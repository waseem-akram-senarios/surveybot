from uuid import uuid4

from fastapi import APIRouter, HTTPException

from models import QuestionP, QuestionResponseP, SympathizeP
from utils import sql_execute, sympathize

router = APIRouter()


@router.post(
    "/questions",
    status_code=201,
    description="""
    Add a new question to the database with support for scale, categorical, or open-ended questions.
    
    Args:
        question (object): Object containing:
            - QueId (str): Question ID (auto-generated if not provided)
            - QueText (str): Question text
            - QueCriteria ("scale" | "categorical" | "open"): Question type
            - QueScale (int | None): Scale value (required for scale questions, None otherwise)
            - QueCategories (List[str] | None): Categories (required for categorical questions, None otherwise)
            - ParentId (str | None): Parent question ID or None for root question
            - ParentCategoryTexts (List[str] | None): For child questions, the parent category texts that should trigger this child
            - Autofill ("Yes" | "No"): Whether the question should be autofilled; Default (unspecified) is "No"
    
    Returns:
        str: Success message with question ID
    """,
)
async def add_question(question: QuestionP):
    try:
        sql_query = """SELECT * FROM questions WHERE id = :question_id"""
        sql_dict = {"question_id": question.QueId}
        res = sql_execute(sql_query, sql_dict)
        if res:
            raise HTTPException(
                status_code=400,
                detail=f"Question with ID {question.QueId} already exists",
            )

        sql_query = """INSERT INTO questions (id, text, criteria, scales, parent_id, autofill)
VALUES (:id, :text, :criteria, :scales, :parent_id, :autofill)"""
        sql_dict = {
            "id": question.QueId,
            "text": question.QueText,
            "criteria": question.QueCriteria,
            "scales": question.QueScale,
            "parent_id": question.ParentId,
            "autofill": question.Autofill,
        }
        sql_execute(sql_query, sql_dict)
        if question.QueCriteria == "categorical":
            question.QueCategories.append("None of the above")
            sql_dict = []
            for category_text in question.QueCategories:
                sql_dict.append(
                    {
                        "id": str(uuid4()),
                        "question_id": question.QueId,
                        "text": category_text,
                    }
                )
            sql_query = """
                        INSERT INTO question_categories (id, question_id, text)
                        VALUES (:id, :question_id, :text)
                    """
            sql_execute(sql_query, sql_dict)

        # If this is a child question and specific parent categories are provided, create mappings
        if question.ParentId and question.ParentCategoryTexts:
            # Fetch parent's categories
            sql_query = """SELECT id, text FROM question_categories WHERE question_id = :parent_id"""
            sql_dict = {"parent_id": question.ParentId}
            parent_categories = sql_execute(sql_query, sql_dict)
            text_to_id = {row["text"]: row["id"] for row in parent_categories}

            # Validate all provided texts exist
            missing = [t for t in question.ParentCategoryTexts if t not in text_to_id]
            if missing:
                raise HTTPException(
                    status_code=400,
                    detail=f"Parent categories not found for texts: {missing}",
                )

            mappings = [
                {
                    "child_question_id": question.QueId,
                    "parent_category_id": text_to_id[t],
                }
                for t in question.ParentCategoryTexts
            ]
            sql_query = """
                INSERT INTO question_category_mappings (child_question_id, parent_category_id)
                VALUES (:child_question_id, :parent_category_id)
            """
            sql_execute(sql_query, mappings)

        return f"Question with ID {question.QueId} added successfully"
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/questions/{question_id}",
    response_model=QuestionResponseP,
    description="""
    Retrieve a specific question by its ID including categories if applicable.

    Args:
        question_id (str): Unique identifier for the question

    Returns:
        object: Question object containing:
            - QueId (str): Question ID
            - QueText (str): Question text
            - QueCriteria ("scale" | "categorical" | "open"): Question type
            - QueScale (int | None): Scale value for scale questions
            - QueCategories (List[str] | None): Categories for categorical questions
            - ParentId (str | None): Parent question ID if this is a child question
            - ParentCategoryTexts (List[str] | None): If a child question is mapped to specific parent categories, those category texts
            - Autofill ("Yes" | "No"): Whether the question should be autofilled; Default (unspecified) is "No"
    """,
)
async def get_question(question_id: str):
    try:
        sql_query = """SELECT * FROM questions WHERE id = :question_id"""
        sql_dict = {"question_id": question_id}
        res = sql_execute(sql_query, sql_dict)
        if not res:
            raise HTTPException(
                status_code=404, detail=f"Question with ID {question_id} not found"
            )
        categories = []
        if res[0]["criteria"] == "categorical":
            # Get categories for the question
            sql_query = (
                """SELECT * FROM question_categories WHERE question_id = :question_id"""
            )
            sql_dict = {"question_id": question_id}
            categories = [item["text"] for item in sql_execute(sql_query, sql_dict)]

        assert res[0]["id"] == question_id

        # For a child question, read any parent category mappings as texts
        parent_category_texts = None
        if res[0]["parent_id"]:
            sql_query = """
                SELECT qc.text
                FROM question_category_mappings m
                JOIN question_categories qc ON qc.id = m.parent_category_id
                WHERE m.child_question_id = :child_id
                ORDER BY qc.text
                """
            sql_dict = {"child_id": question_id}
            rows = sql_execute(sql_query, sql_dict)
            if rows:
                parent_category_texts = [row["text"] for row in rows]

        # Convert to response model
        response = QuestionResponseP(
            QueId=res[0]["id"],
            QueText=res[0]["text"],
            QueScale=res[0]["scales"],
            QueCriteria=res[0]["criteria"],
            QueCategories=categories,
            ParentId=res[0]["parent_id"],
            ParentCategoryTexts=parent_category_texts,
            Autofill=res[0]["autofill"],
        )

        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/questions/{question_id}/parent",
    status_code=200,
    description="""
    Get the parent question ID for a given question.

    Args:
        question_id (str): Unique identifier for the question

    Returns:
        dict: Object containing:
            - parent_id (str | None): Parent question ID or None if root question
    """,
)
async def get_question_parent(question_id: str):
    try:
        sql_query = """SELECT * FROM questions WHERE id = :question_id"""
        sql_dict = {"question_id": question_id}
        question = sql_execute(sql_query, sql_dict)
        if not question:
            raise HTTPException(
                status_code=404, detail=f"Question with ID {question_id} not found"
            )

        if not question[0]["parent_id"]:
            return {"parent_id": None}

        return {"parent_id": question[0]["parent_id"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/questions/{question_id}/children",
    status_code=200,
    description="""
    Get child question IDs for a given parent question.

    Args:
        question_id (str): Unique identifier for the parent question
        category_text (str | None): Optional parent category text to filter children that are mapped to that category. If omitted, returns all children.

    Returns:
        list: Array of child question IDs
    """,
)
async def get_question_children(question_id: str, category_text: str | None = None):
    try:
        sql_query = """SELECT * FROM questions WHERE id = :question_id"""
        sql_dict = {"question_id": question_id}
        question = sql_execute(sql_query, sql_dict)
        if not question:
            raise HTTPException(
                status_code=404, detail=f"Question with ID {question_id} not found"
            )
        # If no category filter provided, return all child question IDs
        if not category_text:
            sql_query = """SELECT id FROM questions WHERE parent_id = :question_id ORDER BY id"""
            sql_dict = {"question_id": question_id}
            children = sql_execute(sql_query, sql_dict)
            return [child["id"] for child in children]

        # With a category filter: include
        #  - children that have no mappings at all (apply to all categories)
        #  - children mapped to the provided category text
        sql_query = """
            SELECT c.id
            FROM questions c
            WHERE c.parent_id = :parent_id
              AND (
                NOT EXISTS (
                  SELECT 1
                  FROM question_category_mappings m
                  WHERE m.child_question_id = c.id
                )
                OR EXISTS (
                  SELECT 1
                  FROM question_category_mappings m
                  JOIN question_categories qc ON qc.id = m.parent_category_id
                  WHERE m.child_question_id = c.id
                    AND qc.question_id = :parent_id
                    AND qc.text = :category_text
                )
              )
            ORDER BY c.id
            """
        sql_dict = {"parent_id": question_id, "category_text": category_text}
        children = sql_execute(sql_query, sql_dict)
        return [child["id"] for child in children]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/list_questions",
    status_code=200,
    description="""
    Retrieve all questions in the system with their details and categories.

    Returns:
        list: Array of question objects, each containing:
            - QueId (str): Question ID
            - QueText (str): Question text
            - QueCriteria ("scale" | "categorical" | "open"): Question type
            - QueScale (int | None): Scale value for scale questions
            - QueCategories (List[str] | None): Categories for categorical questions
            - ParentId (str | None): Parent question ID if this is a child question
            - Autofill ("Yes" | "No"): Whether the question should be autofilled; Default (unspecified) is "No"
    """,
)
async def list_questions():
    try:
        # Get root questions (where parent_id is None)
        try:
            sql_query = """SELECT * FROM questions"""
            sql_dict = []
            questions = sql_execute(sql_query, sql_dict)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

        result = []
        for question in questions:
            # Get categories for each question
            categories = []
            if question["criteria"] == "categorical":
                # Get categories for the question
                sql_query = """SELECT * FROM question_categories WHERE question_id = :question_id"""
                sql_dict = {"question_id": question["id"]}
                categories = [item["text"] for item in sql_execute(sql_query, sql_dict)]

            # If this is a child, also retrieve any mapped parent category texts
            parent_category_texts = None
            if question["parent_id"]:
                sql_query = """
                    SELECT qc.text
                    FROM question_category_mappings m
                    JOIN question_categories qc ON qc.id = m.parent_category_id
                    WHERE m.child_question_id = :child_id
                    ORDER BY qc.text
                    """
                sql_dict = {"child_id": question["id"]}
                rows = sql_execute(sql_query, sql_dict)
                if rows:
                    parent_category_texts = [row["text"] for row in rows]

            result.append(
                QuestionResponseP(
                    QueId=question["id"],
                    QueText=question["text"],
                    QueScale=question["scales"],
                    QueCriteria=question["criteria"],
                    QueCategories=categories,
                    ParentId=question["parent_id"],
                    ParentCategoryTexts=parent_category_texts,
                    Autofill=question["autofill"],
                )
            )

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/questions/{question_id}/answers",
    description="""
    Get all answers submitted for a specific question across surveys.

    Args:
        question_id (str): Unique identifier for the question

    Returns:
        list: Array of objects containing:
            - question_id (str): Question ID
            - question_text (str): Question text
            - criteria (str): Question type
            - scales (int | None): Scale value
            - parent_id (str | None): Parent question ID
            - categories (List[str]): Question categories
            - answers (List[str]): All submitted answers
    """,
)
async def get_answers(question_id: str):
    try:
        # Check if question exists
        # question_id = str(question_id)
        # print(type(question_id))

        sql_query = """SELECT
  q.id AS question_id,
  q.text AS question_text,
  q.criteria,
  q.scales,
  q.parent_id,
  q.autofill,
  COALESCE(
    MAX(qc.categories::text)::json,
    '[]'
  ) AS categories,
  json_agg(sri.answer ORDER BY sri.answer) AS answers
FROM survey_response_items sri
JOIN questions q
  ON sri.question_id = q.id
LEFT JOIN (
  SELECT
    question_id,
    json_agg(text ORDER BY text) AS categories
  FROM question_categories
  GROUP BY question_id
) qc
  ON qc.question_id = q.id
WHERE q.id = :question_id
GROUP BY q.id, q.text, q.criteria, q.scales, q.parent_id
ORDER BY q.id;"""
        sql_dict = {"question_id": question_id}
        question_texts = sql_execute(sql_query, sql_dict)
        dict_results = [dict(row) for row in question_texts]

        return dict_results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch(
    "/questions",
    response_model=QuestionResponseP,
    description="""
    Update an existing question's details.

    Args:
        question (object): Question object containing:
            - QueId (str): Question ID (required, must exist)
            - QueText (str): Updated question text
            - QueCriteria ("scale" | "categorical" | "open"): Question type
            - QueScale (int | None): Scale value (required for scale questions, None otherwise)
            - QueCategories (List[str] | None): Categories (required for categorical questions, None otherwise)
            - ParentId (str | None): Parent question ID or None for root question
            - Autofill ("Yes" | "No"): Whether the question should be autofilled; Default (unspecified) is "No" 
    Returns:
        object: Updated question object
    """,
)
async def edit_question(question: QuestionP):
    try:
        # Check if question with this ID already exists
        sql_query = """SELECT * FROM questions WHERE id = :question_id"""
        sql_dict = {"question_id": question.QueId}
        res = sql_execute(sql_query, sql_dict)
        if not res:
            raise HTTPException(
                status_code=400,
                detail=f"Question with ID {question.QueId} does not exist",
            )

        # Delete categories
        sql_query = (
            """DELETE FROM question_categories WHERE question_id = :question_id"""
        )
        sql_dict = {"question_id": question.QueId}
        sql_execute(sql_query, sql_dict)

        sql_query = """UPDATE questions SET text = :text, criteria = :criteria, scales = :scales, parent_id = :parent_id, autofill = :autofill WHERE id = :id"""
        sql_dict = {
            "id": question.QueId,
            "text": question.QueText,
            "criteria": question.QueCriteria,
            "scales": question.QueScale,
            "parent_id": question.ParentId,
            "autofill": question.Autofill,
        }
        sql_execute(sql_query, sql_dict)
        if question.QueCriteria == "categorical":
            if "None of the above" not in question.QueCategories:
                question.QueCategories.append("None of the above")
            sql_dict = []
            for category_text in question.QueCategories:
                sql_dict.append(
                    {
                        "id": str(uuid4()),
                        "question_id": question.QueId,
                        "text": category_text,
                    }
                )
            sql_query = """
                        INSERT INTO question_categories (id, question_id, text)
                        VALUES (:id, :question_id, :text)
                    """
            sql_execute(sql_query, sql_dict)

        # Update parent category mappings for child questions
        # Strategy: delete existing mappings, then re-insert if provided
        sql_query = """DELETE FROM question_category_mappings WHERE child_question_id = :child_id"""
        sql_dict = {"child_id": question.QueId}
        sql_execute(sql_query, sql_dict)

        if question.ParentId and question.ParentCategoryTexts:
            sql_query = """SELECT id, text FROM question_categories WHERE question_id = :parent_id"""
            sql_dict = {"parent_id": question.ParentId}
            parent_categories = sql_execute(sql_query, sql_dict)
            text_to_id = {row["text"]: row["id"] for row in parent_categories}

            missing = [t for t in question.ParentCategoryTexts if t not in text_to_id]
            if missing:
                raise HTTPException(
                    status_code=400,
                    detail=f"Parent categories not found for texts: {missing}",
                )

            mappings = [
                {
                    "child_question_id": question.QueId,
                    "parent_category_id": text_to_id[t],
                }
                for t in question.ParentCategoryTexts
            ]
            sql_query = """
                INSERT INTO question_category_mappings (child_question_id, parent_category_id)
                VALUES (:child_question_id, :parent_category_id)
            """
            sql_execute(sql_query, mappings)

        return question
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete(
    "/questions/{question_id}",
    status_code=200,
    description="""
    Delete a question and all its child questions if it's a parent question.

    Args:
        question_id (str): Unique identifier for the question to delete

    Returns:
        dict: Success message containing:
            - message (str): Confirmation message
    """,
)
async def delete_question(question_id: str):
    try:
        sql_query = """DELETE FROM question_categories
 WHERE question_id IN (
   :question_id
   UNION
   SELECT id FROM questions WHERE parent_id = :question_id
 )"""
        sql_dict = {"question_id": question_id}
        _ = sql_execute(sql_query, sql_dict)

        # delete child questions
        sql_query = """DELETE FROM questions
 WHERE parent_id = :question_id"""
        sql_dict = {"question_id": question_id}
        _ = sql_execute(sql_query, sql_dict)

        # delete question itself
        sql_query = """DELETE FROM questions
 WHERE id = :question_id"""
        sql_dict = {"question_id": question_id}
        _ = sql_execute(sql_query, sql_dict)

        return {"message": f"Question with ID {question_id} deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/questions/sympathize",
    status_code=200,
    description="""
    Generate a human-like empathetic response based on a question and user's answer.

    Args:
        conversation (object): Object containing:
            - Question (str): The original question text
            - Response (str): The user's response to the question

    Returns:
        dict: Object containing:
            - message (str): Generated empathetic response
    """,
)
async def sympathizer(conversation: SympathizeP):
    try:
        response = sympathize(conversation.Question, conversation.Response)

        return {"message": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

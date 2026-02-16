from fastapi import APIRouter, HTTPException
from models import (
    GetTemplateQuestionsRequestDemo,
    GetTemplateQuestionsRequestP,
    TemplateQuestionCreateP,
    TemplateQuestionDeleteRequestP,
)
from utils import build_filters, process_question_stats, sql_execute

router = APIRouter()


@router.post(
    "/templates/addquestions",
    status_code=201,
    description="""
    Associate an existing question with a template in a specific order.
    
    Args:
        template_question (object): Object containing:
            - TemplateName (str): Name of the template
            - QueId (str): ID of the question to add
            - Order (int): Position order of the question in the template
    
    Returns:
        dict: Object containing:
            - message (str): Success confirmation message
    """,
)
async def add_question_to_template(template_question: TemplateQuestionCreateP):
    try:
        # Check if template exists
        sql_query = """SELECT * FROM templates WHERE name = :template_name"""
        sql_dict = {"template_name": template_question.TemplateName}
        res = sql_execute(sql_query, sql_dict)
        if not res:
            raise HTTPException(
                status_code=404,
                detail=f"Template with Name {template_question.TemplateName} not found",
            )

        # Check if question exists
        sql_query = """SELECT * FROM questions WHERE id = :question_id"""
        sql_dict = {"question_id": template_question.QueId}
        question_response = sql_execute(sql_query, sql_dict)
        if not question_response:
            raise HTTPException(
                status_code=404,
                detail=f"Question with ID {template_question.QueId} not found",
            )

        # Create item for TemplateQuestions table
        sql_query = """INSERT INTO template_questions (template_name, ord, question_id)
VALUES (:template_name, :ord, :question_id)"""
        sql_dict = {
            "template_name": template_question.TemplateName,
            "ord": template_question.Order,
            "question_id": template_question.QueId,
        }
        sql_execute(sql_query, sql_dict)

        return {
            "message": f"Question with Id {template_question.QueId} added to template {template_question.TemplateName} successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/templates/getquestions",
    description="""
    Retrieve all questions associated with a template in order.
    
    Args:
        request (object): Object containing:
            - TemplateName (str): Name of the template
    
    Returns:
        dict: Object containing:
            - TemplateName (str): Template name
            - Questions (list): Array of question objects, each containing:
                - id (str): Question ID
                - text (str): Question text
                - criteria (str): Question type
                - scales (int | None): Scale value
                - parent_id (str | None): Parent question ID
                - ord (int): Question order in template
                - categories (list): Question categories
                - autofill (str): Whether to autofill the question
    """,
)
async def get_template_questions(request: GetTemplateQuestionsRequestP):
    template_name = request.TemplateName
    try:
        # Check if template exists
        sql_query = """SELECT * FROM templates WHERE name = :template_name"""
        sql_dict = {"template_name": request.TemplateName}
        res = sql_execute(sql_query, sql_dict)
        if not res:
            raise HTTPException(
                status_code=404,
                detail=f"Template with Name {request.TemplateName} not found",
            )

        sql_query = """SELECT 
  q.id,
  q.text,
  q.criteria,
  q.scales,
  q.parent_id,
  q.autofill,
  tq.ord,
  COALESCE(array_agg(qc.text ORDER BY qc.id) 
           FILTER (WHERE qc.text IS NOT NULL), '{}') AS categories,
  COALESCE(pm.parent_category_texts, '{}') AS parent_category_texts
FROM 
  template_questions tq
JOIN 
  questions q ON tq.question_id = q.id
LEFT JOIN 
  question_categories qc ON q.id = qc.question_id
LEFT JOIN (
  SELECT m.child_question_id,
         array_agg(qc2.text ORDER BY qc2.id) AS parent_category_texts
    FROM question_category_mappings m
    JOIN question_categories qc2 ON qc2.id = m.parent_category_id
   GROUP BY m.child_question_id
) pm ON pm.child_question_id = q.id
WHERE 
  tq.template_name = :template_name
GROUP BY 
  q.id, q.text, q.criteria, q.scales, q.parent_id, q.autofill, tq.ord, pm.parent_category_texts
ORDER BY 
  tq.ord;"""
        sql_dict = {"template_name": request.TemplateName}
        questions = sql_execute(sql_query, sql_dict)

        return {
            "TemplateName": template_name,
            "Questions": questions,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete(
    "/templates/deletequestionbyidwithparentchild",
    description="""
    Remove a question from a template and delete the question along with any parent/child relationships.
    
    Args:
        request (object): Object containing:
            - TemplateName (str): Name of the template
            - QueId (str): ID of the question to delete
    
    Returns:
        dict: Object containing:
            - message (str): Success confirmation message
    """,
)
async def delete_template_question_fromid_with_parent_child(
    request: TemplateQuestionDeleteRequestP,
):
    try:
        template_name = request.TemplateName
        queid = request.QueId

        # delete category‐choices for question and for its children
        sql_query = """DELETE FROM question_categories
 WHERE question_id = :question_id
    OR question_id IN (
         SELECT id
           FROM questions
          WHERE parent_id = :question_id
       )"""
        sql_dict = {"question_id": queid}
        _ = sql_execute(sql_query, sql_dict)

        # delete template_questions for question and for its children
        sql_query = """DELETE FROM template_questions
 WHERE question_id = :question_id
    OR question_id IN (
         SELECT id
           FROM questions
          WHERE parent_id = :question_id
       )"""
        sql_dict = {"question_id": queid}
        _ = sql_execute(sql_query, sql_dict)

        # delete child questions
        sql_query = """DELETE FROM questions
 WHERE parent_id = :question_id"""
        sql_dict = {"question_id": queid}
        _ = sql_execute(sql_query, sql_dict)

        # delete question itself
        sql_query = """DELETE FROM questions
 WHERE id = :question_id"""
        sql_dict = {"question_id": queid}
        _ = sql_execute(sql_query, sql_dict)

        return {
            "message": f"Question with ID '{queid}' deleted from template '{template_name}'"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/templates/getqna",
    description="""
    Get questions and their aggregated answers/statistics for a template.
    
    Args:
        request (object): Object containing:
            - TemplateName (str): Name of the template
            - AgeRange (List[int], optional): List of two integers [min_age, max_age].* 
              Use None for unbounded ranges. Examples:
              - [18, 65]: Filter for ages 18 to 65
              - [None, 18]: Filter for ages up to 18
              - [65, None]: Filter for ages 65 and above
            - TripsRange (List[int], optional): List of two integers [min_trips, max_trips].*
              Use None for unbounded ranges. Examples:
              - [1, 10]: Filter for 1 to 10 trips
              - [None, 5]: Filter for up to 5 trips
              - [10, None]: Filter for 10 or more trips
            - Gender (str, optional): Filter by gender ("Male", "Female", or "Other")
            - Accessibility (str, optional): Filter by accessibility ("Wheelchair" or "Other")
            * Note that each bound in inclusive
    
    Returns:
        list: Array of question objects with answers, each containing:
            - question_id (str): Question ID
            - question_text (str): Question text
            - criteria (str): Question type
            - scales (int | None): Scale value
            - parent_id (str | None): Parent question ID
            - categories (list): Question categories
            - answers (list): All submitted answers
            - Stats (dict): Statistical analysis of answers
            - autofill (str): Whether to autofill the question
    """,
)
async def get_template_answers(request: GetTemplateQuestionsRequestDemo):
    template_name = request.TemplateName
    where_clause, params = build_filters(request)

    try:
        # Check if template exists
        sql_query = """SELECT * FROM templates WHERE name = :template_name"""
        sql_dict = {"template_name": request.TemplateName}
        res = sql_execute(sql_query, sql_dict)
        if not res:
            raise HTTPException(
                status_code=404,
                detail=f"Template with Name {request.TemplateName} not found",
            )

        sql_query = f"""SELECT
  q.id AS question_id,
  q.text AS question_text,
  q.criteria,
  q.scales,
  q.parent_id,
  q.autofill,
  tq.ord,
  COALESCE(
    MAX(qc.categories::text)::json,
    '[]'
  ) AS categories,
  json_agg(sri.answer ORDER BY sri.answer) AS answers
FROM survey_response_items sri
JOIN questions q
  ON sri.question_id = q.id
LEFT JOIN template_questions tq
  ON tq.question_id = q.id AND tq.template_name = :template_name
LEFT JOIN (
  SELECT
    question_id,
    json_agg(text ORDER BY text) AS categories
  FROM question_categories
  GROUP BY question_id
) qc
  ON qc.question_id = q.id
JOIN surveys s
  ON s.id = sri.survey_id
WHERE s.template_name = :template_name
  AND s.status = 'Completed'
  AND sri.answer IS NOT NULL
  {where_clause}
GROUP BY q.id, q.text, q.criteria, q.scales, q.parent_id, q.autofill, tq.ord
ORDER BY tq.ord;"""
        sql_dict = {"template_name": template_name, **params}
        question_texts = sql_execute(sql_query, sql_dict)
        dict_results = [dict(row) for row in question_texts]

        for question in dict_results:
            question["Stats"] = process_question_stats(question)

        return dict_results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

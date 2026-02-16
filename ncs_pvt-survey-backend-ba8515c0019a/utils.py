import asyncio
import base64
import logging
import os
from datetime import datetime, timezone
from email.mime.text import MIMEText
from io import BytesIO
from typing import Literal, Optional
from uuid import uuid4

import requests
from fastapi import HTTPException
from models import RelevanceP, SurveyQuestionAnswerP
from openai import OpenAI
from PIL import Image
from prompts import (
    autofill_prompt,
    autofill_prompt_open,
    filtering_prompt,
    parse_prompt,
    sympathize_prompt,
)
from pydantic import BaseModel
from sqlalchemy import create_engine, text
from wordcloud import WordCloud

logger = logging.getLogger(__name__)
engine = create_engine(
    f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/db"
)


def sql_execute(sql_query, sql_dict):
    with engine.begin() as conn:
        result = conn.execute(text(sql_query), sql_dict)
    if result.returns_rows:
        return result.mappings().all()
    else:
        return result.rowcount


def translate(text, language="Spanish"):
    # Use gpt-4.1 to translate text to a different Language
    openai_client = OpenAI()
    response = openai_client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {
                "role": "developer",
                "content": f"You are a helpful assistant that translates questions from English to {language}. Translate the question as it is without any additional context or text.",
            },
            {"role": "user", "content": f"{text}"},
        ],
    )
    return response.choices[0].message.content


def translate_categories(categories, language="Spanish"):
    # Use gpt-4.1 to translate text to a different Language
    openai_client = OpenAI()
    response = openai_client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {
                "role": "developer",
                "content": f"You are a helpful assistant that translates categories from English to {language}. Translate the categories (separated by semicolon) as it is without any additional context or text.",
            },
            {"role": "user", "content": f"{'; '.join(categories)}"},
        ],
    )
    return response.choices[0].message.content.split(";")


def parse(question, response, response_format):
    openai_client = OpenAI()
    response = openai_client.beta.chat.completions.parse(
        model="gpt-4.1",
        messages=[
            {
                "role": "developer",
                "content": parse_prompt,
            },
            {
                "role": "user",
                "content": f"Survey Question: {question}\nuser's Response: {response}",
            },
        ],
        response_format=response_format,
    )
    return response.choices[0].message.parsed


def autofill(context, question, response_format):
    openai_client = OpenAI()
    response = openai_client.beta.chat.completions.parse(
        model="gpt-4.1",
        messages=[
            {
                "role": "developer",
                "content": autofill_prompt,
            },
            {
                "role": "user",
                "content": f"Context of the survey: {context}\nSurvey Question: {question}",
            },
        ],
        response_format=response_format,
    )
    return response.choices[0].message.parsed


def autofill_open(context, question):
    # Use gpt-4.1 to translate text to a different Language
    openai_client = OpenAI()
    response = openai_client.chat.completions.create(
        model="gpt-4.1",
        messages=[
            {
                "role": "developer",
                "content": autofill_prompt_open,
            },
            {
                "role": "user",
                "content": f"Context of the survey: {context}\nSurvey Question: {question}",
            },
        ],
    )
    resp = response.choices[0].message.content
    if resp == "Cannot be determined":
        return None
    return resp


def filtering(biodata, question):
    openai_client = OpenAI()
    response = openai_client.beta.chat.completions.parse(
        model="gpt-4.1",
        messages=[
            {
                "role": "developer",
                "content": filtering_prompt,
            },
            {
                "role": "user",
                "content": f"Biodata of the user: {biodata}\nSurvey Question: {question}",
            },
        ],
        response_format=RelevanceP,
    )
    return response.choices[0].message.parsed


def process_question_stats(data):
    if data["criteria"] == "categorical":
        # Initialize all categories with 0
        category_counts = {category: 0 for category in data.get("categories", [])}
        for ans in data.get("answers", []):
            if ans in category_counts:
                category_counts[ans] += 1
        return category_counts

    elif data["criteria"] == "scale":
        try:
            scale_max = int(data["scales"])
        except ValueError:
            return {}  # Handle invalid scale values
        # Initialize scale with 0 for each point
        scale_counts = {str(i): 0 for i in range(1, scale_max + 1)}
        for ans in data.get("answers", []):
            try:
                if 1 <= int(ans) <= int(scale_max):
                    scale_counts[str(ans)] += 1
            except ValueError:
                continue  # Ignore invalid answers
        return scale_counts
    elif data["criteria"] == "open":
        text = " ".join(data["answers"])
        wc = WordCloud(
            width=800, height=400, background_color="white", include_numbers=True
        )

        if not text.strip():
            # Fallback placeholder cloud
            wordcloud = wc.generate_from_frequencies({"No Data": 1})
        else:
            # Normal cloud from responses
            try:
                wordcloud = wc.generate(text)
            except Exception as e:
                wordcloud = wc.generate_from_frequencies({"No Data": 1})
        image = Image.fromarray(wordcloud.to_array())
        # Save image to buffer
        buf = BytesIO()
        image.save(buf, format="PNG")
        buf.seek(0)

        # Encode as base64 string
        img_base64 = base64.b64encode(buf.read()).decode("utf-8")
        return img_base64
        print(data)
    return {}  # For unsupported QueCriteria


def process_question_sync(question_data, biodata):
    return asyncio.run(process_question(question_data, biodata))


async def process_question(question, biodata):
    que_id = question.QueId

    # response = questions_table.get_item(Key={"QueId": que_id})

    # choice = filtering(biodata, response["Item"]["QueText"]).yes_or_no
    choice = "Yes"

    if choice == "Yes":  # i.e. question is relevant
        # try to perform autofill
        que_criteria = question.QueCriteria
        if que_criteria == "scale":
            scale_max = question.QueScale
            scale_list = list(range(1, int(scale_max) + 1))
            scale_list = list(map(str, scale_list))

            class AutoFill(BaseModel):
                can_be_answered_definitely: Literal["Yes", "No"]
                definite_answer: Optional[Literal[tuple(scale_list)]] = None

            filled = autofill(
                biodata,
                question.QueText,
                AutoFill,
            ).definite_answer
        elif que_criteria == "categorical":
            que_categories = question.QueCategories

            if "None of the above" in que_categories:
                que_categories.remove("None of the above")

            class AutoFill(BaseModel):
                can_be_answered_definitely: Literal["Yes", "No"]
                definite_answer: Optional[Literal[tuple(que_categories)]] = None

            filled = autofill(
                biodata,
                question.QueText,
                AutoFill,
            ).definite_answer

        elif que_criteria == "open":
            filled = autofill_open(biodata, question.QueText)

        # Create survey question answer with all question details
        return SurveyQuestionAnswerP(
            QueId=que_id,
            QueText=question.QueText,
            QueScale=question.QueScale,
            QueCriteria=question.QueCriteria,
            QueCategories=question.QueCategories,
            Order=str(question.Order),
            Ans=filled or None,
            RawAns=None,
            Autofill=question.Autofill,
        )
    return None


def summarize(question, response):
    # summarize the response of a question given by user
    if len(response) <= 300:
        return response
    else:
        openai_client = OpenAI()
        response = openai_client.chat.completions.create(
            model="gpt-4.1",
            messages=[
                {
                    "role": "developer",
                    "content": "You are a helpful assistant that summarizes the response of a survey question. Please summarize the response in one or two short sentences without any additional context or text.",
                },
                {
                    "role": "user",
                    "content": f"Survey Question: {question}\nuser's Response: {response}",
                },
            ],
        )
        return response.choices[0].message.content


def process_survey_question(question: dict) -> dict:
    """Process a single survey question to parse the answer from RawAns.

    Args:
        question: A dictionary containing question data including QueCriteria, QueScale,
                QueCategories, QueText, and RawAns.

    Returns:
        The updated question dictionary with the parsed answer in the 'Ans' field.
    """
    if question.get("Ans"):
        return question

    if question.get("QueCriteria") == "scale":
        scale_max = question["QueScale"]
        scale_list = list(range(1, int(scale_max) + 1))
        scale_list = list(map(str, scale_list))

        class Fill(BaseModel):
            answer: Optional[Literal[tuple(scale_list)]] = None
    elif question.get("QueCriteria") == "categorical":
        que_categories = question["QueCategories"]

        class Fill(BaseModel):
            answer: Optional[Literal[tuple(que_categories)]] = None
    else:
        question["Ans"] = summarize(question["QueText"], question["RawAns"])
        return question

    try:
        parsed = parse(
            question["QueText"],
            question["RawAns"],
            Fill,
        )
        question["Ans"] = parsed.answer if parsed.answer else "None of the above"
    except Exception as e:
        logger.warning(
            f"Error parsing answer for question {question.get('QueId')}: {str(e)}"
        )
        question["Ans"] = "None of the above"
    return question


def sympathize(question, response):
    openai_client = OpenAI()
    response = openai_client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {
                "role": "developer",
                "content": sympathize_prompt,
            },
            {"role": "user", "content": f"Question: {question}\nResponse: {response}"},
        ],
    )
    return response.choices[0].message.content


def get_current_time():
    return datetime.now(timezone.utc).isoformat()


def process_question_translation(
    item: dict,
    src_template_name: str,
    new_template_name: str,
    new_template_language: str,
) -> dict:
    """
    Process and translate a single question for template translation.

    Args:
        item: The question item from the template_questions table
        src_template_name: Name of the source template
        new_template_name: Name of the new translated template
        new_template_language: Target language for translation
    """

    try:
        que_id = item["id"]
        # Translate the question text to the target language
        que_text = item["text"]
        que_text_translated = translate(que_text, new_template_language)

        # Handle categories if this is a categorical question
        que_criteria = item["criteria"]
        if que_criteria == "categorical":
            que_categories_new = translate_categories(
                item["categories"],
                new_template_language,
            )
        else:
            que_categories_new = None

        # Create a new question ID for the translated version
        # new_que_id = f"{que_id}_{new_template_language.lower()}"
        new_que_id = str(uuid4())

        # Create the translated version of the question
        new_question = item.copy()
        new_question["id"] = new_que_id
        new_question["text"] = que_text_translated
        # ensure column key matches schema
        new_question["scales"] = item.get("scales", None)
        new_question["categories"] = que_categories_new

        # Translate any parent category mapping texts if present
        pct = item.get("parent_category_texts") or []
        if pct:
            new_question["parent_category_texts"] = translate_categories(
                pct, new_template_language
            )
        else:
            new_question["parent_category_texts"] = []

        # Preserve original id for mapping later
        new_question["old_id"] = que_id

        return new_question

    except Exception as e:
        logger.warning(f"Error processing question {que_id}: {str(e)}")
        raise  # Re-raise to handle in the calling function if needed


def build_html_email(url: str) -> str:
    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #4CAF50;">We'd love your input!</h2>
            <p>We value your feedback and would appreciate it if you could take a few moments to answer a survey:</p>
            <p>Click the link below to complete the survey:</p>
            <p><a href="{url}">Survey Link</a></p>
            <p>Thank you for your time and insights!</p>
        </body>
    </html>
    """
    return html_body


def build_text_email(url: str) -> str:
    text_body = (
        "We'd love your input!\n\n"
        "We value your feedback and would appreciate it if you could take a few moments to answer a survey:\n\n"
        f"Click the link below to complete the survey:\n\n{url}\n\n"
        "Thank you for your time and insights!"
    )
    return text_body


def get_access_token():
    """Fetch a fresh access token using the refresh token."""
    url = "https://oauth2.googleapis.com/token"
    payload = {
        "client_id": os.getenv("CLIENT_ID"),
        "client_secret": os.getenv("CLIENT_SECRET"),
        "refresh_token": os.getenv("REFRESH_TOKEN"),
        "grant_type": "refresh_token",
    }
    response = requests.post(url, data=payload)
    response.raise_for_status()
    return response.json()["access_token"]


def send_email(to, subject, body):
    """Send an email using Gmail API with a fresh token."""
    access_token = get_access_token()

    # Build the email
    message = MIMEText(body, "html")
    message["to"] = to
    message["from"] = os.getenv("SENDER")
    message["subject"] = subject

    raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
    # raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()

    # Gmail API request
    url = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    body = {"raw": raw_message}

    response = requests.post(url, headers=headers, json=body)
    response.raise_for_status()
    return response.json()


def make_call_task(headers, payload, survey_id):
    try:
        # API endpoint
        url = "https://api.vapi.ai/call"
        response = requests.post(url, headers=headers, json=payload)

        if response.status_code == 201:
            call_id = response.json().get("id")
            # insert workflow id into surveys db
            try:
                sql_query = """UPDATE surveys SET call_id = :call_id, call_time = NOW() AT TIME ZONE 'UTC', call_number = :call_number WHERE id = :survey_id"""
                sql_dict = {
                    "survey_id": survey_id,
                    "call_id": call_id,
                    "call_number": payload.get("customer").get("number"),
                }
                rows = sql_execute(sql_query, sql_dict)
                logger.info(f"✅ Call ID updated successfully: {call_id}")
            except Exception as e:
                logger.warning(f"❌ Error updating surveys: {e}")

            return {"CallId": call_id}
        else:
            logger.error(f"❌ Failed to create outbound call: {response.text}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create outbound call: {response.text}",
            )

    except Exception as e:
        logger.error(f"❌ Failed to create outbound call: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to create outbound call: {e}"
        )


def build_filters(request):
    where_parts = []
    params = {}
    if request.AgeRange:
        min_age, max_age = request.AgeRange
        if min_age is not None:
            where_parts.append("s.age >= :min_age")
            params["min_age"] = min_age
        if max_age is not None:
            where_parts.append("s.age <= :max_age")
            params["max_age"] = max_age

    if request.TripsRange:
        min_trips, max_trips = request.TripsRange
        if min_trips is not None:
            where_parts.append("s.num_of_trips >= :min_trips")
            params["min_trips"] = min_trips
        if max_trips is not None:
            where_parts.append("s.num_of_trips <= :max_trips")
            params["max_trips"] = max_trips

    if request.Gender:
        where_parts.append("s.gender = :gender")
        params["gender"] = request.Gender

    if request.Accessibility:
        where_parts.append("s.accessibility = :accessibility")
        params["accessibility"] = request.Accessibility

    return "AND " + " AND ".join(where_parts) if where_parts else "", params

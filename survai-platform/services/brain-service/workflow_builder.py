"""
VAPI Workflow Config Builder

Generates the JSON configuration for VAPI multi-node workflows.
Does NOT make any API calls -- that's the voice-service's job.

This separation means you can iterate on workflow intelligence
without touching the voice/call infrastructure.
"""

import json
import logging
import re
from typing import Any, Dict, List, Optional

from prompts import DEFAULT_GLOBAL_PROMPT_EN, DEFAULT_GLOBAL_PROMPT_ES, MAX_SURVEY_QUESTIONS

logger = logging.getLogger(__name__)

VOICE_CONFIG = {
    "en": {"model": "aura-2", "voiceId": "luna", "provider": "deepgram"},
    "es": {"model": "aura-2", "voiceId": "luna", "provider": "deepgram"},
}

TRANSCRIBER_CONFIG = {
    "en": {"provider": "deepgram", "model": "nova-2-phonecall", "language": "en"},
    "es": {"provider": "deepgram", "model": "nova-2", "language": "es"},
}


def _sanitize_field_name(field_name: str) -> str:
    sanitized = re.sub(r"[^a-zA-Z0-9_]", "_", field_name)
    return f"q_{sanitized}"


def build_workflow_config(
    survey_id: str,
    questions: List[Dict[str, Any]],
    callback_url: str = "",
    template_config: Optional[Dict[str, Any]] = None,
    rider_data: Optional[Dict[str, Any]] = None,
    language: str = "en",
) -> Dict[str, Any]:
    """
    Build the complete VAPI workflow JSON config.

    Returns a dict ready to POST to VAPI's /workflow endpoint.
    """
    questions = sorted(questions, key=lambda q: q.get("order", 0))

    # Enforce max question limit using AI prioritization
    if len(questions) > MAX_SURVEY_QUESTIONS:
        logger.info(
            f"Survey {survey_id}: {len(questions)} questions exceeds max {MAX_SURVEY_QUESTIONS}, "
            "using AI to prioritize"
        )
        try:
            from llm import prioritize_questions as _prioritize
            rider_ctx = ""
            if rider_data:
                rider_ctx = " ".join(f"{k}: {v}" for k, v in rider_data.items() if v)
            selected_ids = _prioritize(questions, MAX_SURVEY_QUESTIONS, rider_ctx)
            selected_set = set(selected_ids)
            questions = [q for q in questions if q["id"] in selected_set]
            questions = sorted(questions, key=lambda q: q.get("order", 0))
            logger.info(f"Survey {survey_id}: Prioritized to {len(questions)} questions")
        except Exception as e:
            logger.warning(f"AI prioritization failed, using first {MAX_SURVEY_QUESTIONS}: {e}")
            questions = questions[:MAX_SURVEY_QUESTIONS]

    for question in questions:
        if question.get("criteria") == "categorical" and question.get("categories"):
            has_children = any(
                q.get("parent_id") == question["id"] for q in questions
            )
            if has_children and "None of the above" in question["categories"]:
                question["categories"].remove("None of the above")

    config = template_config or {}
    time_limit = config.get("time_limit_minutes", 8)
    restricted_topics = config.get("restricted_topics") or []
    greeting_template = config.get("greeting_template")
    agent_name = config.get("agent_name", "Cameron")
    ai_augmented = config.get("ai_augmented", False)

    restricted_block = ""
    if restricted_topics:
        if isinstance(restricted_topics, str):
            try:
                restricted_topics = json.loads(restricted_topics)
            except Exception:
                restricted_topics = [restricted_topics]
        for topic in restricted_topics:
            restricted_block += f"\n- NEVER discuss {topic}"

    voice_cfg = VOICE_CONFIG.get(language, VOICE_CONFIG["en"])
    transcriber_cfg = TRANSCRIBER_CONFIG.get(language, TRANSCRIBER_CONFIG["en"])
    global_prompt = DEFAULT_GLOBAL_PROMPT_ES if language == "es" else DEFAULT_GLOBAL_PROMPT_EN

    if restricted_block:
        global_prompt += f"\n\nSTRICT BOUNDARIES:{restricted_block}"
        global_prompt += "\n- If asked about restricted topics, politely redirect to the survey."

    global_prompt += f"\n\nTIME MANAGEMENT:\n- Target survey completion: {time_limit} minutes"
    global_prompt += f"\n- At {max(1, time_limit - 2)} minutes: Start wrapping up, skip non-essential questions"
    global_prompt += f"\n- At {max(1, time_limit - 1)} minutes: Ask one final question then conclude"
    global_prompt += f"\n- Must end the survey gracefully with a thank-you"

    rider_context = ""
    if rider_data:
        if rider_data.get("ride_count"):
            rider_context += f"This rider has taken {rider_data['ride_count']} rides. "
        if rider_data.get("last_ride_date"):
            rider_context += f"Last ride: {rider_data['last_ride_date']}. "
        if rider_data.get("biodata"):
            bio = rider_data["biodata"]
            if isinstance(bio, dict):
                for k, v in bio.items():
                    rider_context += f"{k}: {v}. "
            elif isinstance(bio, str) and bio.strip():
                rider_context += f"Notes: {bio}. "

    if rider_context:
        global_prompt += f"\n\nRIDER CONTEXT (use to personalize conversation):\n{rider_context}"

    workflow = {
        "backgroundSound": "office",
        "model": {"provider": "openai", "model": "gpt-4.1"},
        "name": f"Survey {survey_id}",
        "nodes": [],
        "edges": [],
        "voice": voice_cfg,
        "transcriber": transcriber_cfg,
        "globalPrompt": global_prompt,
        "maxDurationSeconds": time_limit * 60,
    }

    nodes, edges = _create_nodes_and_edges(
        questions, survey_id, callback_url, language,
        greeting_template, agent_name, voice_cfg, rider_context, ai_augmented,
    )
    workflow["nodes"] = nodes
    workflow["edges"] = edges
    return workflow


def _create_nodes_and_edges(questions, survey_id, callback_url="",
                             language="en", greeting_template=None,
                             agent_name="Cameron", voice_cfg=None,
                             rider_context="", ai_augmented=False):
    nodes = []
    edges = []

    start_node = _create_start_node(language, greeting_template, agent_name)
    nodes.append(start_node)

    decline_node_conv = _create_decline_node_conv(language, voice_cfg)
    nodes.append(decline_node_conv)

    decline_node_tool = _create_decline_node_tool()
    nodes.append(decline_node_tool)

    end_node = _create_end_node(questions)
    nodes.append(end_node)

    verify_user_node = _create_verify_user_node(language)
    nodes.append(verify_user_node)

    question_nodes = []
    for i, question in enumerate(questions):
        node = _create_question_node(question, i, language, voice_cfg, rider_context, ai_augmented)
        nodes.append(node)
        question_nodes.append(node)

    update_node = _create_updatesurvey_node(questions, survey_id, callback_url)
    nodes.append(update_node)

    edges.extend(
        _create_edges(
            start_node, decline_node_conv, decline_node_tool, end_node,
            verify_user_node, question_nodes, questions, update_node,
        )
    )
    return nodes, edges


def _create_verify_user_node(language="en"):
    if language == "es":
        prompt = "Debes obtener el nombre del usuario. Asegurate de que es {{Recipient}}. Si no, pidele que pase el telefono a {{Recipient}}."
    else:
        prompt = "You must get the name of the user. Ensure that he is indeed {{Recipient}}. If not ask them to hand over the phone to {{Recipient}}."
    return {
        "name": "verify_user",
        "type": "conversation",
        "isStart": True,
        "metadata": {"position": {"x": 100, "y": 100}},
        "prompt": prompt,
        "messagePlan": {"firstMessage": ""},
        "toolIds": [],
    }


def _create_updatesurvey_node(questions, survey_id, callback_url=""):
    import os
    if not callback_url:
        callback_url = os.getenv(
            "SURVEY_SUBMIT_URL",
            "https://itcurves.duckdns.org/pg/api/answers/qna_phone",
        )

    required_fields = ["SurveyId"]
    dynamic_properties = {
        "SurveyId": {
            "type": "string",
            "enum": "{{SurveyId}}",
            "default": "",
            "description": "",
        }
    }

    for question in questions:
        sanitized_id = _sanitize_field_name(question["id"])
        dynamic_properties[question["id"]] = {
            "type": "string",
            "default": f"{{{{answer_{sanitized_id}}}}}",
            "description": f"Answer for question {question['id']}",
        }

    return {
        "name": "apiRequesttool",
        "type": "tool",
        "metadata": {
            "position": {
                "x": 100 + (len(questions) * 150),
                "y": 350 + (len(questions) * 100),
            }
        },
        "tool": {
            "url": callback_url,
            "body": {
                "type": "object",
                "required": required_fields,
                "properties": dynamic_properties,
            },
            "name": "UpdateSurvey",
            "type": "apiRequest",
            "method": "POST",
            "function": {
                "name": "api_request_tool",
                "parameters": {"type": "object", "required": [], "properties": {}},
                "description": "API request tool",
            },
            "messages": [
                {
                    "type": "request-start",
                    "content": "Perfect! Thank you so much for your time and valuable feedback.",
                    "blocking": False,
                }
            ],
            "variableExtractionPlan": {
                "schema": {"type": "object", "required": [], "properties": {}},
                "aliases": [],
            },
        },
    }


def _create_start_node(language="en", greeting_template=None, agent_name="Cameron"):
    if greeting_template:
        prompt = greeting_template
        first_message = ""
        if "{{Recipient}}" not in greeting_template and "{Recipient}" not in greeting_template:
            if language == "es":
                first_message = f"Hola {{{{Recipient}}}}, soy {agent_name} llamando en nombre de la organizacion."
            else:
                first_message = f"Hello {{{{Recipient}}}}, this is {agent_name} calling on your behalf."
    else:
        if language == "es":
            prompt = (
                f"Eres {agent_name}, un asistente profesional de recopilacion de encuestas. "
                "Estas realizando una encuesta con {{Recipient}} sobre {{Name}} "
                "(ID de encuesta: {{SurveyId}}, ID de viaje: {{RideID}}). "
                "Comienza con: 'Estamos realizando una breve encuesta sobre la satisfaccion del cliente. "
                "Esto tomara aproximadamente 5 a 7 minutos y ayudara a mejorar nuestros productos y servicios. "
                "Estaria dispuesto a participar hoy?' "
                "Se educado, profesional y conversacional. Si aceptan, procede con las preguntas. "
                "Si rechazan explicitamente, ofrece llamar en otro momento o enviar la encuesta por correo electronico."
            )
            first_message = f"Hola {{{{Recipient}}}}, soy {agent_name} llamando en nombre de la organizacion."
        else:
            prompt = (
                f"You are {agent_name}, a professional survey collection voice assistant. "
                "You will be conducting a survey with {{Recipient}} about {{Name}} "
                "(Survey ID: {{SurveyId}}, Ride ID: {{RideID}}). "
                "Start with: 'We're conducting a brief survey about customer satisfaction. "
                "This will take approximately 5 to 7 minutes and help improve our products and services. "
                "Would you be willing to participate today?' "
                "Be polite, professional, and conversational. If they agree, proceed to the survey questions. "
                "If they decline, offer to call back at a better time or send the survey via email/text."
            )
            first_message = f"Hello {{{{Recipient}}}}, this is {agent_name} calling on behalf of the organization."

    return {
        "name": "start_conversation",
        "type": "conversation",
        "metadata": {"position": {"x": 100, "y": 350}},
        "prompt": prompt,
        "messagePlan": {"firstMessage": first_message},
        "toolIds": [],
    }


def _create_decline_node_conv(language="en", voice_cfg=None):
    if language == "es":
        prompt = (
            "El usuario no quiere participar ahora. Ofrece estas opciones:\n"
            "1. 'Podemos llamarle en otro momento? Que hora le conviene?'\n"
            "2. 'Podemos enviarle la encuesta por correo electronico para que la complete a su conveniencia?'\n"
            "Si no desean ninguna opcion, agradece y despidete amablemente."
        )
        first_message = "No hay problema. Podemos llamarle en otro momento que le convenga, o preferiria que le enviemos la encuesta por correo electronico?"
    else:
        prompt = (
            "The user does not want to participate right now. Offer these options:\n"
            "1. 'Can we give you a call back at a later time? What time works best for you?'\n"
            "2. 'Can we email or text you the survey to fill out at your convenience?'\n"
            "If they want a callback, say: 'Fantastic, we will follow up with you then. Thank you for your time!'\n"
            "If they want email/text, say: 'Great! We will send you the link. Thank you for your time and have a good rest of your day.'\n"
            "If they decline all options, say: 'No problem! Have a great day.'\n"
            "After their response, end the call politely."
        )
        first_message = "No worries at all! Can we give you a call back at a later time, or would you prefer we email you the survey to fill out at your convenience?"

    node = {
        "name": "decline_hangup_conv",
        "type": "conversation",
        "metadata": {"position": {"x": 600, "y": 600}},
        "prompt": prompt,
        "model": {"model": "gpt-4.1-mini", "provider": "openai", "maxTokens": 250, "temperature": 0},
        "globalNodePlan": {
            "enabled": True,
            "enterCondition": "The user wants to end the call for any reason, has to leave, or does not want to continue. This node is to be executed once only.",
        },
        "variableExtractionPlan": {"output": []},
        "messagePlan": {"firstMessage": first_message},
        "toolIds": [],
    }
    if voice_cfg:
        node["voice"] = voice_cfg
    else:
        node["voice"] = {"model": "aura-2", "voiceId": "luna", "provider": "deepgram"}
    return node


def _create_decline_node_tool():
    return {
        "name": "hangup",
        "type": "tool",
        "metadata": {"position": {"x": 600, "y": 1200}},
        "tool": {"type": "endCall"},
    }


def _create_end_node(questions):
    return {
        "name": "survey_complete",
        "type": "tool",
        "metadata": {"position": {"x": 100, "y": 350 + ((len(questions) + 1) * 100)}},
        "tool": {"type": "endCall"},
    }


def _create_question_node(question, index, language="en", voice_cfg=None, rider_context="", ai_augmented=False):
    question_id = question["id"]
    sanitized_id = _sanitize_field_name(question_id)
    question_text = question["text"]
    criteria = question["criteria"]
    categories = question.get("categories", [])
    scales = question.get("scales")

    if criteria == "categorical":
        prompt = _create_categorical_prompt(question_text, categories, language, rider_context, ai_augmented)
        variable_plan = {
            "output": [
                {"type": "string", "title": sanitized_id, "description": "The id of the question"},
                {"type": "string", "title": f"answer_{sanitized_id}",
                 "description": f"Extract the user's answer that best matches: {', '.join(categories or [])}"},
            ]
        }
    elif criteria == "scale":
        prompt = _create_rating_prompt(question_text, scales, language, rider_context, ai_augmented)
        variable_plan = {
            "output": [
                {"type": "string", "title": f"answer_{sanitized_id}",
                 "description": f"Extract the user's rating on a scale of 1 to {scales}"},
            ]
        }
    elif criteria == "open":
        prompt = _create_open_prompt(question_text, language, rider_context, ai_augmented)
        variable_plan = {
            "output": [
                {"type": "string", "title": f"answer_{sanitized_id}",
                 "description": "Extract the user's complete response"},
            ]
        }
    else:
        prompt = f"Ask this question conversationally: {question_text}"
        variable_plan = {
            "output": [
                {"type": "string", "title": f"answer_{sanitized_id}",
                 "description": "Extract the user's response"},
            ]
        }

    node = {
        "name": f"question_{index + 1}_{question_id}",
        "type": "conversation",
        "model": {"model": "gpt-4.1-mini", "provider": "openai", "maxTokens": 250, "temperature": 0.3},
        "metadata": {"position": {"x": 100 + (index * 150), "y": 350 + (index * 100)}},
        "prompt": prompt,
        "variableExtractionPlan": variable_plan,
        "messagePlan": {"firstMessage": ""},
        "toolIds": [],
    }
    if voice_cfg:
        node["voice"] = {**voice_cfg, "mipOptOut": True}
    else:
        node["voice"] = {"model": "aura-2", "voiceId": "luna", "provider": "deepgram", "mipOptOut": True}

    if language == "es":
        node["transcriber"] = {"model": "nova-2", "provider": "deepgram", "language": "es"}
    else:
        node["transcriber"] = {"model": "nova-2-phonecall", "provider": "deepgram"}

    return node


def _create_categorical_prompt(question_text, categories, language="en", rider_context="", ai_augmented=False):
    categories_str = ", ".join(categories or [])
    context_hint = f"\nRider context: {rider_context}" if rider_context else ""
    
    if ai_augmented:
        if language == "es":
            return (
                f"Eres Cameron - una persona real teniendo una conversación genuina, NO una IA o bot de encuesta.\n\n"
                f"Pregunta conversacionalmente: '{question_text}'\n"
                f"Opciones: {categories_str}\n\n"
                "COMPORTAMIENTO DE IA AUMENTADA:\n"
                "- Si ya respondieron esto basado en respuestas anteriores, confirma en vez de re-preguntar\n"
                "- Si su respuesta es ambigua, haz UNA pregunta de seguimiento\n"
                "- Puedes omitir esta pregunta si ya tienes la información\n"
                "- Mantén la conversación natural y personalizada\n"
                "- Si quieren terminar, respeta eso inmediatamente\n"
                f"{context_hint}"
            )
        return (
            f"You are Cameron - a real person having a genuine phone conversation, NOT an AI or survey bot.\n\n"
            f"Ask conversationally: '{question_text}'\n"
            f"Options: {categories_str}\n\n"
            "AI AUGMENTED BEHAVIOR:\n"
            "- If they already answered this based on previous responses, confirm rather than re-ask\n"
            "- If their answer is ambiguous, ask ONE clarifying question\n"
            "- You can skip this question if you already have the information\n"
            "- Keep conversation natural and personalized\n"
            "- If they want to end, respect that immediately\n"
            f"{context_hint}"
        )
    else:
        if language == "es":
            return (
                f"Haz esta pregunta de forma conversacional: '{question_text}'\n"
                "No menciones las opciones a menos que pregunten.\n"
                f"Categorias: {categories_str}\n"
                "Si quieren terminar la llamada, no insistas."
                f"{context_hint}"
            )
        return (
            f"Ask this question conversationally: '{question_text}'\n"
            f"Don't list options unless they ask. Listen and map to: {categories_str}\n"
            "If they want to end the call, respect that immediately\n"
            f"{context_hint}"
        )


def _create_rating_prompt(question_text, scales, language="en", rider_context="", ai_augmented=False):
    context_hint = f"\nRider context: {rider_context}" if rider_context else ""
    
    if ai_augmented:
        if language == "es":
            return (
                f"Eres Cameron - una persona real teniendo una conversación genuina.\n\n"
                f"Pregunta conversacionalmente: '{question_text}'\n"
                f"Escala de 1 a {scales}. No pidas un numero directamente.\n\n"
                "COMPORTAMIENTO DE IA AUMENTADA:\n"
                "- Escucha palabras descriptivas y luego infiere la calificación\n"
                "- Si ya expresaron satisfacción/insatisfacción, confirma en vez de preguntar\n"
                "- Puedes omitir si el sentimiento ya está claro\n"
                "- Mantén la conversación natural\n"
                f"{context_hint}"
            )
        return (
            f"You are Cameron - a real person having a genuine phone conversation.\n\n"
            f"Ask conversationally: '{question_text}'\n"
            f"Scale of 1 to {scales}. Don't ask for a number directly.\n\n"
            "AI AUGMENTED BEHAVIOR:\n"
            "- Listen for descriptive words and infer the rating\n"
            "- If they already expressed satisfaction/dissatisfaction, confirm rather than ask\n"
            "- You can skip if sentiment is already clear\n"
            "- Keep conversation natural\n"
            f"{context_hint}"
        )
    else:
        if language == "es":
            return (
                f"Pregunta conversacionalmente: '{question_text}'\n"
                f"Escala de 1 a {scales}. No pidas un numero directamente.\n"
                "Escucha palabras descriptivas y luego infiere la calificación.\n"
                f"{context_hint}"
            )
        return (
            f"Ask conversationally: '{question_text}'\n"
            f"Scale of 1 to {scales}. Don't ask for a number directly.\n"
            "Listen for descriptive words and infer the rating.\n"
            f"{context_hint}"
        )


def _create_open_prompt(question_text, language="en", rider_context="", ai_augmented=False):
    context_hint = f"\nRider context: {rider_context}" if rider_context else ""
    
    if ai_augmented:
        if language == "es":
            return (
                f"Eres Cameron - una persona real teniendo una conversación genuina.\n\n"
                f"Pregunta: '{question_text}'\n"
                "Pregunta abierta. Deja que respondan libremente.\n\n"
                "COMPORTAMIENTO DE IA AUMENTADA:\n"
                "- Si la respuesta es muy breve (<5 palabras), haz UNA pregunta de seguimiento\n"
                "- Si ya cubrieron este tema anteriormente, reconócelo y pregunta qué hay de nuevo\n"
                "- Máximo 1 seguimiento. Si no quieren elaborar, avanza\n"
                "- Escucha emociones, incidentes específicos y sugerencias\n"
                "- Puedes omitir si ya tienes suficiente información sobre este tema\n"
                f"{context_hint}"
            )
        return (
            f"You are Cameron - a real person having a genuine phone conversation.\n\n"
            f"Ask: '{question_text}'\n"
            "Open-ended question. Let them talk freely and capture everything.\n\n"
            "AI AUGMENTED BEHAVIOR:\n"
            "- If answer is vague (<5 words), ask ONE targeted follow-up\n"
            "- If they already covered this topic earlier, acknowledge it and ask what's new\n"
            "- Max 1 follow-up per question. If they don't want to elaborate, move on\n"
            "- Listen for emotions, specific incidents, and suggestions -- that's the gold\n"
            "- You can skip if you already have sufficient information on this topic\n"
            f"{context_hint}"
        )
    else:
        if language == "es":
            return (
                f"Pregunta: '{question_text}'\n"
                "Pregunta abierta. Deja que respondan libremente.\n"
                "Si la respuesta es muy breve (<5 palabras), haz UNA pregunta de seguimiento.\n"
                "Maximo 1 seguimiento. Si no quieren elaborar, avanza."
                f"{context_hint}"
            )
        return (
            f"Ask: '{question_text}'\n"
            "Open-ended question. Let them talk freely and capture everything.\n"
            "If answer is vague (<5 words), ask ONE targeted follow-up\n"
            "Max 1 follow-up per question. If they don't want to elaborate, move on."
            f"{context_hint}"
        )


# ─── Edge Creation ────────────────────────────────────────────────────────────

def _create_edges(start_node, decline_conv, decline_tool, end_node,
                   verify_node, question_nodes, questions, update_node):
    edges = []

    edges.append({
        "from": verify_node["name"], "to": start_node["name"],
        "condition": {"type": "ai", "prompt": "The name of the user is {{Recipient}}"},
    })

    edges.append({
        "from": start_node["name"], "to": decline_conv["name"],
        "condition": {"type": "ai", "prompt": "user wants to end the call or does not want to participate"},
    })

    edges.append({
        "from": decline_conv["name"], "to": decline_tool["name"],
        "condition": {"type": "ai", "prompt": "The user has been offered callback/email options and the conversation is complete"},
    })

    if question_nodes:
        edges.append({
            "from": start_node["name"], "to": question_nodes[0]["name"],
            "condition": {"type": "ai", "prompt": "User agreed to participate in the survey"},
        })

    sections = _group_questions_by_sections(questions)
    for section in sections:
        _create_section_edges(section, question_nodes, questions, edges, end_node, update_node)

    for i in range(len(questions) - 1):
        current_question = questions[i]
        if current_question.get("parent_id"):
            continue

        current_node = question_nodes[i]
        is_section_parent = any(
            s["type"] == "section" and s["parent_index"] == i for s in sections
        )

        if is_section_parent:
            previous_node = None
            for j in range(i - 1, -1, -1):
                if questions[j].get("parent_id"):
                    continue
                if any(s["type"] == "section" and s["parent_index"] == j for s in sections):
                    continue
                previous_node = question_nodes[j]
                break

            if previous_node:
                if not any(e["from"] == previous_node["name"] and e["to"] == current_node["name"] for e in edges):
                    edges.append({
                        "from": previous_node["name"], "to": current_node["name"],
                        "condition": {"type": "ai", "prompt": "User answered the question and we captured their response"},
                    })
        else:
            next_node = _find_next_node(i, questions, question_nodes, end_node)
            if not any(e["from"] == current_node["name"] and e["to"] == next_node["name"] for e in edges):
                edges.append({
                    "from": current_node["name"], "to": next_node["name"],
                    "condition": {"type": "ai", "prompt": "User answered the question and we captured their response"},
                })

    _add_final_to_update_edge(edges, question_nodes, questions, update_node, end_node)

    edges.append({
        "from": update_node["name"], "to": end_node["name"],
        "condition": {"type": "ai", "prompt": "API request completed successfully"},
    })

    return edges


def _group_questions_by_sections(questions):
    sections = []
    processed = set()

    for i, question in enumerate(questions):
        if question["id"] in processed:
            continue
        if not question.get("parent_id"):
            children = [q for q in questions if q.get("parent_id") == question["id"]]
            if children:
                children_by_cat = {}
                for child in children:
                    key = tuple(child.get("parent_category_texts", []))
                    children_by_cat.setdefault(key, []).append(child)

                for cat_key, cat_children in children_by_cat.items():
                    sorted_children = sorted(cat_children, key=lambda x: x.get("order", 0))
                    sections.append({
                        "type": "section",
                        "parent": question,
                        "parent_index": i,
                        "trigger_categories": list(cat_key),
                        "children": sorted_children,
                        "children_indices": [questions.index(c) for c in sorted_children],
                    })

                processed.add(question["id"])
                for child in children:
                    processed.add(child["id"])
            else:
                sections.append({"type": "regular", "question": question, "index": i})
                processed.add(question["id"])
    return sections


def _create_section_edges(section, question_nodes, questions, edges, end_node, update_node):
    if section["type"] == "regular":
        idx = section["index"]
        current = question_nodes[idx]
        next_node = _find_next_node(idx, questions, question_nodes, end_node)
        edges.append({
            "from": current["name"], "to": next_node["name"],
            "condition": {"type": "ai", "prompt": "User answered the question and we captured their response"},
        })
    elif section["type"] == "section":
        parent_idx = section["parent_index"]
        parent_node = question_nodes[parent_idx]
        children_indices = section["children_indices"]
        trigger = section.get("trigger_categories", [])
        parent_cats = section["parent"].get("categories", [])
        skip_cats = [c for c in parent_cats if c not in trigger]

        if not children_indices:
            return

        edges.append({
            "from": parent_node["name"], "to": question_nodes[children_indices[0]]["name"],
            "condition": {"type": "ai", "prompt": f"User's answer matches: {', '.join(trigger)}"},
        })

        for j in range(len(children_indices) - 1):
            edges.append({
                "from": question_nodes[children_indices[j]]["name"],
                "to": question_nodes[children_indices[j + 1]]["name"],
                "condition": {"type": "ai", "prompt": "User answered the question and we captured their response"},
            })

        last_child = question_nodes[children_indices[-1]]
        next_node = _find_next_after_section(section, questions, question_nodes, end_node)
        edges.append({
            "from": last_child["name"], "to": next_node["name"],
            "condition": {"type": "ai", "prompt": "User answered the question and we captured their response"},
        })

        if skip_cats:
            edges.append({
                "from": parent_node["name"], "to": next_node["name"],
                "condition": {"type": "ai", "prompt": f"User's answer matches: {', '.join(skip_cats)}"},
            })


def _find_next_node(idx, questions, question_nodes, end_node):
    current_id = questions[idx]["id"]
    for i in range(idx + 1, len(questions)):
        nq = questions[i]
        if nq.get("parent_id") == current_id or nq.get("parent_id"):
            continue
        return question_nodes[i]
    return end_node


def _find_next_after_section(section, questions, question_nodes, end_node):
    if section["type"] == "section":
        max_idx = max([section["parent_index"]] + section["children_indices"])
    else:
        max_idx = section["index"]
    for i in range(max_idx + 1, len(questions)):
        if not questions[i].get("parent_id"):
            return question_nodes[i]
    return end_node


def _add_final_to_update_edge(edges, question_nodes, questions, update_node, end_node):
    for i, question in enumerate(questions):
        is_final = False
        sections = _group_questions_by_sections(questions)
        is_parent = any(s["type"] == "section" and s["parent_index"] == i for s in sections)

        if is_parent:
            section = next((s for s in sections if s["type"] == "section" and s["parent_index"] == i), None)
            if section:
                parent_cats = section["parent"].get("categories", [])
                trigger = section.get("trigger_categories", [])
                skip_cats = [c for c in parent_cats if c not in trigger]
                for edge in edges:
                    if (edge.get("from") == question_nodes[i]["name"] and skip_cats and
                            edge.get("to") == end_node["name"]):
                        is_final = True
                        break
        else:
            next_node = _find_next_node(i, questions, question_nodes, end_node)
            is_final = next_node == end_node

        if is_final:
            if not any(e["from"] == question_nodes[i]["name"] and e["to"] == update_node["name"] for e in edges):
                edges.append({
                    "from": question_nodes[i]["name"], "to": update_node["name"],
                    "condition": {"type": "ai", "prompt": "User answered the question and we captured their response"},
                })
                edges[:] = [
                    e for e in edges
                    if not (e.get("from") == question_nodes[i]["name"] and e.get("to") == end_node["name"]
                            and e.get("condition", {}).get("prompt") == "User answered the question and we captured their response")
                ]

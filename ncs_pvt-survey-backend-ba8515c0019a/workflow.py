"""
Universal VAPI Survey Workflow Generator

This module automatically generates VAPI workflows for any survey structure,
handling categorical, rating, and open-ended questions with conditional logic.
"""

import logging
import os
from typing import Any, Dict, List, Optional

import requests

logger = logging.getLogger(__name__)


class VAPISurveyWorkflowGenerator:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.vapi.ai"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

    def _sanitize_field_name(self, field_name: str) -> str:
        """Sanitize field names to contain only letters, numbers, and underscores"""
        # Replace hyphens and other special characters with underscores
        sanitized = field_name.replace("-", "_").replace(" ", "_").replace(".", "_")
        # Remove any other non-alphanumeric characters except underscores
        import re

        sanitized = re.sub(r"[^a-zA-Z0-9_]", "_", sanitized)
        # Ensure it doesn't start with a number
        # if sanitized and sanitized[0].isdigit():
        #     sanitized = f"q_{sanitized}"
        return f"q_{sanitized}"

    def generate_workflow_from_survey(
        self, survey_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate a complete VAPI workflow from survey data"""

        survey_id = survey_data["SurveyId"]
        questions = survey_data["Questions"]

        # Sort questions by order
        questions.sort(key=lambda q: q.get("order", 0))

        # Modify categories for section parents to remove 'None of the above'
        for question in questions:
            if question.get("criteria") == "categorical" and question.get("categories"):
                # Check if this question has children (i.e., it's a section parent)
                has_children = any(
                    q.get("parent_id") == question["id"] for q in questions
                )
                if has_children and "None of the above" in question["categories"]:
                    question["categories"].remove("None of the above")

        # Generate workflow configuration
        workflow = {
            "backgroundSound": "office",
            "model": {"provider": "openai", "model": "gpt-4.1"},
            "name": f"Survey {survey_id}",
            "nodes": [],
            "edges": [],
            "voice": {"model": "aura-2", "voiceId": "thalia", "provider": "deepgram"},
            "transcriber": {"provider": "deepgram"},
            # "voice": {
            #     "model": "eleven_turbo_v2_5",
            #     "voiceId": "sarah",
            #     "language": "en",
            #     "provider": "11labs",
            # },
            # "transcriber": {
            #     "model": "scribe_v1",
            #     "language": "en",
            #     "provider": "11labs",
            # },
            "globalPrompt": "For every response of the user to a question, respond with a brief phrase that matches the user's response before proceeding to the next question. If the user's response is positive, appreciate the positive feedback. If the user's response is negative, respond with an apologetic tone. If the user's response is neutral, acknowledge the response without any strong emotion. Do not attempt to remediate the user's response, just acknowledge it. You must not try to repeat the response of the user or phrases from it.",
        }

        # Create nodes and edges
        nodes, edges = self._create_nodes_and_edges(questions, survey_id)
        workflow["nodes"] = nodes
        workflow["edges"] = edges

        return workflow

    def _create_nodes_and_edges(self, questions: List[Dict], survey_id: str) -> tuple:
        """Create nodes and edges based on questions"""

        nodes = []
        edges = []

        # 1. Create initial conversation node
        start_node = self._create_start_node()
        nodes.append(start_node)

        # 2a. Create decline hangup node (conversation)
        decline_node_conv = self._create_decline_node_conv()
        nodes.append(decline_node_conv)

        # 2b. Create decline hangup node (tool)
        decline_node_tool = self._create_decline_node_tool()
        nodes.append(decline_node_tool)

        # 3. Create end survey hangup node
        end_node = self._create_end_node(questions)
        nodes.append(end_node)

        # 4. Create ask to continue node
        ask_to_continue_node = self._create_ask_to_continue_node()
        nodes.append(ask_to_continue_node)

        # 5. Create question nodes
        question_nodes = []
        for i, question in enumerate(questions):
            node = self._create_question_node(question, i)
            nodes.append(node)
            question_nodes.append(node)

        # 5. Create update survey node (pass questions here)
        update_node = self._create_updatesurvey_node(questions, survey_id)
        nodes.append(update_node)

        # 6. Create edges
        edges.extend(
            self._create_edges(
                start_node,
                decline_node_conv,
                decline_node_tool,
                end_node,
                ask_to_continue_node,
                question_nodes,
                questions,
                update_node,
            )
        )

        return nodes, edges

    def _create_ask_to_continue_node(self) -> Dict:
        """Create ask to continue node"""
        return {
            "name": "ask_to_continue",
            "type": "conversation",
            "metadata": {"position": {"x": 100, "y": 350}},
            "prompt": "You are Cameron, a professional survey collection voice assistant for IT Curves. You will be conducting a survey with {{Recipient}} about {{Name}} (Survey ID: {{SurveyId}}, Ride ID: {{RideID}}).If they agree, proceed to the survey questions. If they explicitly refuse, proceed to end the call",
            "messagePlan": {
                "firstMessage": "Hi {{Recipient}}. We're conducting a brief survey about customer satisfaction. This will take approximately 5 to 7 minutes and help improve our products and services. Would you be willing to participate today?"
            },
            "toolIds": [],
        }

    def _create_updatesurvey_node(self, questions: List[Dict], survey_id: str) -> Dict:
        """Create update survey node with unrolled question-answer pairs"""

        # Build the dynamic properties and required array
        required_fields = ["SurveyId"]
        dynamic_properties = {
            "SurveyId": {
                "type": "string",
                "enum": "{{SurveyId}}",
                "default": "",
                "description": "",
            }
        }

        # Add each question as a direct property
        for question in questions:
            sanitized_id = self._sanitize_field_name(question["id"])
            # required_fields.append(sanitized_id)
            dynamic_properties[question["id"]] = {
                "type": "string",
                "default": f"{{{{answer_{sanitized_id}}}}}",
                "description": f"Answer for question {question['id']}",
            }
            dynamic_properties[f"r_{question['id']}"] = {
                "type": "string",
                "default": f"{{{{raw_answer_{sanitized_id}}}}}",
                "description": f"Raw answer for question {question['id']}",
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
                "url": "https://itcurves.duckdns.org/pg/api/answers/qna_phone",
                # "url": f"https://composed-daily-gnat.ngrok-free.app/pg/api/answers/qna_phone",
                "body": {
                    "type": "object",
                    "required": required_fields,
                    "properties": dynamic_properties,
                },
                # ... rest of the method remains the same
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

    def _create_start_node(self) -> Dict:
        """Create the initial conversation node"""

        return {
            "name": "start_conversation",
            "isStart": True,
            "type": "conversation",
            "metadata": {"position": {"x": 100, "y": 100}},
            "prompt": "You will only speak with {{Recipient}}. If the user is not {{Recipient}}, ask them to hand over the phone to {{Recipient}}. If the user says {{Recipient}} is not available, end the call. Give a brief pause before speaking your first sentence",
            "messagePlan": {
                "firstMessage": "Hello, this is Cameron, a digital AI Agent calling on behalf of IT Curves. Am I speaking with {{Recipient}}?"
            },
            "toolIds": [],
        }

    def _create_decline_node_conv(self) -> Dict:
        """Create hangup node for when user declines"""
        return {
            "name": "decline_hangup_conv",
            "type": "conversation",
            "metadata": {"position": {"x": 600, "y": 600}},
            "prompt": "Your goal is to inform the user that the survey will be conducted later. You will simply state your default message and nothing else. You will immediately end the call.",
            "model": {
                "model": "gpt-4o",
                "provider": "openai",
                "maxTokens": 250,
                "temperature": 0,
            },
            "voice": {"model": "aura-2", "voiceId": "thalia", "provider": "deepgram"},
            "globalNodePlan": {
                "enabled": True,
                "enterCondition": "The user explicitly asks to end the call, has to leave, or does not have time. This node is to be executed once only.",
            },
            "variableExtractionPlan": {"output": []},
            "messagePlan": {
                "firstMessage": "No worries. This survey will be conducted at a later time. Have a great day"
            },
            "toolIds": [],
        }

    def _create_decline_node_tool(self) -> Dict:
        """Create hangup node for when user declines"""
        return {
            "name": "hangup",
            "type": "tool",
            "metadata": {"position": {"x": 600, "y": 1200}},
            "tool": {
                "type": "endCall",
            },
        }

    def _create_end_node(self, questions: List[Dict]) -> Dict:
        """Create hangup node for survey completion"""
        return {
            "name": "survey_complete",
            "type": "tool",
            "metadata": {
                "position": {
                    "x": 100,
                    "y": 350 + ((len(questions) + 1) * 100),
                }
            },
            "tool": {"type": "endCall"},
        }

    def _create_question_node(self, question: Dict, index: int) -> Dict:
        """Create a conversation node for a question"""

        question_id = question["id"]
        sanitized_id = self._sanitize_field_name(question_id)
        question_text = question["text"]
        criteria = question["criteria"]
        categories = question.get("categories", [])
        scales = question.get("scales")

        # Generate appropriate prompt based on question type
        if criteria == "categorical":
            prompt = self._create_categorical_prompt(question_text, categories)
            variable_plan = {
                "output": [
                    {
                        "type": "string",
                        "title": f"answer_{sanitized_id}",
                        "description": f"Extract the user's answer that best matches one of these categories: {', '.join(categories)}",
                    },
                    {
                        "type": "string",
                        "title": f"raw_answer_{sanitized_id}",
                        "description": "Extract the user's raw response to this question as it is",
                    },
                ]
            }
        elif criteria == "scale":
            prompt = self._create_rating_prompt(question_text, scales)
            variable_plan = {
                "output": [
                    {
                        "type": "string",
                        "title": f"answer_{sanitized_id}",
                        "description": f"Extract or infer the user's rating on a scale of 1 to {scales}",
                    },
                    {
                        "type": "string",
                        "title": f"raw_answer_{sanitized_id}",
                        "description": "Extract the user's raw response to this question as it is",
                    },
                ]
            }
        elif criteria == "open":
            prompt = self._create_open_prompt(question_text)
            variable_plan = {
                "output": [
                    {
                        "type": "string",
                        "title": f"answer_{sanitized_id}",
                        "description": "Extract the user's complete response to this open-ended question",
                    },
                    {
                        "type": "string",
                        "title": f"raw_answer_{sanitized_id}",
                        "description": "Extract the user's complete response to this open-ended question",
                    },
                ]
            }
        else:
            prompt = f"Ask this question in a conversational way: {question_text}"
            variable_plan = {
                "output": [
                    {
                        "type": "string",
                        "title": f"answer_{sanitized_id}",
                        "description": "Extract the user's response",
                    },
                    {
                        "type": "string",
                        "title": f"raw_answer_{sanitized_id}",
                        "description": "Extract the user's raw response to this question as it is",
                    },
                ]
            }

        return {
            "name": f"question_{index + 1}_{question_id}",
            "type": "conversation",
            "model": {
                "model": "gpt-4o",
                "provider": "openai",
                "maxTokens": 250,
                "temperature": 0.0,
            },
            "voice": {
                "model": "aura-2",
                "voiceId": "thalia",
                "provider": "deepgram",
                "mipOptOut": True,
            },
            "transcriber": {
                "model": "nova-3",
                # "model": "nova-2-phonecall",
                "provider": "deepgram",
            },
            # "voice": {
            #     "model": "eleven_turbo_v2_5",
            #     "voiceId": "sarah",
            #     "language": "en",
            #     "provider": "11labs",
            # },
            # "transcriber": {
            #     "model": "scribe_v1",
            #     "language": "en",
            #     "provider": "11labs",
            # },
            "metadata": {
                "position": {"x": 100 + (index * 150), "y": 350 + (index * 100)}
            },
            "prompt": prompt,
            "variableExtractionPlan": variable_plan,
            "messagePlan": {"firstMessage": ""},
            "toolIds": [],
        }

    def _create_categorical_prompt(
        self, question_text: str, categories: List[str]
    ) -> str:
        """Create prompt for categorical questions"""
        categories_str = ", ".join(categories)

        prompt = (
            f"Ask this question in a natural, conversational way: `{question_text}` "
            "Don't mention the specific options to the user unless they ask. "
            f"Instead, listen to their response and determine which category it best fits: "
            f"Available categories: {categories_str}. "
            "If their answer doesn't clearly fit any category, ask follow-up questions to clarify. "
            "Be conversational and helpful in guiding them to provide a clear answer. "
            "After the user gives a response, respond with a brief phrase that matches the user's response before proceeding to the next question. If the user's response is positive, appreciate the positive feedback. If the user's response is negative, respond with an apologetic tone. If the user's response is neutral, acknowledge the response without any strong emotion. Do not attempt to remediate the user's response, just acknowledge it. You must not try to repeat the response of the user or phrases from it."
            "If they want to end the call or not proceed with the survey any further for any reason, do not question them further. "
            "If the user asks for more information, use speciifc, relevant parts of the following facts to address his queries. 1) This survey is being conducted on behalf of IT Curves 2) This is for the Ride with ID {{RideID}}. 3) The goal of the survey is to improve the products and services based on user feedback."
        )
        return prompt

    def _create_rating_prompt(self, question_text: str, scales: int) -> str:
        """Create prompt for rating/scale questions"""

        prompt = (
            f"Ask this question in a natural, conversational way: `{question_text}` "
            f"This is a rating question with a scale of 1 to {scales}. Don't ask for a specific number initially. "
            f"Based on their response, infer the appropriate rating on the 1-{scales} scale. "
            "Only ask for a specific number if you can't determine the rating from their conversational response. "
            "After the user gives a response, respond with a brief phrase that matches the user's response before proceeding to the next question. If the user's response is positive, appreciate the positive feedback. If the user's response is negative, respond with an apologetic tone. If the user's response is neutral, acknowledge the response without any strong emotion. Do not attempt to remediate the user's response, just acknowledge it. You must not try to repeat the response of the user or phrases from it."
            "If they want to end the call or not proceed with the survey any further for any reason, do not question them further. "
            "If the user asks for more information, use speciifc, relevant parts of the following facts to address his queries. 1) This survey is being conducted on behalf of IT Curves 2) This is for the Ride with ID {{RideID}}. 3) The goal of the survey is to improve the products and services based on user feedback."
        )
        return prompt

    def _create_open_prompt(self, question_text: str) -> str:
        """Create prompt for open-ended questions"""

        prompt = (
            f"Ask this question in a natural, conversational way: `{question_text}` "
            "This is an open-ended question. Let the user respond freely and capture their complete response. "
            "After the user gives a response, respond with a brief phrase that matches the user's response before proceeding to the next question. If the user's response is positive, appreciate the positive feedback. If the user's response is negative, respond with an apologetic tone. If the user's response is neutral, acknowledge the response without any strong emotion. Do not attempt to remediate the user's response, just acknowledge it. You must not try to repeat the response of the user or phrases from it."
            "If they want to end the call or not proceed with the survey any further for any reason, do not question them further. "
            "If the user asks for more information, use speciifc, relevant parts of the following facts to address his queries. 1) This survey is being conducted on behalf of IT Curves 2) This is for the Ride with ID {{RideID}}. 3) The goal of the survey is to improve the products and services based on user feedback."
        )
        return prompt

    def _create_edges(
        self,
        start_node: Dict,
        decline_node_conv: Dict,
        decline_node_tool: Dict,
        end_node: Dict,
        ask_to_continue_node: Dict,
        question_nodes: List[Dict],
        questions: List[Dict],
        update_node: Dict,
    ) -> List[Dict]:
        """Create edges connecting the nodes with proper section handling"""

        edges = []

        # Edge from verify user node to start node
        edges.append(
            {
                "from": start_node["name"],
                "to": ask_to_continue_node["name"],
                "condition": {
                    "type": "ai",
                    "prompt": "The name of the user is {{Recipient}}",
                },
            }
        )

        # Edge from start to decline conv
        edges.append(
            {
                "from": ask_to_continue_node["name"],
                "to": decline_node_conv["name"],
                "condition": {
                    "type": "ai",
                    "prompt": "user wants to end the call or does not want to participate in the survey",
                },
            }
        )

        # Edge from decline conv to decline tool
        edges.append(
            {
                "from": decline_node_conv["name"],
                "to": decline_node_tool["name"],
                "condition": {
                    "type": "ai",
                    "prompt": "the user has been informed that this survey will be conducted later",
                },
            }
        )

        # Edge from verify user node to first question
        if question_nodes:
            edges.append(
                {
                    "from": ask_to_continue_node["name"],
                    "to": question_nodes[0]["name"],
                    "condition": {
                        "type": "ai",
                        "prompt": "User agreed to participate in the survey",
                    },
                }
            )

        # Group questions by sections
        sections = self._group_questions_by_sections(questions)

        # Create edges for each section, but ensure proper sequential flow
        section_parent_indices = set()
        for section in sections:
            if section["type"] == "section":
                section_parent_indices.add(section["parent_index"])
            self._create_section_edges(
                section, question_nodes, questions, edges, end_node, update_node
            )

        # Handle questions that are not part of any section (sequential questions)
        for i in range(len(questions) - 1):
            current_question = questions[i]

            # Skip if this question is a child of another question (will be handled by section logic)
            if current_question.get("parent_id"):
                continue

            current_node = question_nodes[i]

            # Check if this question is a section parent
            is_section_parent = any(
                section["type"] == "section" and section["parent_index"] == i
                for section in sections
            )

            if is_section_parent:
                # This is a section parent - its edges will be handled by section logic
                # But we need to ensure something connects TO this parent

                # Find what should connect to this parent question
                previous_question_node = None
                for j in range(i - 1, -1, -1):
                    prev_q = questions[j]
                    # Skip child questions
                    if prev_q.get("parent_id"):
                        continue
                    # Skip other section parents (they should have their own routing)
                    prev_is_section_parent = any(
                        s["type"] == "section" and s["parent_index"] == j
                        for s in sections
                    )
                    if prev_is_section_parent:
                        continue
                    # This is a regular question that should connect to our parent
                    previous_question_node = question_nodes[j]
                    break

                if previous_question_node:
                    # Add edge from previous regular question to this parent
                    edge_exists = any(
                        edge.get("from") == previous_question_node["name"]
                        and edge.get("to") == current_node["name"]
                        for edge in edges
                    )

                    if not edge_exists:
                        edges.append(
                            {
                                "from": previous_question_node["name"],
                                "to": current_node["name"],
                                "condition": {
                                    "type": "ai",
                                    "prompt": "User answered the question and we captured their response",
                                },
                            }
                        )
            else:
                # This is a regular question - connect to next appropriate question
                next_node = self._find_next_node_after_question(
                    i, questions, question_nodes, end_node
                )

                # Only add edge if we're not duplicating section logic
                edge_exists = any(
                    edge.get("from") == current_node["name"]
                    and edge.get("to") == next_node["name"]
                    for edge in edges
                )

                if not edge_exists:
                    edges.append(
                        {
                            "from": current_node["name"],
                            "to": next_node["name"],
                            "condition": {
                                "type": "ai",
                                "prompt": "User answered the question and we captured their response",
                            },
                        }
                    )

        # Ensure the final question connects to the API request (update survey) node
        self._add_final_question_to_update_edge(
            edges, question_nodes, questions, update_node, end_node
        )

        # Ensure the API request node connects to survey_complete
        edges.append(
            {
                "from": update_node["name"],
                "to": end_node["name"],
                "condition": {
                    "type": "ai",
                    "prompt": "API request completed successfully",
                },
            }
        )

        return edges

    def _group_questions_by_sections(self, questions: List[Dict]) -> List[Dict]:
        """Group questions into sections based on parent-child relationships"""
        sections = []
        processed_questions = set()

        for i, question in enumerate(questions):
            if question["id"] in processed_questions:
                continue

            if not question.get("parent_id"):  # This is a main question
                # Check if this question has children
                children = [
                    q for q in questions if q.get("parent_id") == question["id"]
                ]

                if children:
                    # Group children by their parent_category_texts (conditional paths)
                    children_by_category = {}
                    for child in children:
                        category_key = tuple(child.get("parent_category_texts", []))
                        if category_key not in children_by_category:
                            children_by_category[category_key] = []
                        children_by_category[category_key].append(child)

                    # Create separate sections for each conditional path
                    for category_key, category_children in children_by_category.items():
                        section = {
                            "type": "section",
                            "parent": question,
                            "parent_index": i,
                            "trigger_categories": list(category_key),
                            "children": sorted(
                                category_children, key=lambda x: x.get("order", 0)
                            ),
                            "children_indices": [
                                questions.index(child)
                                for child in sorted(
                                    category_children, key=lambda x: x.get("order", 0)
                                )
                            ],
                        }
                        sections.append(section)

                    # Mark all children as processed
                    processed_questions.add(question["id"])
                    for child in children:
                        processed_questions.add(child["id"])
                else:
                    # This is a regular question
                    section = {"type": "regular", "question": question, "index": i}
                    processed_questions.add(question["id"])
                    sections.append(section)

        return sections

    def _create_section_edges(
        self,
        section: Dict,
        question_nodes: List[Dict],
        questions: List[Dict],
        edges: List[Dict],
        end_node: Dict,
        update_node: Dict,
    ):
        """Create edges for a specific section"""

        if section["type"] == "regular":
            # Regular question - simple sequential edge
            question_index = section["index"]
            current_node = question_nodes[question_index]

            # Find next section or end
            next_node = self._find_next_node_after_question(
                question_index, questions, question_nodes, end_node
            )

            edges.append(
                {
                    "from": current_node["name"],
                    "to": next_node["name"],
                    "condition": {
                        "type": "ai",
                        "prompt": "User answered the question and we captured their response",
                    },
                }
            )

            # NOTE: Parallel edges to update_node are removed - only the final question should connect to update_node

        elif section["type"] == "section":
            # Section with parent and children
            parent_question = section["parent"]
            parent_index = section["parent_index"]
            parent_node = question_nodes[parent_index]
            children = section["children"]
            children_indices = section["children_indices"]
            trigger_categories = section.get("trigger_categories", [])

            if not children:
                return

            # Get all categories from parent question to determine skip conditions
            parent_categories = parent_question.get("categories", [])
            skip_categories = [
                cat for cat in parent_categories if cat not in trigger_categories
            ]

            # Edge from parent to first child (when trigger condition is met)
            first_child_node = question_nodes[children_indices[0]]
            edges.append(
                {
                    "from": parent_node["name"],
                    "to": first_child_node["name"],
                    "condition": {
                        "type": "ai",
                        "prompt": f"User's answer matches one of these categories: {', '.join(trigger_categories)}",
                    },
                }
            )

            # Linear edges between children questions
            for i in range(len(children) - 1):
                current_child_node = question_nodes[children_indices[i]]
                next_child_node = question_nodes[children_indices[i + 1]]

                edges.append(
                    {
                        "from": current_child_node["name"],
                        "to": next_child_node["name"],
                        "condition": {
                            "type": "ai",
                            "prompt": "User answered the question and we captured their response",
                        },
                    }
                )

            # Edge from last child to next main question/end
            last_child_node = question_nodes[children_indices[-1]]
            next_node = self._find_next_node_after_section(
                section, questions, question_nodes, end_node
            )

            edges.append(
                {
                    "from": last_child_node["name"],
                    "to": next_node["name"],
                    "condition": {
                        "type": "ai",
                        "prompt": "User answered the question and we captured their response",
                    },
                }
            )

            # NOTE: Parallel edges to update_node are removed - only the final question should connect to update_node

            # Edge from parent to skip children (when skip condition is met)
            if skip_categories:
                edges.append(
                    {
                        "from": parent_node["name"],
                        "to": next_node["name"],
                        "condition": {
                            "type": "ai",
                            "prompt": f"User's answer matches one of these categories: {', '.join(skip_categories)}",
                        },
                    }
                )

    def _find_next_node_after_question(
        self,
        question_index: int,
        questions: List[Dict],
        question_nodes: List[Dict],
        end_node: Dict,
    ) -> Dict:
        """Find the next node after a regular question"""
        current_question_id = questions[question_index]["id"]

        # First, check if the immediate next question is a parent with children
        # If so, we should skip to the question after that parent
        for i in range(question_index + 1, len(questions)):
            next_question = questions[i]

            # Skip if this is a child of the current question (will be handled by section logic)
            if next_question.get("parent_id") == current_question_id:
                continue

            # Skip if this is a child of any other question (will be handled by section logic)
            if next_question.get("parent_id"):
                continue

            # Check if this question has children (is a section parent)
            has_children = any(
                q.get("parent_id") == next_question["id"] for q in questions
            )

            if has_children:
                # This is a parent question - check if there's a non-parent question before it
                for j in range(question_index + 1, i):
                    intermediate_question = questions[j]
                    # Skip child questions
                    if intermediate_question.get("parent_id"):
                        continue
                    # This is a non-parent question that should come first
                    return question_nodes[j]
                # No intermediate question, so go to this parent
                return question_nodes[i]
            else:
                # This is a regular question
                return question_nodes[i]

        return end_node

    def _find_next_node_after_section(
        self,
        section: Dict,
        questions: List[Dict],
        question_nodes: List[Dict],
        end_node: Dict,
    ) -> Dict:
        """Find the next node after a complete section"""
        # Find the highest index among all questions in this section
        if section["type"] == "section":
            all_indices = [section["parent_index"]] + section["children_indices"]
            max_index = max(all_indices)
        else:
            max_index = section["index"]

        # Look for the next main question after this section
        for i in range(max_index + 1, len(questions)):
            if not questions[i].get("parent_id"):  # This is a main question
                return question_nodes[i]
        return end_node

    def _add_final_question_to_update_edge(
        self,
        edges: List[Dict],
        question_nodes: List[Dict],
        questions: List[Dict],
        update_node: Dict,
        end_node: Dict,
    ) -> None:
        """Find all questions that connect to end_node and redirect them to connect to update_node instead"""
        for i, question in enumerate(questions):
            is_final_question = False
            next_node = None

            # Check if this question is a section parent
            sections = self._group_questions_by_sections(questions)
            is_section_parent = any(
                section["type"] == "section" and section["parent_index"] == i
                for section in sections
            )

            if is_section_parent:
                # For section parents, check if they have skip conditions
                section = next(
                    (
                        s
                        for s in sections
                        if s["type"] == "section" and s["parent_index"] == i
                    ),
                    None,
                )
                if section:
                    parent_categories = section["parent"].get("categories", [])
                    trigger_categories = section.get("trigger_categories", [])
                    skip_categories = [
                        cat
                        for cat in parent_categories
                        if cat not in trigger_categories
                    ]

                    # If section parent has skip logic that goes to end_node, it's a final question
                    for edge in edges:
                        if (
                            edge.get("from") == question_nodes[i]["name"]
                            and skip_categories
                            and edge.get("condition", {})
                            .get("prompt", "")
                            .startswith(
                                f"User's answer matches one of these categories: {', '.join(skip_categories)}"
                            )
                        ):
                            if edge.get("to") == end_node["name"]:
                                is_final_question = True
                                break
            else:
                # For regular questions, check what next node they lead to
                next_node = self._find_next_node_after_question(
                    i, questions, question_nodes, end_node
                )
                is_final_question = next_node == end_node

            if is_final_question:
                # Check if we already have an edge from this question to update_node
                existing_edge = any(
                    edge.get("from") == question_nodes[i]["name"]
                    and edge.get("to") == update_node["name"]
                    for edge in edges
                )

                if not existing_edge:
                    edges.append(
                        {
                            "from": question_nodes[i]["name"],
                            "to": update_node["name"],
                            "condition": {
                                "type": "ai",
                                "prompt": "User answered the question and we captured their response",
                            },
                        }
                    )

                    # Remove the original edge to end_node to avoid parallel paths
                    edges[:] = [
                        edge
                        for edge in edges
                        if not (
                            edge.get("from") == question_nodes[i]["name"]
                            and edge.get("to") == end_node["name"]
                            and edge.get("condition", {}).get("prompt")
                            == "User answered the question and we captured their response"
                        )
                    ]

    def create_workflow(self, workflow_config: Dict[str, Any]) -> Optional[str]:
        """Create workflow on VAPI and return workflow ID"""

        try:
            response = requests.post(
                f"{self.base_url}/workflow", headers=self.headers, json=workflow_config
            )

            if response.status_code == 201:
                workflow_data = response.json()
                logger.info(
                    f"✅ Workflow created successfully with ID: {workflow_data.get('id')}"
                )
                return workflow_data.get("id")
            else:
                logger.warning(
                    f"❌ Failed to create workflow: Status {response.status_code}"
                )
                logger.warning(f"Response: {response.text}")
                return None

        except Exception as e:
            logger.warning(f"❌ Exception during workflow creation: {e}")
            return None

    def create_call_with_survey(
        self,
        survey_data: Dict,
        recipient_info: Dict,
        phone_number_id: str,
        customer_phone: str,
    ) -> Optional[str]:
        """Complete flow: Create workflow from survey and make call"""

        # 1. Generate workflow configuration
        workflow_config = self.generate_workflow_from_survey(survey_data)

        # 2. Create workflow on VAPI
        workflow_id = self.create_workflow(workflow_config)

        if not workflow_id:
            return None

        # 3. Prepare workflow variables
        workflow_variables = {
            "SurveyId": survey_data["SurveyId"],
            "Recipient": recipient_info.get("Recipient", "Customer"),
            "Name": recipient_info.get("Name", "Survey"),
            "RideID": recipient_info.get("RideID", "N/A"),
        }

        # 4. Create call
        call_response = requests.post(
            f"{self.base_url}/call",
            headers=self.headers,
            json={
                "workflowId": workflow_id,
                "phoneNumberId": phone_number_id,
                "workflowOverrides": {"variableValues": workflow_variables},
                "customer": {"number": customer_phone},
            },
        )

        if call_response.status_code == 201:
            call_data = call_response.json()
            return call_data.get("id")
        else:
            return None


async def fetch_survey_data(survey_id):
    """Fetch survey data from the API"""
    from routes.surveys import get_survey_questions_unanswered

    survey_questions = await get_survey_questions_unanswered(survey_id)
    if survey_questions:
        logger.info(
            f"✅ Successfully fetched survey with {len(survey_questions.get('Questions', []))} questions"
        )
        return survey_questions
    else:
        logger.warning("❌ Failed to fetch survey data. Cannot create workflow.")
        return None


async def create_workflow_only(survey_id):
    """Create just the workflow without making a call - fetching survey data from API"""

    API_KEY = os.getenv("VAPI_API_KEY")

    # Fetch survey data from API
    complex_survey_data = await fetch_survey_data(survey_id)

    if not complex_survey_data:
        logger.warning("❌ Failed to fetch survey data. Cannot create workflow.")
        return None

    generator = VAPISurveyWorkflowGenerator(API_KEY)

    logger.info("🔧 Creating Complex Workflow with Dynamic Survey Data...")
    logger.info(f"Survey ID: {complex_survey_data['SurveyId']}")
    logger.info(f"Total Questions: {len(complex_survey_data['Questions'])}")

    # Analyze the survey structure
    logger.info("📊 Survey Structure Analysis:")
    universal_questions = []
    section_questions = {}

    for q in complex_survey_data["Questions"]:
        if q["parent_id"] is None:
            universal_questions.append(q["id"])
        elif q.get("parent_category_texts"):
            for category in q["parent_category_texts"]:
                if category not in section_questions:
                    section_questions[category] = []
                section_questions[category].append(q["id"])

    logger.info(f"  • Universal Questions: {len(universal_questions)}")
    for section, questions in section_questions.items():
        logger.info(f"  • {section} Section: {len(questions)} questions")

    # Generate workflow configuration
    logger.info("⚙️ Generating workflow configuration...")
    workflow_config = generator.generate_workflow_from_survey(complex_survey_data)

    # Debug: Check the edges in the workflow configuration
    logger.info(
        f"\n🔍 Debug - Workflow Edges ({len(workflow_config.get('edges', []))} total):"
    )
    edges = workflow_config.get("edges", [])
    for i, edge in enumerate(edges):
        logger.info(f"  {i + 1}. {edge.get('from')} → {edge.get('to')}")

    # Check the flow structure
    logger.info("\n🎯 Survey Flow Analysis:")
    logger.info("  Start → Q1 → Q2 (conditional routing)")
    logger.info("  Q2 → Transportation section OR Customer Support section OR Q13+")

    # Check what questions are connected
    question_nodes = [edge.get("from") for edge in edges] + [
        edge.get("to") for edge in edges
    ]
    question_nodes = list(
        set([node for node in question_nodes if node and node.startswith("q")])
    )
    question_nodes.sort()
    logger.info(f"\n📋 All question nodes found: {question_nodes}")

    logger.info("\n" + "=" * 50)

    # Create the workflow
    workflow_id = generator.create_workflow(workflow_config)

    if workflow_id:
        return workflow_id
    else:
        return None

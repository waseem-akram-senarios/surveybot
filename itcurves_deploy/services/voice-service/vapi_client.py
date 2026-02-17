"""
VAPI API Client

Handles all communication with the VAPI platform:
- Create workflows
- Initiate calls
- Retrieve transcripts

No AI logic here -- just VAPI HTTP calls.
"""

import logging
from typing import Any, Dict, Optional

import requests

logger = logging.getLogger(__name__)

VAPI_BASE_URL = "https://api.vapi.ai"


class VAPIClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

    def create_workflow(self, workflow_config: Dict[str, Any]) -> Optional[str]:
        """Create a workflow in VAPI. Returns workflow ID or None."""
        try:
            resp = requests.post(
                f"{VAPI_BASE_URL}/workflow",
                headers=self.headers,
                json=workflow_config,
            )
            if resp.status_code in (200, 201):
                data = resp.json()
                wf_id = data.get("id")
                logger.info(f"Workflow created: {wf_id}")
                return wf_id
            else:
                logger.error(f"Failed to create workflow: {resp.status_code} {resp.text}")
                return None
        except Exception as e:
            logger.error(f"Exception creating workflow: {e}")
            return None

    def make_call(
        self,
        workflow_id: str,
        phone_number_id: str,
        customer_phone: str,
        workflow_variables: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Initiate a VAPI call using a workflow. Returns call data."""
        payload = {
            "workflowId": workflow_id,
            "phoneNumberId": phone_number_id,
            "workflowOverrides": {"variableValues": workflow_variables},
            "customer": {"number": customer_phone},
        }

        try:
            resp = requests.post(
                f"{VAPI_BASE_URL}/call",
                headers=self.headers,
                json=payload,
            )
            if resp.status_code in (200, 201):
                data = resp.json()
                logger.info(f"Call initiated: {data.get('id')}")
                return data
            else:
                logger.error(f"Failed to make call: {resp.status_code} {resp.text}")
                raise RuntimeError(f"VAPI call failed: {resp.text}")
        except requests.RequestException as e:
            logger.error(f"Call request error: {e}")
            raise

    def get_call_transcript(self, call_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve transcript for a specific call from VAPI."""
        try:
            resp = requests.get(
                f"{VAPI_BASE_URL}/call/{call_id}",
                headers=self.headers,
            )
            if resp.status_code == 200:
                return resp.json()
            else:
                logger.warning(f"Failed to get call {call_id}: {resp.status_code}")
                return None
        except Exception as e:
            logger.error(f"Get call transcript error: {e}")
            return None

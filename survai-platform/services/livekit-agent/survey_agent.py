"""
Survey Agent class definition.
Contains the main Agent that conducts customer surveys.
"""

import asyncio
import re

from livekit.agents.voice import Agent

from config.settings import ORGANIZATION_NAME

PLACEHOLDER_NAMES = {
    "customer", "unknown", "user", "recipient", "test",
    "n/a", "na", "none", "name",
}

_PLACEHOLDER_PATTERN = re.compile(
    r"^(rider|user|customer|recipient|test)\s*\d*$", re.IGNORECASE
)


class SurveyAgent(Agent):
    def __init__(self, instructions: str, rider_first_name: str, organization_name: str = None, **kwargs):
        super().__init__(instructions=instructions, **kwargs)
        self.rider_first_name = rider_first_name
        self.organization_name = organization_name or ORGANIZATION_NAME

    def _is_real_name(self, name: str) -> bool:
        if not name or not name.strip():
            return False
        clean = name.strip()
        if clean.lower() in PLACEHOLDER_NAMES:
            return False
        if _PLACEHOLDER_PATTERN.match(clean):
            return False
        alpha_only = re.sub(r"[^a-zA-Z]", "", clean)
        return len(alpha_only) >= 2

    async def on_enter(self):
        """Called when agent enters - AI speaks first."""
        # Brief delay to let the SIP audio channel stabilize after answer
        await asyncio.sleep(1.0)

        name = self.rider_first_name
        org = self.organization_name
        if self._is_real_name(name):
            greeting = (
                f"Hi there! This is Cameron, an AI assistant calling on behalf of {org}. "
                f"Am I speaking with {name}?"
            )
        else:
            greeting = (
                f"Hi there! This is Cameron, an AI assistant calling on behalf of {org}. "
                f"I'm reaching out to get your quick feedback on a recent experience — do you have a moment?"
            )
        await self.session.say(greeting)


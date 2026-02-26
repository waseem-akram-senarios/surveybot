"""
Survey Agent class definition.
Contains the main Agent that conducts customer surveys.
"""

import asyncio

from livekit.agents.voice import Agent

from config.settings import ORGANIZATION_NAME


class SurveyAgent(Agent):
    """
    Agent that conducts customer surveys with function tools.
    
    This agent handles the survey conversation flow, speaking first
    and guiding the participant through the survey questions.
    """
    
    def __init__(self, instructions: str, rider_first_name: str, organization_name: str = None, **kwargs):
        super().__init__(instructions=instructions, **kwargs)
        self.rider_first_name = rider_first_name
        self.organization_name = organization_name or ORGANIZATION_NAME
    
    async def on_enter(self):
        """Called when agent enters - AI speaks first."""
        # Brief delay to let the SIP audio channel stabilize after answer
        await asyncio.sleep(1.0)

        name = self.rider_first_name
        if name and name.lower() not in ("customer", "unknown", ""):
            greeting = f"Hi, this is Cameron, an AI assistant calling on behalf of {self.organization_name}. Am I speaking with {name}?"
        else:
            greeting = f"Hi, this is Cameron, an AI assistant calling on behalf of {self.organization_name}. I'm reaching out to get your feedback on a recent experience — do you have a quick moment?"
        await self.session.say(greeting)


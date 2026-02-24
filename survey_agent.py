"""
Survey Agent class definition.
Contains the main Agent that conducts customer surveys.
"""

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
        await self.session.say(
            f"Hi, this is Jane with {self.organization_name}. Am I speaking to {self.rider_first_name}?"
        )


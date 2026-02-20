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
    
    def __init__(self, instructions: str, rider_first_name: str, **kwargs):
        """
        Initialize the survey agent.
        
        Args:
            instructions: The system prompt/instructions for the agent
            rider_first_name: The rider's first name for personalized greeting
            **kwargs: Additional arguments passed to parent Agent class
        """
        super().__init__(instructions=instructions, **kwargs)
        self.rider_first_name = rider_first_name
    
    async def on_enter(self):
        """
        Called when agent enters - AI speaks first.
        
        This method initiates the conversation by greeting the participant
        immediately when the call connects.
        """
        # Generate the first greeting immediately
        await self.session.say(
            f"Hi, this is Jane with {ORGANIZATION_NAME}. Am I speaking to {self.rider_first_name}?"
        )


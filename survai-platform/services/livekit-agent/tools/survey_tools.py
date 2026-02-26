"""
Survey function tools.
These are the tools that the LLM can call during the survey conversation.
"""

from datetime import datetime
from typing import Optional, Callable

from livekit.agents import function_tool, RunContext

from utils.logging import get_logger
from utils.storage import save_survey_responses

logger = get_logger()


def create_survey_tools(
    survey_responses: dict,
    rider_first_name: str,
    caller_number: str,
    call_start_time: datetime,
    log_handler,
    cleanup_logging_fn: Callable,
    disconnect_fn: Callable = None
):
    """
    Create survey tool functions with access to survey state.
    
    This factory function creates tool functions that have closure access
    to the survey state (responses, caller info, etc.)
    
    Args:
        survey_responses: Dictionary to store survey responses
        rider_first_name: The rider's first name
        caller_number: The caller's phone number
        call_start_time: When the call started
        log_handler: The logging handler for this call
        cleanup_logging_fn: Function to cleanup logging
        
    Returns:
        dict: Dictionary of tool functions
    """
    
    @function_tool()
    async def confirm_name_and_availability(
        context: RunContext, 
        confirmed: bool, 
        available: Optional[bool] = None
    ):
        """
        Confirm rider's name and check availability for survey.
        
        Args:
            confirmed: True if name is confirmed, False if wrong person
            available: True if available now, False if not available (only needed if confirmed=True)
        """
        if not confirmed:
            survey_responses["name_confirmed"] = False
            logger.info("❌ Name not confirmed - ending survey")
            return "Name not confirmed. End the call politely."
        
        survey_responses["name_confirmed"] = True
        logger.info(f"✅ Name confirmed: {rider_first_name}")
        
        if available is not None:
            survey_responses["availability_status"] = "available" if available else "not_available"
            logger.info(f"✅ Availability: {'Available' if available else 'Not available'}")
            if available:
                return "Great! Now proceed to Question 1: Ask about their overall experience rating."
            else:
                return "Not available now. Ask about callback or alternative survey method."
        
        return "Name confirmed. Now ask about availability for the survey."
    
    @function_tool()
    async def schedule_callback(context: RunContext, callback_time: str):
        """
        Schedule a callback time for the survey.
        
        Args:
            callback_time: The time/date when user wants callback
        """
        survey_responses["availability_status"] = "callback"
        survey_responses["callback_time"] = callback_time
        logger.info(f"📅 Callback scheduled for: {callback_time}")
        return "Callback scheduled. Now say: 'Fantastic, we will follow up with you then. Thank you for your time!' Then use end_survey tool with reason='callback_scheduled'."
    
    @function_tool()
    async def offer_alternative_survey(context: RunContext, method: str):
        """
        User prefers email/text survey instead of phone.
        
        Args:
            method: "email_text" for alternative delivery method
        """
        survey_responses["availability_status"] = "email_requested"
        logger.info(f"📧 Alternative survey method requested: {method}")
        return "Email method accepted. Now say: 'Great! We will send you the link. Thank you for your time and have a good rest of your day.' Then use end_survey tool with reason='email_requested'."
    
    @function_tool()
    async def store_q1_rating(context: RunContext, rating: int):
        """
        Store overall experience rating (Question 1).
        
        Args:
            rating: Rating from 1 to 5 (1=very poor, 5=excellent)
        """
        if 1 <= rating <= 5:
            survey_responses["q1_overall_rating"] = rating
            logger.info(f"✅ Q1 - Overall Rating: {rating}/5")
            return "Rating recorded. Acknowledge with 'Thank you!' and proceed to Question 2: Would you recommend our services to someone you know?"
        else:
            return "Invalid rating. Ask them to provide a rating between 1 and 5."
    
    @function_tool()
    async def store_q2_recommendation(context: RunContext, would_recommend: bool):
        """
        Store recommendation response (Question 2).
        
        Args:
            would_recommend: True if would recommend, False otherwise
        """
        survey_responses["q2_would_recommend"] = "Yes" if would_recommend else "No"
        logger.info(f"✅ Q2 - Would Recommend: {survey_responses['q2_would_recommend']}")
        return "Recommendation recorded. Acknowledge and proceed to Question 3: How satisfied are you with the timeliness of the service?"
    
    @function_tool()
    async def store_q3_timeliness(context: RunContext, satisfaction_level: str):
        """
        Store timeliness satisfaction (Question 3).
        
        Args:
            satisfaction_level: Range from "Very negative" to "Very positive" or numeric/descriptive
        """
        survey_responses["q3_timeliness_satisfaction"] = satisfaction_level
        logger.info(f"✅ Q3 - Timeliness Satisfaction: {satisfaction_level}")
        
        # Determine sentiment for follow-up
        level_lower = satisfaction_level.lower()
        if any(word in level_lower for word in ["negative", "poor", "disappointed", "bad"]) or (satisfaction_level.isdigit() and int(satisfaction_level) <= 2):
            return "Timeliness recorded as NEGATIVE. Ask follow-up: 'I'm sorry to hear that. Can you tell me more about what happened with the timing?'"
        elif any(word in level_lower for word in ["positive", "excellent", "great", "wonderful"]) or (satisfaction_level.isdigit() and int(satisfaction_level) >= 4):
            return "Timeliness recorded as POSITIVE. Ask follow-up: 'That's wonderful to hear! What specifically worked well for you timing-wise?'"
        else:
            return "Timeliness recorded as NEUTRAL. Ask follow-up: 'What could we do better to improve the timeliness?'"
    
    @function_tool()
    async def store_q3_followup(context: RunContext, followup_answer: str):
        """
        Store follow-up answer for Question 3 (based on their satisfaction level).
        
        Args:
            followup_answer: Detailed response about timing experience
        """
        survey_responses["q3_followup"] = followup_answer
        logger.info(f"✅ Q3 Follow-up: {followup_answer[:100]}...")
        return "Follow-up recorded. Acknowledge with 'Thank you for sharing that' and proceed to Question 4: How has our service impacted your daily life or routine?"
    
    @function_tool()
    async def store_q4_daily_impact(context: RunContext, impact: str):
        """
        Store how service impacted daily life (Question 4).
        
        Args:
            impact: Open-ended response about daily life impact
        """
        survey_responses["q4_daily_life_impact"] = impact
        logger.info(f"✅ Q4 - Daily Impact: {impact[:100]}...")
        return "Daily impact recorded. Acknowledge and proceed to Question 5: What challenges, if any, have you faced while using the service?"
    
    @function_tool()
    async def store_q5_challenges(context: RunContext, challenges: str):
        """
        Store challenges faced while using service (Question 5).
        
        Args:
            challenges: Open-ended response about challenges (or "None")
        """
        survey_responses["q5_challenges_faced"] = challenges
        logger.info(f"✅ Q5 - Challenges: {challenges[:100]}...")
        return "Challenges recorded. Acknowledge and proceed to Question 6: What specific improvements would you like to see in the service?"
    
    @function_tool()
    async def store_q6_improvements(context: RunContext, improvements: str):
        """
        Store desired improvements (Question 6).
        
        Args:
            improvements: Open-ended suggestions for improvement
        """
        survey_responses["q6_improvements_desired"] = improvements
        logger.info(f"✅ Q6 - Improvements: {improvements[:100]}...")
        return "Improvements recorded. Acknowledge and proceed to Question 7 (FINAL): Thank you for your input. Is there anything else about your experience that we didn't ask about but you'd like to mention?"
    
    @function_tool()
    async def store_q7_additional(context: RunContext, additional_comments: str):
        """
        Store any additional comments (Question 7 - Final question).
        
        Args:
            additional_comments: Any additional feedback or "None"
        """
        survey_responses["q7_additional_comments"] = additional_comments
        logger.info(f"✅ Q7 - Additional: {additional_comments[:100]}...")
        return "Final answer recorded. Now give the concluding statement and use the complete_survey tool."
    
    @function_tool()
    async def complete_survey(context: RunContext):
        """
        Mark survey as completed and prepare to end call.
        Called after concluding statement.
        """
        survey_responses["completed"] = True
        logger.info("✅ Survey completed successfully!")
        
        # Calculate call duration
        call_duration = (datetime.now() - call_start_time).total_seconds()
        
        # Save responses
        save_survey_responses(caller_number, survey_responses, call_duration)
        
        # Cleanup logging
        cleanup_logging_fn(log_handler)
        
        return """Survey completed and saved successfully!

NEXT STEPS:
1. Deliver your farewell: "Thanks so much for your time. Have a wonderful day!"
2. Pause briefly to let them respond naturally.
3. If they say a farewell (bye, thanks, take care, etc.) — respond warmly with one short line, then call end_survey(reason="completed").
4. If they say nothing after a brief pause — call end_survey(reason="completed").
Do not leave the line open beyond 1-2 exchanges after your farewell."""
    
    @function_tool()
    async def end_survey(context: RunContext, reason: str = "completed"):
        """
        End the survey call immediately.
        
        Args:
            reason: Reason for ending (wrong_person, declined, callback_scheduled, email_requested, completed)
        """
        logger.info(f"📞 Survey ending: {reason}")
        
        survey_responses["availability_status"] = reason
        
        # Calculate call duration
        call_duration = (datetime.now() - call_start_time).total_seconds()
        
        # Save responses if any were collected
        if any(v is not None for k, v in survey_responses.items() if k not in ["completed", "rider_name", "rider_phone"]):
            save_survey_responses(caller_number, survey_responses, call_duration)
        
        # Cleanup logging
        cleanup_logging_fn(log_handler)
        
        # Disconnect the call
        if disconnect_fn:
            await disconnect_fn()
        
        return "Survey ended. The call is being disconnected."
    
    @function_tool()
    async def disconnect_call(context: RunContext):
        """
        Disconnect and end the phone call immediately.
        
        MUST USE THIS after complete_survey() when user says ANY of:
        - bye, goodbye, thanks, thank you, okay, alright, sure
        - you too, take care, have a good day, sounds good
        - Any short acknowledgment or farewell response
        
        DO NOT wait for user to hang up - YOU must call this to end the call!
        """
        logger.info("📞 Ending call - disconnect_call triggered")
        
        if disconnect_fn:
            await disconnect_fn()
            return "Call disconnected successfully."
        else:
            return "Call will end shortly."
    
    # Return all tools as a list
    return [
        confirm_name_and_availability,
        schedule_callback,
        offer_alternative_survey,
        store_q1_rating,
        store_q2_recommendation,
        store_q3_timeliness,
        store_q3_followup,
        store_q4_daily_impact,
        store_q5_challenges,
        store_q6_improvements,
        store_q7_additional,
        complete_survey,
        end_survey,
        disconnect_call,
    ]


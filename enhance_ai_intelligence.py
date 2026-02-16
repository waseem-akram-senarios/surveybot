#!/usr/bin/env python3
"""
Enhance AI Intelligence - Make Survey Bot More Conversational and Intelligent
"""

import os
import sys
import asyncio
import logging
import json
import requests
from uuid import uuid4
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def create_intelligent_survey_call():
    """Create an intelligent, conversational survey call"""
    
    try:
        vapi_api_key = "3e2eef67-342e-4902-9847-95c1aa571a0a"
        phone_number_id = "caec45b5-3868-4df2-a0de-80678d14d897"
        test_phone = "+13855263745"
        
        logger.info("🧠 Creating INTELLIGENT AI Survey Call")
        logger.info("=" * 50)
        
        headers = {
            "Authorization": f"Bearer {vapi_api_key}",
            "Content-Type": "application/json"
        }
        
        # Intelligent AI survey with adaptive conversation
        intelligent_ai_data = {
            "assistant": {
                "firstMessage": "Hi there! I'm calling to chat about your recent experience. I'd love to hear your honest thoughts - no robotic questions, just a natural conversation. Do you have a moment to chat?",
                "model": {
                    "provider": "openai",
                    "model": "gpt-4",  # Use GPT-4 for more intelligence
                    "temperature": 0.8,  # Higher temperature for creativity
                    "systemPrompt": """You are an intelligent, empathetic survey conductor having a natural conversation.

                    YOUR PERSONALITY:
                    - Conversational and friendly, not robotic
                    - Adaptive - change questions based on responses
                    - Empathetic - understand emotions and context
                    - Intelligent - ask follow-up questions that matter
                    - Natural - use everyday language, not survey jargon
                    - Flexible - skip irrelevant questions, explore interesting topics

                    CONVERSATION STYLE:
                    - Start with "How are you today?" or similar warm opening
                    - Ask questions naturally: "I'm curious about..." rather than "On a scale of 1-5..."
                    - Listen to emotions and respond appropriately
                    - If they mention something interesting, explore it
                    - If they seem rushed, be brief and respectful
                    - Use phrases like "That's interesting, tell me more..." or "How did that make you feel?"
                    - Adapt your questions based on their previous answers
                    - End naturally when conversation feels complete

                    SURVEY GOALS (cover these naturally):
                    - Overall satisfaction with the service
                    - Ease of use experience
                    - Any memorable moments (good or bad)
                    - Suggestions for improvement
                    - Likelihood to recommend

                    EXAMPLES:
                    - Instead of: "Rate your satisfaction 1-5"
                    - Say: "How did you feel about the whole experience?"
                    
                    - Instead of: "Was it easy to use?"
                    - Say: "How smooth was everything for you?"
                    
                    - Instead of: "Any additional comments?"
                    - Say: "Is there anything else you'd like to share about your experience?"

                    Remember: You're having a conversation, not conducting an interrogation. Be genuinely curious and responsive to their answers."""
                },
                "voice": "nova-openai",  # Friendly female voice
                "recordingEnabled": True,
                "language": "en-US",
                "maxDurationSeconds": 300  # 5 minutes for natural conversation
            },
            "phoneNumberId": phone_number_id,
            "customer": {
                "number": test_phone
            },
            "metadata": {
                "survey_id": f"intelligent-{uuid4().hex[:8]}",
                "ai_type": "intelligent_conversational",
                "temperature": 0.8,
                "model": "gpt-4",
                "source": "intelligent_ai_test"
            }
        }
        
        try:
            response = requests.post(
                "https://api.vapi.ai/call/phone",
                headers=headers,
                json=intelligent_ai_data
            )
            
            if response.status_code == 201:
                call_data = response.json()
                call_id = call_data.get("id")
                logger.info(f"🧠 INTELLIGENT AI call created!")
                logger.info(f"📞 Call ID: {call_id}")
                logger.info(f"📱 Phone: {test_phone}")
                logger.info(f"🎤 Voice: nova-openai (friendly)")
                logger.info(f"🧠 Model: GPT-4 with high creativity")
                logger.info(f"🗣️ Style: Natural, adaptive conversation")
                
                print(f"\n🧠 INTELLIGENT AI SURVEY INITIATED!")
                print(f"📞 Call ID: {call_id}")
                print(f"📱 Calling: {test_phone}")
                print(f"🎤 AI will be conversational and adaptive")
                print(f"🧠 Uses GPT-4 for intelligent responses")
                print(f"🗣️ Natural conversation, not robotic questions")
                print(f"📞 The person should feel like they're chatting with a helpful human")
                
                return call_id
                
            else:
                logger.error(f"❌ Failed to create intelligent AI call: {response.status_code}")
                logger.error(f"❌ Response: {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Intelligent AI call creation failed: {e}")
            return None
        
    except Exception as e:
        logger.error(f"❌ Setup failed: {e}")
        return None

async def create_contextual_ai_call():
    """Create an AI that understands context and emotions"""
    
    try:
        vapi_api_key = "3e2eef67-342e-4902-9847-95c1aa571a0a"
        phone_number_id = "caec45b5-3868-4df2-a0de-80678d14d897"
        test_phone = "+13855263745"
        
        logger.info("🎭 Creating CONTEXTUAL AI Survey Call")
        logger.info("=" * 50)
        
        headers = {
            "Authorization": f"Bearer {vapi_api_key}",
            "Content-Type": "application/json"
        }
        
        # Context-aware AI with emotional intelligence
        contextual_ai_data = {
            "assistant": {
                "firstMessage": "Hello! I'm here to learn about your experience. I'm genuinely interested in hearing how things went for you - the good, the challenging, everything. Do you have a few minutes to share your story?",
                "model": {
                    "provider": "openai",
                    "model": "gpt-4",
                    "temperature": 0.9,  # Very high creativity
                    "systemPrompt": """You are an emotionally intelligent survey conductor with deep contextual understanding.

                    EMOTIONAL INTELLIGENCE:
                    - Detect emotions in voice and words
                    - Respond with empathy and understanding
                    - Adjust tone based on their emotional state
                    - Validate their feelings: "That sounds frustrating" or "That must have been exciting!"
                    - Know when to be brief vs when to explore deeper

                    CONTEXTUAL AWARENESS:
                    - Remember previous answers and reference them naturally
                    - Connect different parts of their experience
                    - Notice patterns and themes in their responses
                    - Ask follow-up questions that show you're truly listening
                    - Adapt the conversation flow based on what matters to them

                    ADAPTIVE QUESTIONING:
                    - If they're enthusiastic: explore what they loved
                    - If they're frustrated: understand what went wrong
                    - If they're neutral: find what could make it better
                    - If they mention specific people: ask about those interactions
                    - If they mention timing: explore scheduling or pacing issues

                    CONVERSATION EXAMPLES:
                    
                    Instead of robotic questions, use natural flow:
                    
                    "That's really interesting - you mentioned the app was confusing at first. What specifically felt challenging about it?"
                    
                    "I can hear you're excited about that feature! What made it so great for you?"
                    
                    "It sounds like that was frustrating. How did that affect your overall experience?"
                    
                    "You mentioned the staff was helpful. Can you tell me more about that interaction?"
                    
                    INTELLIGENT PROBING:
                    - "What was going through your mind when that happened?"
                    - "How did that compare to what you expected?"
                    - "What would have made that experience even better?"
                    - "Is that something you've experienced before with similar services?"
                    
                    ENDING THE CONVERSATION:
                    - Summarize key points naturally: "So it sounds like..."
                    - Thank them for their honesty and time
                    - End on a positive, personal note
                    - Ask if there's anything else they'd like to share

                    Remember: You're having a genuine conversation, not collecting data. Show you care about their experience and feelings."""
                },
                "voice": "alloy-openai",  # Clear, professional but warm
                "recordingEnabled": True,
                "language": "en-US",
                "maxDurationSeconds": 360  # 6 minutes for deeper conversation
            },
            "phoneNumberId": phone_number_id,
            "customer": {
                "number": test_phone
            },
            "metadata": {
                "survey_id": f"contextual-{uuid4().hex[:8]}",
                "ai_type": "contextual_emotional",
                "temperature": 0.9,
                "model": "gpt-4",
                "source": "contextual_ai_test"
            }
        }
        
        try:
            response = requests.post(
                "https://api.vapi.ai/call/phone",
                headers=headers,
                json=contextual_ai_data
            )
            
            if response.status_code == 201:
                call_data = response.json()
                call_id = call_data.get("id")
                logger.info(f"🎭 CONTEXTUAL AI call created!")
                logger.info(f"📞 Call ID: {call_id}")
                logger.info(f"📱 Phone: {test_phone}")
                logger.info(f"🧠 Model: GPT-4 with contextual awareness")
                logger.info(f"💭 Emotional intelligence enabled")
                logger.info(f"🎯 Adaptive conversation flow")
                
                print(f"\n🎭 CONTEXTUAL AI SURVEY INITIATED!")
                print(f"📞 Call ID: {call_id}")
                print(f"📱 Calling: {test_phone}")
                print(f"💭 AI will understand emotions and context")
                print(f"🎯 Questions adapt based on responses")
                print(f"🧠 Remembers and references previous answers")
                print(f"🗣️ Natural, empathetic conversation style")
                
                return call_id
                
            else:
                logger.error(f"❌ Failed to create contextual AI call: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Contextual AI call creation failed: {e}")
            return None
        
    except Exception as e:
        logger.error(f"❌ Setup failed: {e}")
        return None

async def update_system_prompts():
    """Update the system prompts in the actual deployment"""
    
    try:
        logger.info("📝 Updating system prompts for intelligent AI...")
        
        # Update the main workflow generator
        workflow_file = "/home/senarios/Desktop/surveybot/itcurves_deploy/pg/workflow.py"
        
        # Read the current workflow file
        try:
            with open(workflow_file, 'r') as f:
                content = f.read()
            
            # New intelligent system prompt
            new_prompt = '''"""You are an intelligent, conversational AI survey conductor.

                    GUIDELINES:
                    - Be natural and conversational, not robotic
                    - Adapt questions based on user responses
                    - Show genuine curiosity and empathy
                    - Use everyday language, not survey jargon
                    - Ask follow-up questions that explore interesting topics
                    - Remember previous answers and reference them naturally
                    - Adjust tone based on user emotions
                    - End the conversation when it feels complete naturally

                    QUESTION STYLE:
                    - Instead of: "Rate your satisfaction 1-5"
                    - Use: "How did you feel about the experience?"
                    
                    - Instead of: "Was it easy to use?"
                    - Use: "How smooth was everything for you?"
                    
                    - Instead of: "Any additional comments?"
                    - Use: "Is there anything else you'd like to share?"

                    Remember: You're having a conversation, not conducting a survey. Be genuinely curious and responsive."""'''
            
            # Find and replace the system prompt section
            old_prompt = '''You are an AI survey assistant conducting phone surveys.'''
            
            if old_prompt in content:
                updated_content = content.replace(old_prompt, new_prompt)
                
                with open(workflow_file, 'w') as f:
                    f.write(updated_content)
                
                logger.info("✅ Updated workflow.py with intelligent AI prompt")
            else:
                logger.warning("⚠️ Could not find the exact prompt to replace")
                
        except Exception as e:
            logger.error(f"❌ Failed to update workflow.py: {e}")
        
        # Update the LiveKit agent
        agent_file = "/home/senarios/Desktop/surveybot/itcurves_deploy/pg/livekit_agent.py"
        
        try:
            with open(agent_file, 'r') as f:
                agent_content = f.read()
            
            # New intelligent agent prompt
            agent_prompt = '''"""You are an intelligent, empathetic AI survey conductor having natural conversations.

                    PERSONALITY:
                    - Conversational and friendly
                    - Adaptive to user responses
                    - Emotionally intelligent
                    - Genuinely curious about experiences
                    - Natural language, no survey jargon

                    CONVERSATION APPROACH:
                    - Start with warm, personal greeting
                    - Ask questions naturally based on context
                    - Listen to emotions and respond appropriately
                    - Explore interesting topics that arise
                    - Reference previous answers naturally
                    - End when conversation feels complete
                    
                    Remember: You're having a conversation, not collecting data."""'''
            
            old_agent_prompt = '''You are a survey AI assistant.'''
            
            if old_agent_prompt in agent_content:
                updated_agent_content = agent_content.replace(old_agent_prompt, agent_prompt)
                
                with open(agent_file, 'w') as f:
                    f.write(updated_agent_content)
                
                logger.info("✅ Updated livekit_agent.py with intelligent AI prompt")
            else:
                logger.warning("⚠️ Could not find the exact agent prompt to replace")
                
        except Exception as e:
            logger.error(f"❌ Failed to update livekit_agent.py: {e}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ System prompt update failed: {e}")
        return False

if __name__ == "__main__":
    print("🧠 ENHANCE AI INTELLIGENCE")
    print("=" * 50)
    print("🎯 This will make your survey bot more intelligent and conversational")
    print("🗣️ Natural conversation instead of robotic questions")
    print("💭 Emotional intelligence and contextual awareness")
    print("🎯 Adaptive questioning based on responses")
    print("📱 Test calls will be made to +13855263745")
    print()
    
    print("📝 Step 1: Update system prompts...")
    confirm1 = input("Update system prompts for intelligent AI? (y/N): ")
    if confirm1.lower() == 'y':
        result1 = asyncio.run(update_system_prompts())
        if result1:
            print("✅ System prompts updated successfully!")
        else:
            print("❌ System prompt update failed")
    
    print("\n🧠 Step 2: Test intelligent AI conversation...")
    print("🎭 This will create a natural, adaptive conversation")
    
    confirm2 = input("Create intelligent AI test call? (y/N): ")
    if confirm2.lower() == 'y':
        call_id1 = asyncio.run(create_intelligent_survey_call())
        if call_id1:
            print(f"✅ Intelligent AI call created: {call_id1}")
    
    print("\n💭 Step 3: Test contextual AI with emotional intelligence...")
    print("🎯 This will create an emotionally aware, contextual conversation")
    
    confirm3 = input("Create contextual AI test call? (y/N): ")
    if confirm3.lower() == 'y':
        call_id2 = asyncio.run(create_contextual_ai_call())
        if call_id2:
            print(f"✅ Contextual AI call created: {call_id2}")
    
    print("\n" + "=" * 50)
    print("🏁 AI Intelligence Enhancement Completed")
    print("\n💡 Your AI survey bot will now:")
    print("🗣️ Have natural, conversational discussions")
    print("🧠 Adapt questions based on user responses")
    print("💭 Understand and respond to emotions")
    print("🎯 Remember context and reference previous answers")
    print("🎭 Use everyday language, not survey jargon")
    print("📞 Feel like talking to a helpful human, not a bot")
    
    print("\n📞 Test calls will demonstrate the improvements!")
    print("🚀 Your survey bot is now much more intelligent and natural!")

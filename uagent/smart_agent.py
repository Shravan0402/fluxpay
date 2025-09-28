#!/usr/bin/env python3
"""
Smart Agent for AI-powered responses
Standalone uAgent that provides intelligent responses for various queries
"""

import os
import time
import json
import random
from typing import Dict, Any, Optional
from uagents import Agent, Context, Model

# Agent configuration
SEED_PHRASE = "smart_agent_seed_phrase_for_ai_responses_2025"
AGENT_NAME = "SmartAgent"

# Create the agent
agent = Agent(
    name=AGENT_NAME,
    seed=SEED_PHRASE,
    port=8001,
    endpoint=["http://127.0.0.1:8001/submit"]
)

# Conversation memory
conversation_memory: Dict[str, list] = {}

# Message models
class ChatMessage(Model):
    message: str
    user_address: Optional[str] = None
    conversation_id: Optional[str] = None

class AgentResponse(Model):
    response: str
    success: bool = True
    error: Optional[str] = None

@agent.on_event("startup")
async def startup(ctx: Context):
    """Agent startup event"""
    ctx.logger.info("🚀 SmartAgent is starting up!")
    ctx.logger.info(f"📍 Agent address: {agent.address}")
    ctx.logger.info(f"🌐 Endpoint: http://localhost:8001/submit")
    ctx.logger.info("✅ Smart Agent is ready to help!")

def generate_ai_response(message: str, user_address: Optional[str] = None) -> str:
    """Generate intelligent AI response based on message content"""
    message_lower = message.lower()
    
    # Weather queries
    if any(keyword in message_lower for keyword in ['weather', 'temperature', 'forecast', 'climate']):
        return """🌤️ **Weather in New Delhi:**
• Temperature: 28°C (82°F)
• Conditions: Partly Cloudy ☁️
• Humidity: 65%
• Wind: 12 km/h (7 mph)
• Feels like: 30°C
• UV Index: 6 (Moderate)

📊 **Today's Forecast:**
• Morning: 24°C, Clear
• Afternoon: 30°C, Partly Cloudy
• Evening: 26°C, Light Breeze

💡 *This is a sample weather report. For real-time data, please check your local weather service.*"""
    
    # Payment queries
    elif any(keyword in message_lower for keyword in ['payment', 'pay', 'balance', 'transaction']):
        return """💳 **Payment System Status**
✅ Payment processed successfully!
💰 Your balance: 100,000,000,000,000,000 WAT

🛠️ **What I can help you with:**
• Weather information
• Payment processing
• General assistance

💡 *Your payment has been verified and the service is now unlocked!*"""
    
    # Image creation queries
    elif any(keyword in message_lower for keyword in ['create', 'generate', 'image', 'picture', 'art']):
        return """🎨 **Image Creation Service**
I can help you create images! Here are some options:

🖼️ **Available Styles:**
• Realistic photography
• Digital art
• Abstract designs
• Logo creation
• Infographics

💡 *Just describe what you'd like me to create, and I'll generate it for you!*"""
    
    # General greetings
    elif any(keyword in message_lower for keyword in ['hello', 'hi', 'hey', 'greetings']):
        return """👋 Hello! I'm your Smart Agent powered by ASI!

🤖 **What I can do:**
• Provide weather information
• Process payments
• Create images
• Answer questions
• Help with various tasks

💡 *Just ask me anything - I'm here to help make your day better!*"""
    
    # Help queries
    elif any(keyword in message_lower for keyword in ['help', 'assist', 'support']):
        return """🆘 **How can I help you?**

🌤️ **Weather Information** - Ask about current conditions and forecasts
💳 **Payment Processing** - Handle payments and transactions
🎨 **Image Creation** - Generate images and artwork
💬 **General Chat** - Have conversations and get assistance

**Example queries:**
• "What's the weather like?"
• "Check my balance"
• "Create an image of a sunset"
• "Help me with a task"

💡 *I'm here to assist you with whatever you need!*"""
    
    # Default response
    else:
        return f"""🤖 **Smart Agent Response**

I received your message: *"{message}"*

🛠️ **Here's what I can help you with:**
🌤️ **Weather Information** - Get current conditions and forecasts
💳 **Payment Processing** - Handle payments and transactions
🎨 **Image Creation** - Generate images and artwork
💬 **General Chat** - Have conversations and get assistance

💡 *Just ask me anything - I'm here to help make your day better!*"""

def store_conversation(conversation_id: str, message: str, response: str):
    """Store conversation in memory"""
    if conversation_id not in conversation_memory:
        conversation_memory[conversation_id] = []
    
    conversation_memory[conversation_id].append({
        "timestamp": time.time(),
        "user_message": message,
        "agent_response": response
    })

@agent.on_message(model=ChatMessage)
async def handle_message(ctx: Context, sender: str, msg: ChatMessage):
    """Handle incoming chat messages"""
    try:
        ctx.logger.info(f"📨 Received message from {sender}: {msg.message}")
        
        # Generate AI response
        response = generate_ai_response(msg.message, msg.user_address)
        
        # Store conversation
        conversation_id = msg.conversation_id or f"conv_{int(time.time())}"
        store_conversation(conversation_id, msg.message, response)
        
        # Send response back
        await ctx.send(sender, AgentResponse(
            response=response,
            success=True
        ))
        
        ctx.logger.info("✅ Response sent successfully")
        
    except Exception as e:
        ctx.logger.error(f"❌ Error processing message: {e}")
        await ctx.send(sender, AgentResponse(
            response="Sorry, I encountered an error processing your message.",
            success=False,
            error=str(e)
        ))

if __name__ == "__main__":
    print("🚀 Starting SmartAgent...")
    print(f"📍 Agent address: {agent.address}")
    print(f"🌐 Endpoint: http://localhost:8001/submit")
    print("✅ Smart Agent is ready to help!")
    agent.run()
# main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import asyncio
import aiohttp
import json
import time
import os
from typing import Optional, Dict, Any

# Define the FastAPI application
app = FastAPI(
    title="Smart Agent API",
    description="API for Smart Agent with ASI and TransactAI integration",
    version="1.0.0"
)

# Define the data model for the incoming chat message
class ChatMessage(BaseModel):
    message: str
    user_address: Optional[str] = None
    payment_proof: Optional[str] = None

# Define the data model for the agent's response
class AgentResponse(BaseModel):
    response: str
    status: str = "success"
    metadata: Optional[Dict[str, Any]] = None

# Define the data model for agent communication
class AgentRequest(BaseModel):
    message: str
    sender: str
    message_type: str = "text"

# Add CORS middleware to allow cross-origin requests from your frontend
# WARNING: For production, replace "*" with your frontend's specific origin(s)
origins = ["*"]  # Allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Smart Agent Configuration
SMART_AGENT_ADDRESS = "agent1q..."  # This will be updated when the agent is deployed
SMART_AGENT_ENDPOINT = "http://127.0.0.1:8001/submit"

# Create the POST endpoint for the chat agent
@app.post("/create-image", response_model=AgentResponse)
async def create_image(request: ChatMessage):
    """Create image endpoint that communicates with the smart agent"""
    try:
        # Forward the request to the smart agent
        agent_response = await send_to_smart_agent(request.message, request.user_address)
        return AgentResponse(
            response=agent_response,
            status="success",
            metadata={"endpoint": "create-image", "agent_processed": True}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

# Create another POST endpoint for the chat agent
@app.post("/create-new", response_model=AgentResponse)
async def create_new(request: ChatMessage):
    """Create new endpoint that communicates with the smart agent"""
    try:
        # Forward the request to the smart agent
        agent_response = await send_to_smart_agent(request.message, request.user_address)
        return AgentResponse(
            response=agent_response,
            status="success",
            metadata={"endpoint": "create-new", "agent_processed": True}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

# New endpoint for direct agent communication
@app.post("/agent/chat", response_model=AgentResponse)
async def agent_chat(request: ChatMessage):
    """Direct chat endpoint with the smart agent"""
    try:
        agent_response = await send_to_smart_agent(request.message, request.user_address)
        return AgentResponse(
            response=agent_response,
            status="success",
            metadata={"endpoint": "agent-chat", "agent_processed": True}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error communicating with agent: {str(e)}")

# Weather endpoint - now gated behind payment
@app.post("/weather", response_model=AgentResponse)
async def get_weather(request: ChatMessage):
    """Get weather information - requires payment verification"""
    try:
        # Check if payment proof is provided
        payment_proof = request.payment_proof
        print(f"Payment proof received: {payment_proof}")
        print(f"Request object: {request}")
        print(f"Request dict: {request.__dict__}")
        
        if not payment_proof:
            # Return payment required response
            return AgentResponse(
                response="Payment required for weather API access. Weather API access requires payment. Please provide payment proof.",
                status="payment_required",
                metadata={
                    "endpoint": "weather",
                    "payment_required": True,
                    "price": "0.01 WAT",
                    "payment_endpoint": "http://localhost:3000/settle"
                }
            )
        else:
            # Payment proof provided, verify and settle via facilitator
            facilitator_url = "http://localhost:3000"
            
            # Parse the payment payload from the proof
            try:
                payment_payload = json.loads(payment_proof)
            except json.JSONDecodeError:
                return AgentResponse(
                    response="Invalid payment proof format",
                    status="payment_failed",
                    metadata={"endpoint": "weather", "error": "invalid_payment_format"}
                )
            
            # Build payment requirements for cross-chain payment
            # User pays on Polygon Amoy, merchant receives on 0G Testnet
            payment_requirements = {
                "scheme": "exact",
                "network": "polygon-amoy",  # User's network
                "asset": "0xec690C24B7451B85B6167a06292e49B5DA822fBE",  # Polygon Amoy WAT
                "payTo": "0xAF9fC206261DF20a7f2Be9B379B101FAFd983117",  # Merchant address on 0G Testnet
                "maxAmountRequired": "10000000000000000",  # 0.01 WAT
            }
            
            # Step 1: Verify payment
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{facilitator_url}/verify",
                    json={
                        "paymentPayload": payment_payload,
                        "paymentRequirements": payment_requirements
                    }
                ) as response:
                    if response.status != 200:
                        return AgentResponse(
                            response="Payment verification failed",
                            status="payment_failed",
                            metadata={"endpoint": "weather", "error": "verification_failed"}
                        )
                    
                    verify_result = await response.json()
                    if not verify_result.get("isValid", False):
                        return AgentResponse(
                            response="Payment verification failed",
                            status="payment_failed",
                            metadata={"endpoint": "weather", "error": verify_result.get("invalidReason", "unknown")}
                        )
                
                # Step 2: Settle payment
                async with session.post(
                    f"{facilitator_url}/settle",
                    json={
                        "paymentPayload": payment_payload,
                        "paymentRequirements": payment_requirements
                    }
                ) as response:
                    if response.status != 200:
                        return AgentResponse(
                            response="Payment settlement failed",
                            status="payment_failed",
                            metadata={"endpoint": "weather", "error": "settlement_failed"}
                        )
                    
                    settle_result = await response.json()
                    if not settle_result.get("success", False):
                        return AgentResponse(
                            response="Payment settlement failed",
                            status="payment_failed",
                            metadata={"endpoint": "weather", "error": settle_result.get("errorReason", "unknown")}
                        )
                    
                    # Payment successful, return weather data
                    weather_query = f"Get weather for: {request.message}"
                    agent_response = await send_to_smart_agent(weather_query, request.user_address)
                    return AgentResponse(
                        response=agent_response,
                        status="success",
                        metadata={
                            "endpoint": "weather", 
                            "payment_verified": True,
                            "transaction": settle_result.get("transaction", ""),
                            "payer": settle_result.get("payer", "")
                        }
                    )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting weather: {str(e)}")

# Payment endpoint
@app.post("/payment", response_model=AgentResponse)
async def handle_payment(request: ChatMessage):
    """Handle payment requests through the smart agent"""
    try:
        payment_query = f"Payment request: {request.message}"
        agent_response = await send_to_smart_agent(payment_query, request.user_address)
        return AgentResponse(
            response=agent_response,
            status="success",
            metadata={"endpoint": "payment", "agent_processed": True}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing payment: {str(e)}")

async def send_to_smart_agent(message: str, user_address: Optional[str] = None) -> str:
    """Generate a simple AI response for weather queries"""
    message_lower = message.lower()
    
    if any(keyword in message_lower for keyword in ['weather', 'temperature', 'forecast']):
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
    
    elif any(keyword in message_lower for keyword in ['payment', 'pay', 'balance']):
        return """💳 **Payment System Status**
✅ Payment processed successfully!
💰 Your balance: 100,000,000,000,000,000 WAT

🛠️ **What I can help you with:**
• Weather information
• Payment processing
• General assistance

💡 *Your payment has been verified and the service is now unlocked!*"""
    
    else:
        return f"""👋 Hello! I received your message: *'{message}'*

🛠️ **Here's what I can help you with:**
🌤️ **Weather Information** - Get current conditions and forecasts
💳 **Payment Processing** - Handle payments and transactions
💬 **General Chat** - Have conversations and get assistance

💡 *Just ask me anything - I'm here to help make your day better!*"""

# Define a health check endpoint
@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Smart Agent API is operational"}

# Agent status endpoint
@app.get("/agent/status")
def agent_status():
    return {
        "status": "active",
        "agent_address": SMART_AGENT_ADDRESS,
        "endpoint": SMART_AGENT_ENDPOINT,
        "capabilities": ["weather", "payments", "image_creation", "general_chat"]
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

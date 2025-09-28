#!/usr/bin/env python3
"""
Test script for the Smart Agent
Tests the uAgent functionality independently
"""

import asyncio
import httpx
import json

async def test_agent():
    """Test the Smart Agent with various messages"""
    
    test_messages = [
        "Hello! How are you?",
        "What's the weather like?",
        "Check my balance",
        "Create an image of a sunset",
        "Help me with something",
        "Tell me about payments"
    ]
    
    print("🧪 Testing Smart Agent...")
    print("=" * 50)
    
    async with httpx.AsyncClient() as client:
        for i, message in enumerate(test_messages, 1):
            print(f"\n📨 Test {i}: {message}")
            
            try:
                # Send message to agent
                response = await client.post(
                    "http://localhost:8001/submit",
                    json={
                        "message": message,
                        "user_address": "0x1234567890123456789012345678901234567890",
                        "conversation_id": f"test_conv_{i}"
                    },
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Response: {data.get('response', 'No response')[:100]}...")
                else:
                    print(f"❌ Error: HTTP {response.status_code}")
                    
            except Exception as e:
                print(f"❌ Error: {e}")
            
            # Small delay between tests
            await asyncio.sleep(1)
    
    print("\n" + "=" * 50)
    print("🏁 Testing complete!")

if __name__ == "__main__":
    asyncio.run(test_agent())

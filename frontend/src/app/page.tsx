'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { WalletConnectButton } from '../components/WalletConnectButton';
import { useAccount, useSignMessage } from 'wagmi';
import { encodePacked, keccak256 } from 'viem';
import Image from 'next/image';
import AIlogo from '../public/ailogo.png'

// Define Message types
interface ChatMessage {
  id: number;
  text: string;
  type: 'user' | 'bot' | 'error' | 'payment';
}

// Payment requirements interface
interface PaymentRequirements {
  endpoint: string;
  payment_required: boolean;
  price: string;
  payment_endpoint: string;
}

// Payment payload interface
interface PaymentPayload {
  scheme: string;
  network: string;
  payload: {
    authorization: {
      from: string;
      to: string;
      amount: string;
      validAfter: number;
      validBefore: number;
      nonce: string;
    };
    signature: string;
  };
}

export default function HomePage() {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  // NEW STATE: To track if the component has mounted on the client
  const [isClientMounted, setIsClientMounted] = useState(false);

  // State for chat messages
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [chatTitle, setChatTitle] = useState<string>('New Chat');
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const [pendingPayment, setPendingPayment] = useState<PaymentRequirements | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [pendingMessage, setPendingMessage] = useState<string>('');

  // Refs for DOM elements
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const userInputRef = useRef<HTMLTextAreaElement>(null);
  const sendButtonRef = useRef<HTMLButtonElement>(null);

  // Effect to set isClientMounted to true after the component mounts
  useEffect(() => {
    setIsClientMounted(true);
  }, []); // Run only once on mount

  function truncateString(str:string | undefined, num:number) {
    if(!str){return ''}
    if (str.length > num) {
      return str.slice(0, num) + "...";
    } else {
      return str;
    }
  }

  // Auto-resize textarea logic
  const autoResize = useCallback(() => {
    if (userInputRef.current) {
      userInputRef.current.style.height = 'auto';
      userInputRef.current.style.height = Math.min(userInputRef.current.scrollHeight, 128) + 'px';
    }
  }, []);

  // Scroll to bottom of chat window
  const scrollToBottom = useCallback(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, []);

  // Add a new message to the chat
  const addMessage = useCallback((text: string, type: 'user' | 'bot' | 'error' | 'payment') => {
    setMessages((prevMessages) => {
      const newMessages = [...prevMessages, { id: Date.now(), text, type }];
      return newMessages;
    });
    setShowWelcome(false);
  }, []);

  // Create EIP-3009 authorization signature
  const createPaymentAuthorization = async (paymentRequirements: PaymentRequirements): Promise<PaymentPayload> => {
    console.log("🔐 Creating EIP-3009 authorization...");

    const nonce = "0x" + Math.random().toString(16).slice(2).padStart(64, '0');
    const validAfter = Math.floor(Date.now() / 1000) - 10;
    const validBefore = validAfter + 300; // 5 minutes

    const authorization = {
      from: address!,
      to: "0xec690C24B7451B85B6167a06292e49B5DA822fBE", // Weather token address
      amount: "10000000000000000", // 0.01 WAT
      validAfter,
      validBefore,
      nonce
    };

    // Create the EIP-3009 authorization hash (matching contract logic)
    const contractAddress = "0xec690C24B7451B85B6167a06292e49B5DA822fBE";
    const packedData = encodePacked(
      ['address', 'address', 'uint256', 'uint256', 'uint256', 'bytes32', 'address'],
      [
        authorization.from as `0x${string}`,
        authorization.to as `0x${string}`,
        BigInt(authorization.amount),
        BigInt(authorization.validAfter),
        BigInt(authorization.validBefore),
        authorization.nonce as `0x${string}`,
        contractAddress as `0x${string}`
      ]
    );

    // Hash the packed data (inner hash)
    const innerHash = keccak256(packedData);

    // Sign the inner hash directly (contract adds Ethereum Signed Message prefix during recovery)
    const signature = await signMessageAsync({
      message: { raw: innerHash },
    });

    console.log("✅ Authorization signed");

    return {
      scheme: "exact",
      network: "polygon-amoy",
      payload: {
        authorization,
        signature
      }
    };
  };

  // Send message to smart agent via backend
  const sendMessage = async (message: string, paymentProof?: string): Promise<{ response: string; paymentRequired?: PaymentRequirements }> => {
    if (!isConnected) {
      throw new Error("Wallet not connected.");
    }
    try {
      console.log("Sending message to smart agent:", message);
      
      // Determine the appropriate endpoint based on message content
      let endpoint = '/agent/chat'; // Default endpoint
      const messageLower = message.toLowerCase();
      
      if (messageLower.includes('weather') || messageLower.includes('temperature') || messageLower.includes('forecast')) {
        endpoint = '/weather';
      } else if (messageLower.includes('payment') || messageLower.includes('pay') || messageLower.includes('balance') || 
                 messageLower.includes('send') || messageLower.includes('transfer') || messageLower.includes('amount')) {
        endpoint = '/payment';
      } else if (messageLower.includes('create') || messageLower.includes('generate') || messageLower.includes('image')) {
        endpoint = '/create-image';
      }
      
      const response = await fetch(`http://127.0.0.1:8000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: message,
          user_address: address,
          payment_proof: paymentProof
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Check if payment is required
      if (data.status === 'payment_required') {
        return { 
          response: data.response, 
          paymentRequired: data.metadata 
        };
      }
      
      return { response: data.response };
    } catch (error) {
      console.error('Smart Agent API error:', error);
      throw error;
    }
  };

  // Handle payment processing
  const handlePayment = async () => {
    if (!pendingPayment || !address || !pendingMessage) return;
    
    setIsProcessingPayment(true);
    
    try {
      // Create payment authorization
      const paymentPayload = await createPaymentAuthorization(pendingPayment);
      
      // Retry the original request with payment proof
      const result = await sendMessage(pendingMessage, JSON.stringify(paymentPayload));
      
      if (result.paymentRequired) {
        addMessage('Payment failed. Please try again.', 'error');
      } else {
        addMessage(result.response, 'bot');
        setPendingPayment(null);
        setPendingMessage('');
      }
    } catch (error) {
      console.error("Payment processing error:", error);
      addMessage('Payment failed. Please try again.', 'error');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Handle user input submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isTyping || !isConnected) return;

    const userMessage = userInput.trim();
    setUserInput('');
    autoResize();

    addMessage(userMessage, 'user');
    setIsTyping(true);

    try {
      const result = await sendMessage(userMessage);
      
      if (result.paymentRequired) {
        // Payment required - show payment UI
        setPendingPayment(result.paymentRequired);
        setPendingMessage(userMessage); // Store the original message
        addMessage(`Payment required: ${result.paymentRequired.price} for ${result.paymentRequired.endpoint}`, 'payment');
      } else {
        addMessage(result.response, 'bot');
      }
    } catch (error) {
      console.error("Error sending message:", error);
      addMessage('Sorry, I encountered an error. Please try again. (Is your wallet connected?)', 'error');
    } finally {
      setIsTyping(false);
    }
  };

  // Handle attach button click
  const handleAttach = () => {
    if (!isConnected) {
      alert('Please connect your wallet to use this feature.');
      return;
    }
    alert('File attachment feature coming soon!');
  };

  // Function to start a new chat
  const startNewChat = useCallback(() => {
    if (!isConnected) return;
    setMessages([]);
    setChatTitle('New Chat');
    setShowWelcome(true);
    if (userInputRef.current) {
      userInputRef.current.focus();
    }
  }, [isConnected]);

  // Function to load a specific chat (currently just changes title)
  const loadChat = useCallback((id: string) => {
    if (!isConnected) return;
    const titles: { [key: string]: string } = {
      'quantum-computing': 'Quantum Computing Explained',
      'birthday-ideas': '10-year-old birthday ideas',
      'sql-california': 'SQL for California Users',
      'ai-ethics': 'Article Summary: AI Ethics',
    };
    setMessages([]);
    setChatTitle(titles[id] || 'New Chat');
    setShowWelcome(true);
    if (userInputRef.current) {
      userInputRef.current.focus();
    }
  }, [isConnected]);


  // Effect for initial setup and scrolling
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, showWelcome, scrollToBottom]);

  // Effect for textarea auto-resize on input change
  useEffect(() => {
    autoResize();
  }, [userInput, autoResize]);

  // Keyboard shortcuts (e.g., Ctrl+/ to focus input)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        userInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Enable/disable send button based on input, typing status, AND connection status
  useEffect(() => {
    if (sendButtonRef.current) {
      sendButtonRef.current.disabled = !userInput.trim() || isTyping || !isConnected || isProcessingPayment;
    }
  }, [userInput, isTyping, isConnected, isProcessingPayment]);


  // Helper to render message bubbles
  const renderMessage = (message: ChatMessage) => {
    if (message.type === 'user') {
      return (
        <div key={message.id} className="message user">
          <div className="message-bubble user">{message.text}</div>
        </div>
      );
    } else if (message.type === 'error') {
      return (
        <div key={message.id} className="message">
          <div className="message-avatar ai">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div className="message-bubble ai" style={{ borderColor: '#ef4444', backgroundColor: '#fef2f2' }}>
            {message.text}
          </div>
        </div>
      );
    } else if (message.type === 'payment') {
      return (
        <div key={message.id} className="message">
          <div className="message-avatar ai">
            <i className="fas fa-credit-card"></i>
          </div>
          <div className="message-bubble ai" style={{ borderColor: '#f59e0b', backgroundColor: '#fffbeb' }}>
            <div style={{ marginBottom: '12px' }}>
              {message.text}
            </div>
            
            {/* Cross-chain payment explanation */}
            <div style={{ 
              marginBottom: '16px', 
              padding: '12px', 
              backgroundColor: '#f3f4f6', 
              borderRadius: '8px',
              fontSize: '13px',
              color: '#374151'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>
                🔗 Cross-Chain Payment Flow:
              </div>
              <div style={{ marginBottom: '6px' }}>
                <span style={{ color: '#7c3aed' }}>1. You sign on Polygon Amoy</span> (your network)
              </div>
              <div style={{ marginBottom: '6px' }}>
                <span style={{ color: '#059669' }}>2. Merchant receives on 0G Testnet</span> (their network)
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
                Our solver facilitates the cross-chain settlement automatically
              </div>
            </div>
            
            <button
              onClick={handlePayment}
              disabled={isProcessingPayment}
              style={{
                backgroundColor: '#f59e0b',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: isProcessingPayment ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {isProcessingPayment ? 'Processing...' : 'Sign on Polygon Amoy'}
            </button>
          </div>
        </div>
      );
    } else {
      return (
        <div key={message.id} className="message">
          <div className="message-avatar ai">
            <i className="fas fa-robot"></i>
          </div>
          <div className="message-bubble ai">
            {message.text}
          </div>
        </div>
      );
    }
  };

  // Main rendering logic
  let content;
  if (!isClientMounted) {
    content = (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-900 text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 100 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold mb-6">Loading Emergent AI...</h1>
          <p className="text-xl mb-8">Please wait while we initialize the application.</p>
        </motion.div>
      </div>
    );
  }  else {
    // If client mounted AND connected, show the full chat interface
    content = (
      <>
        {/* Sidebar */}
        <div className="sidebar">
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <i className="fas fa-robot"></i>
              <span>Emergent AI</span>
            </div>
          </div>

          <button className="new-chat-btn" onClick={startNewChat} disabled={!isConnected}>
            + New Chat
          </button>

          <div className="chat-history scrollbar-hide">
            <div className="chat-history-title">Chat History</div>
            <div className="chat-item" onClick={() => loadChat('quantum-computing')}>
              Quantum Computing Explai..
            </div>
            <div className="chat-item" onClick={() => loadChat('birthday-ideas')}>
              10-year-old birthday ideas
            </div>
            <div className="chat-item" onClick={() => loadChat('sql-california')}>
              SQL for California Users
            </div>
            <div className="chat-item" onClick={() => loadChat('ai-ethics')}>
              Article Summary: AI Ethics
            </div>
          </div>

          <div className="sidebar-footer">
            <div className="user-profile">
              <div className="user-avatar">
                <i className="fas fa-user"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          {/* Chat Header */}
          <div className="chat-header">
            <h1 className="chat-title" id="chat-title">{chatTitle}</h1>
            <div className="header-actions">
            {!isConnected ?
               <WalletConnectButton />:
               <div>
                {truncateString(address,10)}</div>}
            </div>
          </div>

          {/* Chat Messages */}
          <div className="chat-messages scrollbar-hide" id="chat-window" ref={chatWindowRef}>
            {showWelcome && (
              <div className="welcome-message" id="welcome-message">
                    <Image src={AIlogo} alt="Description of image" width={100} height={100} className="logoimage"/>
                <h2 className="welcome-title">Welcome to Smart Agent</h2>
                <p className="welcome-subtitle">Your intelligent agent with ASI and payment capabilities</p>
                <div className="welcome-features">
                  <div className="feature-item">
                    <i className="fas fa-cloud-sun"></i>
                    <span>Weather Information</span>
                  </div>
                  <div className="feature-item">
                    <i className="fas fa-credit-card"></i>
                    <span>Payment Processing</span>
                  </div>
                  <div className="feature-item">
                    <i className="fas fa-image"></i>
                    <span>Image Creation</span>
                  </div>
                  <div className="feature-item">
                    <i className="fas fa-robot"></i>
                    <span>AI Assistant</span>
                  </div>
                </div>
                <div className="welcome-examples">
                  <p>Try asking:</p>
                  <ul>
                    <li>"What's the weather like?"</li>
                    <li>"Check my balance"</li>
                    <li>"Create an image"</li>
                    <li>"Send payment to agent1q..."</li>
                  </ul>
                </div>
              </div>
            )}
            {messages.map(renderMessage)}
          </div>

          {/* Typing Indicator */}
          {isTyping && (
            <div id="typing-indicator" className="typing-indicator">
              <div className="message-avatar ai">
                <i className="fas fa-robot"></i>
              </div>
              <div className="typing-dots">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
              <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>AI is thinking...</span>
            </div>
          )}

          {/* Input Area */}
          <div className="input-area">
            <form id="chat-form" className="input-container" onSubmit={handleSubmit}>
              <div className="input-wrapper">
                <button type="button" className="input-add-btn" id="attach-button" title="Attach File" onClick={handleAttach} disabled={!isConnected}>
                  <i className="fas fa-plus"></i>
                </button>
                <textarea
                  id="user-input"
                  className="message-input"
                  placeholder={isConnected ? "Ask me anything..." : "Connect your wallet to chat..."}
                  rows={1}
                  required
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      handleSubmit(e);
                    }
                  }}
                  ref={userInputRef}
                  disabled={!isConnected}
                ></textarea>
              </div>
              <button type="submit" className="send-btn" id="send-button" ref={sendButtonRef} disabled={!userInput.trim() || isTyping || !isConnected || isProcessingPayment}>
                <span>Send</span>
                <i className="fas fa-arrow-right"></i>
              </button>
            </form>
            <div className="disclaimer">
              Smart Agent can make mistakes. Consider checking important information. Powered by ASI and TransactAI.
            </div>
          </div>
        </div>
      </>
    );
  }

  return <div className="app-container">{content}</div>;
}


// Clean AI Chatbot with Modern UX
class AIChatbot {
    constructor() {
        this.chatWindow = document.getElementById('chat-window');
        this.chatForm = document.getElementById('chat-form');
        this.userInput = document.getElementById('user-input');
        this.typingIndicator = document.getElementById('typing-indicator');
        this.sendButton = document.getElementById('send-button');
        this.attachButton = document.getElementById('attach-button');
        this.welcomeMessage = document.getElementById('welcome-message');
        this.chatTitle = document.getElementById('chat-title');
        
        this.isTyping = false;
        this.messageCount = 0;
        this.currentChatId = 'default';
        
        this.initializeEventListeners();
        this.setupMobileOptimizations();
        this.addMicroInteractions();
        this.addSampleMessages();
    }
    
    initializeEventListeners() {
        this.chatForm.addEventListener('submit', (e) => this.handleSubmit(e));
        this.userInput.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.userInput.addEventListener('input', () => this.handleInput());
        this.attachButton.addEventListener('click', () => this.handleAttach());
        
        // Auto-resize textarea
        this.userInput.addEventListener('input', () => this.autoResize());
    }
    
    handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.chatForm.dispatchEvent(new Event('submit'));
        }
    }
    
    handleInput() {
        const hasText = this.userInput.value.trim().length > 0;
        this.sendButton.disabled = !hasText || this.isTyping;
    }
    
    handleAttach() {
        // Future: Implement file attachment functionality
        this.showNotification('File attachment feature coming soon!', 'info');
    }
    
    autoResize() {
        this.userInput.style.height = 'auto';
        this.userInput.style.height = Math.min(this.userInput.scrollHeight, 128) + 'px';
    }
    
    addSampleMessages() {
        // Add sample conversation like in the reference image
        if (this.messageCount === 0) {
            this.addUserMessage("Tell me a joke about programming.");
            this.addBotMessage("Why do programmers prefer dark mode? Because light attracts bugs!");
            this.hideWelcomeMessage();
        }
    }
    
    // Enhanced mobile support
    setupMobileOptimizations() {
        // Prevent zoom on input focus (iOS)
        this.userInput.addEventListener('focus', () => {
            if (window.innerWidth < 768) {
                document.querySelector('meta[name="viewport"]').setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
            }
        });
        
        this.userInput.addEventListener('blur', () => {
            if (window.innerWidth < 768) {
                document.querySelector('meta[name="viewport"]').setAttribute('content', 'width=device-width, initial-scale=1.0');
            }
        });
        
        // Handle virtual keyboard
        window.addEventListener('resize', () => {
            setTimeout(() => {
                this.scrollToBottom();
            }, 300);
        });
    }
    
    async handleSubmit(e) {
        e.preventDefault();
        
        const message = this.userInput.value.trim();
        if (!message || this.isTyping) return;
        
        // Clear input and disable form
        this.userInput.value = '';
        this.autoResize();
        this.sendButton.disabled = true;
        
        // Hide welcome message if it exists
        this.hideWelcomeMessage();
        
        // Add user message
        this.addUserMessage(message);
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            const response = await this.sendMessage(message);
            this.hideTypingIndicator();
            this.addBotMessage(response);
        } catch (error) {
            this.hideTypingIndicator();
            this.addErrorMessage('Sorry, I encountered an error. Please try again.');
            console.error('Chat error:', error);
        }
    }
    
    async sendMessage(message) {
        const response = await fetch('http://127.0.0.1:8000/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message }),
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.response;
    }
    
    addWelcomeMessage() {
        // Welcome message is already in HTML, no need to add here
    }
    
    hideWelcomeMessage() {
        if (this.welcomeMessage) {
            this.welcomeMessage.style.display = 'none';
        }
    }
    
    showWelcomeMessage() {
        if (this.welcomeMessage) {
            this.welcomeMessage.style.display = 'block';
        }
    }
    
    addUserMessage(message) {
        const messageElement = this.createMessageElement(message, 'user');
        this.chatWindow.appendChild(messageElement);
        this.scrollToBottom();
        this.messageCount++;
    }
    
    addBotMessage(message) {
        const messageElement = this.createMessageElement(message, 'bot');
        this.chatWindow.appendChild(messageElement);
        this.scrollToBottom();
        this.messageCount++;
    }
    
    addErrorMessage(message) {
        const messageElement = this.createMessageElement(message, 'error');
        this.chatWindow.appendChild(messageElement);
        this.scrollToBottom();
    }
    
    createMessageElement(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type === 'user' ? 'user' : ''}`;
        
        if (type === 'user') {
            // User message (right-aligned)
            const bubbleDiv = document.createElement('div');
            bubbleDiv.className = 'message-bubble user';
            bubbleDiv.textContent = message;
            messageDiv.appendChild(bubbleDiv);
        } else if (type === 'error') {
            // Error message
            const avatarDiv = document.createElement('div');
            avatarDiv.className = 'message-avatar ai';
            avatarDiv.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
            
            const bubbleDiv = document.createElement('div');
            bubbleDiv.className = 'message-bubble ai';
            bubbleDiv.style.borderColor = '#ef4444';
            bubbleDiv.style.backgroundColor = '#fef2f2';
            bubbleDiv.textContent = message;
            
            messageDiv.appendChild(avatarDiv);
            messageDiv.appendChild(bubbleDiv);
        } else {
            // AI message with avatar and actions
            const avatarDiv = document.createElement('div');
            avatarDiv.className = 'message-avatar ai';
            avatarDiv.innerHTML = '<i class="fas fa-robot"></i>';
            
            const bubbleDiv = document.createElement('div');
            bubbleDiv.className = 'message-bubble ai';
            bubbleDiv.textContent = message;
            
            // Add message actions
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'message-actions';
            actionsDiv.innerHTML = `
                <button class="action-icon" title="Like">
                    <i class="fas fa-thumbs-up"></i>
                </button>
                <button class="action-icon" title="Dislike">
                    <i class="fas fa-thumbs-down"></i>
                </button>
                <button class="action-icon" title="Copy">
                    <i class="fas fa-copy"></i>
                </button>
            `;
            
            bubbleDiv.appendChild(actionsDiv);
            messageDiv.appendChild(avatarDiv);
            messageDiv.appendChild(bubbleDiv);
        }
        
        return messageDiv;
    }
    
    showTypingIndicator() {
        this.isTyping = true;
        this.typingIndicator.style.display = 'flex';
        this.sendButton.disabled = true;
        this.scrollToBottom();
    }
    
    hideTypingIndicator() {
        this.isTyping = false;
        this.typingIndicator.style.display = 'none';
        this.sendButton.disabled = false;
    }
    
    scrollToBottom() {
        setTimeout(() => {
            this.chatWindow.scrollTop = this.chatWindow.scrollHeight;
        }, 100);
    }
    
    showNotification(message, type = 'info') {
        // Create premium notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl text-white backdrop-blur-sm border transition-all duration-300 transform translate-x-full ${
            type === 'info' 
                ? 'bg-emerald-500/90 border-emerald-400/30' 
                : 'bg-green-500/90 border-green-400/30'
        }`;
        
        notification.style.fontFamily = "'Inter', sans-serif";
        notification.style.fontWeight = '500';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove notification after 4 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(full)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }
    
    // Enhanced micro-interactions
    addMicroInteractions() {
        // Add subtle hover effects to message bubbles
        document.addEventListener('mouseover', (e) => {
            if (e.target.closest('.message-bubble')) {
                e.target.closest('.message-bubble').style.transform = 'translateY(-1px)';
                e.target.closest('.message-bubble').style.transition = 'transform 0.2s ease';
            }
        });
        
        document.addEventListener('mouseout', (e) => {
            if (e.target.closest('.message-bubble')) {
                e.target.closest('.message-bubble').style.transform = 'translateY(0)';
            }
        });
        
        // Add keyboard shortcut hints
        this.addKeyboardHints();
    }
    
    addKeyboardHints() {
        // Add subtle keyboard shortcut indicator
        const inputContainer = document.querySelector('#user-input').parentElement;
        const hint = document.createElement('div');
        hint.className = 'absolute -bottom-6 left-0 text-xs text-slate-500 font-medium opacity-0 transition-opacity duration-200';
        hint.innerHTML = 'Press <kbd class="px-1 py-0.5 bg-slate-700 rounded text-xs">Enter</kbd> to send, <kbd class="px-1 py-0.5 bg-slate-700 rounded text-xs">Ctrl+/</kbd> to focus';
        inputContainer.appendChild(hint);
        
        // Show hint on focus
        this.userInput.addEventListener('focus', () => {
            hint.style.opacity = '1';
        });
        
        this.userInput.addEventListener('blur', () => {
            hint.style.opacity = '0';
        });
    }
}

// Global functions for sidebar functionality
function startNewChat() {
    // Clear current chat
    const chatWindow = document.getElementById('chat-window');
    const welcomeMessage = document.getElementById('welcome-message');
    
    // Remove all messages except welcome
    const messages = chatWindow.querySelectorAll('.message');
    messages.forEach(msg => msg.remove());
    
    // Show welcome message
    if (welcomeMessage) {
        welcomeMessage.style.display = 'block';
    }
    
    // Update title
    const chatTitle = document.getElementById('chat-title');
    if (chatTitle) {
        chatTitle.textContent = 'New Chat';
    }
    
    // Focus input
    const userInput = document.getElementById('user-input');
    if (userInput) {
        userInput.focus();
    }
    
    // Reset message count
    if (window.chatbot) {
        window.chatbot.messageCount = 0;
    }
}

function loadChat(chatId) {
    // Update title based on chat ID
    const chatTitle = document.getElementById('chat-title');
    const titles = {
        'quantum-computing': 'Quantum Computing Explained',
        'birthday-ideas': '10-year-old birthday ideas',
        'sql-california': 'SQL for California Users',
        'ai-ethics': 'Article Summary: AI Ethics'
    };
    
    if (chatTitle && titles[chatId]) {
        chatTitle.textContent = titles[chatId];
    }
    
    // Clear current messages and show welcome
    const chatWindow = document.getElementById('chat-window');
    const welcomeMessage = document.getElementById('welcome-message');
    
    const messages = chatWindow.querySelectorAll('.message');
    messages.forEach(msg => msg.remove());
    
    if (welcomeMessage) {
        welcomeMessage.style.display = 'block';
    }
    
    // Focus input
    const userInput = document.getElementById('user-input');
    if (userInput) {
        userInput.focus();
    }
}

// Initialize the chatbot when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chatbot = new AIChatbot();
    
    // Add smooth scrolling behavior
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Add loading animation for page load
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease-in-out';
    
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === '/') {
            e.preventDefault();
            document.getElementById('user-input').focus();
        }
    });
    
    // Add click outside to focus input
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#chat-window') && !e.target.closest('form')) {
            document.getElementById('user-input').focus();
        }
    });
});

const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');

// Store conversation history for Claude API
let conversationHistory = [];

// System prompt for Claude to guide its behavior
const SYSTEM_PROMPT = `You are a thoughtful decision-making coach helping someone work through a difficult choice. Your goal is to:

1. Ask specific, personalized follow-up questions based on what they tell you
2. Help them uncover their values, constraints, and what's really making this decision hard
3. Be conversational and natural - avoid generic advice or templated responses
4. Listen carefully to their specific situation and respond to the details they share
5. Guide them toward clarity by asking questions like:
   - What matters most to you in this situation?
   - What would you tell a friend in this position?
   - What are you afraid might happen?
   - What excites you about each option?
   - What constraints or deadlines are you working with?

Keep responses concise (2-4 sentences max). Be warm, curious, and focused on understanding their unique situation. Don't give direct advice - help them find their own answer through thoughtful questions.`;

function addMessage(content, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'assistant-message'}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    // Handle line breaks and formatting
    const formattedContent = content.replace(/\n/g, '<br>');
    contentDiv.innerHTML = `<p>${formattedContent}</p>`;

    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant-message';
    typingDiv.id = 'typing-indicator';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = `
        <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;

    typingDiv.appendChild(contentDiv);
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

async function callClaudeAPI(userMessage) {
    // Add user message to history
    conversationHistory.push({
        role: 'user',
        content: userMessage
    });

    try {
        // Call our local server instead of Claude API directly
        const response = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                system: SYSTEM_PROMPT,
                messages: conversationHistory
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server Error: ${response.status}`);
        }

        const data = await response.json();
        const assistantMessage = data.content[0].text;

        // Add assistant response to history
        conversationHistory.push({
            role: 'assistant',
            content: assistantMessage
        });

        return assistantMessage;
    } catch (error) {
        console.error('Error calling server:', error);

        // Remove the user message from history if the API call failed
        conversationHistory.pop();

        throw error;
    }
}

async function handleSend() {
    const message = userInput.value.trim();

    if (!message) return;

    // Add user message
    addMessage(message, true);

    // Clear input
    userInput.value = '';
    userInput.style.height = 'auto';

    // Disable send button
    sendButton.disabled = true;

    // Show typing indicator
    showTypingIndicator();

    try {
        const response = await callClaudeAPI(message);
        removeTypingIndicator();
        addMessage(response, false);
    } catch (error) {
        removeTypingIndicator();
        addMessage('Sorry, I encountered an error. Please check your API key in config.js and try again.', false);
        console.error('Error:', error);
    } finally {
        sendButton.disabled = false;
        userInput.focus();
    }
}

// Event listeners
sendButton.addEventListener('click', handleSend);

userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
});

// Auto-resize textarea
userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = userInput.scrollHeight + 'px';
});

// Focus input on load
userInput.focus();

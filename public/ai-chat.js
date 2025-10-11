// AI Chat Page JavaScript
(function() {
    'use strict';

    // DOM Elements
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendButton = document.getElementById('sendButton');
    const statusMessage = document.getElementById('statusMessage');
    const welcomeMessage = document.getElementById('welcomeMessage');

    // State
    let isProcessing = false;

    // Initialize
    function init() {
        // Event Listeners
        sendButton.addEventListener('click', sendMessage);
        
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Auto-resize textarea
        chatInput.addEventListener('input', autoResizeTextarea);
        
        // Focus input on load
        chatInput.focus();
    }

    // Auto-resize textarea based on content
    function autoResizeTextarea() {
        chatInput.style.height = 'auto';
        const newHeight = Math.min(chatInput.scrollHeight, 150);
        chatInput.style.height = newHeight + 'px';
    }

    // Send message
    async function sendMessage() {
        const message = chatInput.value.trim();

        if (!message || isProcessing) {
            return;
        }

        try {
            // Hide welcome message if it exists
            if (welcomeMessage) {
                welcomeMessage.style.display = 'none';
            }

            // Set processing state
            isProcessing = true;
            chatInput.disabled = true;
            sendButton.disabled = true;
            sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            updateStatus('در حال ارسال پیام...', 'loading');

            // Add user message to chat
            addMessage(message, 'user');

            // Clear input
            chatInput.value = '';
            chatInput.style.height = 'auto';

            // Scroll to bottom
            scrollToBottom();

            // Show typing indicator
            const typingIndicator = addTypingIndicator();

            // Send to API
            const response = await fetch('/api/chat/send-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
            });

            const result = await response.json();

            // Remove typing indicator
            removeTypingIndicator(typingIndicator);

            if (result.success && result.data && result.data.aiResponse) {
                // Add AI response
                addMessage(result.data.aiResponse, 'bot');
                updateStatus('پیام ارسال شد', 'success');
            } else {
                throw new Error(result.error || 'خطا در دریافت پاسخ');
            }

        } catch (error) {
            console.error('Error sending message:', error);
            addMessage('متاسفانه خطایی رخ داد. لطفاً دوباره تلاش کنید.', 'bot', true);
            updateStatus('خطا در ارسال پیام', 'error');
        } finally {
            // Reset state
            isProcessing = false;
            chatInput.disabled = false;
            sendButton.disabled = false;
            sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
            chatInput.focus();

            // Clear status after 3 seconds
            setTimeout(() => {
                updateStatus('', '');
            }, 3000);

            scrollToBottom();
        }
    }

    // Add message to chat
    function addMessage(text, sender, isError = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}-message`;

        const avatarIcon = sender === 'user' ? 'fas fa-user' : 'fas fa-robot';
        const currentTime = new Date().toLocaleTimeString('fa-IR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        const formattedText = formatMessage(text);
        const copyButton = sender === 'bot' && !isError ? 
            `<button class="copy-btn" onclick="copyMessageText(this)" title="کپی متن">
                <i class="fas fa-copy"></i>
            </button>` : '';

        messageDiv.innerHTML = `
            <div class="message-avatar-wrapper">
                <i class="${avatarIcon}"></i>
            </div>
            <div class="message-content-wrapper">
                <div class="message-bubble ${isError ? 'error-bubble' : ''}">
                    ${copyButton}
                    <div class="message-text">${formattedText}</div>
                    <span class="message-time">${currentTime}</span>
                </div>
            </div>
        `;

        chatMessages.appendChild(messageDiv);
        
        // Animate message entrance
        setTimeout(() => {
            messageDiv.style.opacity = '1';
        }, 50);
    }

    // Format message text
    function formatMessage(text) {
        if (!text) return '';
        
        // Escape HTML
        const div = document.createElement('div');
        div.textContent = text;
        let formatted = div.innerHTML;
        
        // Add line breaks
        formatted = formatted.replace(/\n/g, '<br>');
        
        // Remove excessive line breaks
        formatted = formatted.replace(/(<br>\s*){3,}/g, '<br><br>');
        
        return formatted;
    }

    // Add typing indicator
    function addTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message bot-message typing-indicator';
        typingDiv.id = 'typing-indicator';

        typingDiv.innerHTML = `
            <div class="message-avatar-wrapper">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content-wrapper">
                <div class="typing-indicator-wrapper">
                    <span class="typing-text">در حال تایپ</span>
                    <div class="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        `;

        chatMessages.appendChild(typingDiv);
        scrollToBottom();

        return typingDiv;
    }

    // Remove typing indicator
    function removeTypingIndicator(indicator) {
        if (indicator && indicator.parentNode) {
            indicator.remove();
        }
    }

    // Update status message
    function updateStatus(text, type) {
        statusMessage.textContent = text;
        statusMessage.className = `status-message ${type}`;
    }

    // Scroll to bottom
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Copy message text (global function for onclick)
    window.copyMessageText = function(button) {
        const messageText = button.parentElement.querySelector('.message-text');
        const textToCopy = messageText.textContent || messageText.innerText;

        navigator.clipboard.writeText(textToCopy).then(() => {
            // Show success feedback
            const originalIcon = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i>';
            button.style.color = '#10b981';

            setTimeout(() => {
                button.innerHTML = originalIcon;
                button.style.color = '';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy:', err);
            
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = textToCopy;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.select();
            
            try {
                document.execCommand('copy');
                
                // Show success feedback
                const originalIcon = button.innerHTML;
                button.innerHTML = '<i class="fas fa-check"></i>';
                button.style.color = '#10b981';

                setTimeout(() => {
                    button.innerHTML = originalIcon;
                    button.style.color = '';
                }, 2000);
            } catch (err) {
                console.error('Fallback copy failed:', err);
            }
            
            document.body.removeChild(textArea);
        });
    };

    // Initialize on DOM load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();



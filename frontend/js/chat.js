const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', function() {
    loadUserInfo();
});

async function loadUserInfo() {
    try {
        const response = await fetch(`${API_BASE}/check-auth`, { credentials: 'include' });
        const data = await response.json();
        if (data.authenticated) {
            document.getElementById('userName').textContent = `${data.user.real_name || data.user.username} (${data.user.role === 'admin' ? '管理员' : '从业者'})`;
            
            if (data.user.role === 'admin') {
                const customerLink = document.getElementById('customerLink');
                const userLink = document.getElementById('userLink');
                if (customerLink) customerLink.style.display = 'block';
                if (userLink) userLink.style.display = 'block';
            }
        } else {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('加载用户信息失败:', error);
        window.location.href = '/login';
    }
}

async function logout() {
    try {
        await fetch(`${API_BASE}/logout`, { method: 'POST', credentials: 'include' });
        window.location.href = '/login';
    } catch (error) {
        console.error('退出登录失败:', error);
        window.location.href = '/login';
    }
}

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const message = input.value.trim();
    
    if (!message) return;
    
    const messagesDiv = document.getElementById('chatMessages');
    
    // 创建用户消息
    const userMsg = document.createElement('div');
    userMsg.className = 'message user';
    userMsg.innerHTML = `
        <div class="message-bubble">
            <span class="message-label">我</span>
            <div class="message-content">${escapeHtml(message)}</div>
        </div>
    `;
    messagesDiv.appendChild(userMsg);
    
    // 清空输入框，禁用按钮
    input.value = '';
    input.disabled = true;
    sendBtn.disabled = true;
    
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    // 创建AI消息容器
    const aiMsg = document.createElement('div');
    aiMsg.className = 'message assistant';
    aiMsg.innerHTML = `
        <div class="message-bubble">
            <span class="message-label">AI顾问</span>
            <div class="message-content"></div>
        </div>
    `;
    messagesDiv.appendChild(aiMsg);
    
    const contentDiv = aiMsg.querySelector('.message-content');
    
    try {
        const response = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // 逐字显示动画
            const responseText = result.response || '';
            await typeText(contentDiv, responseText, 30);
        } else {
            contentDiv.textContent = `错误: ${result.error || '请求失败'}`;
            contentDiv.style.color = '#ef4444';
        }
        
    } catch (error) {
        contentDiv.textContent = `网络错误: ${error.message}`;
        contentDiv.style.color = '#ef4444';
    }
    
    // 恢复输入框
    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function typeText(element, text, speed = 30) {
    return new Promise((resolve) => {
        let index = 0;
        const messagesDiv = document.getElementById('chatMessages');
        
        // 添加闪烁光标
        const cursor = document.createElement('span');
        cursor.className = 'typing-cursor';
        element.appendChild(cursor);
        
        const timer = setInterval(() => {
            if (index < text.length) {
                // 在光标前插入文字
                element.insertBefore(document.createTextNode(text.charAt(index)), cursor);
                index++;
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            } else {
                clearInterval(timer);
                // 移除光标
                if (cursor.parentNode) {
                    cursor.parentNode.removeChild(cursor);
                }
                resolve();
            }
        }, speed);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

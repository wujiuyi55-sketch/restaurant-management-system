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

async function runAnalysis() {
    const resultDiv = document.getElementById('analysisResult');
    const contentDiv = document.getElementById('analysisContent');
    
    resultDiv.style.display = 'block';
    contentDiv.innerHTML = '正在分析中，请稍候...';
    
    try {
        const response = await fetch(`${API_BASE}/analysis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            contentDiv.innerHTML = result.analysis;
        } else {
            contentDiv.innerHTML = '分析失败: ' + (result.error || '未知错误');
        }
    } catch (error) {
        contentDiv.innerHTML = '分析失败: ' + error.message;
    }
}

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
            
            document.getElementById('userUsername').textContent = data.user.username;
            document.getElementById('userRealName').textContent = data.user.real_name || '-';
            document.getElementById('userRole').textContent = data.user.role === 'admin' ? '管理员' : '从业者';
            document.getElementById('userCreatedAt').textContent = data.user.created_at ? data.user.created_at.split(' ')[0] : '-';
            
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

async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const messageDiv = document.getElementById('message');
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        showMessage('请填写所有字段', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showMessage('两次输入的新密码不一致', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showMessage('新密码长度不能少于6位', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/change-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage(result.message, 'success');
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            showMessage(result.error || '修改失败', 'error');
        }
    } catch (error) {
        console.error('修改密码失败:', error);
        showMessage('修改密码失败，请稍后重试', 'error');
    }
}

function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = 'message ' + type;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}
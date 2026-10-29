const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', function() {
    loadUserInfo();
    loadUsers();
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

async function loadUsers() {
    const response = await fetch(`${API_BASE}/users`);
    const users = await response.json();
    
    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.real_name || '-'}</td>
            <td>${user.role === 'admin' ? '管理员' : '从业者'}</td>
            <td>${user.created_at ? user.created_at.split(' ')[0] : '-'}</td>
            <td>
                <button class="edit-btn" onclick="openEditModal(${user.id})">编辑</button>
                <button class="delete-btn" onclick="deleteUser(${user.id})">删除</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function openAddModal() {
    document.getElementById('modalTitle').textContent = '添加用户';
    document.getElementById('userId').value = '';
    document.getElementById('username').value = '';
    document.getElementById('realName').value = '';
    document.getElementById('password').value = '';
    document.getElementById('role').value = 'staff';
    document.getElementById('userModal').style.display = 'block';
}

async function openEditModal(id) {
    const response = await fetch(`${API_BASE}/users/${id}`);
    const user = await response.json();
    
    document.getElementById('modalTitle').textContent = '编辑用户';
    document.getElementById('userId').value = user.id;
    document.getElementById('username').value = user.username;
    document.getElementById('realName').value = user.real_name || '';
    document.getElementById('password').value = '';
    document.getElementById('role').value = user.role;
    document.getElementById('userModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('userModal').style.display = 'none';
}

async function saveUser() {
    const id = document.getElementById('userId').value;
    const data = {
        username: document.getElementById('username').value,
        realName: document.getElementById('realName').value,
        role: document.getElementById('role').value
    };
    
    const password = document.getElementById('password').value;
    if (password) {
        data.password = password;
    }
    
    let response;
    if (id) {
        response = await fetch(`${API_BASE}/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    } else {
        response = await fetch(`${API_BASE}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    }
    
    const result = await response.json();
    
    if (response.ok) {
        alert(result.message);
        closeModal();
        loadUsers();
    } else {
        alert(result.error || '操作失败');
    }
}

async function deleteUser(id) {
    if (!confirm('确定要删除这个用户吗？')) {
        return;
    }
    
    const response = await fetch(`${API_BASE}/users/${id}`, {
        method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (response.ok) {
        alert(result.message);
        loadUsers();
    } else {
        alert(result.error || '删除失败');
    }
}

window.addEventListener('click', function(e) {
    const modal = document.getElementById('userModal');
    if (e.target === modal) {
        closeModal();
    }
});

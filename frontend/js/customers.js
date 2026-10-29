const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', function() {
    loadUserInfo();
    loadCustomers();
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
    await fetch(`${API_BASE}/logout`, { method: 'POST' });
    window.location.href = '/login';
}

async function loadCustomers() {
    const response = await fetch(`${API_BASE}/customers`);
    const customers = await response.json();
    
    const tbody = document.getElementById('dataTableBody');
    tbody.innerHTML = '';
    
    customers.forEach(customer => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${customer.id}</td>
            <td>${customer.name}</td>
            <td>${customer.phone || '-'}</td>
            <td>${customer.email || '-'}</td>
            <td>¥${parseFloat(customer.total_spent || 0).toLocaleString()}</td>
            <td>${customer.visit_count || 0}</td>
            <td>${customer.last_visit || '-'}</td>
            <td>
                <button class="edit-btn" onclick="openEditModal(${customer.id})">编辑</button>
                <button class="delete-btn" onclick="deleteData(${customer.id})">删除</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function openAddModal() {
    document.getElementById('modalTitle').textContent = '添加客户';
    document.getElementById('dataId').value = '';
    document.getElementById('name').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('email').value = '';
    document.getElementById('total_spent').value = '0';
    document.getElementById('visit_count').value = '0';
    document.getElementById('last_visit').value = '';
    document.getElementById('dataModal').style.display = 'block';
}

async function openEditModal(id) {
    const response = await fetch(`${API_BASE}/customers/${id}`);
    const customer = await response.json();
    
    document.getElementById('modalTitle').textContent = '编辑客户';
    document.getElementById('dataId').value = customer.id;
    document.getElementById('name').value = customer.name;
    document.getElementById('phone').value = customer.phone || '';
    document.getElementById('email').value = customer.email || '';
    document.getElementById('total_spent').value = customer.total_spent || 0;
    document.getElementById('visit_count').value = customer.visit_count || 0;
    document.getElementById('last_visit').value = customer.last_visit || '';
    document.getElementById('dataModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('dataModal').style.display = 'none';
}

async function saveData() {
    const id = document.getElementById('dataId').value;
    const data = {
        name: document.getElementById('name').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        total_spent: document.getElementById('total_spent').value,
        visit_count: document.getElementById('visit_count').value,
        last_visit: document.getElementById('last_visit').value
    };
    
    let response;
    if (id) {
        response = await fetch(`${API_BASE}/customers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    } else {
        response = await fetch(`${API_BASE}/customers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    }
    
    const result = await response.json();
    
    if (response.ok) {
        alert(result.message);
        closeModal();
        loadCustomers();
    } else {
        alert(result.error || '操作失败');
    }
}

async function deleteData(id) {
    if (!confirm('确定要删除这个客户吗？')) {
        return;
    }
    
    const response = await fetch(`${API_BASE}/customers/${id}`, {
        method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (response.ok) {
        alert(result.message);
        loadCustomers();
    } else {
        alert(result.error || '删除失败');
    }
}

window.addEventListener('click', function(e) {
    const modal = document.getElementById('dataModal');
    if (e.target === modal) {
        closeModal();
    }
});

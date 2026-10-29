const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', function() {
    loadUserInfo();
    loadData();
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

async function loadData() {
    try {
        const response = await fetch(`${API_BASE}/vegetables`, { credentials: 'include' });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        renderTable(data);
    } catch (error) {
        console.error('加载数据失败:', error);
        alert('加载蔬菜采购数据失败，请刷新页面重试');
    }
}

function renderTable(data) {
    const tbody = document.getElementById('dataTableBody');
    tbody.innerHTML = '';
    
    if (!Array.isArray(data) || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;">暂无数据</td></tr>';
        return;
    }
    
    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.id}</td>
            <td>${item.name || '-'}</td>
            <td>${item.quantity || '0'}</td>
            <td>${item.unit || '-'}</td>
            <td>¥${parseFloat(item.unit_price || 0).toFixed(2)}</td>
            <td>¥${parseFloat(item.total_price || 0).toFixed(2)}</td>
            <td>${item.supplier || '-'}</td>
            <td>${item.purchase_date || '-'}</td>
            <td>
                <button class="edit-btn" onclick="openEditModal(${item.id})">编辑</button>
                <button class="delete-btn" onclick="deleteData(${item.id})">删除</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function openAddModal() {
    document.getElementById('modalTitle').textContent = '添加采购记录';
    document.getElementById('dataId').value = '';
    document.getElementById('name').value = '';
    document.getElementById('quantity').value = '';
    document.getElementById('unit').value = '';
    document.getElementById('price').value = '';
    document.getElementById('total_price').value = '';
    document.getElementById('supplier').value = '';
    document.getElementById('purchase_date').value = '';
    document.getElementById('dataModal').style.display = 'block';
}

async function openEditModal(id) {
    try {
        const response = await fetch(`${API_BASE}/vegetables/${id}`, { credentials: 'include' });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const item = await response.json();
        
        document.getElementById('modalTitle').textContent = '编辑采购记录';
        document.getElementById('dataId').value = item.id;
        document.getElementById('name').value = item.name || '';
        document.getElementById('quantity').value = item.quantity || '';
        document.getElementById('unit').value = item.unit || '';
        document.getElementById('price').value = item.unit_price || '';
        document.getElementById('total_price').value = item.total_price || '';
        document.getElementById('supplier').value = item.supplier || '';
        document.getElementById('purchase_date').value = item.purchase_date || '';
        document.getElementById('dataModal').style.display = 'block';
    } catch (error) {
        console.error('加载编辑数据失败:', error);
        alert('加载采购记录失败，请重试');
    }
}

function closeModal() {
    document.getElementById('dataModal').style.display = 'none';
}

async function saveData() {
    const id = document.getElementById('dataId').value;
    const name = document.getElementById('name').value.trim();
    
    if (!name) {
        alert('请输入蔬菜名称');
        return;
    }
    
    const quantity = document.getElementById('quantity').value;
    const unit = document.getElementById('unit').value.trim();
    const price = document.getElementById('price').value;
    const total_price = document.getElementById('total_price').value;
    const supplier = document.getElementById('supplier').value.trim();
    const purchase_date = document.getElementById('purchase_date').value;
    
    const data = {
        name: name,
        quantity: quantity,
        unit: unit,
        unit_price: price,
        total_price: total_price,
        supplier: supplier,
        purchase_date: purchase_date
    };
    
    try {
        let response;
        if (id) {
            response = await fetch(`${API_BASE}/vegetables/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data),
                credentials: 'include'
            });
        } else {
            response = await fetch(`${API_BASE}/vegetables`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data),
                credentials: 'include'
            });
        }
        
        const result = await response.json();
        
        if (response.ok) {
            alert(result.message || '保存成功');
            closeModal();
            loadData();
        } else {
            alert(result.error || '保存失败');
        }
    } catch (error) {
        console.error('保存数据失败:', error);
        alert('保存失败，请检查网络连接后重试');
    }
}

async function deleteData(id) {
    if (!confirm('确定要删除这条采购记录吗？')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/vegetables/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert(result.message || '删除成功');
            loadData();
        } else {
            alert(result.error || '删除失败');
        }
    } catch (error) {
        console.error('删除数据失败:', error);
        alert('删除失败，请检查网络连接后重试');
    }
}

window.addEventListener('click', function(e) {
    const modal = document.getElementById('dataModal');
    if (e.target === modal) {
        closeModal();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    loadUserInfo();
    loadData();
    
    document.getElementById('fruitQuantity').addEventListener('input', calculateTotal);
    document.getElementById('fruitPrice').addEventListener('input', calculateTotal);
});

async function loadUserInfo() {
    try {
        const response = await fetch(`${API_BASE}/check-auth`, { credentials: 'include' });
        const data = await response.json();
        if (data.authenticated) {
            const userNameEl = document.getElementById('userName');
            if (userNameEl) {
                userNameEl.textContent = `${data.user.real_name || data.user.username} (${data.user.role === 'admin' ? '管理员' : '从业者'})`;
            }
            
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
    const tbody = document.getElementById('fruitsTableBody');
    
    try {
        const response = await fetch(`${API_BASE}/fruits`, { credentials: 'include' });
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                window.location.href = '/login';
                return;
            }
            throw new Error(`请求失败: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!Array.isArray(data) || data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 40px; color: #999;">
                        暂无采购记录，点击"添加采购记录"开始
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = data.map(item => `
            <tr>
                <td>${item.id}</td>
                <td>${escapeHtml(item.name || '')}</td>
                <td>${parseFloat(item.quantity || 0).toFixed(2)}</td>
                <td>${escapeHtml(item.unit || '')}</td>
                <td>¥${parseFloat(item.price || 0).toFixed(2)}</td>
                <td>¥${parseFloat(item.total || 0).toFixed(2)}</td>
                <td>${escapeHtml(item.supplier || '')}</td>
                <td>${formatDate(item.purchase_date || item.date || '')}</td>
                <td>
                    <button class="edit-btn" onclick="openEditModal(${item.id})">编辑</button>
                    <button class="delete-btn" onclick="deleteData(${item.id})">删除</button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('加载数据失败:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: #f44336;">
                    加载数据失败，请刷新页面重试
                </td>
            </tr>
        `;
    }
}

function openAddModal() {
    document.getElementById('fruitModalTitle').textContent = '添加采购记录';
    document.getElementById('fruitId').value = '';
    document.getElementById('fruitName').value = '';
    document.getElementById('fruitQuantity').value = '';
    document.getElementById('fruitUnit').value = '斤';
    document.getElementById('fruitPrice').value = '';
    document.getElementById('fruitTotal').value = '';
    document.getElementById('fruitSupplier').value = '';
    document.getElementById('fruitDate').value = getTodayDate();
    document.getElementById('fruitModal').style.display = 'block';
}

async function openEditModal(id) {
    try {
        const response = await fetch(`${API_BASE}/fruits/${id}`, { credentials: 'include' });
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                window.location.href = '/login';
                return;
            }
            throw new Error(`请求失败: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            alert('加载数据失败: ' + (data.error || '未知错误'));
            return;
        }
        
        document.getElementById('fruitModalTitle').textContent = '编辑采购记录';
        document.getElementById('fruitId').value = data.id || id;
        document.getElementById('fruitName').value = data.name || '';
        document.getElementById('fruitQuantity').value = parseFloat(data.quantity || 0);
        document.getElementById('fruitUnit').value = data.unit || '斤';
        document.getElementById('fruitPrice').value = parseFloat(data.price || 0);
        document.getElementById('fruitTotal').value = parseFloat(data.total || 0);
        document.getElementById('fruitSupplier').value = data.supplier || '';
        document.getElementById('fruitDate').value = formatDateForInput(data.purchase_date || data.date || '');
        
        document.getElementById('fruitModal').style.display = 'block';
        
    } catch (error) {
        console.error('加载采购记录失败:', error);
        alert('加载采购记录失败，请重试');
    }
}

function closeModal() {
    document.getElementById('fruitModal').style.display = 'none';
}

async function saveData() {
    const id = document.getElementById('fruitId').value;
    const name = document.getElementById('fruitName').value.trim();
    const quantity = parseFloat(document.getElementById('fruitQuantity').value);
    const unit = document.getElementById('fruitUnit').value;
    const price = parseFloat(document.getElementById('fruitPrice').value);
    const total = parseFloat(document.getElementById('fruitTotal').value);
    const supplier = document.getElementById('fruitSupplier').value.trim();
    const purchase_date = document.getElementById('fruitDate').value;
    
    if (!name) {
        alert('请输入水果名称');
        return;
    }
    
    if (isNaN(quantity) || quantity <= 0) {
        alert('请输入有效的数量');
        return;
    }
    
    if (isNaN(price) || price <= 0) {
        alert('请输入有效的单价');
        return;
    }
    
    if (!supplier) {
        alert('请输入供应商');
        return;
    }
    
    if (!purchase_date) {
        alert('请选择采购日期');
        return;
    }
    
    const data = {
        name: name,
        quantity: quantity,
        unit: unit,
        price: price,
        total: total,
        supplier: supplier,
        purchase_date: purchase_date
    };
    
    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_BASE}/fruits/${id}` : `${API_BASE}/fruits`;
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                window.location.href = '/login';
                return;
            }
            throw new Error(`请求失败: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.error) {
            alert('保存失败: ' + (result.error || '未知错误'));
            return;
        }
        
        alert(result.message || '保存成功');
        closeModal();
        loadData();
        
    } catch (error) {
        console.error('保存数据失败:', error);
        alert('保存数据失败，请重试');
    }
}

async function deleteData(id) {
    if (!confirm('确定要删除这条采购记录吗？')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/fruits/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                window.location.href = '/login';
                return;
            }
            throw new Error(`请求失败: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.error) {
            alert('删除失败: ' + (result.error || '未知错误'));
            return;
        }
        
        alert(result.message || '删除成功');
        loadData();
        
    } catch (error) {
        console.error('删除数据失败:', error);
        alert('删除数据失败，请重试');
    }
}

function calculateTotal() {
    const quantity = parseFloat(document.getElementById('fruitQuantity').value) || 0;
    const price = parseFloat(document.getElementById('fruitPrice').value) || 0;
    const total = quantity * price;
    document.getElementById('fruitTotal').value = total.toFixed(2);
}

function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch {
        return dateStr;
    }
}

function formatDateForInput(dateStr) {
    if (!dateStr) return getTodayDate();
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }
    return formatDate(dateStr);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

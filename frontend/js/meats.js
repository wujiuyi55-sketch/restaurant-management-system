document.addEventListener('DOMContentLoaded', () => {
    loadUserInfo();
    loadData();
    
    document.getElementById('meatQuantity').addEventListener('input', calculateTotal);
    document.getElementById('meatPrice').addEventListener('input', calculateTotal);
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
    const tbody = document.getElementById('meatsTableBody');
    
    try {
        const response = await fetch(`${API_BASE}/meats`, { credentials: 'include' });

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
                <td>¥${parseFloat(item.unit_price || 0).toFixed(2)}</td>
                <td>¥${parseFloat(item.total_price || 0).toFixed(2)}</td>
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
    document.getElementById('meatModalTitle').textContent = '添加采购记录';
    document.getElementById('meatId').value = '';
    document.getElementById('meatName').value = '';
    document.getElementById('meatQuantity').value = '';
    document.getElementById('meatUnit').value = '斤';
    document.getElementById('meatPrice').value = '';
    document.getElementById('meatTotal').value = '';
    document.getElementById('meatSupplier').value = '';
    document.getElementById('meatDate').value = getTodayDate();
    document.getElementById('meatModal').style.display = 'block';
}

async function openEditModal(id) {
    try {
        const response = await fetch(`${API_BASE}/meats/${id}`, { credentials: 'include' });

        if (!response.ok) {
            if (response.status === 403) {
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
        
        document.getElementById('meatModalTitle').textContent = '编辑采购记录';
        document.getElementById('meatId').value = data.id || id;
        document.getElementById('meatName').value = data.name || '';
        document.getElementById('meatQuantity').value = parseFloat(data.quantity || 0);
        document.getElementById('meatUnit').value = data.unit || '斤';
        document.getElementById('meatPrice').value = parseFloat(data.unit_price || 0);
        document.getElementById('meatTotal').value = parseFloat(data.total_price || 0);
        document.getElementById('meatSupplier').value = data.supplier || '';
        document.getElementById('meatDate').value = formatDateForInput(data.purchase_date || data.date || '');
        
        document.getElementById('meatModal').style.display = 'block';
        
    } catch (error) {
        console.error('加载采购记录失败:', error);
        alert('加载采购记录失败，请重试');
    }
}

function closeModal() {
    document.getElementById('meatModal').style.display = 'none';
}

async function saveData() {
    const id = document.getElementById('meatId').value;
    const name = document.getElementById('meatName').value.trim();
    const quantity = parseFloat(document.getElementById('meatQuantity').value);
    const unit = document.getElementById('meatUnit').value;
    const price = parseFloat(document.getElementById('meatPrice').value);
    const total = parseFloat(document.getElementById('meatTotal').value);
    const supplier = document.getElementById('meatSupplier').value.trim();
    const purchase_date = document.getElementById('meatDate').value;
    
    if (!name) {
        alert('请输入肉类名称');
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
        unit_price: price,
        total_price: total,
        supplier: supplier,
        purchase_date: purchase_date
    };
    
    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_BASE}/meats/${id}` : `${API_BASE}/meats`;
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        
        if (!response.ok) {
            if (response.status === 403) {
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
        const response = await fetch(`${API_BASE}/meats/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            if (response.status === 403) {
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
    const quantity = parseFloat(document.getElementById('meatQuantity').value) || 0;
    const price = parseFloat(document.getElementById('meatPrice').value) || 0;
    const total = quantity * price;
    document.getElementById('meatTotal').value = total.toFixed(2);
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

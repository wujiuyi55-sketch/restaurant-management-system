const API_BASE = '/api';
let inventoryData = [];

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
        const response = await fetch(`${API_BASE}/inventory`);
        
        if (!response.ok) {
            throw new Error('获取数据失败');
        }
        
        const data = await response.json();
        inventoryData = data;
        
        if (Array.isArray(data)) {
            renderTable(data);
        } else {
            console.error('数据格式错误:', data);
            alert('数据格式错误');
        }
        
        renderCharts();
    } catch (error) {
        console.error('加载数据失败:', error);
        alert('加载数据失败: ' + error.message);
    }
}

function renderTable(data) {
    const tbody = document.getElementById('dataTableBody');
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">暂无数据</td></tr>';
        return;
    }
    
    data.forEach(item => {
        const row = document.createElement('tr');
        const isLowStock = parseFloat(item.quantity) <= parseFloat(item.min_stock);
        const quantityClass = isLowStock ? 'low-stock' : '';
        
        row.innerHTML = `
            <td>${item.id}</td>
            <td>${item.name}</td>
            <td>${item.category || '-'}</td>
            <td class="${quantityClass}">${parseFloat(item.quantity).toFixed(2)}</td>
            <td>${item.unit || '-'}</td>
            <td>${parseFloat(item.min_stock || 0).toFixed(2)}</td>
            <td>¥${parseFloat(item.price || 0).toFixed(2)}</td>
            <td>${item.supplier || '-'}</td>
            <td>
                <button class="edit-btn" onclick="openEditModal(${item.id})">编辑</button>
                <button class="delete-btn" onclick="deleteData(${item.id})">删除</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderCharts() {
    renderCategoryPieChart();
    renderQuantityBarChart();
    renderValueChart();
    renderLowStockChart();
}

function renderCategoryPieChart() {
    const canvas = document.getElementById('categoryPieChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 40;
    
    const categoryStats = {};
    inventoryData.forEach(item => {
        const cat = item.category || '其他';
        categoryStats[cat] = (categoryStats[cat] || 0) + parseFloat(item.quantity || 0);
    });
    
    const categories = Object.entries(categoryStats);
    if (categories.length === 0) {
        ctx.fillStyle = '#a0aec0';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('暂无数据', centerX, centerY);
        return;
    }
    
    const total = categories.reduce((sum, cat) => sum + cat[1], 0);
    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7', '#fa709a'];
    
    let startAngle = -Math.PI / 2;
    
    categories.forEach((cat, i) => {
        const percentage = cat[1] / total;
        const endAngle = startAngle + percentage * Math.PI * 2;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius * 0.6, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = '#16213e';
        ctx.fill();
        
        startAngle = endAngle;
    });
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('库存分类分布', centerX, 25);
    
    const legendY = centerY + radius + 20;
    const legendItemHeight = 20;
    const cols = Math.min(categories.length, 2);
    const itemsPerCol = Math.ceil(categories.length / cols);
    
    categories.forEach((cat, i) => {
        const col = Math.floor(i / itemsPerCol);
        const row = i % itemsPerCol;
        const legendX = centerX - 100 + col * 120;
        const legendYPos = legendY + row * legendItemHeight;
        
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(legendX, legendYPos, 12, 12);
        
        ctx.fillStyle = '#a0aec0';
        ctx.font = '10px Arial';
        ctx.textAlign = 'left';
        const name = cat[0].length > 6 ? cat[0].substring(0, 6) + '...' : cat[0];
        ctx.fillText(name + ': ' + cat[1].toFixed(1), legendX + 18, legendYPos + 10);
    });
}

function renderQuantityBarChart() {
    const canvas = document.getElementById('quantityBarChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const padding = { top: 40, right: 40, bottom: 20, left: 120 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const sortedItems = [...inventoryData].sort((a, b) => 
        parseFloat(b.quantity || 0) - parseFloat(a.quantity || 0)
    ).slice(0, 7);
    
    if (sortedItems.length === 0) {
        ctx.fillStyle = '#a0aec0';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('暂无数据', width / 2, height / 2);
        return;
    }
    
    const maxQuantity = Math.max(...sortedItems.map(i => parseFloat(i.quantity || 0)));
    
    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'];
    const barHeight = chartHeight / sortedItems.length;
    
    sortedItems.forEach((item, i) => {
        const barWidth = (parseFloat(item.quantity || 0) / maxQuantity) * chartWidth;
        const x = padding.left;
        const y = padding.top + barHeight * i + 5;
        const barH = barHeight - 10;
        
        const gradient = ctx.createLinearGradient(x, y, x + barWidth, y);
        gradient.addColorStop(0, colors[i % colors.length]);
        gradient.addColorStop(1, adjustColor(colors[i % colors.length], -30));
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barH, 4);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(item.name, padding.left - 10, y + barH / 2 + 4);
        
        ctx.fillStyle = '#a0aec0';
        ctx.font = '11px Arial';
        ctx.textAlign = 'left';
        ctx.fillText((item.quantity || 0) + item.unit, x + barWidth + 10, y + barH / 2 + 4);
    });
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('库存数量排行', width / 2, 25);
}

function renderValueChart() {
    const canvas = document.getElementById('valueChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const padding = { top: 40, right: 40, bottom: 50, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const categoryValues = {};
    inventoryData.forEach(item => {
        const cat = item.category || '其他';
        const value = parseFloat(item.quantity || 0) * parseFloat(item.price || 0);
        categoryValues[cat] = (categoryValues[cat] || 0) + value;
    });
    
    const categories = Object.entries(categoryValues);
    if (categories.length === 0) {
        ctx.fillStyle = '#a0aec0';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('暂无数据', width / 2, height / 2);
        return;
    }
    
    const maxValue = Math.max(...categories.map(c => c[1]));
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        
        const value = Math.round(maxValue - (maxValue / 5) * i);
        ctx.fillStyle = '#a0aec0';
        ctx.font = '10px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('¥' + value.toLocaleString(), padding.left - 10, y + 4);
    }
    
    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7', '#fa709a'];
    const stepX = chartWidth / categories.length;
    const barWidth = stepX * 0.7;
    
    categories.forEach((cat, i) => {
        const x = padding.left + stepX * i + (stepX - barWidth) / 2;
        const barHeight = maxValue > 0 ? (cat[1] / maxValue) * chartHeight : 0;
        
        const gradient = ctx.createLinearGradient(x, height - padding.bottom, x, height - padding.bottom - barHeight);
        gradient.addColorStop(0, colors[i % colors.length]);
        gradient.addColorStop(1, adjustColor(colors[i % colors.length], -30));
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, height - padding.bottom - barHeight, barWidth, barHeight, 4);
        ctx.fill();
        
        ctx.fillStyle = '#a0aec0';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        const name = cat[0].length > 5 ? cat[0].substring(0, 5) + '...' : cat[0];
        ctx.fillText(name, x + barWidth / 2, height - padding.bottom + 20);
    });
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('库存价值统计', width / 2, 25);
}

function renderLowStockChart() {
    const canvas = document.getElementById('lowStockChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const padding = { top: 40, right: 40, bottom: 40, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const lowStockItems = inventoryData.filter(item => 
        parseFloat(item.quantity || 0) <= parseFloat(item.min_stock || 0)
    ).slice(0, 5);
    
    if (lowStockItems.length === 0) {
        ctx.fillStyle = '#43e97b';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🎉 暂无低库存预警', width / 2, height / 2);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('低库存预警', width / 2, 25);
        return;
    }
    
    const maxMinStock = Math.max(...lowStockItems.map(i => parseFloat(i.min_stock || 1)));
    
    const barWidth = chartWidth / lowStockItems.length;
    
    lowStockItems.forEach((item, i) => {
        const x = padding.left + barWidth * i;
        const quantity = parseFloat(item.quantity || 0);
        const minStock = parseFloat(item.min_stock || 1);
        
        const currentHeight = (quantity / maxMinStock) * chartHeight * 0.6;
        const warningHeight = ((minStock - quantity) / maxMinStock) * chartHeight * 0.6;
        
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.roundRect(x + 5, height - padding.bottom - currentHeight - warningHeight, barWidth - 10, warningHeight, 4);
        ctx.fill();
        
        ctx.fillStyle = '#43e97b';
        ctx.beginPath();
        ctx.roundRect(x + 5, height - padding.bottom - currentHeight, barWidth - 10, currentHeight, 4);
        ctx.fill();
        
        ctx.fillStyle = '#a0aec0';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        const name = item.name.length > 6 ? item.name.substring(0, 6) + '...' : item.name;
        ctx.fillText(name, x + barWidth / 2, height - padding.bottom + 20);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(quantity + '/' + minStock, x + barWidth / 2, height - padding.bottom - currentHeight - warningHeight - 5);
    });
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('低库存预警', width / 2, 25);
    
    ctx.fillStyle = '#43e97b';
    ctx.fillRect(width - padding.right - 60, 60, 12, 12);
    ctx.fillStyle = '#a0aec0';
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('当前库存', width - padding.right - 45, 70);
    
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(width - padding.right - 60, 80, 12, 12);
    ctx.fillStyle = '#a0aec0';
    ctx.fillText('缺口', width - padding.right - 45, 90);
}

function adjustColor(color, amount) {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
    return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
}

function openAddModal() {
    document.getElementById('modalTitle').textContent = '添加食材';
    document.getElementById('dataId').value = '';
    document.getElementById('name').value = '';
    document.getElementById('category').value = '蔬菜';
    document.getElementById('quantity').value = '';
    document.getElementById('unit').value = '';
    document.getElementById('min_stock').value = '';
    document.getElementById('price').value = '';
    document.getElementById('supplier').value = '';
    document.getElementById('dataModal').style.display = 'block';
}

async function openEditModal(id) {
    try {
        const response = await fetch(`${API_BASE}/inventory/${id}`);
        
        if (!response.ok) {
            throw new Error('获取数据失败');
        }
        
        const item = await response.json();
        
        if (item.error) {
            throw new Error(item.error);
        }
        
        document.getElementById('modalTitle').textContent = '编辑食材';
        document.getElementById('dataId').value = item.id;
        document.getElementById('name').value = item.name || '';
        document.getElementById('category').value = item.category || '蔬菜';
        document.getElementById('quantity').value = item.quantity || '';
        document.getElementById('unit').value = item.unit || '';
        document.getElementById('min_stock').value = item.min_stock || '';
        document.getElementById('price').value = item.price || '';
        document.getElementById('supplier').value = item.supplier || '';
        document.getElementById('dataModal').style.display = 'block';
    } catch (error) {
        console.error('加载编辑数据失败:', error);
        alert('加载数据失败: ' + error.message);
    }
}

function closeModal() {
    document.getElementById('dataModal').style.display = 'none';
}

async function saveData() {
    const id = document.getElementById('dataId').value;
    
    const name = document.getElementById('name').value.trim();
    const category = document.getElementById('category').value;
    const quantity = document.getElementById('quantity').value;
    const unit = document.getElementById('unit').value.trim();
    const min_stock = document.getElementById('min_stock').value;
    const price = document.getElementById('price').value;
    const supplier = document.getElementById('supplier').value.trim();
    
    if (!name) {
        alert('请输入食材名称');
        return;
    }
    
    if (!quantity) {
        alert('请输入数量');
        return;
    }
    
    if (!unit) {
        alert('请输入单位');
        return;
    }
    
    if (!min_stock) {
        alert('请输入最低库存');
        return;
    }
    
    if (!price) {
        alert('请输入单价');
        return;
    }
    
    const data = {
        name: name,
        category: category,
        quantity: parseFloat(quantity),
        unit: unit,
        min_stock: parseFloat(min_stock),
        price: parseFloat(price),
        supplier: supplier
    };
    
    try {
        let response;
        if (id) {
            response = await fetch(`${API_BASE}/inventory/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            response = await fetch(`${API_BASE}/inventory`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }
        
        const result = await response.json();
        
        if (response.ok) {
            alert(result.message || '保存成功');
            closeModal();
            loadData();
        } else {
            alert(result.error || result.message || '操作失败');
        }
    } catch (error) {
        console.error('保存数据失败:', error);
        alert('保存失败: ' + error.message);
    }
}

async function deleteData(id) {
    if (!confirm('确定要删除这个食材吗？此操作不可撤销。')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/inventory/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert(result.message || '删除成功');
            loadData();
        } else {
            alert(result.error || result.message || '删除失败');
        }
    } catch (error) {
        console.error('删除数据失败:', error);
        alert('删除失败: ' + error.message);
    }
}

window.addEventListener('click', function(e) {
    const modal = document.getElementById('dataModal');
    if (e.target === modal) {
        closeModal();
    }
});

window.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});
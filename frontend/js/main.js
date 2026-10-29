const API_BASE = 'http://localhost:5000/api';

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById(sectionId).classList.remove('hidden');
    
    if (sectionId === 'dashboard') {
        loadDashboard();
    } else if (sectionId === 'dishes') {
        loadDishes();
    } else if (sectionId === 'customers') {
        loadCustomers();
    } else if (sectionId === 'sales') {
        loadSales();
    }
}

async function fetchData(url) {
    try {
        const response = await fetch(`${API_BASE}${url}`);
        return await response.json();
    } catch (error) {
        console.error('API请求失败:', error);
        return [];
    }
}

async function loadDashboard() {
    const [monthlySales, dishes, customers] = await Promise.all([
        fetchData('/monthly_sales'),
        fetchData('/dishes'),
        fetchData('/customers')
    ]);
    
    const totalRevenue = monthlySales.reduce((sum, m) => sum + parseFloat(m.total_amount), 0);
    const totalOrders = monthlySales.reduce((sum, m) => sum + m.order_count, 0);
    
    document.getElementById('totalRevenue').textContent = `¥${totalRevenue.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
    document.getElementById('totalOrders').textContent = totalOrders.toLocaleString();
    document.getElementById('totalDishes').textContent = dishes.length;
    document.getElementById('totalCustomers').textContent = customers.length;
    
    renderSalesChart(monthlySales);
}

function renderSalesChart(data) {
    const canvas = document.getElementById('salesChart');
    const ctx = canvas.getContext('2d');
    
    canvas.width = canvas.offsetWidth;
    canvas.height = 300;
    
    const padding = { top: 40, right: 40, bottom: 50, left: 60 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const values = data.map(d => parseFloat(d.total_amount));
    const maxValue = Math.max(...values) * 1.1;
    const minValue = 0;
    
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
        const value = maxValue - (maxValue - minValue) * (i / 5);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(canvas.width - padding.right, y);
        ctx.stroke();
        
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`¥${(value / 1000).toFixed(0)}k`, padding.left - 10, y + 4);
    }
    
    const barWidth = (chartWidth / data.length) * 0.6;
    const gap = (chartWidth / data.length) * 0.4;
    
    data.forEach((item, index) => {
        const x = padding.left + (chartWidth / data.length) * index + gap / 2;
        const height = (parseFloat(item.total_amount) / maxValue) * chartHeight;
        const y = padding.top + chartHeight - height;
        
        const gradient = ctx.createLinearGradient(x, y, x, y + height);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, height, 4);
        ctx.fill();
        
        ctx.fillStyle = '#333';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(item.month.split('-')[1] + '月', x + barWidth / 2, canvas.height - 20);
    });
    
    ctx.fillStyle = '#333';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('月度销售额 (元)', canvas.width / 2, 25);
}

async function loadDishes() {
    const dishes = await fetchData('/dishes');
    const tbody = document.getElementById('dishesTableBody');
    tbody.innerHTML = dishes.map(dish => `
        <tr>
            <td>${dish.id}</td>
            <td>${dish.name}</td>
            <td>¥${parseFloat(dish.price).toFixed(2)}</td>
            <td>${dish.category}</td>
            <td><span class="status-badge ${dish.status === 1 ? 'active' : 'inactive'}">${dish.status === 1 ? '上架' : '下架'}</span></td>
            <td>
                <button class="action-btn edit" onclick="editDish(${dish.id})">编辑</button>
                <button class="action-btn delete" onclick="deleteDish(${dish.id})">删除</button>
            </td>
        </tr>
    `).join('');
}

async function loadCustomers() {
    const customers = await fetchData('/customers');
    const tbody = document.getElementById('customersTableBody');
    tbody.innerHTML = customers.map(customer => `
        <tr>
            <td>${customer.id}</td>
            <td>${customer.name}</td>
            <td>${customer.phone || '-'}</td>
            <td>¥${parseFloat(customer.total_spent).toFixed(2)}</td>
            <td>${customer.visit_count}</td>
            <td>${customer.last_visit || '-'}</td>
            <td>
                <button class="action-btn edit" onclick="editCustomer(${customer.id})">编辑</button>
                <button class="action-btn delete" onclick="deleteCustomer(${customer.id})">删除</button>
            </td>
        </tr>
    `).join('');
}

async function loadSales() {
    const [monthlySales, topDishes] = await Promise.all([
        fetchData('/monthly_sales'),
        fetchData('/sales')
    ]);
    
    const monthlyBody = document.getElementById('monthlySalesBody');
    monthlyBody.innerHTML = monthlySales.map(item => {
        const avgOrder = parseFloat(item.total_amount) / item.order_count;
        return `
            <tr>
                <td>${item.month}</td>
                <td>¥${parseFloat(item.total_amount).toLocaleString()}</td>
                <td>${item.order_count}</td>
                <td>¥${avgOrder.toFixed(2)}</td>
            </tr>
        `;
    }).join('');
    
    const dishSales = {};
    topDishes.forEach(sale => {
        const name = sale.dish_name || '未知';
        if (!dishSales[name]) {
            dishSales[name] = { quantity: 0, revenue: 0 };
        }
        dishSales[name].quantity += sale.quantity;
        dishSales[name].revenue += parseFloat(sale.total_price);
    });
    
    const sortedDishes = Object.entries(dishSales)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);
    
    const topDishesBody = document.getElementById('topDishesBody');
    topDishesBody.innerHTML = sortedDishes.map((dish, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${dish.name}</td>
            <td>${dish.quantity}</td>
            <td>¥${dish.revenue.toFixed(2)}</td>
        </tr>
    `).join('');
}

function openDishModal() {
    document.getElementById('dishModalTitle').textContent = '添加菜品';
    document.getElementById('dishId').value = '';
    document.getElementById('dishName').value = '';
    document.getElementById('dishPrice').value = '';
    document.getElementById('dishCategory').value = '热菜';
    document.getElementById('dishDescription').value = '';
    document.getElementById('dishStatus').value = '1';
    document.getElementById('dishModal').classList.remove('hidden');
}

function closeDishModal() {
    document.getElementById('dishModal').classList.add('hidden');
}

async function editDish(id) {
    const dish = await fetchData(`/dishes/${id}`);
    if (!dish.error) {
        document.getElementById('dishModalTitle').textContent = '编辑菜品';
        document.getElementById('dishId').value = dish.id;
        document.getElementById('dishName').value = dish.name;
        document.getElementById('dishPrice').value = dish.price;
        document.getElementById('dishCategory').value = dish.category || '热菜';
        document.getElementById('dishDescription').value = dish.description || '';
        document.getElementById('dishStatus').value = dish.status;
        document.getElementById('dishModal').classList.remove('hidden');
    }
}

async function deleteDish(id) {
    if (confirm('确定要删除这个菜品吗？')) {
        const response = await fetch(`${API_BASE}/dishes/${id}`, { method: 'DELETE' });
        const result = await response.json();
        alert(result.message);
        loadDishes();
    }
}

document.getElementById('dishForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('dishId').value;
    const data = {
        name: document.getElementById('dishName').value,
        price: parseFloat(document.getElementById('dishPrice').value),
        category: document.getElementById('dishCategory').value,
        description: document.getElementById('dishDescription').value,
        status: parseInt(document.getElementById('dishStatus').value)
    };
    
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/dishes/${id}` : '/dishes';
    
    const response = await fetch(`${API_BASE}${url}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    
    const result = await response.json();
    alert(result.message);
    closeDishModal();
    loadDishes();
});

function openCustomerModal() {
    document.getElementById('customerModalTitle').textContent = '添加客户';
    document.getElementById('customerId').value = '';
    document.getElementById('customerName').value = '';
    document.getElementById('customerPhone').value = '';
    document.getElementById('customerEmail').value = '';
    document.getElementById('customerTotalSpent').value = '0';
    document.getElementById('customerVisitCount').value = '0';
    document.getElementById('customerLastVisit').value = '';
    document.getElementById('customerModal').classList.remove('hidden');
}

function closeCustomerModal() {
    document.getElementById('customerModal').classList.add('hidden');
}

async function editCustomer(id) {
    const customer = await fetchData(`/customers/${id}`);
    if (!customer.error) {
        document.getElementById('customerModalTitle').textContent = '编辑客户';
        document.getElementById('customerId').value = customer.id;
        document.getElementById('customerName').value = customer.name;
        document.getElementById('customerPhone').value = customer.phone || '';
        document.getElementById('customerEmail').value = customer.email || '';
        document.getElementById('customerTotalSpent').value = customer.total_spent || '0';
        document.getElementById('customerVisitCount').value = customer.visit_count || '0';
        document.getElementById('customerLastVisit').value = customer.last_visit || '';
        document.getElementById('customerModal').classList.remove('hidden');
    }
}

async function deleteCustomer(id) {
    if (confirm('确定要删除这个客户吗？')) {
        const response = await fetch(`${API_BASE}/customers/${id}`, { method: 'DELETE' });
        const result = await response.json();
        alert(result.message);
        loadCustomers();
    }
}

document.getElementById('customerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('customerId').value;
    const data = {
        name: document.getElementById('customerName').value,
        phone: document.getElementById('customerPhone').value,
        email: document.getElementById('customerEmail').value,
        total_spent: parseFloat(document.getElementById('customerTotalSpent').value),
        visit_count: parseInt(document.getElementById('customerVisitCount').value),
        last_visit: document.getElementById('customerLastVisit').value
    };
    
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/customers/${id}` : '/customers';
    
    const response = await fetch(`${API_BASE}${url}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    
    const result = await response.json();
    alert(result.message);
    closeCustomerModal();
    loadCustomers();
});

async function runAnalysis() {
    document.getElementById('analysisResult').classList.add('hidden');
    
    try {
        const response = await fetch(`${API_BASE}/analysis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.error) {
            alert(result.error);
            return;
        }
        
        document.getElementById('analysisContent').textContent = result.analysis;
        document.getElementById('analysisResult').classList.remove('hidden');
    } catch (error) {
        alert('分析请求失败，请稍后重试');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    showSection('dashboard');
});

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    addChatMessage('user', message);
    input.value = '';
    
    try {
        const response = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message })
        });
        
        const result = await response.json();
        
        if (result.error) {
            addChatMessage('assistant', '抱歉，发生了错误：' + result.error);
        } else {
            addChatMessage('assistant', result.response);
        }
    } catch (error) {
        addChatMessage('assistant', '抱歉，发生了网络错误，请稍后重试。');
        console.error('Chat error:', error);
    }
}

function addChatMessage(role, content) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';
    
    if (role === 'assistant') {
        bubbleDiv.innerHTML = `<strong>AI顾问</strong><br>${content}`;
    } else {
        bubbleDiv.innerHTML = `<strong>您</strong><br>${content}`;
    }
    
    messageDiv.appendChild(bubbleDiv);
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
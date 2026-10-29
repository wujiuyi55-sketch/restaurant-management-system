const API_BASE = '/api';
let salesData = [];
let monthlySalesData = [];

document.addEventListener('DOMContentLoaded', function() {
    loadUserInfo();
    loadSales();
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

async function loadSales() {
    try {
        const response = await fetch(`${API_BASE}/monthly_sales`, { credentials: 'include' });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                window.location.href = '/login';
                return;
            }
            throw new Error(`请求失败: ${response.status}`);
        }
        const sales = await response.json();
        monthlySalesData = sales;
        
        const tbody = document.getElementById('monthlySalesBody');
        tbody.innerHTML = '';
        
        sales.forEach(item => {
            const avgPrice = item.order_count > 0 ? (item.total_amount / item.order_count).toFixed(2) : 0;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.month}</td>
                <td>¥${parseFloat(item.total_amount).toLocaleString()}</td>
                <td>${item.order_count}</td>
                <td>¥${parseFloat(avgPrice).toFixed(2)}</td>
            `;
            tbody.appendChild(row);
        });
        
        const response2 = await fetch(`${API_BASE}/sales`, { credentials: 'include' });
        if (!response2.ok) {
            return;
        }
        const allSales = await response2.json();
        salesData = allSales;
        
        const dishStats = {};
        allSales.forEach(sale => {
            const name = sale.dish_name || '未知';
            if (!dishStats[name]) {
                dishStats[name] = { quantity: 0, revenue: 0 };
            }
            dishStats[name].quantity += sale.quantity;
            dishStats[name].revenue += parseFloat(sale.total_price);
        });
        
        const sorted = Object.entries(dishStats).sort((a, b) => b[1].quantity - a[1].quantity).slice(0, 10);
    
        const tbody2 = document.getElementById('topDishesBody');
        tbody2.innerHTML = '';
        
        sorted.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${item[0]}</td>
                <td>${item[1].quantity}</td>
                <td>¥${item[1].revenue.toLocaleString()}</td>
            `;
            tbody2.appendChild(row);
        });
        
        renderCharts();
    } catch (error) {
        console.error('加载销售数据失败:', error);
    }
}

function renderCharts() {
    renderSalesTrendChart();
    renderTopDishesChart();
    renderCategoryPieChart();
    renderOrderTrendChart();
}

function renderSalesTrendChart() {
    const canvas = document.getElementById('salesTrendChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const padding = { top: 40, right: 40, bottom: 50, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const data = monthlySalesData.slice(-6);
    if (!data || data.length === 0) {
        ctx.fillStyle = '#a0aec0';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('暂无数据', width / 2, height / 2);
        return;
    }
    
    const amounts = data.map(d => parseFloat(d.total_amount));
    const maxAmount = Math.max(...amounts);
    const minAmount = Math.min(...amounts);
    const range = maxAmount - minAmount || 1;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        
        const value = maxAmount - (range / 5) * i;
        ctx.fillStyle = '#a0aec0';
        ctx.font = '10px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('¥' + Math.round(value).toLocaleString(), padding.left - 10, y + 4);
    }
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    const stepX = chartWidth / (data.length - 1 || 1);
    data.forEach((d, i) => {
        const x = padding.left + stepX * i;
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, height - padding.bottom);
        ctx.stroke();
        
        ctx.fillStyle = '#a0aec0';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(d.month, x, height - padding.bottom + 20);
    });
    
    ctx.beginPath();
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 3;
    data.forEach((d, i) => {
        const x = padding.left + stepX * i;
        const y = padding.top + chartHeight - ((parseFloat(d.total_amount) - minAmount) / range) * chartHeight;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    data.forEach((d, i) => {
        const x = padding.left + stepX * i;
        const y = padding.top + chartHeight - ((parseFloat(d.total_amount) - minAmount) / range) * chartHeight;
        
        ctx.beginPath();
        ctx.fillStyle = '#667eea';
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.fillStyle = '#ffffff';
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('月度销售额趋势', width / 2, 25);
}

function renderTopDishesChart() {
    const canvas = document.getElementById('topDishesChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const padding = { top: 40, right: 40, bottom: 20, left: 120 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const dishStats = {};
    salesData.forEach(sale => {
        const name = sale.dish_name || '未知';
        if (!dishStats[name]) {
            dishStats[name] = { quantity: 0, revenue: 0 };
        }
        dishStats[name].quantity += sale.quantity;
        dishStats[name].revenue += parseFloat(sale.total_price);
    });
    
    const sorted = Object.entries(dishStats).sort((a, b) => b[1].quantity - a[1].quantity).slice(0, 7);
    
    if (sorted.length === 0) {
        ctx.fillStyle = '#a0aec0';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('暂无数据', width / 2, height / 2);
        return;
    }
    
    const maxQuantity = Math.max(...sorted.map(d => d[1].quantity));
    
    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'];
    
    const barHeight = chartHeight / sorted.length;
    
    sorted.forEach((item, i) => {
        const barWidth = (item[1].quantity / maxQuantity) * chartWidth;
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
        ctx.fillText(item[0], padding.left - 10, y + barH / 2 + 4);
        
        ctx.fillStyle = '#a0aec0';
        ctx.font = '11px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(item[1].quantity + '份', x + barWidth + 10, y + barH / 2 + 4);
    });
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('热销菜品分布', width / 2, 25);
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
    salesData.forEach(sale => {
        const category = sale.category || '其他';
        if (!categoryStats[category]) {
            categoryStats[category] = 0;
        }
        categoryStats[category] += parseFloat(sale.total_price);
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
    ctx.fillText('分类销售占比', centerX, 25);
    
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
        ctx.fillText(name + ': ' + (cat[1] / total * 100).toFixed(1) + '%', legendX + 18, legendYPos + 10);
    });
}

function renderOrderTrendChart() {
    const canvas = document.getElementById('orderTrendChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const padding = { top: 40, right: 40, bottom: 50, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const data = monthlySalesData.slice(-6);
    if (!data || data.length === 0) {
        ctx.fillStyle = '#a0aec0';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('暂无数据', width / 2, height / 2);
        return;
    }
    
    const orders = data.map(d => parseInt(d.order_count) || 0);
    const maxOrder = Math.max(...orders);
    const minOrder = Math.min(...orders);
    const range = maxOrder - minOrder || 1;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        
        const value = maxOrder - (range / 5) * i;
        ctx.fillStyle = '#a0aec0';
        ctx.font = '10px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(value.toString(), padding.left - 10, y + 4);
    }
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    const stepX = chartWidth / (data.length - 1 || 1);
    data.forEach((d, i) => {
        const x = padding.left + stepX * i;
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, height - padding.bottom);
        ctx.stroke();
        
        ctx.fillStyle = '#a0aec0';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(d.month, x, height - padding.bottom + 20);
    });
    
    const barWidth = stepX * 0.6;
    
    data.forEach((d, i) => {
        const x = padding.left + stepX * i - barWidth / 2;
        const orderCount = parseInt(d.order_count) || 0;
        const barHeight = ((orderCount - minOrder) / range) * chartHeight;
        
        const gradient = ctx.createLinearGradient(x, height - padding.bottom, x, height - padding.bottom - barHeight);
        gradient.addColorStop(0, '#43e97b');
        gradient.addColorStop(1, '#38f9d7');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, height - padding.bottom - barHeight, barWidth, barHeight, 4);
        ctx.fill();
    });
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('月度订单趋势', width / 2, 25);
}

function adjustColor(color, amount) {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
    return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
}
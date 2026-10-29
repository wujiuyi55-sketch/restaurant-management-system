const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', () => {
    loadUserInfo();
    loadDashboard();
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

async function fetchData(endpoint) {
    try {
        const response = await fetch(`${API_BASE}/${endpoint}`, { credentials: 'include' });
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login';
                return [];
            }
            // 403 表示已登录但无权限（如从业者访问管理员接口），返回空数据继续渲染
            return [];
        }
        return await response.json();
    } catch {
        return [];
    }
}

async function loadDashboard() {
    try {
        const monthlySales = await fetchData('monthly_sales');
        const dishes = await fetchData('dishes');
        const customers = await fetchData('customers');
        const sales = await fetchData('sales');
        
        const totalRevenue = monthlySales.reduce((sum, m) => {
            return sum + parseFloat(m.total_amount || 0);
        }, 0);
        
        const totalOrders = monthlySales.reduce((sum, m) => {
            return sum + (m.order_count || 0);
        }, 0);
        
        const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00';
        
        const dishStats = {};
        sales.forEach(sale => {
            const name = sale.dish_name || '未知';
            if (!dishStats[name]) {
                dishStats[name] = { quantity: 0, revenue: 0 };
            }
            dishStats[name].quantity += sale.quantity;
            dishStats[name].revenue += parseFloat(sale.total_price);
        });
        
        const topDish = Object.entries(dishStats).sort((a, b) => b[1].quantity - a[1].quantity)[0];
        
        const categoryStats = {};
        dishes.forEach(dish => {
            const category = dish.category || '未分类';
            if (!categoryStats[category]) {
                categoryStats[category] = { count: 0, total_price: 0 };
            }
            categoryStats[category].count++;
        });
        
        document.getElementById('totalRevenue').textContent = 
            '¥' + totalRevenue.toLocaleString('zh-CN', { minimumFractionDigits: 2 });
        document.getElementById('totalOrders').textContent = 
            totalOrders.toLocaleString();
        document.getElementById('totalDishes').textContent = dishes.length;
        document.getElementById('totalCustomers').textContent = customers.length;
        document.getElementById('avgOrderValue').textContent = '¥' + avgOrderValue;
        document.getElementById('topDish').textContent = topDish ? topDish[0] : '-';
        
        renderSalesChart(monthlySales);
        renderCategoryChart(categoryStats);
        renderTopDishesChart(dishStats);
        renderCustomerChart(customers);
        
    } catch (error) {
        console.error('加载数据失败:', error);
    }
}

function renderSalesChart(data) {
    const canvas = document.getElementById('salesChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 280;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!data || data.length === 0) {
        ctx.fillStyle = '#cccccc';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('暂无数据', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    const padding = { top: 40, right: 30, bottom: 50, left: 60 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;
    
    const values = data.map(d => parseFloat(d.total_amount));
    const maxValue = Math.max(...values) * 1.1 || 100;
    const minValue = 0;
    
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(canvas.width - padding.right, y);
        ctx.stroke();
        
        ctx.fillStyle = '#cccccc';
        ctx.font = '11px Arial';
        ctx.textAlign = 'right';
        const val = maxValue - (maxValue - minValue) * (i / 4);
        ctx.fillText('¥' + Math.round(val / 1000) + 'K', padding.left - 8, y + 3);
    }
    
    const barCount = data.length;
    const barWidth = (chartWidth / barCount) * 0.65;
    const gap = (chartWidth / barCount) * 0.35;
    
    data.forEach((item, index) => {
        const x = padding.left + (chartWidth / barCount) * index + gap / 2;
        const value = parseFloat(item.total_amount) || 0;
        const height = (value / maxValue) * chartHeight;
        const y = padding.top + chartHeight - height;
        
        const gradient = ctx.createLinearGradient(x, y, x, y + height);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, height, 4);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        const label = item.month ? item.month.split('-')[1] + '月' : '';
        ctx.fillText(label, x + barWidth / 2, canvas.height - 20);
    });
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('月度销售额趋势', canvas.width / 2, 22);
}

function renderCategoryChart(categoryStats) {
    const canvas = document.getElementById('categoryChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 280;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const categories = Object.entries(categoryStats);
    if (!categories || categories.length === 0) {
        ctx.fillStyle = '#cccccc';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('暂无数据', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 40;
    
    const colors = ['#667eea', '#f093fb', '#4ade80', '#fbbf24', '#fb7185', '#38bdf8', '#a78bfa', '#fb923c'];
    let startAngle = -Math.PI / 2;
    
    const total = categories.reduce((sum, cat) => sum + cat[1].count, 0);
    
    categories.forEach(([name, stats], index) => {
        const sliceAngle = (stats.count / total) * 2 * Math.PI;
        const endAngle = startAngle + sliceAngle;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = colors[index % colors.length];
        ctx.fill();
        
        const midAngle = startAngle + sliceAngle / 2;
        const labelX = centerX + Math.cos(midAngle) * (radius * 0.7);
        const labelY = centerY + Math.sin(midAngle) * (radius * 0.7);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (stats.count / total > 0.08) {
            ctx.fillText(name, labelX, labelY - 8);
            ctx.fillText(stats.count, labelX, labelY + 8);
        }
        
        startAngle = endAngle;
    });
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('菜品分类占比', canvas.width / 2, 22);
    
    let legendY = canvas.height - 30;
    categories.forEach(([name, stats], index) => {
        const legendX = 20 + index * 90;
        ctx.fillStyle = colors[index % colors.length];
        ctx.fillRect(legendX, legendY - 10, 12, 12);
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(name, legendX + 18, legendY - 2);
    });
}

function renderTopDishesChart(dishStats) {
    const canvas = document.getElementById('topDishesChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 280;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const sortedDishes = Object.entries(dishStats).sort((a, b) => b[1].quantity - a[1].quantity).slice(0, 5);
    if (!sortedDishes || sortedDishes.length === 0) {
        ctx.fillStyle = '#cccccc';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('暂无数据', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    const padding = { top: 35, right: 30, bottom: 20, left: 80 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;
    
    const maxQuantity = Math.max(...sortedDishes.map(d => d[1].quantity));
    const barHeight = chartHeight / sortedDishes.length * 0.7;
    const gap = chartHeight / sortedDishes.length * 0.3;
    
    const colors = ['#667eea', '#764ba2', '#f093fb', '#a78bfa', '#c4b5fd'];
    
    sortedDishes.forEach(([name, stats], index) => {
        const y = padding.top + (chartHeight / sortedDishes.length) * index + gap / 2;
        const width = (stats.quantity / maxQuantity) * chartWidth;
        const x = padding.left;
        
        const gradient = ctx.createLinearGradient(x, y, x + width, y);
        gradient.addColorStop(0, colors[index]);
        gradient.addColorStop(1, adjustColor(colors[index], -30));
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, width, barHeight, 4);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(name.length > 6 ? name.substring(0, 6) + '...' : name, padding.left - 10, y + barHeight / 2 + 4);
        
        ctx.fillStyle = '#cccccc';
        ctx.font = '11px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(stats.quantity + '份', x + width + 8, y + barHeight / 2 + 4);
    });
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('热销菜品TOP5', canvas.width / 2, 22);
}

function renderCustomerChart(customers) {
    const canvas = document.getElementById('customerChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 280;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!customers || customers.length === 0) {
        ctx.fillStyle = '#cccccc';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('暂无数据', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    const levels = [
        { name: '普通客户', min: 0, max: 500, color: '#94a3b8' },
        { name: '银卡客户', min: 500, max: 2000, color: '#64748b' },
        { name: '金卡客户', min: 2000, max: 5000, color: '#fbbf24' },
        { name: '钻石客户', min: 5000, max: Infinity, color: '#7c3aed' }
    ];
    
    const levelCounts = levels.map(level => {
        return customers.filter(c => {
            const spent = parseFloat(c.total_spent || 0);
            return spent >= level.min && spent < level.max;
        }).length;
    });
    
    const total = levelCounts.reduce((sum, c) => sum + c, 0);
    const maxCount = Math.max(...levelCounts);
    
    const padding = { top: 35, right: 40, bottom: 40, left: 60 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;
    
    const barWidth = (chartWidth / levels.length) * 0.6;
    const gap = (chartWidth / levels.length) * 0.4;
    
    levels.forEach((level, index) => {
        const x = padding.left + (chartWidth / levels.length) * index + gap / 2;
        const height = maxCount > 0 ? (levelCounts[index] / maxCount) * chartHeight : 0;
        const y = padding.top + chartHeight - height;
        
        ctx.fillStyle = level.color;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, height, 6);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(levelCounts[index], x + barWidth / 2, y - 8);
        
        ctx.fillStyle = '#cccccc';
        ctx.font = '10px Arial';
        ctx.fillText(level.name, x + barWidth / 2, canvas.height - 15);
    });
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('客户消费等级分布', canvas.width / 2, 22);
    
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
        const y = padding.top + (chartHeight / 3) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(canvas.width - padding.right, y);
        ctx.stroke();
    }
}

function adjustColor(color, amount) {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
    return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
}

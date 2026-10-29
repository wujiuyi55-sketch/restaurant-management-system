const API_BASE = '/api';
let employeesData = [];

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
        const response = await fetch(`${API_BASE}/employees`, { credentials: 'include' });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                window.location.href = '/login';
                return;
            }
            throw new Error(`请求失败: ${response.status}`);
        }
        const data = await response.json();
        employeesData = data;
        
        const tbody = document.getElementById('dataTableBody');
        tbody.innerHTML = '';
        
        data.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.id}</td>
                <td>${item.name}</td>
                <td>${item.phone || '-'}</td>
                <td>${item.position || '-'}</td>
                <td>¥${parseFloat(item.salary || 0).toLocaleString()}</td>
                <td>${item.hire_date || '-'}</td>
                <td>${item.status == 1 ? '<span style="color: green;">在职</span>' : '<span style="color: red;">离职</span>'}</td>
                <td>
                    <button class="edit-btn" onclick="openEditModal(${item.id})">编辑</button>
                    <button class="delete-btn" onclick="deleteData(${item.id})">删除</button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        renderCharts();
    } catch (error) {
        console.error('加载数据失败:', error);
    }
}

function renderCharts() {
    renderPositionChart();
    renderSalaryChart();
    renderStatusChart();
    renderHireChart();
}

function renderPositionChart() {
    const canvas = document.getElementById('positionChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 40;
    
    const positionStats = {};
    employeesData.forEach(emp => {
        const pos = emp.position || '其他';
        positionStats[pos] = (positionStats[pos] || 0) + 1;
    });
    
    const positions = Object.entries(positionStats);
    if (positions.length === 0) {
        ctx.fillStyle = '#a0aec0';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('暂无数据', centerX, centerY);
        return;
    }
    
    const total = positions.reduce((sum, p) => sum + p[1], 0);
    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7', '#fa709a'];
    
    let startAngle = -Math.PI / 2;
    
    positions.forEach((pos, i) => {
        const percentage = pos[1] / total;
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
    ctx.fillText('职位分布', centerX, 25);
    
    const legendY = centerY + radius + 20;
    const legendItemHeight = 20;
    const cols = Math.min(positions.length, 2);
    const itemsPerCol = Math.ceil(positions.length / cols);
    
    positions.forEach((pos, i) => {
        const col = Math.floor(i / itemsPerCol);
        const row = i % itemsPerCol;
        const legendX = centerX - 100 + col * 120;
        const legendYPos = legendY + row * legendItemHeight;
        
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(legendX, legendYPos, 12, 12);
        
        ctx.fillStyle = '#a0aec0';
        ctx.font = '10px Arial';
        ctx.textAlign = 'left';
        const name = pos[0].length > 6 ? pos[0].substring(0, 6) + '...' : pos[0];
        ctx.fillText(name + ': ' + pos[1] + '人', legendX + 18, legendYPos + 10);
    });
}

function renderSalaryChart() {
    const canvas = document.getElementById('salaryChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const padding = { top: 40, right: 40, bottom: 50, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const salaries = employeesData.filter(e => e.salary).map(e => parseFloat(e.salary));
    if (salaries.length === 0) {
        ctx.fillStyle = '#a0aec0';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('暂无数据', width / 2, height / 2);
        return;
    }
    
    const ranges = [
        { min: 0, max: 3000, label: '3k以下' },
        { min: 3000, max: 5000, label: '3k-5k' },
        { min: 5000, max: 8000, label: '5k-8k' },
        { min: 8000, max: 12000, label: '8k-12k' },
        { min: 12000, max: Infinity, label: '12k以上' }
    ];
    
    const rangeCounts = ranges.map(r => salaries.filter(s => s >= r.min && s < r.max).length);
    const maxCount = Math.max(...rangeCounts);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        
        const value = Math.round(maxCount - (maxCount / 5) * i);
        ctx.fillStyle = '#a0aec0';
        ctx.font = '10px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(value.toString(), padding.left - 10, y + 4);
    }
    
    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe'];
    const stepX = chartWidth / ranges.length;
    const barWidth = stepX * 0.7;
    
    ranges.forEach((range, i) => {
        const x = padding.left + stepX * i + (stepX - barWidth) / 2;
        const barHeight = maxCount > 0 ? (rangeCounts[i] / maxCount) * chartHeight : 0;
        
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
        ctx.fillText(range.label, x + barWidth / 2, height - padding.bottom + 20);
    });
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('薪资分布', width / 2, 25);
}

function renderStatusChart() {
    const canvas = document.getElementById('statusChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const padding = { top: 40, right: 40, bottom: 40, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const activeCount = employeesData.filter(e => e.status == 1).length;
    const inactiveCount = employeesData.filter(e => e.status == 0).length;
    const total = activeCount + inactiveCount;
    
    if (total === 0) {
        ctx.fillStyle = '#a0aec0';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('暂无数据', width / 2, height / 2);
        return;
    }
    
    const statuses = [
        { label: '在职', count: activeCount, color: '#43e97b' },
        { label: '离职', count: inactiveCount, color: '#ef4444' }
    ];
    
    const barWidth = chartWidth * 0.35;
    const gap = chartWidth * 0.3;
    
    statuses.forEach((status, i) => {
        const x = padding.left + (barWidth + gap) * i;
        const barHeight = (status.count / total) * chartHeight;
        
        const gradient = ctx.createLinearGradient(x, height - padding.bottom, x, height - padding.bottom - barHeight);
        gradient.addColorStop(0, status.color);
        gradient.addColorStop(1, adjustColor(status.color, -30));
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, height - padding.bottom - barHeight, barWidth, barHeight, 8);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(status.count.toString(), x + barWidth / 2, height - padding.bottom - barHeight - 15);
        
        ctx.fillStyle = '#a0aec0';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(status.label, x + barWidth / 2, height - padding.bottom + 20);
    });
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('在职状态统计', width / 2, 25);
}

function renderHireChart() {
    const canvas = document.getElementById('hireChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const padding = { top: 40, right: 40, bottom: 50, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const monthCounts = {};
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    months.forEach(m => monthCounts[m] = 0);
    
    employeesData.forEach(emp => {
        if (emp.hire_date) {
            const month = parseInt(emp.hire_date.split('-')[1]) + '月';
            if (monthCounts[month] !== undefined) {
                monthCounts[month]++;
            }
        }
    });
    
    const counts = months.map(m => monthCounts[m]);
    const maxCount = Math.max(...counts);
    const minCount = Math.min(...counts);
    const range = maxCount - minCount || 1;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        
        const value = Math.round(maxCount - (range / 5) * i);
        ctx.fillStyle = '#a0aec0';
        ctx.font = '10px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(value.toString(), padding.left - 10, y + 4);
    }
    
    const stepX = chartWidth / (months.length - 1);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    months.forEach((m, i) => {
        const x = padding.left + stepX * i;
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, height - padding.bottom);
        ctx.stroke();
        
        ctx.fillStyle = '#a0aec0';
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(m, x, height - padding.bottom + 20);
    });
    
    ctx.beginPath();
    ctx.strokeStyle = '#f093fb';
    ctx.lineWidth = 3;
    months.forEach((m, i) => {
        const x = padding.left + stepX * i;
        const count = monthCounts[m];
        const y = padding.top + chartHeight - ((count - minCount) / range) * chartHeight;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    months.forEach((m, i) => {
        const x = padding.left + stepX * i;
        const count = monthCounts[m];
        const y = padding.top + chartHeight - ((count - minCount) / range) * chartHeight;
        
        ctx.beginPath();
        ctx.fillStyle = '#f093fb';
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.fillStyle = '#ffffff';
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
    });
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('入职时间分布', width / 2, 25);
}

function adjustColor(color, amount) {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
    return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
}

function openAddModal() {
    document.getElementById('modalTitle').textContent = '添加员工';
    document.getElementById('dataId').value = '';
    document.getElementById('name').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('position').value = '';
    document.getElementById('salary').value = '';
    document.getElementById('hire_date').value = '';
    document.getElementById('status').value = '1';
    document.getElementById('dataModal').style.display = 'block';
}

async function openEditModal(id) {
    const response = await fetch(`${API_BASE}/employees/${id}`);
    const item = await response.json();
    
    document.getElementById('modalTitle').textContent = '编辑员工';
    document.getElementById('dataId').value = item.id;
    document.getElementById('name').value = item.name;
    document.getElementById('phone').value = item.phone || '';
    document.getElementById('position').value = item.position || '';
    document.getElementById('salary').value = item.salary || '';
    document.getElementById('hire_date').value = item.hire_date || '';
    document.getElementById('status').value = item.status;
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
        position: document.getElementById('position').value,
        salary: document.getElementById('salary').value,
        hire_date: document.getElementById('hire_date').value,
        status: document.getElementById('status').value
    };
    
    let response;
    if (id) {
        response = await fetch(`${API_BASE}/employees/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    } else {
        response = await fetch(`${API_BASE}/employees`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    }
    
    const result = await response.json();
    
    if (response.ok) {
        alert(result.message);
        closeModal();
        loadData();
    } else {
        alert(result.error || '操作失败');
    }
}

async function deleteData(id) {
    if (!confirm('确定要删除这个员工吗？')) {
        return;
    }
    
    const response = await fetch(`${API_BASE}/employees/${id}`, {
        method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (response.ok) {
        alert(result.message);
        loadData();
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
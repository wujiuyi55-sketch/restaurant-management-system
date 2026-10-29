const API_BASE = '/api';

let records = [];
let isAdmin = false;
let searchTimer = null;

document.addEventListener('DOMContentLoaded', function () {
    loadUserInfo();
    loadRecords();
});

async function loadUserInfo() {
    try {
        const response = await fetch(`${API_BASE}/check-auth`, { credentials: 'include' });
        const data = await response.json();
        if (data.authenticated) {
            isAdmin = data.user.role === 'admin';
            document.getElementById('userName').textContent =
                `${data.user.real_name || data.user.username} (${isAdmin ? '管理员' : '从业者'})`;

            if (isAdmin) {
                const customerLink = document.getElementById('customerLink');
                const userLink = document.getElementById('userLink');
                if (customerLink) customerLink.style.display = 'block';
                if (userLink) userLink.style.display = 'block';
                document.getElementById('userColumn').style.display = '';
                document.getElementById('detailUserRow').style.display = 'flex';
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

function debounceSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadRecords, 300);
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function loadRecords() {
    const keyword = document.getElementById('searchKeyword').value.trim();
    const url = `${API_BASE}/chat/records?limit=100&keyword=${encodeURIComponent(keyword)}`;
    try {
        const response = await fetch(url, { credentials: 'include' });
        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }
        records = await response.json();
        if (!Array.isArray(records)) records = [];
        renderTable();
    } catch (error) {
        console.error('加载对话记录失败:', error);
        records = [];
        renderTable();
    }
}

function renderTable() {
    const tbody = document.getElementById('recordsBody');
    const emptyTip = document.getElementById('emptyTip');
    tbody.innerHTML = '';

    if (records.length === 0) {
        emptyTip.style.display = 'block';
        return;
    }
    emptyTip.style.display = 'none';

    records.forEach(record => {
        const row = document.createElement('tr');
        const userName = record.real_name || record.username || `用户${record.user_id}`;
        const question = escapeHtml(record.question);
        const answer = escapeHtml(record.answer || '');
        const userCell = isAdmin
            ? `<td>${escapeHtml(userName)}</td>`
            : '';
        row.innerHTML = `
            <td>${record.id}</td>
            ${userCell}
            <td><div class="record-text-cell" title="${question.replace(/"/g, '&quot;')}">${question}</div></td>
            <td><div class="record-text-cell answer" title="${answer.replace(/"/g, '&quot;')}">${answer || '-'}</div></td>
            <td>${record.created_at || '-'}</td>
            <td>
                <button class="edit-btn" onclick="openDetail(${record.id})">查看</button>
                <button class="delete-btn" onclick="deleteRecord(${record.id})">删除</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function openDetail(id) {
    const record = records.find(r => r.id === id);
    if (!record) return;

    document.getElementById('detailId').textContent = record.id;
    document.getElementById('detailTime').textContent = record.created_at || '-';
    document.getElementById('detailUser').textContent = record.real_name || record.username || `用户${record.user_id}`;
    document.getElementById('detailQuestion').textContent = record.question || '';
    document.getElementById('detailAnswer').textContent = record.answer || '（无回答内容）';

    document.getElementById('recordDetailModal').classList.add('show');
}

function closeDetail() {
    document.getElementById('recordDetailModal').classList.remove('show');
}

async function deleteRecord(id) {
    if (!confirm('确定要删除这条对话记录吗？')) {
        return;
    }
    try {
        const response = await fetch(`${API_BASE}/chat/records/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const result = await response.json();
        if (response.ok) {
            alert(result.message || '删除成功');
            loadRecords();
        } else {
            alert(result.error || '删除失败');
        }
    } catch (error) {
        console.error('删除对话记录失败:', error);
        alert('删除失败，请稍后重试');
    }
}

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeDetail();
    }
});

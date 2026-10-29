const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', function() {
    loadUserInfo();
    loadDishes();
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

async function loadDishes() {
    try {
        const response = await fetch(`${API_BASE}/dishes`, { credentials: 'include' });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                window.location.href = '/login';
                return;
            }
            throw new Error(`请求失败: ${response.status}`);
        }
        const dishes = await response.json();
        
        const tbody = document.getElementById('dataTableBody');
        tbody.innerHTML = '';
        
        dishes.forEach(dish => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${dish.id}</td>
                <td>${dish.name}</td>
                <td>¥${parseFloat(dish.price).toFixed(2)}</td>
                <td>${dish.category || '-'}</td>
                <td>${dish.description || '-'}</td>
                <td>${dish.status == 1 ? '<span style="color: green;">上架</span>' : '<span style="color: red;">下架</span>'}</td>
                <td>
                    <button class="edit-btn" onclick="openEditModal(${dish.id})">编辑</button>
                    <button class="recipe-btn" onclick="openRecipeModal(${dish.id}, '${(dish.name||'').replace(/'/g,"\\'")}')">配方</button>
                    <button class="delete-btn" onclick="deleteData(${dish.id})">删除</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('加载数据失败:', error);
    }
}

function openAddModal() {
    document.getElementById('modalTitle').textContent = '添加菜品';
    document.getElementById('dataId').value = '';
    document.getElementById('name').value = '';
    document.getElementById('price').value = '';
    document.getElementById('category').value = '热菜';
    document.getElementById('description').value = '';
    document.getElementById('status').value = '1';
    document.getElementById('dataModal').style.display = 'block';
}

async function openEditModal(id) {
    const response = await fetch(`${API_BASE}/dishes/${id}`);
    const dish = await response.json();
    
    document.getElementById('modalTitle').textContent = '编辑菜品';
    document.getElementById('dataId').value = dish.id;
    document.getElementById('name').value = dish.name;
    document.getElementById('price').value = dish.price;
    document.getElementById('category').value = dish.category || '热菜';
    document.getElementById('description').value = dish.description || '';
    document.getElementById('status').value = dish.status;
    document.getElementById('dataModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('dataModal').style.display = 'none';
}

async function saveData() {
    const id = document.getElementById('dataId').value;
    const data = {
        name: document.getElementById('name').value,
        price: document.getElementById('price').value,
        category: document.getElementById('category').value,
        description: document.getElementById('description').value,
        status: document.getElementById('status').value
    };
    
    let response;
    if (id) {
        response = await fetch(`${API_BASE}/dishes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    } else {
        response = await fetch(`${API_BASE}/dishes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    }
    
    const result = await response.json();
    
    if (response.ok) {
        alert(result.message);
        closeModal();
        loadDishes();
    } else {
        alert(result.error || '操作失败');
    }
}

async function deleteData(id) {
    if (!confirm('确定要删除这个菜品吗？')) {
        return;
    }
    
    const response = await fetch(`${API_BASE}/dishes/${id}`, {
        method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (response.ok) {
        alert(result.message);
        loadDishes();
    } else {
        alert(result.error || '删除失败');
    }
}

window.addEventListener('click', function(e) {
    const modal = document.getElementById('dataModal');
    if (e.target === modal) {
        closeModal();
    }
    const recipeModal = document.getElementById('recipeModal');
    if (e.target === recipeModal) {
        closeRecipeModal();
    }
});

// ============ 食材配方管理 ============
let inventoryNamesCache = [];

async function loadInventoryNames() {
    if (inventoryNamesCache.length) return inventoryNamesCache;
    try {
        const r = await fetch(`${API_BASE}/inventory/names`, { credentials: 'include' });
        if (r.ok) inventoryNamesCache = await r.json();
    } catch (e) { console.error('加载库存食材失败:', e); }
    return inventoryNamesCache;
}

async function openRecipeModal(dishId, dishName) {
    document.getElementById('recipeDishId').value = dishId;
    document.getElementById('recipeModalTitle').textContent = `「${dishName}」食材配方`;
    const tbody = document.getElementById('recipeTableBody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#6b7280;">加载中…</td></tr>';
    document.getElementById('recipeModal').style.display = 'block';

    const [names, recipe] = await Promise.all([
        loadInventoryNames(),
        fetch(`${API_BASE}/dishes/${dishId}/ingredients`, { credentials: 'include' }).then(r => r.json())
    ]);

    tbody.innerHTML = '';
    if (recipe && recipe.length) {
        recipe.forEach(it => addRecipeRow(it));
    } else {
        addRecipeRow();
    }
}

function closeRecipeModal() {
    document.getElementById('recipeModal').style.display = 'none';
}

function addRecipeRow(data) {
    const tbody = document.getElementById('recipeTableBody');
    const tr = document.createElement('tr');
    const opts = inventoryNamesCache.map(n =>
        `<option value="${n.item_name}">${n.item_name}（${n.category||''} / ${n.unit||''}）</option>`
    ).join('');
    const item_name = data ? (data.item_name || '') : '';
    const quantity = data ? (data.quantity || '') : '';
    const unit = data ? (data.unit || '') : '';
    const stock = data && data.stock != null ? data.stock : '';
    tr.innerHTML = `
        <td><select class="recipe-item-name"><option value="">请选择食材</option>${opts}</select></td>
        <td><input type="number" class="recipe-qty" step="0.01" min="0.01" value="${quantity}" style="width:110px;"></td>
        <td><input type="text" class="recipe-unit" value="${unit}" style="width:80px;" placeholder="kg/斤/盒"></td>
        <td class="recipe-stock">${stock}</td>
        <td><button class="delete-btn" onclick="this.closest('tr').remove()">移除</button></td>
    `;
    tbody.appendChild(tr);
    if (item_name) tr.querySelector('.recipe-item-name').value = item_name;
    tr.querySelector('.recipe-item-name').addEventListener('change', function() {
        const sel = inventoryNamesCache.find(n => n.item_name === this.value);
        const unitInput = tr.querySelector('.recipe-unit');
        if (sel && !unitInput.value) unitInput.value = sel.unit || '';
        tr.querySelector('.recipe-stock').textContent = sel ? sel.quantity : '';
    });
    if (item_name) tr.querySelector('.recipe-item-name').dispatchEvent(new Event('change'));
}

async function saveRecipe() {
    const dishId = document.getElementById('recipeDishId').value;
    const rows = document.querySelectorAll('#recipeTableBody tr');
    const ingredients = [];
    rows.forEach(tr => {
        const name = tr.querySelector('.recipe-item-name').value.trim();
        const qty = tr.querySelector('.recipe-qty').value;
        const unit = tr.querySelector('.recipe-unit').value.trim();
        if (name && qty) ingredients.push({ item_name: name, quantity: parseFloat(qty), unit });
    });
    try {
        const r = await fetch(`${API_BASE}/dishes/${dishId}/ingredients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ ingredients })
        });
        const j = await r.json();
        if (r.ok) {
            alert(j.message || '配方已保存');
            closeRecipeModal();
        } else {
            alert(j.error || '保存失败');
        }
    } catch (e) {
        console.error(e);
        alert('保存失败，请重试');
    }
}

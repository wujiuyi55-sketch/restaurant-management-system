let dishes = [];
let cart = [];
let currentCategory = 'all';
let searchKeyword = '';

const DISH_ICONS = {
    '热菜': '🍲',
    '凉菜': '🥗',
    '汤品': '🍜',
    '主食': '🍚',
    '饮品': '🍹',
    '甜品': '🍰',
    '其他': '🍽️'
};

async function loadDishes() {
    try {
        const response = await fetch('/api/public/dishes');
        const data = await response.json();
        dishes = data;
        renderDishes();
    } catch (error) {
        console.error('Failed to load dishes:', error);
    }
}

function renderDishes() {
    const grid = document.getElementById('dishGrid');
    const filtered = dishes.filter(dish => {
        const matchCategory = currentCategory === 'all' || dish.category === currentCategory;
        const matchSearch = !searchKeyword || 
            dish.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            dish.description.toLowerCase().includes(searchKeyword.toLowerCase());
        return matchCategory && matchSearch && dish.status === 1;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <p>没有找到符合条件的菜品</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(dish => {
        const icon = DISH_ICONS[dish.category] || DISH_ICONS['其他'];
        const prompt = encodeURIComponent(`${dish.name} 美食摄影 高清特写`);
        const imgUrl = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${prompt}&image_size=square_hd`;
        return `
            <div class="dish-card">
                <div class="dish-image">
                    <img src="${imgUrl}" alt="${dish.name}" onerror="this.style.display='none'; this.parentElement.innerHTML='${icon}'">
                </div>
                <div class="dish-info">
                    <div class="dish-name">${dish.name}</div>
                    <div class="dish-description">${dish.description || '暂无描述'}</div>
                    <div class="dish-footer">
                        <div class="dish-price">¥${parseFloat(dish.price).toFixed(2)}</div>
                        <button class="add-to-cart-btn" onclick="addToCart(${dish.id})">
                            + 加入购物车
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function filterCategory(category) {
    currentCategory = category;
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.includes(category === 'all' ? '全部' : category)) {
            btn.classList.add('active');
        }
    });
    renderDishes();
}

function searchDishes() {
    searchKeyword = document.getElementById('searchInput').value;
    renderDishes();
}

function getCartItem(dishId) {
    return cart.find(item => item.id === dishId);
}

function addToCart(dishId) {
    const dish = dishes.find(d => d.id === dishId);
    if (!dish) return;

    const cartItem = getCartItem(dishId);
    if (cartItem) {
        cartItem.quantity++;
    } else {
        cart.push({
            id: dish.id,
            name: dish.name,
            price: dish.price,
            quantity: 1,
            category: dish.category
        });
    }
    saveCart();
    updateCartUI();
}

function removeFromCart(dishId) {
    cart = cart.filter(item => item.id !== dishId);
    saveCart();
    updateCartUI();
}

function updateQuantity(dishId, delta) {
    const cartItem = getCartItem(dishId);
    if (cartItem) {
        cartItem.quantity += delta;
        if (cartItem.quantity <= 0) {
            removeFromCart(dishId);
        } else {
            saveCart();
            updateCartUI();
        }
    }
}

function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const cartFooter = document.getElementById('cartFooter');
    const totalPriceEl = document.querySelector('.cart-summary .total-price');

    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalCount;

    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <p>购物车是空的</p>
                <p class="hint">快去选购美味菜品吧！</p>
            </div>
        `;
        cartFooter.style.display = 'none';
        return;
    }

    cartFooter.style.display = 'block';
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    totalPriceEl.textContent = `¥${total.toFixed(2)}`;

    cartItems.innerHTML = cart.map(item => {
        const icon = DISH_ICONS[item.category] || DISH_ICONS['其他'];
        return `
            <div class="cart-item">
                <div class="cart-item-image">${icon}</div>
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">¥${parseFloat(item.price).toFixed(2)}</div>
                </div>
                <div class="cart-item-actions">
                    <div class="quantity-control">
                        <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                        <span class="qty-value">${item.quantity}</span>
                        <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                    </div>
                    <button class="remove-item-btn" onclick="removeFromCart(${item.id})">删除</button>
                </div>
            </div>
        `;
    }).join('');
}

function saveCart() {
    localStorage.setItem('restaurant_cart', JSON.stringify(cart));
}

function loadCart() {
    try {
        const saved = localStorage.getItem('restaurant_cart');
        if (saved) {
            cart = JSON.parse(saved);
            updateCartUI();
        }
    } catch (e) {
        cart = [];
    }
}

function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    sidebar.classList.toggle('open');
}

function checkout() {
    const orderItems = document.getElementById('orderItems');
    const finalTotal = document.getElementById('finalTotal');
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    orderItems.innerHTML = cart.map(item => `
        <div class="order-item">
            <div class="order-item-info">
                <div class="order-item-name">${item.name}</div>
                <div class="order-item-quantity">x${item.quantity}</div>
            </div>
            <div class="order-item-price">¥${(item.price * item.quantity).toFixed(2)}</div>
        </div>
    `).join('');
    
    finalTotal.textContent = `¥${total.toFixed(2)}`;
    document.getElementById('checkoutModal').classList.add('show');
}

function closeCheckout() {
    document.getElementById('checkoutModal').classList.remove('show');
}

async function submitOrder() {
    const name = document.getElementById('customerName').value;
    const phone = document.getElementById('customerPhone').value;
    const table = document.getElementById('tableNumber').value;

    if (!name || !phone || !table) {
        alert('请填写完整的顾客信息');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const orderData = {
        customer_name: name,
        customer_phone: phone,
        table_number: table,
        items: cart,
        total_price: total,
        status: 'paid'
    };

    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();

        if (response.ok) {
            document.getElementById('successOrderNo').textContent = result.order_no;
            document.getElementById('successAmount').textContent = `¥${total.toFixed(2)}`;
            closeCheckout();
            document.getElementById('successModal').classList.add('show');
            
            cart = [];
            saveCart();
            updateCartUI();
            
            saveOrderHistory(result);
        } else {
            alert(result.error || '下单失败');
        }
    } catch (error) {
        console.error('Order submission failed:', error);
        alert('网络错误，请重试');
    }
}

function closeSuccess() {
    document.getElementById('successModal').classList.remove('show');
}

function saveOrderHistory(order) {
    const history = getOrderHistory();
    history.unshift(order);
    localStorage.setItem('restaurant_orders', JSON.stringify(history));
}

function getOrderHistory() {
    try {
        const saved = localStorage.getItem('restaurant_orders');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        return [];
    }
}

async function showOrderHistory() {
    const history = getOrderHistory();
    const list = document.getElementById('orderHistoryList');
    
    if (history.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <p>暂无订单记录</p>
            </div>
        `;
    } else {
        list.innerHTML = history.map(order => `
            <div class="order-card">
                <div class="order-card-header">
                    <span class="order-no">订单号: ${order.order_no}</span>
                    <span class="order-status paid">已支付</span>
                </div>
                <div class="order-items-list">
                    ${order.items.map(item => `
                        <div class="order-history-item">
                            <span>${item.name} x${item.quantity}</span>
                            <span>¥${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="order-history-total">
                    合计: ¥${order.total_price.toFixed(2)}
                </div>
            </div>
        `).join('');
    }
    
    document.getElementById('orderHistoryModal').classList.add('show');
}

function closeOrderHistory() {
    document.getElementById('orderHistoryModal').classList.remove('show');
}

document.addEventListener('DOMContentLoaded', () => {
    loadDishes();
    loadCart();
});
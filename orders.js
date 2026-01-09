// 全局变量存储当前数据
let currentOrders = [];
let currentTags = {};

// 加载订单数据
async function loadOrders() {
    try {
        const [ordersRes, tagsRes] = await Promise.all([
            fetch('/api/orders'),
            fetch('/api/tags')
        ]);

        currentOrders = await ordersRes.json();
        currentTags = await tagsRes.json();

        renderOrderStats(currentOrders, currentTags);
        renderOrders(currentOrders);
    } catch (error) {
        console.error('加载订单失败:', error);
        document.getElementById('ordersContainer').innerHTML =
            '<div class="empty-state"><h2>加载失败</h2><p>请检查服务器是否运行</p></div>';
    }
}

// 渲染订单统计
function renderOrderStats(orders, tags) {
    const statsContainer = document.createElement('div');
    statsContainer.className = 'order-stats';
    statsContainer.innerHTML = `
        <div class="stats-card">
            <h3>📊 订单统计</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">${orders.length}</div>
                    <div class="stat-label">总订单数</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${orders.filter(o => o.status === 'pending').length}</div>
                    <div class="stat-label">待处理</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${orders.filter(o => o.status === 'completed').length}</div>
                    <div class="stat-label">已完成</div>
                </div>
            </div>
        </div>
    `;

    // 计算最受欢迎的菜品
    const dishStats = {};
    orders.forEach(order => {
        order.dishes.forEach(dish => {
            const dishName = dish.dish_name;
            dishStats[dishName] = (dishStats[dishName] || 0) + 1;
        });
    });

    const popularDishes = Object.entries(dishStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);

    if (popularDishes.length > 0) {
        statsContainer.innerHTML += `
            <div class="stats-card">
                <h3>🥇 最受欢迎菜品</h3>
                <div class="popular-dishes">
                    ${popularDishes.map(([name, count], index) => `
                        <div class="popular-item">
                            <span class="rank">#${index + 1}</span>
                            <span class="dish-name">${name}</span>
                            <span class="order-count">${count}次</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    const container = document.getElementById('ordersContainer');
    container.insertBefore(statsContainer, container.firstChild);
}

// 渲染订单列表
function renderOrders(orders) {
    const container = document.getElementById('ordersContainer');

    if (!orders || orders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h2>暂无订单</h2>
                <p>您还没有下过单，去点餐吧！</p>
                <a href="/recipe.html" style="display: inline-block; margin-top: 15px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px;">去点餐</a>
            </div>
        `;
        return;
    }

    container.innerHTML = orders.map(order => {
        const orderTime = new Date(order.order_time).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        const statusText = {
            'pending': '待处理',
            'completed': '已完成',
            'cancelled': '已取消'
        }[order.status] || order.status;

        const statusClass = order.status;

        return `
            <div class="order-card" onclick="viewOrderDetails(${order.id})">
                <div class="order-header">
                    <div class="order-time">${orderTime}</div>
                    <div class="order-status ${statusClass}">${statusText}</div>
                </div>
                <div class="order-summary">
                    <div>共 ${order.total_count} 道菜</div>
                    <div class="order-total">订单 #${order.id}</div>
                </div>
                <div class="order-dishes">
                    ${order.dishes.map(dish => `
                        <div class="dish-item">
                            <div class="dish-name">${dish.dish_name}</div>
                            ${dish.description ? `<div class="dish-description">${dish.description}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
                <div class="order-actions">
                    <button class="view-details-btn" onclick="event.stopPropagation(); viewOrderDetails(${order.id})">
                        👁️ 查看详情
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// 查看订单详情
async function viewOrderDetails(orderId) {
    const order = currentOrders.find(o => o.id === orderId);
    if (!order) return;

    const modal = document.getElementById('orderModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    const orderTime = new Date(order.order_time).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });

    const statusText = {
        'pending': '待处理',
        'completed': '已完成',
        'cancelled': '已取消'
    }[order.status] || order.status;

    modalTitle.textContent = `订单 #${order.id} - ${orderTime}`;

    modalBody.innerHTML = `
        <div class="order-detail-header">
            <div class="order-info">
                <div class="order-time">下单时间：${orderTime}</div>
                <div class="order-status status-${order.status}">状态：${statusText}</div>
                <div class="order-total">共 ${order.total_count} 道菜</div>
            </div>
        </div>

        <div class="order-dishes-detail">
            <h3>🍽️ 菜品详情</h3>
            ${await renderDishDetails(order.dishes)}
        </div>

        <div class="order-notes">
            <h3>📝 厨师备注</h3>
            <textarea id="orderNotes" placeholder="添加备注信息..." rows="4">${order.notes || ''}</textarea>
            <div class="notes-actions">
                <button onclick="saveOrderNotes(${order.id})" class="save-notes-btn">💾 保存备注</button>
            </div>
        </div>
    `;

    modal.style.display = 'block';
}

// 渲染菜品详细信息
async function renderDishDetails(dishes) {
    const dishDetails = await Promise.all(dishes.map(async (dish) => {
        const tag = currentTags[dish.stickerId];
        if (!tag) {
            return `
                <div class="dish-detail-card">
                    <h4>${dish.dish_name}</h4>
                    <p class="no-recipe">暂无菜谱信息</p>
                </div>
            `;
        }

        return `
            <div class="dish-detail-card">
                <h4>${tag.dish_name}</h4>
                ${tag.description ? `<p class="dish-description">${tag.description}</p>` : ''}
                ${tag.ingredients ? `
                    <div class="recipe-section">
                        <h5>🥘 原料：</h5>
                        <p>${tag.ingredients}</p>
                    </div>
                ` : ''}
                ${tag.recipe ? `
                    <div class="recipe-section">
                        <h5>👨‍🍳 做法：</h5>
                        <p>${tag.recipe}</p>
                    </div>
                ` : ''}
            </div>
        `;
    }));

    return dishDetails.join('');
}

// 保存订单备注
async function saveOrderNotes(orderId) {
    const notesTextarea = document.getElementById('orderNotes');
    const notes = notesTextarea.value.trim();

    try {
        const response = await fetch(`/api/orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ notes: notes })
        });

        const result = await response.json();

        if (result.success) {
            // 更新本地数据
            const order = currentOrders.find(o => o.id === orderId);
            if (order) {
                order.notes = notes;
            }

            alert('备注保存成功！');
        } else {
            alert('保存失败：' + (result.error || '未知错误'));
        }
    } catch (error) {
        console.error('保存备注失败:', error);
        alert('保存失败，请检查网络连接');
    }
}

// 关闭订单详情模态框
function closeOrderModal() {
    document.getElementById('orderModal').style.display = 'none';
}

// 点击模态框外部关闭
window.onclick = function(event) {
    const modal = document.getElementById('orderModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// 页面加载时初始化
loadOrders();
let tagsData = {};
        let mappingData = {};
        let selectedDishes = new Set();
        let allDishes = [];

        // 加载数据
        async function loadData() {
            try {
                const [tagsRes, mappingRes] = await Promise.all([
                    fetch('/api/tags'),
                    fetch('/api/mapping')
                ]);
                
                tagsData = await tagsRes.json();
                mappingData = await mappingRes.json();
                
                // 调试信息
                console.log('tagsData:', tagsData);
                console.log('mappingData:', mappingData);
                
                buildDishesList();
                renderDishes();
            } catch (error) {
                console.error('加载数据失败:', error);
                document.getElementById('dishesGrid').innerHTML = 
                    '<div class="empty-state"><h2>加载失败</h2><p>请检查服务器是否运行</p></div>';
            }
        }

        // 构建菜品列表
        function buildDishesList() {
            allDishes = [];
            
            // 遍历所有标签，找到有菜名的贴纸
            for (const [stickerId, tag] of Object.entries(tagsData)) {
                if (tag.dish_name && tag.dish_name.trim()) {
                    // 找到对应的贴纸路径
                    // stickerId格式: photoId_index（如：20260108_001_1_0）
                    let stickerPath = '';
                    
                    // 方法1：从stickerId中提取photoId和索引
                    // stickerId格式是 photoId_index，最后一部分是索引
                    const lastUnderscoreIndex = stickerId.lastIndexOf('_');
                    if (lastUnderscoreIndex > 0) {
                        const photoId = stickerId.substring(0, lastUnderscoreIndex);
                        const indexStr = stickerId.substring(lastUnderscoreIndex + 1);
                        const stickerIndex = parseInt(indexStr);
                        
                        if (!isNaN(stickerIndex) && mappingData[photoId] && mappingData[photoId].stickers) {
                            const stickers = mappingData[photoId].stickers;
                            if (stickers[stickerIndex] !== undefined) {
                                stickerPath = stickers[stickerIndex];
                            }
                        }
                    }
                    
                    // 方法2：如果方法1失败，遍历所有照片查找
                    if (!stickerPath) {
                        for (const [photoId, photoData] of Object.entries(mappingData)) {
                            const stickers = photoData.stickers || [];
                            // stickerId应该是 photoId_index 格式
                            if (stickerId.startsWith(photoId + '_')) {
                                const indexStr = stickerId.substring(photoId.length + 1);
                                const stickerIndex = parseInt(indexStr);
                                if (!isNaN(stickerIndex) && stickers[stickerIndex]) {
                                    stickerPath = stickers[stickerIndex];
                                    break;
                                }
                            }
                        }
                    }
                    
                    // 调试信息
                    if (!stickerPath) {
                        console.warn(`未找到贴纸路径: stickerId=${stickerId}`);
                    }
                    
                    allDishes.push({
                        stickerId,
                        stickerPath,
                        ...tag
                    });
                }
            }
        }

        // 渲染菜品
        function renderDishes(filteredDishes = null) {
            const dishes = filteredDishes || allDishes;
            const grid = document.getElementById('dishesGrid');
            
            if (dishes.length === 0) {
                grid.innerHTML = '<div class="empty-state"><h2>暂无菜品</h2><p>请先在浏览页标记贴纸</p></div>';
                return;
            }

            grid.innerHTML = dishes.map(dish => {
                const isSelected = selectedDishes.has(dish.stickerId);
                const hasDetails = dish.ingredients || dish.recipe;
                
                return `
                    <div class="dish-card ${isSelected ? 'selected' : ''}" 
                         onclick="toggleDish('${dish.stickerId}')"
                         data-dish-id="${dish.stickerId}">
                        <input type="checkbox" class="select-checkbox" 
                               ${isSelected ? 'checked' : ''}
                               onclick="event.stopPropagation(); toggleDish('${dish.stickerId}')">
                        <img src="${dish.stickerPath || ''}" alt="${dish.dish_name}" class="dish-image"
                             onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27/%3E'">
                        <div class="dish-info">
                            <div class="dish-name">
                                ${dish.favorite ? '<span class="favorite-icon">⭐</span>' : ''}
                                ${dish.dish_name}
                            </div>
                            ${dish.description ? `<div class="dish-description">${dish.description}</div>` : ''}
                            ${hasDetails ? `
                                <button class="toggle-details" onclick="event.stopPropagation(); toggleDetails('${dish.stickerId}')">
                                    查看详情
                                </button>
                                <div class="dish-details" id="details-${dish.stickerId}" style="display: none;">
                                    ${dish.ingredients ? `
                                        <div class="detail-section">
                                            <div class="detail-label">🥘 原料：</div>
                                            <div class="detail-content">${dish.ingredients}</div>
                                        </div>
                                    ` : ''}
                                    ${dish.recipe ? `
                                        <div class="detail-section">
                                            <div class="detail-label">👨‍🍳 做法：</div>
                                            <div class="detail-content">${dish.recipe}</div>
                                        </div>
                                    ` : ''}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }

        // 切换菜品选择
        function toggleDish(stickerId) {
            if (selectedDishes.has(stickerId)) {
                selectedDishes.delete(stickerId);
            } else {
                selectedDishes.add(stickerId);
            }
            updateOrderSummary();
            renderDishes();
        }

        // 切换详情显示
        function toggleDetails(stickerId) {
            const details = document.getElementById(`details-${stickerId}`);
            if (details) {
                details.style.display = details.style.display === 'none' ? 'block' : 'none';
                const btn = details.previousElementSibling;
                if (btn && btn.classList.contains('toggle-details')) {
                    btn.textContent = details.style.display === 'none' ? '查看详情' : '收起详情';
                }
            }
        }

        // 更新订单摘要
        function updateOrderSummary() {
            const orderList = document.getElementById('orderList');
            const orderCount = document.getElementById('orderCount');
            const totalCount = document.getElementById('totalCount');
            
            const selectedList = Array.from(selectedDishes).map(id => {
                const dish = allDishes.find(d => d.stickerId === id);
                return dish ? dish.dish_name : '';
            }).filter(name => name);
            
            orderCount.textContent = selectedList.length;
            totalCount.textContent = selectedList.length;
            
            if (selectedList.length === 0) {
                orderList.innerHTML = '<div style="color: #999; text-align: center; padding: 20px;">暂无选择</div>';
            } else {
                orderList.innerHTML = selectedList.map(name => 
                    `<div class="order-item">${name}</div>`
                ).join('');
            }
        }

        // 清空选择
        function clearOrder() {
            if (selectedDishes.size === 0) return;
            if (confirm('确定要清空所有选择吗？')) {
                selectedDishes.clear();
                updateOrderSummary();
                renderDishes();
            }
        }

        // 搜索过滤
        function filterDishes() {
            const keyword = document.getElementById('searchInput').value.toLowerCase().trim();
            
            if (!keyword) {
                renderDishes();
                return;
            }
            
            const filtered = allDishes.filter(dish => {
                return dish.dish_name.toLowerCase().includes(keyword) ||
                       (dish.description && dish.description.toLowerCase().includes(keyword)) ||
                       (dish.ingredients && dish.ingredients.toLowerCase().includes(keyword)) ||
                       (dish.recipe && dish.recipe.toLowerCase().includes(keyword));
            });
            
            renderDishes(filtered);
        }

        // 页面加载时初始化
        loadData();
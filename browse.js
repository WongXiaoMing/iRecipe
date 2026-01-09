let mappingData = {};
let tagsData = {};

// 加载数据
async function loadData() {
    try {
        const [mappingRes, tagsRes] = await Promise.all([
            fetch('/api/mapping'),
            fetch('/api/tags')
        ]);
        
        mappingData = await mappingRes.json();
        tagsData = await tagsRes.json();
        
        renderPhotos();
    } catch (error) {
        console.error('加载数据失败:', error);
        document.getElementById('photoGrid').innerHTML = 
            '<div class="empty-state">加载失败，请检查服务器是否运行</div>';
    }
}

// 渲染照片
function renderPhotos() {
    const grid = document.getElementById('photoGrid');
    
    const photos = Object.entries(mappingData);
    if (photos.length === 0) {
        grid.innerHTML = '<div class="empty-state">暂无照片，请先运行照片处理脚本</div>';
        return;
    }

    // 按时间倒序排列
    photos.sort((a, b) => {
        const timeA = a[1].processed_time || '';
        const timeB = b[1].processed_time || '';
        return timeB.localeCompare(timeA);
    });

    grid.innerHTML = photos.map(([photoId, photoData]) => {
        const stickers = photoData.stickers || [];
        const originalPhoto = photoData.original_photo || '';
        
        return `
            <div class="photo-card" data-photo-id="${photoId}">
                <img src="${originalPhoto}" alt="原图" class="photo-image" 
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27/%3E'">
                <div class="stickers-container">
                    ${stickers.map((stickerPath, index) => {
                        const stickerId = `${photoId}_${index}`;
                        const tag = tagsData[stickerId] || {};
                        const isFavorite = tag.favorite || false;
                        
                        return `
                            <div class="sticker-item ${isFavorite ? 'favorite' : ''}" 
                                 data-sticker-id="${stickerId}">
                                <img src="${stickerPath}" alt="贴纸" class="sticker-image"
                                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27/%3E'">
                                <div class="sticker-actions">
                                    <button class="btn-edit" onclick="editTag('${stickerId}')">编辑</button>
                                    <button class="btn-favorite ${isFavorite ? 'active' : ''}" 
                                            onclick="toggleFavorite('${stickerId}')">
                                        ⭐
                                    </button>
                                    <button class="btn-delete" onclick="deleteSticker('${photoId}', ${index})">删除</button>
                                </div>
                                ${tag.dish_name ? `<div style="font-size:12px;margin-top:5px;text-align:center;">${tag.dish_name}</div>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// 编辑标记
function editTag(stickerId) {
    const tag = tagsData[stickerId] || {};
    document.getElementById('stickerId').value = stickerId;
    document.getElementById('dishName').value = tag.dish_name || '';
    document.getElementById('description').value = tag.description || '';
    document.getElementById('ingredients').value = tag.ingredients || '';
    document.getElementById('recipe').value = tag.recipe || '';
    document.getElementById('tagModal').style.display = 'block';
}

// 关闭标记弹窗
function closeTagModal() {
    document.getElementById('tagModal').style.display = 'none';
}

// 保存标记
document.getElementById('tagForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const stickerId = document.getElementById('stickerId').value;
    const data = {
        sticker_id: stickerId,
        dish_name: document.getElementById('dishName').value,
        description: document.getElementById('description').value,
        ingredients: document.getElementById('ingredients').value,
        recipe: document.getElementById('recipe').value,
        updated_time: new Date().toISOString()
    };

    try {
        const response = await fetch('/api/save_tags', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });

        if (response.ok) {
            tagsData[stickerId] = data;
            closeTagModal();
            renderPhotos();
            alert('保存成功！');
        } else {
            alert('保存失败');
        }
    } catch (error) {
        console.error('保存失败:', error);
        alert('保存失败');
    }
});

// 切换收藏
async function toggleFavorite(stickerId) {
    const tag = tagsData[stickerId] || {};
    tag.favorite = !tag.favorite;
    tag.updated_time = new Date().toISOString();
    
    try {
        const response = await fetch('/api/save_tags', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                sticker_id: stickerId,
                ...tag
            })
        });

        if (response.ok) {
            tagsData[stickerId] = tag;
            renderPhotos();
        }
    } catch (error) {
        console.error('操作失败:', error);
    }
}

// 删除贴纸
async function deleteSticker(photoId, index) {
    if (!confirm('确定要删除这个贴纸吗？')) return;

    if (mappingData[photoId] && mappingData[photoId].stickers) {
        mappingData[photoId].stickers.splice(index, 1);
        
        // 如果贴纸全部删除，删除照片记录
        if (mappingData[photoId].stickers.length === 0) {
            delete mappingData[photoId];
        } else {
            // 更新映射
            try {
                const response = await fetch('/api/update_mapping', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(mappingData)
                });

                if (response.ok) {
                    renderPhotos();
                }
            } catch (error) {
                console.error('删除失败:', error);
            }
        }
    }
}

// 刷新数据
function refreshData() {
    loadData();
}

// 删除选中（简化版）
function deleteSelected() {
    alert('批量删除功能：请先选择要删除的贴纸');
}

// 批量收藏
function batchFavorite() {
    alert('批量收藏功能：请先选择要收藏的贴纸');
}

// 点击弹窗外部关闭
window.onclick = function(event) {
    const modal = document.getElementById('tagModal');
    if (event.target == modal) {
        closeTagModal();
    }
}

// 页面加载时初始化
loadData();
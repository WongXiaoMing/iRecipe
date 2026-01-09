let mappingData = {};
let tagsData = {};
let currentSortBy = 'processed_time';
let currentSortOrder = 'desc';

// 加载数据
async function loadData() {
    try {
        const [mappingRes, tagsRes] = await Promise.all([
            fetch('/api/mapping'),
            fetch('/api/tags')
        ]);
        
        mappingData = await mappingRes.json();
        tagsData = await tagsRes.json();
        
        // 设置默认排序选项
        document.getElementById('sortBy').value = currentSortBy;
        document.getElementById('sortOrder').value = currentSortOrder;
        
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

    // 按选择的排序方式排列
    photos.sort((a, b) => {
        const timeA = a[1][currentSortBy] || '';
        const timeB = b[1][currentSortBy] || '';
        const comparison = timeA.localeCompare(timeB);
        return currentSortOrder === 'desc' ? -comparison : comparison;
    });

    grid.innerHTML = photos.map(([photoId, photoData]) => {
        const stickers = photoData.stickers || [];
        const originalPhoto = photoData.original_photo || '';
        const captureTime = photoData.capture_time ? new Date(photoData.capture_time).toLocaleString('zh-CN') : '未知';
        const processedTime = photoData.processed_time ? new Date(photoData.processed_time).toLocaleString('zh-CN') : '未知';
        
        return `
            <div class="photo-card" data-photo-id="${photoId}">
                <div class="photo-info">
                    <div class="time-info">
                        📅 拍摄: ${captureTime}<br>
                        ⚙️ 处理: ${processedTime}
                    </div>
                </div>
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
                                <label class="sticker-checkbox">
                                    <input type="checkbox" class="sticker-select" 
                                           data-sticker-id="${stickerId}"
                                           onchange="updateStickerSelection(this)">
                                    <span class="checkmark"></span>
                                </label>
                                <img src="${stickerPath}" alt="贴纸" class="sticker-image"
                                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27/%3E'">
                                <div class="sticker-actions">
                                    <button class="btn-edit" onclick="editTag('${stickerId}')">编辑</button>
                                    <button class="btn-favorite ${isFavorite ? 'active' : ''}" 
                                            onclick="toggleFavorite('${stickerId}')">
                                         ${isFavorite ? '⭐' : '☆'}
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

// 改变排序方式
function changeSort() {
    currentSortBy = document.getElementById('sortBy').value;
    currentSortOrder = document.getElementById('sortOrder').value;
    renderPhotos();
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
        updated_time: new Date().toISOString(),
        favorite: true
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
                ops: tag.favorite?'update':'delete' ,
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
        const stickerId = `${photoId}_${index}`;
        
        // 删除贴纸
        mappingData[photoId].stickers.splice(index, 1);
        
        // 删除对应的标签
        if (tagsData[stickerId]) {
            delete tagsData[stickerId];
        }
        
        // 重新生成所有贴纸的ID（因为索引变了）
        const newMappingData = {};
        const newTagsData = {};
        
        for (const [pid, pdata] of Object.entries(mappingData)) {
            if (pdata.stickers && pdata.stickers.length > 0) {
                newMappingData[pid] = pdata;
                
                // 重新映射标签
                pdata.stickers.forEach((_, newIndex) => {
                    const oldStickerId = `${pid}_${newIndex}`;
                    const newStickerId = `${pid}_${newIndex}`;
                    
                    // 如果索引没变，保留标签；如果变了，需要找到对应的标签
                    // 由于我们删除了一个，后面的索引都会前移
                    // 这里简化处理：删除后重新加载数据
                });
            }
        }
        
        // 如果贴纸全部删除，删除照片记录
        if (mappingData[photoId].stickers.length === 0) {
            delete mappingData[photoId];
        }
        
        // 删除标签（服务器端）
        try {
            await fetch('/api/delete_tags', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ sticker_ids: [stickerId] })
            });
        } catch (error) {
            console.error('删除标签失败:', error);
        }
        
        // 更新映射
        try {
            const response = await fetch('/api/update_mapping', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(mappingData)
            });

            if (response.ok) {
                // 重新加载数据以确保ID正确
                await loadData();
            } else {
                alert('删除失败，请重试');
            }
        } catch (error) {
            console.error('删除失败:', error);
            alert('删除失败，请重试');
        }
    }
}

// 刷新数据
async function refreshData() {
    try {
        await loadData();
        alert('刷新成功！');
    } catch (error) {
        console.error('刷新失败:', error);
        alert('刷新失败，请重试');
    }
}

// 更新贴纸选中状态
function updateStickerSelection(checkbox) {
    const stickerItem = checkbox.closest('.sticker-item');
    if (checkbox.checked) {
        stickerItem.classList.add('selected');
    } else {
        stickerItem.classList.remove('selected');
    }
}

// 获取所有选中的贴纸ID
function getSelectedStickerIds() {
    const checkboxes = document.querySelectorAll('.sticker-select:checked');
    return Array.from(checkboxes).map(cb => cb.getAttribute('data-sticker-id'));
}

// 删除选中
async function deleteSelected() {
    const selectedIds = getSelectedStickerIds();
    
    if (selectedIds.length === 0) {
        alert('请先选择要删除的贴纸');
        return;
    }
    
    if (!confirm(`确定要删除选中的 ${selectedIds.length} 个贴纸吗？`)) {
        return;
    }
    
    try {
        // 按照片ID分组处理
        const photoStickerMap = {};
        selectedIds.forEach(stickerId => {
            const [photoId, indexStr] = stickerId.split('_');
            const index = parseInt(indexStr);
            if (!photoStickerMap[photoId]) {
                photoStickerMap[photoId] = [];
            }
            photoStickerMap[photoId].push({ stickerId, index });
        });
        
        // 从后往前删除，避免索引变化问题
        for (const [photoId, items] of Object.entries(photoStickerMap)) {
            // 按索引从大到小排序
            items.sort((a, b) => b.index - a.index);
            
            for (const { stickerId, index } of items) {
                if (mappingData[photoId] && mappingData[photoId].stickers) {
                    mappingData[photoId].stickers.splice(index, 1);
                    
                    // 删除标签
                    if (tagsData[stickerId]) {
                        delete tagsData[stickerId];
                    }
                    
                    // 如果贴纸全部删除，删除照片记录
                    if (mappingData[photoId].stickers.length === 0) {
                        delete mappingData[photoId];
                    }
                }
            }
        }
        
        // 删除标签（服务器端）
        await fetch('/api/delete_tags', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ sticker_ids: selectedIds })
        });
        
        // 更新映射
        const response = await fetch('/api/update_mapping', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(mappingData)
        });
        
        if (response.ok) {
            // 重新加载数据以确保ID正确
            await loadData();
            alert(`成功删除 ${selectedIds.length} 个贴纸`);
        } else {
            alert('删除失败，请重试');
        }
    } catch (error) {
        console.error('批量删除失败:', error);
        alert('批量删除失败，请重试');
    }
}

// 批量收藏
async function batchFavorite() {
    const selectedIds = getSelectedStickerIds();
    
    if (selectedIds.length === 0) {
        alert('请先选择要收藏的贴纸');
        return;
    }
    
    try {
        let successCount = 0;
        
        for (const stickerId of selectedIds) {
            const tag = tagsData[stickerId] || {};
            tag.favorite = true;
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
                    successCount++;
                }
            } catch (error) {
                console.error(`收藏 ${stickerId} 失败:`, error);
            }
        }
        
        if (successCount > 0) {
            renderPhotos();
            alert(`成功收藏 ${successCount} 个贴纸`);
        } else {
            alert('批量收藏失败，请重试');
        }
    } catch (error) {
        console.error('批量收藏失败:', error);
        alert('批量收藏失败，请重试');
    }
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
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
初始化数据目录和示例文件
"""

import os
import json
from pathlib import Path

def init_data_directories():
    """创建必要的数据目录"""
    dirs = [
        'data',
        'data/raw_photos',
        'data/stickers/static',
        'data/stickers/dynamic',
        'data/tags'
    ]
    
    for dir_path in dirs:
        Path(dir_path).mkdir(parents=True, exist_ok=True)
        print(f"✓ 创建目录: {dir_path}")

def init_json_files():
    """初始化JSON数据文件"""
    # 照片-贴纸映射文件
    mapping_file = 'data/photo_sticker_mapping.json'
    if not os.path.exists(mapping_file):
        with open(mapping_file, 'w', encoding='utf-8') as f:
            json.dump({}, f, ensure_ascii=False, indent=2)
        print(f"✓ 创建文件: {mapping_file}")
    
    # 贴纸标记文件
    tags_file = 'data/tags/sticker_tags.json'
    if not os.path.exists(tags_file):
        with open(tags_file, 'w', encoding='utf-8') as f:
            json.dump({}, f, ensure_ascii=False, indent=2)
        print(f"✓ 创建文件: {tags_file}")
    
    # 已处理文件日志
    log_file = 'data/processed_files.log'
    if not os.path.exists(log_file):
        Path(log_file).touch()
        print(f"✓ 创建文件: {log_file}")

if __name__ == '__main__':
    print("初始化数据目录和文件...")
    init_data_directories()
    init_json_files()
    print("\n初始化完成！")
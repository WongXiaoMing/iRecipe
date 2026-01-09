#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库初始化和迁移脚本
"""

import sqlite3
import json
import os

def create_database():
    """创建SQLite数据库和表"""
    conn = sqlite3.connect('data/irecipe.db')
    cursor = conn.cursor()

    # 创建photo_sticker_mapping表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS photo_sticker_mapping (
            photo_id TEXT PRIMARY KEY,
            original_photo TEXT,
            stickers TEXT,  -- JSON字符串
            is_live_photo INTEGER,
            processed_time TEXT
        )
    ''')

    # 检查并添加capture_time列（如果不存在）
    try:
        cursor.execute("ALTER TABLE photo_sticker_mapping ADD COLUMN capture_time TEXT")
        print("添加了capture_time列")
    except sqlite3.OperationalError:
        # 列已存在
        pass

    # 创建sticker_tags表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sticker_tags (
            sticker_id TEXT PRIMARY KEY,
            dish_name TEXT,
            description TEXT,
            ingredients TEXT,
            recipe TEXT,
            favorite INTEGER,
            updated_time TEXT
        )
    ''')

    conn.commit()
    conn.close()
    print("数据库和表创建完成")

def migrate_data():
    """迁移现有JSON数据到SQLite"""
    conn = sqlite3.connect('data/irecipe.db')
    cursor = conn.cursor()

    # 迁移photo_sticker_mapping
    mapping_file = 'data/photo_sticker_mapping.json'
    if os.path.exists(mapping_file):
        with open(mapping_file, 'r', encoding='utf-8') as f:
            mapping_data = json.load(f)

        for photo_id, data in mapping_data.items():
            cursor.execute('''
                INSERT OR REPLACE INTO photo_sticker_mapping
                (photo_id, original_photo, stickers, is_live_photo, capture_time, processed_time)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                photo_id,
                data.get('original_photo', ''),
                json.dumps(data.get('stickers', [])),
                1 if data.get('is_live_photo', False) else 0,
                data.get('capture_time', data.get('processed_time', '')),  # 如果没有capture_time，使用processed_time作为后备
                data.get('processed_time', '')
            ))

        print(f"迁移了 {len(mapping_data)} 条映射数据")

    # 迁移sticker_tags
    tags_file = 'data/tags/sticker_tags.json'
    if os.path.exists(tags_file):
        with open(tags_file, 'r', encoding='utf-8') as f:
            tags_data = json.load(f)

        for sticker_id, data in tags_data.items():
            cursor.execute('''
                INSERT OR REPLACE INTO sticker_tags
                (sticker_id, dish_name, description, ingredients, recipe, favorite, updated_time)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                sticker_id,
                data.get('dish_name', ''),
                data.get('description', ''),
                data.get('ingredients', ''),
                data.get('recipe', ''),
                1 if data.get('favorite', False) else 0,
                data.get('updated_time', '')
            ))

        print(f"迁移了 {len(tags_data)} 条标签数据")

    conn.commit()
    conn.close()
    print("数据迁移完成")

if __name__ == '__main__':
    os.makedirs('data', exist_ok=True)
    create_database()
    migrate_data()
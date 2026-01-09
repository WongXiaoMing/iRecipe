#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简单的Flask服务器，用于提供前端页面和API
"""

import os
import json
import sqlite3
import datetime
from flask import Flask, send_file, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # 启用CORS支持

def get_db_connection():
    """获取数据库连接"""
    conn = sqlite3.connect('data/irecipe.db')
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
@app.route('/index.html')
def index():
    return send_file('index.html')

@app.route('/browse.html')
def browse():
    return send_file('browse.html')

@app.route('/browse-style.css')
def browse_style():
    return send_file('browse-style.css')

@app.route('/recipe.html')
def recipe():
    return send_file('recipe.html')

@app.route('/recipe-style.css')
def recipe_style():
    return send_file('recipe-style.css')

@app.route('/browse.js')
def browse_js():
    return send_file('browse.js')
@app.route('/recipe.js')
def recipe_js():
    return send_file('recipe.js')

@app.route('/orders.html')
def orders():
    return send_file('orders.html')

@app.route('/orders-style.css')
def orders_style():
    return send_file('orders-style.css')

@app.route('/orders.js')
def orders_js():
    return send_file('orders.js')

@app.route('/api/mapping')
def api_mapping():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM photo_sticker_mapping')
    rows = cursor.fetchall()
    conn.close()

    mapping = {}
    for row in rows:
        mapping[row['photo_id']] = {
            'original_photo': row['original_photo'],
            'stickers': json.loads(row['stickers']) if row['stickers'] else [],
            'is_live_photo': bool(row['is_live_photo']),
            'capture_time': row['capture_time'],
            'processed_time': row['processed_time']
        }
    return jsonify(mapping)

@app.route('/api/tags')
def api_tags():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 获取所有标签
    cursor.execute('SELECT * FROM sticker_tags where favorite=true')
    tag_rows = cursor.fetchall()

    # 获取订单统计信息
    cursor.execute('''
        SELECT
            json_extract(dish.value, '$.stickerId') as sticker_id,
            COUNT(*) as order_count
        FROM orders,
             json_each(orders.dishes) as dish
        GROUP BY json_extract(dish.value, '$.stickerId')
    ''')
    order_stats_rows = cursor.fetchall()

    # 将订单统计转换为字典
    order_stats = {}
    for row in order_stats_rows:
        order_stats[row['sticker_id']] = row['order_count']

    conn.close()

    tags = {}
    for row in tag_rows:
        tags[row['sticker_id']] = {
            'dish_name': row['dish_name'],
            'description': row['description'],
            'ingredients': row['ingredients'],
            'recipe': row['recipe'],
            'favorite': bool(row['favorite']),
            'updated_time': row['updated_time'],
            'order_count': order_stats.get(row['sticker_id'], 0)  # 添加订单次数
        }
    return jsonify(tags)

@app.route('/data/<path:filepath>')
def serve_data(filepath):
    return send_file(os.path.join('data', filepath))

@app.route('/static/<path:filepath>')
def serve_static(filepath):
    return send_file(filepath)

@app.route('/api/save_tags', methods=['POST'])
def save_tags():
    try:
        data = request.get_json()
        sticker_id = data.get('sticker_id')
        if not sticker_id:
            return jsonify({'error': 'Missing sticker_id'}), 400

        conn = get_db_connection()
        cursor = conn.cursor()
        
        if data.get('delete', False):
            # 删除标签
            cursor.execute('DELETE FROM sticker_tags WHERE sticker_id = ?', (sticker_id,))
            conn.commit()
            conn.close()
            return jsonify({'success': True})

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

        conn.commit()
        conn.close()

        return jsonify({'success': True})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/update_mapping', methods=['POST'])
def update_mapping():
    try:
        data = request.get_json()

        conn = get_db_connection()
        cursor = conn.cursor()

        # 清空现有数据
        cursor.execute('DELETE FROM photo_sticker_mapping')

        # 插入新数据
        for photo_id, photo_data in data.items():
            cursor.execute('''
                INSERT INTO photo_sticker_mapping
                (photo_id, original_photo, stickers, is_live_photo, capture_time, processed_time)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                photo_id,
                photo_data.get('original_photo', ''),
                json.dumps(photo_data.get('stickers', [])),
                1 if photo_data.get('is_live_photo', False) else 0,
                photo_data.get('capture_time', ''),
                photo_data.get('processed_time', '')
            ))

        conn.commit()
        conn.close()

        return jsonify({'success': True})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/orders', methods=['POST'])
def create_order():
    try:
        data = request.get_json()
        dishes = data.get('dishes', [])
        total_count = data.get('total_count', 0)

        if not dishes or total_count <= 0:
            return jsonify({'error': 'Invalid order data'}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        order_time = datetime.datetime.now().isoformat()

        cursor.execute('''
            INSERT INTO orders (order_time, dishes, total_count, status)
            VALUES (?, ?, ?, ?)
        ''', (order_time, json.dumps(dishes), total_count, 'pending'))

        order_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return jsonify({'success': True, 'order_id': order_id})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/orders')
def get_orders():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM orders ORDER BY order_time DESC')
        rows = cursor.fetchall()
        conn.close()

        orders = []
        for row in rows:
            orders.append({
                'id': row['id'],
                'order_time': row['order_time'],
                'dishes': json.loads(row['dishes']),
                'total_count': row['total_count'],
                'status': row['status'],
                'notes': row['notes'] or ''
            })

        return jsonify(orders)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/orders/<int:order_id>', methods=['PUT'])
def update_order_notes(order_id):
    try:
        data = request.get_json()
        notes = data.get('notes', '')

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('''
            UPDATE orders
            SET notes = ?
            WHERE id = ?
        ''', (notes, order_id))

        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'error': 'Order not found'}), 404

        conn.commit()
        conn.close()

        return jsonify({'success': True})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print('服务器启动在 http://localhost:8000')
    print('访问 http://localhost:8000/browse.html 查看浏览页')
    print('访问 http://localhost:8000/recipe.html 查看菜谱页')
    print('按 Ctrl+C 停止服务器')
    app.run(host='0.0.0.0', port=8000, threaded=True)
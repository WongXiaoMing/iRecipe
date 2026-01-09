#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简单的HTTP服务器，用于提供前端页面和API
"""

import os
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import mimetypes

class WebHandler(BaseHTTPRequestHandler):
    """HTTP请求处理器"""
    
    def do_GET(self):
        """处理GET请求"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        # 路由处理
        if path == '/' or path == '/index.html':
            self.serve_file('index.html')
        elif path == '/browse.html':
            self.serve_file('browse.html')
        elif path == '/browse-style.css':
            self.serve_file('browse-style.css')
        elif path == '/recipe.html':
            self.serve_file('recipe.html')
        elif path == '/recipe-style.css':
            self.serve_file('recipe-style.css')
        elif path == '/browse.js':
            self.serve_file('browse.js')
        elif path == '/recipe.js':
            self.serve_file('recipe.js')
        elif path == '/api/mapping':
            self.serve_json('data/photo_sticker_mapping.json')
        elif path == '/api/tags':
            self.serve_json('data/tags/sticker_tags.json')
        elif path.startswith('/data/'):
            # 提供静态文件（图片、贴纸等）
            self.serve_file(path[1:])  # 去掉开头的'/'
        elif path.startswith('/static/'):
            # CSS/JS文件
            self.serve_file(path[1:])
        else:
            self.send_error(404)
    
    def do_POST(self):
        """处理POST请求"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        if path == '/api/save_tags':
            self.save_tags()
        elif path == '/api/update_mapping':
            self.update_mapping()
        else:
            self.send_error(404)
    
    def serve_file(self, filepath):
        """提供文件服务"""
        if not os.path.exists(filepath):
            self.send_error(404)
            return
        
        # 设置MIME类型
        mimetype, _ = mimetypes.guess_type(filepath)
        if mimetype is None:
            mimetype = 'application/octet-stream'
        
        self.send_response(200)
        self.send_header('Content-type', mimetype)
        self.end_headers()
        
        with open(filepath, 'rb') as f:
            self.wfile.write(f.read())
    
    def serve_json(self, filepath):
        """提供JSON文件服务"""
        if not os.path.exists(filepath):
            # 如果文件不存在，返回空JSON
            data = {}
        else:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json; charset=utf-8')
        self.end_headers()
        
        json_str = json.dumps(data, ensure_ascii=False)
        self.wfile.write(json_str.encode('utf-8'))
    
    def save_tags(self):
        """保存贴纸标记"""
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode('utf-8'))
            
            # 读取现有标签
            tags_file = 'data/tags/sticker_tags.json'
            if os.path.exists(tags_file):
                with open(tags_file, 'r', encoding='utf-8') as f:
                    tags = json.load(f)
            else:
                tags = {}
            
            # 更新标签
            sticker_id = data.get('sticker_id')
            if sticker_id:
                tags[sticker_id] = {
                    'dish_name': data.get('dish_name', ''),
                    'description': data.get('description', ''),
                    'ingredients': data.get('ingredients', ''),
                    'recipe': data.get('recipe', ''),
                    'favorite': data.get('favorite', False),
                    'updated_time': data.get('updated_time', '')
                }
                
                # 确保目录存在
                os.makedirs('data/tags', exist_ok=True)
                
                # 保存
                with open(tags_file, 'w', encoding='utf-8') as f:
                    json.dump(tags, f, ensure_ascii=False, indent=2)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True}).encode('utf-8'))
            else:
                self.send_error(400, 'Missing sticker_id')
                
        except Exception as e:
            self.send_error(500, str(e))
    
    def update_mapping(self):
        """更新映射文件"""
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode('utf-8'))
            
            # 保存映射
            with open('data/photo_sticker_mapping.json', 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({'success': True}).encode('utf-8'))
            
        except Exception as e:
            self.send_error(500, str(e))
    
    def log_message(self, format, *args):
        """重写日志方法，使用UTF-8编码"""
        message = format % args
        print(message)


def main():
    """启动服务器"""
    port = 8000
    server_address = ('', port)
    httpd = HTTPServer(server_address, WebHandler)
    
    print(f'服务器启动在 http://localhost:{port}')
    print('访问 http://localhost:8000/browse.html 查看浏览页')
    print('访问 http://localhost:8000/recipe.html 查看菜谱页')
    print('按 Ctrl+C 停止服务器')
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n服务器已停止')
        httpd.server_close()


if __name__ == '__main__':
    main()
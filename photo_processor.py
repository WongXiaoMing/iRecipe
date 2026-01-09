#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
照片自动化处理脚本
功能：从NAS读取照片，筛选食物照片，生成静态/动态贴纸
"""

import os
import json
import shutil
import logging
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Tuple
import cv2
import numpy as np
from PIL import Image
import imageio
from rembg import remove
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('photo_processor.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class PhotoProcessor:
    """照片处理器"""
    
    def __init__(self, config_path: str = "config.json"):
        """初始化处理器"""
        with open(config_path, 'r', encoding='utf-8') as f:
            self.config = json.load(f)
        
        # 创建必要的目录
        self._create_directories()
        
        # 加载已处理文件列表
        self.processed_files = self._load_processed_files()
        
        # 加载照片-贴纸映射
        self.mapping = self._load_mapping()
    
    def _create_directories(self):
        """创建必要的目录"""
        dirs = [
            self.config['local_data_path'],
            self.config['raw_photos_path'],
            self.config['stickers_static_path'],
            self.config['stickers_dynamic_path'],
            self.config['tags_path']
        ]
        for dir_path in dirs:
            Path(dir_path).mkdir(parents=True, exist_ok=True)
    
    def _load_processed_files(self) -> set:
        """加载已处理文件列表"""
        log_file = self.config['processed_files_log']
        if os.path.exists(log_file):
            with open(log_file, 'r', encoding='utf-8') as f:
                return set(line.strip() for line in f if line.strip())
        return set()
    
    def _save_processed_file(self, file_path: str):
        """记录已处理文件"""
        log_file = self.config['processed_files_log']
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(f"{file_path}\n")
        self.processed_files.add(file_path)
    
    def _load_mapping(self) -> Dict:
        """加载照片-贴纸映射"""
        mapping_file = self.config['mapping_file']
        if os.path.exists(mapping_file):
            with open(mapping_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}
    
    def _save_mapping(self):
        """保存照片-贴纸映射"""
        mapping_file = self.config['mapping_file']
        with open(mapping_file, 'w', encoding='utf-8') as f:
            json.dump(self.mapping, f, ensure_ascii=False, indent=2)
    
    def scan_photos(self) -> List[str]:
        """扫描NAS路径，获取所有照片文件"""
        nas_path = self.config['nas_path']
        photo_files = []
        
        if not os.path.exists(nas_path):
            logger.warning(f"NAS路径不存在: {nas_path}")
            return photo_files
        
        # 支持的图片格式
        image_extensions = {'.jpg', '.jpeg', '.png', '.heic', '.heif'}
        video_extensions = {'.mov', '.mp4'}
        
        for root, dirs, files in os.walk(nas_path):
            for file in files:
                file_path = os.path.join(root, file)
                file_ext = os.path.splitext(file)[1].lower()
                
                if file_ext in image_extensions or file_ext in video_extensions:
                    if file_path not in self.processed_files:
                        photo_files.append(file_path)
        
        logger.info(f"扫描到 {len(photo_files)} 个新照片文件")
        return photo_files
    
    def is_food_photo(self, image_path: str) -> bool:
        """判断是否为食物照片（简化版：基于文件名和基本特征）"""
        # 这里应该调用AI API，暂时使用简化判断
        # 实际应用中应集成CLIP或百度AI等API
        
        filename = os.path.basename(image_path).lower()
        food_keywords = ['food', 'meal', 'dish', 'cooking', 'recipe', 'delicious']
        
        # 简单关键词匹配（实际应使用AI识别）
        for keyword in food_keywords:
            if keyword in filename:
                return True
        
        # 尝试读取图片进行基本判断
        try:
            img = cv2.imread(image_path)
            if img is None:
                return False
            
            # 简单的颜色和纹理分析（简化版）
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            # 食物通常有丰富的颜色
            color_variance = np.var(hsv[:, :, 1])
            if color_variance > 1000:  # 阈值可调整
                return True
        except Exception as e:
            logger.error(f"分析图片失败 {image_path}: {e}")
        
        return False
    
    def extract_stickers_from_image(self, image_path: str, photo_id: str) -> List[str]:
        """从图片中提取食物贴纸"""
        sticker_paths = []
        
        try:
            # 检查是否为HEIC格式
            file_ext = os.path.splitext(image_path)[1].lower()
            is_heic = file_ext in ['.heic', '.heif']
            
            # 如果是HEIC格式，使用pillow-heif注册HEIF插件
            if is_heic:
                try:
                    from pillow_heif import register_heif_opener
                    register_heif_opener()
                    logger.info("已注册HEIF插件，支持HEIC格式")
                except ImportError:
                    logger.warning("pillow-heif未安装，无法处理HEIC文件。请安装: pip install pillow-heif")
                    return sticker_paths
                except Exception as e:
                    logger.warning(f"注册HEIF插件失败: {e}，尝试继续处理")
            
            # 使用rembg去除背景（rembg可以直接处理HEIC，如果pillow-heif已注册）
            with open(image_path, 'rb') as f:
                input_data = f.read()
            
            output_data = remove(input_data)
            
            # 保存贴纸
            sticker_filename = f"{photo_id}_1.png"
            sticker_path = os.path.join(self.config['stickers_static_path'], sticker_filename)
            
            with open(sticker_path, 'wb') as f:
                f.write(output_data)
            
            sticker_paths.append(sticker_path)
            logger.info(f"生成静态贴纸: {sticker_path}")
            
        except Exception as e:
            logger.error(f"提取贴纸失败 {image_path}: {e}")
        
        return sticker_paths
    
    def extract_live_photo_stickers(self, image_path: str, mov_path: str, photo_id: str) -> str:
        """从实况照片提取动态贴纸"""
        try:
            # 读取MOV文件
            if not os.path.exists(mov_path):
                logger.warning(f"MOV文件不存在: {mov_path}")
                return None
            
            reader = imageio.get_reader(mov_path)
            frames = []
            
            # 提取关键帧（简化：取前10帧，或总帧数的一半）
            total_frames = reader.count_frames() if hasattr(reader, 'count_frames') else None
            max_frames = min(10, total_frames // 2 if total_frames else 10)
            
            frame_count = 0
            for frame in reader:
                if frame_count >= max_frames:
                    break
                frames.append(frame)
                frame_count += 1
            
            reader.close()
            
            if not frames:
                logger.warning(f"无法从MOV提取帧: {mov_path}")
                return None
            
            # 对每一帧进行背景移除
            processed_frames = []
            import io
            for frame in frames:
                try:
                    # 转换为PIL Image
                    pil_img = Image.fromarray(frame)
                    # 使用rembg
                    img_bytes = io.BytesIO()
                    pil_img.save(img_bytes, format='PNG')
                    output_data = remove(img_bytes.getvalue())
                    processed_img = Image.open(io.BytesIO(output_data))
                    processed_frames.append(np.array(processed_img))
                except Exception as e:
                    logger.warning(f"处理帧失败: {e}")
                    continue
            
            if not processed_frames:
                logger.warning(f"没有成功处理的帧")
                return None
            
            # 保存为GIF
            sticker_filename = f"{photo_id}_1.gif"
            sticker_path = os.path.join(self.config['stickers_dynamic_path'], sticker_filename)
            imageio.mimsave(sticker_path, processed_frames, duration=0.1, loop=0)
            
            logger.info(f"生成动态贴纸: {sticker_path}")
            return sticker_path
            
        except Exception as e:
            logger.error(f"提取动态贴纸失败 {image_path}: {e}")
            return None
    
    def process_photo(self, photo_path: str):
        """处理单张照片"""
        try:
            # 生成照片ID
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = os.path.basename(photo_path)
            photo_id = f"{timestamp}_{os.path.splitext(filename)[0]}"
            
            # 判断是否为食物照片
            if not self.is_food_photo(photo_path):
                logger.info(f"跳过非食物照片: {photo_path}")
                self._save_processed_file(photo_path)
                return
            
            # 复制到raw_photos目录
            dest_path = os.path.join(self.config['raw_photos_path'], os.path.basename(photo_path))
            shutil.copy2(photo_path, dest_path)
            
            # 检查是否为实况照片（尝试多种可能的MOV文件名）
            base_name = os.path.splitext(photo_path)[0]
            mov_path = None
            is_live_photo = False
            
            # 尝试常见的MOV文件名格式
            possible_mov_paths = [
                base_name + '.mov',
                base_name + '.MOV',
                photo_path.replace('.jpg', '.mov').replace('.jpeg', '.mov').replace('.JPG', '.mov').replace('.JPEG', '.mov'),
            ]
            
            for mov_file in possible_mov_paths:
                if os.path.exists(mov_file):
                    mov_path = mov_file
                    is_live_photo = True
                    break
            
            sticker_paths = []
            
            if is_live_photo:
                # 处理实况照片
                mov_dest = os.path.join(self.config['raw_photos_path'], os.path.basename(mov_path))
                shutil.copy2(mov_path, mov_dest)
                
                sticker_path = self.extract_live_photo_stickers(dest_path, mov_dest, photo_id)
                if sticker_path:
                    sticker_paths.append(sticker_path)
            else:
                # 处理静态照片
                sticker_paths = self.extract_stickers_from_image(dest_path, photo_id)
            
            # 更新映射
            if sticker_paths:
                self.mapping[photo_id] = {
                    'original_photo': dest_path,
                    'stickers': sticker_paths,
                    'is_live_photo': is_live_photo,
                    'processed_time': datetime.now().isoformat()
                }
                self._save_mapping()
            
            # 记录已处理
            self._save_processed_file(photo_path)
            if is_live_photo:
                self._save_processed_file(mov_path)
            
            logger.info(f"处理完成: {photo_path}")
            
        except Exception as e:
            logger.error(f"处理照片失败 {photo_path}: {e}")
    
    def process_all(self):
        """处理所有新照片"""
        photos = self.scan_photos()
        for photo_path in photos:
            self.process_photo(photo_path)
        logger.info(f"共处理 {len(photos)} 张照片")


class PhotoWatcher(FileSystemEventHandler):
    """文件系统监控器"""
    
    def __init__(self, processor: PhotoProcessor):
        self.processor = processor
    
    def on_created(self, event):
        if not event.is_directory:
            file_path = event.src_path
            if any(file_path.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.heic', '.mov']):
                logger.info(f"检测到新文件: {file_path}")
                self.processor.process_photo(file_path)


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='照片处理器')
    parser.add_argument('--mode', choices=['once', 'watch'], default='once',
                       help='运行模式: once=单次处理, watch=持续监控')
    
    args = parser.parse_args()
    
    processor = PhotoProcessor()
    
    if args.mode == 'once':
        logger.info("开始单次处理...")
        processor.process_all()
    else:
        logger.info("开始监控模式...")
        event_handler = PhotoWatcher(processor)
        observer = Observer()
        observer.schedule(event_handler, processor.config['nas_path'], recursive=True)
        observer.start()
        
        try:
            while True:
                import time
                time.sleep(1)
        except KeyboardInterrupt:
            observer.stop()
        observer.join()


if __name__ == '__main__':
    main()
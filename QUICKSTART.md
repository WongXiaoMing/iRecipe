# 快速开始指南

## 第一步：安装依赖

```bash
pip install -r requirements.txt
```

**重要提示**：
- `pillow-heif` 用于支持HEIC格式（iPhone照片），Windows上可直接安装
- `rembg` 首次运行时会自动下载AI模型（约170MB）

## 第二步：配置系统

编辑 `config.json`，修改NAS路径：

```json
{
  "nas_path": "//192.168.1.100/photo/iphone_food/",
  ...
}
```

**Windows用户**：使用 `//IP地址/共享文件夹` 格式

## 第三步：初始化数据目录

```bash
python init_data.py
```

或者直接运行 `start.bat`（Windows）会自动初始化。

## 第四步：处理照片

### 方式一：使用批处理脚本（Windows）

双击运行 `process_photos.bat`，选择处理模式。

### 方式二：命令行

**单次处理**（处理所有新照片）：
```bash
python photo_processor.py --mode once
```

**持续监控**（自动处理新增照片）：
```bash
python photo_processor.py --mode watch
```

## 第五步：启动Web服务器

### 方式一：使用批处理脚本（Windows）

双击运行 `start.bat`

### 方式二：命令行

```bash
python server.py
```

服务器启动后，访问：
- http://localhost:8000/ - 首页
- http://localhost:8000/browse.html - 浏览管理页
- http://localhost:8000/recipe.html - 菜谱展示页

## 使用流程

1. **处理照片**：运行照片处理脚本，系统会自动：
   - 从NAS读取照片
   - 筛选食物照片
   - 生成贴纸（PNG/GIF）

2. **标记贴纸**：在浏览页（browse.html）：
   - 查看所有照片和贴纸
   - 点击"编辑"为贴纸添加菜名、描述、原料、做法
   - 点击"⭐"收藏喜欢的贴纸
   - 删除无效的贴纸

3. **查看菜谱**：在菜谱页（recipe.html）：
   - 浏览所有已标记的菜品
   - 使用搜索框查找
   - 勾选菜品进行"点餐"
   - 查看菜品的详细信息

## 常见问题

### Q: NAS路径无法访问？
A: 确保：
- NAS已开启文件共享
- 网络连接正常
- Windows下使用正确的网络路径格式（`//IP/路径`）

### Q: 照片处理失败？
A: 检查：
- 照片格式是否支持（JPG/PNG/HEIC）
- 是否有足够的磁盘空间
- 查看 `photo_processor.log` 日志文件

### Q: 贴纸背景去除效果不好？
A: `rembg` 使用AI模型，对某些复杂背景可能效果不佳。可以：
- 手动调整照片
- 使用其他背景去除工具预处理

### Q: 如何集成更好的AI识别？
A: 修改 `photo_processor.py` 中的 `is_food_photo()` 方法，集成：
- CLIP模型（OpenAI）
- 百度AI开放平台
- 其他图像识别API

## 下一步

- 阅读完整文档：`README.md`
- 自定义配置：编辑 `config.json`
- 扩展功能：修改源代码

祝使用愉快！🍽️
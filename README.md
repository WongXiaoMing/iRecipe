# 食物照片转菜谱系统

一套轻量型食物照片自动化处理 + 网页端管理系统，实现从iPhone照片自动生成食物贴纸，并通过网页端完成标记、管理和菜谱展示。

## 功能特性

### 📸 照片自动化处理（后端）
- **照片读取**：支持从NAS路径读取iPhone照片（JPG/PNG/HEIC），兼容实况照片（Live Photo）
- **食物筛选**：自动识别并筛选包含食物的照片
- **贴纸生成**：自动抠取食物贴纸（静态PNG/动态GIF）
- **定时监控**：支持手动触发和定时监控两种模式

### 🌐 网页端管理系统（前端）
- **浏览管理页**：照片和贴纸的浏览、编辑、删除、收藏
- **标记功能**：为贴纸添加菜名、描述、原料、做法等信息
- **菜谱展示页**：按菜名分类展示，支持搜索和点餐功能
- **订单记录页**：查看历史下单记录，按时间排序展示

## 项目结构

```
iRecipe/
├── photo_processor.py      # 照片处理主脚本
├── server.py               # HTTP服务器
├── config.json             # 配置文件
├── requirements.txt        # Python依赖
├── index.html              # 首页
├── browse.html             # 浏览管理页
├── browse-style.css        # 浏览页样式
├── browse.js               # 浏览页脚本
├── recipe.html             # 菜谱展示页
├── recipe-style.css        # 菜谱页样式
├── recipe.js               # 菜谱页脚本
├── orders.html             # 订单记录页
├── orders-style.css        # 订单页样式
├── orders.js               # 订单页脚本
├── README.md               # 说明文档
└── data/                   # 数据目录（自动生成）
    ├── irecipe.db          # SQLite数据库
    ├── raw_photos/         # 筛选后的原图
    └── stickers/
        ├── static/         # 静态贴纸（PNG）
        └── dynamic/        # 动态贴纸（GIF）
```

## 安装与配置

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

**注意**：某些依赖可能需要额外安装：

- **pillow-heif**：用于读取HEIC格式图片（iPhone照片），Windows上可直接通过pip安装，无需额外系统库

- **rembg**：用于背景移除，首次运行会自动下载模型（约170MB）

### 2. 配置系统

编辑 `config.json` 文件：

```json
{
  "nas_path": "//192.168.1.100/photo/iphone_food/",
  "scan_interval_seconds": 3600,
  ...
}
```

**重要配置项**：
- `nas_path`: NAS照片路径（Windows网络路径格式）
- `scan_interval_seconds`: 定时扫描间隔（秒）
- `ai_api`: AI识别API配置（可选，当前使用简化版识别）

## 使用方法

### 1. 处理照片

**单次处理模式**：
```bash
python photo_processor.py --mode once
```

**持续监控模式**：
```bash
python photo_processor.py --mode watch
```

### 2. 启动Web服务器

```bash
python server.py
```

服务器将在 `http://localhost:8000` 启动。

### 3. 访问网页

- **首页**：http://localhost:8000/
- **浏览管理页**：http://localhost:8000/browse.html
- **菜谱展示页**：http://localhost:8000/recipe.html
- **订单记录页**：http://localhost:8000/orders.html

## 功能说明

### 照片处理流程

1. **扫描照片**：从配置的NAS路径扫描所有照片文件
2. **食物筛选**：使用图像识别判断是否为食物照片（当前为简化版，可集成CLIP或百度AI）
3. **生成贴纸**：
   - 静态照片：使用rembg去除背景，生成PNG贴纸
   - 实况照片：提取MOV关键帧，生成GIF动态贴纸
4. **保存映射**：记录照片与贴纸的对应关系

### 网页端操作

#### 浏览管理页
- 查看所有处理后的照片和贴纸
- 点击"编辑"为贴纸添加标记信息
- 点击"⭐"收藏喜欢的贴纸
- 点击"删除"移除无效贴纸

#### 菜谱展示页
- 浏览所有已标记的菜品
- 使用搜索框快速查找
- 勾选菜品进行"点餐"
- 点击"🍽️ 下单"按钮提交订单
- 查看菜品的原料和做法详情
- **显示每个菜品的被下单次数统计**

#### 订单记录页
- 查看所有历史订单记录
- 按下单时间倒序排列
- 显示订单状态（待处理/已完成/已取消）
- 查看每个订单包含的菜品详情
- **显示订单统计信息（总订单数、状态分布）**
- **显示最受欢迎的菜品排行榜**

## 技术栈

- **后端**：Python 3.7+
  - Flask: Web框架
  - SQLite3: 数据存储
  - Pillow: 图像处理
  - OpenCV: 图像分析
  - rembg: 背景移除
  - watchdog: 文件监控
  - imageio: GIF生成

- **前端**：HTML + CSS + JavaScript
  - 响应式设计
  - 原生JavaScript（无框架依赖）

## 注意事项

1. **NAS路径访问**：确保NAS路径可正常访问，Windows下使用 `//IP/路径` 格式
2. **存储空间**：处理后的照片和贴纸会占用本地存储空间
3. **AI识别**：当前使用简化版识别，建议集成专业的图像识别API（如CLIP、百度AI等）
4. **性能优化**：大量照片处理可能需要较长时间，建议分批处理

## 扩展功能建议

- [x] 集成SQLite数据库存储（已完成）
- [x] 添加订单管理系统（已完成）
- [x] 添加菜品订单统计功能（已完成）
- [ ] 集成CLIP或百度AI进行更准确的食物识别
- [ ] 支持多用户登录和权限管理
- [ ] 添加菜品分类和标签系统
- [ ] 支持导出菜谱为PDF或图片
- [ ] 添加移动端APP支持
- [ ] 支持云端存储同步
- [ ] 添加订单状态管理（确认/制作/完成）
- [ ] 支持订单导出和打印

## 许可证

MIT License

## 联系方式

如有问题或建议，欢迎提交Issue。
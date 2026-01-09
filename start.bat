@echo off
chcp 65001 >nul
echo ====================================
echo 食物照片转菜谱系统 - 启动脚本
echo ====================================
echo.

echo [1/2] 初始化数据目录...
python init_data.py
echo.

echo [2/2] 启动Web服务器...
echo 服务器将在 http://localhost:8000 启动
echo 按 Ctrl+C 停止服务器
echo.
python server.py

pause
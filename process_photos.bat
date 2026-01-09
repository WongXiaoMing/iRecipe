@echo off
chcp 65001 >nul
echo ====================================
echo 照片处理脚本
echo ====================================
echo.
echo 选择处理模式:
echo 1. 单次处理（处理所有新照片）
echo 2. 持续监控（自动处理新增照片）
echo.
set /p mode="请输入选项 (1 或 2): "

if "%mode%"=="1" (
    echo 开始单次处理...
    python photo_processor.py --mode once
) else if "%mode%"=="2" (
    echo 开始持续监控模式...
    echo 按 Ctrl+C 停止监控
    python photo_processor.py --mode watch
) else (
    echo 无效选项，使用默认单次处理模式
    python photo_processor.py --mode once
)

pause
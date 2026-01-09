import requests
import json

# 测试预录入菜品API
base_url = 'http://localhost:8000'

# 测试创建预录入菜品
dish_data = {
    'dish_name': '测试红烧肉',
    'description': '经典的红烧肉做法，肥而不腻',
    'ingredients': '五花肉 500g\n姜 3片\n葱 2根\n八角 2个\n桂皮 1小块\n料酒 2勺\n生抽 3勺\n老抽 1勺\n冰糖 20g\n清水 适量',
    'recipe': '1. 五花肉切块，冷水下锅煮开，撇去浮沫，捞出洗净\n2. 锅中放油，放入冰糖小火炒至焦糖色\n3. 放入五花肉翻炒上色\n4. 加入姜葱八角桂皮爆香\n5. 加入料酒、生抽、老抽调味\n6. 加入清水没过肉，大火烧开转小火炖1小时\n7. 收汁装盘即可'
}

print("测试创建预录入菜品...")
response = requests.post(f'{base_url}/api/predefined_dishes', json=dish_data)
print(f"状态码: {response.status_code}")
if response.status_code == 200:
    result = response.json()
    print(f"创建成功，ID: {result.get('id')}")
    dish_id = result.get('id')
else:
    print(f"创建失败: {response.text}")
    exit(1)

# 测试获取预录入菜品列表
print("\n测试获取预录入菜品列表...")
response = requests.get(f'{base_url}/api/predefined_dishes')
print(f"状态码: {response.status_code}")
if response.status_code == 200:
    dishes = response.json()
    print(f"获取到 {len(dishes)} 个预录入菜品")
    for dish in dishes:
        print(f"- ID: {dish['id']}, 名称: {dish['dish_name']}")
else:
    print(f"获取失败: {response.text}")

# 测试更新菜品
print(f"\n测试更新菜品 (ID: {dish_id})...")
update_data = {
    'dish_name': '经典红烧肉',
    'description': '经典的红烧肉做法，肥而不腻，色香味俱全',
    'ingredients': '五花肉 500g\n姜 3片\n葱 2根\n八角 2个\n桂皮 1小块\n料酒 2勺\n生抽 3勺\n老抽 1勺\n冰糖 20g\n清水 适量\n盐 适量',
    'recipe': '1. 五花肉切块，冷水下锅煮开，撇去浮沫，捞出洗净\n2. 锅中放油，放入冰糖小火炒至焦糖色\n3. 放入五花肉翻炒上色\n4. 加入姜葱八角桂皮爆香\n5. 加入料酒、生抽、老抽和盐调味\n6. 加入清水没过肉，大火烧开转小火炖1小时\n7. 收汁装盘即可'
}

response = requests.put(f'{base_url}/api/predefined_dishes/{dish_id}', json=update_data)
print(f"状态码: {response.status_code}")
if response.status_code == 200:
    print("更新成功")
else:
    print(f"更新失败: {response.text}")

print("\n测试完成！")
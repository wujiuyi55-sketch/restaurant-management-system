from flask import Flask, request, jsonify, send_from_directory, session
from flask_cors import CORS
import json
import requests
import os
import mysql.connector
from functools import wraps
from config import DB_CONFIG, LLM_CONFIG

app = Flask(__name__, 
            static_folder='../frontend', 
            static_url_path='/static')
# 生产环境请通过环境变量 FLASK_SECRET_KEY 指定固定密钥
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'dev-secret-key-change-in-production')
CORS(app, supports_credentials=True)

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            # 判断是否是API请求
            if request.path.startswith('/api/'):
                return jsonify({'error': '未登录', 'authenticated': False}), 401
            return send_from_directory('../frontend/templates', 'login.html')
        return f(*args, **kwargs)
    return decorated_function

def role_required(allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user_id' not in session:
                return send_from_directory('../frontend/templates', 'login.html')
            user_role = session.get('role', '')
            if user_role not in allowed_roles:
                return jsonify({'error': '权限不足'}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def init_data_on_start():
    try:
        conn = mysql.connector.connect(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            port=DB_CONFIG['port'],
            charset='utf8'
        )
        cursor = conn.cursor()
        
        cursor.execute(f'CREATE DATABASE IF NOT EXISTS {DB_CONFIG["database"]} CHARACTER SET utf8')
        cursor.execute(f'USE {DB_CONFIG["database"]}')
        
        cursor.execute('SHOW TABLES')
        tables = [t[0] for t in cursor.fetchall()]
        
        if 'users' not in tables:
            cursor.execute('''
                CREATE TABLE users (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    username VARCHAR(50) NOT NULL UNIQUE,
                    password VARCHAR(100) NOT NULL,
                    real_name VARCHAR(50),
                    role VARCHAR(20) DEFAULT 'admin',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            print('✅ 用户表创建完成')
        
        if 'dishes' not in tables:
            cursor.execute('''
                CREATE TABLE dishes (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    name VARCHAR(100) NOT NULL,
                    price DECIMAL(10,2) NOT NULL,
                    category VARCHAR(50),
                    description TEXT,
                    image_url VARCHAR(255),
                    status INT DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NULL
                )
            ''')
            print('✅ 菜品表创建完成')
        
        if 'sales' not in tables:
            cursor.execute('''
                CREATE TABLE sales (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    dish_id INT,
                    quantity INT NOT NULL,
                    total_price DECIMAL(10,2) NOT NULL,
                    sale_date DATE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            print('✅ 销售记录表创建完成')
        
        if 'monthly_sales' not in tables:
            cursor.execute('''
                CREATE TABLE monthly_sales (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    month VARCHAR(7) NOT NULL UNIQUE,
                    total_amount DECIMAL(12,2) NOT NULL,
                    order_count INT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NULL
                )
            ''')
            print('✅ 月度销售表创建完成')
        
        if 'customers' not in tables:
            cursor.execute('''
                CREATE TABLE customers (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    name VARCHAR(100),
                    phone VARCHAR(20),
                    email VARCHAR(100),
                    visit_count INT DEFAULT 0,
                    total_spent DECIMAL(12,2) DEFAULT 0,
                    last_visit DATE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NULL
                )
            ''')
            print('✅ 客户表创建完成')
        
        if 'employees' not in tables:
            cursor.execute('''
                CREATE TABLE employees (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    name VARCHAR(100) NOT NULL,
                    phone VARCHAR(20),
                    position VARCHAR(50),
                    salary DECIMAL(10,2),
                    hire_date DATE,
                    status INT DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NULL
                )
            ''')
            print('✅ 员工管理表创建完成')
        
        if 'inventory' not in tables:
            cursor.execute('''
                CREATE TABLE inventory (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    item_name VARCHAR(100) NOT NULL,
                    category VARCHAR(50),
                    unit VARCHAR(20),
                    quantity DECIMAL(10,2) DEFAULT 0,
                    min_quantity DECIMAL(10,2) DEFAULT 0,
                    max_quantity DECIMAL(10,2),
                    price DECIMAL(10,2),
                    supplier VARCHAR(100),
                    location VARCHAR(100),
                    status INT DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NULL
                )
            ''')
            print('✅ 库存食材表创建完成')
        
        if 'orders' not in tables:
            cursor.execute('''
                CREATE TABLE orders (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    order_no VARCHAR(50) NOT NULL UNIQUE,
                    customer_name VARCHAR(100) NOT NULL,
                    customer_phone VARCHAR(20) NOT NULL,
                    table_number VARCHAR(50),
                    total_price DECIMAL(10,2) NOT NULL,
                    status VARCHAR(20) DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NULL
                )
            ''')
            print('✅ 订单表创建完成')
        
        if 'order_items' not in tables:
            cursor.execute('''
                CREATE TABLE order_items (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    order_id INT,
                    dish_id INT,
                    dish_name VARCHAR(100) NOT NULL,
                    quantity INT NOT NULL,
                    price DECIMAL(10,2) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
                )
            ''')
            print('✅ 订单项表创建完成')
        
        if 'dish_ingredients' not in tables:
            cursor.execute('''
                CREATE TABLE dish_ingredients (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    dish_id INT NOT NULL,
                    item_name VARCHAR(100) NOT NULL,
                    quantity DECIMAL(10,2) NOT NULL,
                    unit VARCHAR(20),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
                    UNIQUE KEY uk_dish_item (dish_id, item_name)
                )
            ''')
            print('✅ 菜品食材配方表创建完成')
        
        if 'vegetable_purchases' not in tables:
            cursor.execute('''
                CREATE TABLE vegetable_purchases (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    name VARCHAR(100) NOT NULL,
                    quantity DECIMAL(10,2),
                    unit VARCHAR(20),
                    unit_price DECIMAL(10,2),
                    total_price DECIMAL(10,2),
                    supplier VARCHAR(100),
                    purchase_date DATE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            print('✅ 采购蔬菜表创建完成')
        
        if 'meat_purchases' not in tables:
            cursor.execute('''
                CREATE TABLE meat_purchases (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    name VARCHAR(100) NOT NULL,
                    quantity DECIMAL(10,2),
                    unit VARCHAR(20),
                    unit_price DECIMAL(10,2),
                    total_price DECIMAL(10,2),
                    supplier VARCHAR(100),
                    purchase_date DATE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            print('✅ 采购肉类表创建完成')

        if 'fruit_purchases' not in tables:
            cursor.execute('''
                CREATE TABLE fruit_purchases (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    name VARCHAR(100) NOT NULL,
                    quantity DECIMAL(10,2),
                    unit VARCHAR(20),
                    price DECIMAL(10,2),
                    total DECIMAL(10,2),
                    supplier VARCHAR(100),
                    purchase_date DATE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            print('✅ 采购水果表创建完成')

        if 'attendance' not in tables:
            cursor.execute('''
                CREATE TABLE attendance (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    employee_id INT,
                    employee_name VARCHAR(100),
                    date DATE NOT NULL,
                    status VARCHAR(20),
                    remark TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            print('✅ 考勤记录表创建完成')

        if 'chat_records' not in tables:
            cursor.execute('''
                CREATE TABLE chat_records (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    user_id INT NOT NULL,
                    question TEXT NOT NULL,
                    answer LONGTEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_user_time (user_id, created_at),
                    CONSTRAINT fk_chat_user FOREIGN KEY (user_id)
                        REFERENCES users(id) ON DELETE CASCADE
                )
            ''')
            print('✅ AI对话记录表创建完成')

        conn.commit()
        
        cursor.execute('SELECT COUNT(*) FROM users')
        if cursor.fetchone()[0] == 0:
            cursor.execute('''INSERT INTO users (username, password, real_name, role) 
                             VALUES (%s, %s, %s, %s)''', ('admin', '123456', '管理员', 'admin'))
            cursor.execute('''INSERT INTO users (username, password, real_name, role) 
                             VALUES (%s, %s, %s, %s)''', ('staff', '123456', '从业者', 'staff'))
            print('✅ 默认管理员和从业者账号创建完成')
        
        cursor.execute('SELECT COUNT(*) FROM dishes')
        if cursor.fetchone()[0] == 0:
            dishes = [
                ('红烧肉', 48.00, '热菜', '精选五花肉', 1),
                ('清蒸鲈鱼', 68.00, '热菜', '新鲜鲈鱼', 1),
                ('宫保鸡丁', 38.00, '热菜', '鸡肉嫩滑', 1),
                ('蒜蓉西兰花', 28.00, '素菜', '新鲜西兰花', 1),
                ('麻婆豆腐', 22.00, '热菜', '豆腐嫩滑', 1),
                ('糖醋排骨', 58.00, '热菜', '精选肋排', 1),
                ('鱼香肉丝', 32.00, '热菜', '肉丝鲜嫩', 1),
                ('米饭', 3.00, '主食', '香米米饭', 1),
                ('馒头', 2.00, '主食', '白面馒头', 1),
                ('蛋炒饭', 18.00, '主食', '粒粒分明', 1)
            ]
            cursor.executemany('''INSERT INTO dishes (name, price, category, description, status)
                                VALUES (%s, %s, %s, %s, %s)''', dishes)
            print('✅ 菜品数据添加完成')
        
        cursor.execute('SELECT COUNT(*) FROM monthly_sales')
        if cursor.fetchone()[0] == 0:
            # 动态生成最近6个月的月度销售数据
            from datetime import date
            today = date.today()
            sample = [(15680.50, 320), (14250.80, 290), (18900.30, 380),
                      (16500.60, 340), (21000.00, 420), (22500.20, 450)]
            monthly = []
            for i, (amt, cnt) in enumerate(sample):
                m = today.month - (5 - i)
                y = today.year
                while m <= 0:
                    m += 12
                    y -= 1
                monthly.append((f'{y}-{m:02d}', amt, cnt))
            cursor.executemany('INSERT INTO monthly_sales (month, total_amount, order_count) VALUES (%s, %s, %s)', monthly)
            print('✅ 月度销售数据添加完成')
        
        cursor.execute('SELECT COUNT(*) FROM customers')
        if cursor.fetchone()[0] == 0:
            customers = [
                ('张三', '13800138001', 'zhangsan@example.com', 15, 880.00, '2024-06-15'),
                ('李四', '13900139002', 'lisi@example.com', 8, 520.00, '2024-06-10'),
                ('王五', '13700137003', 'wangwu@example.com', 22, 1280.00, '2024-06-18'),
                ('赵六', '13600136004', 'zhaoliu@example.com', 5, 320.00, '2024-06-08'),
                ('钱七', '13500135005', 'qianqi@example.com', 12, 680.00, '2024-06-12')
            ]
            cursor.executemany('''INSERT INTO customers (name, phone, email, visit_count, total_spent, last_visit)
                                VALUES (%s, %s, %s, %s, %s, %s)''', customers)
            print('✅ 客户数据添加完成')
        
        cursor.execute('SELECT COUNT(*) FROM sales')
        if cursor.fetchone()[0] == 0:
            cursor.execute('SELECT id, price FROM dishes')
            dish_list = cursor.fetchall()
            
            import random
            from datetime import datetime, timedelta
            
            sales = []
            for i in range(200):
                dish_id, price = random.choice(dish_list)
                qty = random.randint(1, 5)
                total = float(price) * qty
                date = (datetime(2024, 6, 1) + timedelta(days=random.randint(0, 30))).strftime('%Y-%m-%d')
                sales.append((dish_id, qty, total, date))
            
            cursor.executemany('INSERT INTO sales (dish_id, quantity, total_price, sale_date) VALUES (%s, %s, %s, %s)', sales)
            print('✅ 销售记录添加完成')
        
        cursor.execute('SELECT COUNT(*) FROM employees')
        if cursor.fetchone()[0] == 0:
            employees = [
                ('张伟', '13800001111', '厨师长', 8000.00, '2020-03-15', 1),
                ('李娜', '13800002222', '服务员', 3500.00, '2021-06-20', 1),
                ('王强', '13800003333', '收银员', 3800.00, '2021-09-10', 1),
                ('赵敏', '13800004444', '服务员', 3500.00, '2022-01-05', 1),
                ('刘洋', '13800005555', '厨师', 5000.00, '2022-04-18', 1),
                ('陈静', '13800006666', '经理', 6000.00, '2021-03-01', 1),
                ('周涛', '13800007777', '帮厨', 4000.00, '2023-02-15', 1),
                ('吴琳', '13800008888', '洗碗工', 3000.00, '2023-07-20', 1)
            ]
            cursor.executemany('''INSERT INTO employees (name, phone, position, salary, hire_date, status)
                                VALUES (%s, %s, %s, %s, %s, %s)''', employees)
            print('✅ 员工数据添加完成')
        
        from datetime import date as _date_cls, timedelta as _timedelta_cls
        _today = _date_cls.today()

        # 采购规格: (食材名, 单位, 库存下限, 库存上限, 存放位置, 默认供应商, [(采购量, 单价, 距今天数, 供应商), ...])
        vegetable_specs = [
            ('白菜', '斤', 15, 120, '冷藏柜', '绿源蔬菜', [(30, 2.5, 13, '绿源蔬菜'), (40, 2.8, 3, '绿源蔬菜')]),
            ('菠菜', '斤', 10, 60, '冷藏柜', '本地菜农', [(20, 6.0, 9, '本地菜农'), (15, 6.5, 2, '本地菜农')]),
            ('西兰花', '斤', 10, 80, '冷藏柜', '绿源蔬菜', [(25, 7.0, 16, '绿源蔬菜'), (20, 7.5, 5, '绿源蔬菜')]),
            ('土豆', '斤', 30, 200, '干货储藏', '本地菜农', [(50, 3.0, 21, '本地菜农'), (60, 3.2, 6, '本地菜农')]),
            ('黄瓜', '斤', 20, 100, '冷藏柜', '绿源蔬菜', [(35, 4.5, 10, '绿源蔬菜'), (30, 5.0, 2, '绿源蔬菜')]),
            ('青椒', '斤', 10, 80, '冷藏柜', '本地菜农', [(25, 5.5, 13, '本地菜农'), (20, 6.0, 4, '本地菜农')]),
            ('西红柿', '斤', 20, 120, '冷藏柜', '本地菜农', [(40, 5.0, 11, '本地菜农'), (35, 5.5, 3, '本地菜农')]),
        ]
        meat_specs = [
            ('五花肉', '斤', 15, 150, '冷库A区', '鑫源肉铺', [(40, 28.0, 15, '鑫源肉铺'), (30, 27.0, 2, '鑫源肉铺')]),
            ('排骨', '斤', 10, 100, '冷库A区', '鑫源肉铺', [(30, 35.0, 14, '鑫源肉铺'), (25, 36.0, 5, '鑫源肉铺')]),
            ('牛肉', '斤', 10, 80, '冷库A区', '肉类批发商', [(25, 65.0, 12, '肉类批发商'), (20, 68.0, 3, '肉类批发商')]),
            ('羊肉', '斤', 8, 70, '冷库A区', '肉类批发商', [(20, 58.0, 16, '肉类批发商'), (18, 60.0, 6, '肉类批发商')]),
            ('鸡腿肉', '斤', 20, 150, '冷库B区', '禽类批发', [(40, 12.0, 10, '禽类批发'), (50, 11.5, 1, '禽类批发')]),
        ]
        fruit_specs = [
            ('苹果', '斤', 30, 200, '水果区', '鑫源水果批发', [(60, 8.5, 13, '鑫源水果批发'), (50, 9.0, 4, '鑫源水果批发')]),
            ('香蕉', '斤', 20, 120, '水果区', '鑫源水果批发', [(40, 4.5, 11, '鑫源水果批发'), (35, 5.0, 3, '鑫源水果批发')]),
            ('橙子', '斤', 20, 150, '水果区', '鲜果源', [(50, 6.0, 10, '鲜果源'), (40, 6.5, 2, '鲜果源')]),
            ('葡萄', '斤', 15, 90, '水果区', '鑫源水果批发', [(30, 12.0, 14, '鑫源水果批发'), (25, 13.0, 5, '鑫源水果批发')]),
            ('西瓜', '个', 10, 60, '水果区', '鲜果源', [(20, 15.0, 21, '鲜果源'), (15, 16.0, 6, '鲜果源')]),
        ]
        extra_inventory = [
            ('鲈鱼', '海鲜', '条', 30.0, 5, 50, 35.0, '水产批发市场', '冰鲜区'),
            ('豆腐', '豆制品', '盒', 50.0, 20, 100, 3.5, '豆制品厂', '冷藏柜'),
            ('大米', '粮油', '袋', 40.0, 10, 80, 130.0, '粮油批发商', '干货储藏'),
        ]

        def _purchase_rows(specs):
            rows = []
            for name, unit, _mn, _mx, _loc, _default_sup, buys in specs:
                for qty, price, days_ago, supplier in buys:
                    pdate = (_today - _timedelta_cls(days=days_ago)).strftime('%Y-%m-%d')
                    rows.append((name, float(qty), unit, float(price), round(qty * price, 2), supplier, pdate))
            return rows

        def _inventory_rows(specs, category):
            rows = []
            for name, unit, min_q, max_q, location, default_sup, buys in specs:
                total_qty = sum(b[0] for b in buys)
                latest = min(buys, key=lambda b: b[2])
                rows.append((name, category, unit, float(total_qty), float(min_q), float(max_q),
                             float(latest[1]), latest[3], location, 1))
            return rows

        cursor.execute('SELECT COUNT(*) FROM inventory')
        if cursor.fetchone()[0] == 0:
            inventory_seed = (_inventory_rows(vegetable_specs, '蔬菜')
                              + _inventory_rows(meat_specs, '肉类')
                              + _inventory_rows(fruit_specs, '水果')
                              + extra_inventory)
            cursor.executemany('''INSERT INTO inventory
                                (item_name, category, unit, quantity, min_quantity, max_quantity, price, supplier, location, status)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)''', inventory_seed)
            print('✅ 库存食材数据添加完成')

        cursor.execute('SELECT COUNT(*) FROM vegetable_purchases')
        if cursor.fetchone()[0] == 0:
            cursor.executemany('''INSERT INTO vegetable_purchases (name, quantity, unit, unit_price, total_price, supplier, purchase_date)
                                VALUES (%s, %s, %s, %s, %s, %s, %s)''', _purchase_rows(vegetable_specs))
            print('✅ 蔬菜采购数据添加完成')

        cursor.execute('SELECT COUNT(*) FROM meat_purchases')
        if cursor.fetchone()[0] == 0:
            cursor.executemany('''INSERT INTO meat_purchases (name, quantity, unit, unit_price, total_price, supplier, purchase_date)
                                VALUES (%s, %s, %s, %s, %s, %s, %s)''', _purchase_rows(meat_specs))
            print('✅ 肉类采购数据添加完成')

        cursor.execute('SELECT COUNT(*) FROM fruit_purchases')
        if cursor.fetchone()[0] == 0:
            fruit_rows = []
            for name, qty, unit, price, total, supplier, pdate in _purchase_rows(fruit_specs):
                fruit_rows.append((name, qty, unit, price, total, supplier, pdate))
            cursor.executemany('''INSERT INTO fruit_purchases (name, quantity, unit, price, total, supplier, purchase_date)
                                VALUES (%s, %s, %s, %s, %s, %s, %s)''', fruit_rows)
            print('✅ 水果采购数据添加完成')


        cursor.execute('SELECT COUNT(*) FROM attendance')
        if cursor.fetchone()[0] == 0:
            import random
            from datetime import datetime, timedelta
            cursor.execute('SELECT id, name FROM employees LIMIT 5')
            emp_list = cursor.fetchall()

            statuses = ['正常', '迟到', '早退', '请假', '旷工']
            attendance_records = []
            for emp_id, emp_name in emp_list:
                for day in range(30):
                    status = random.choice(statuses)
                    date = (datetime(2024, 6, 1) + timedelta(days=day)).strftime('%Y-%m-%d')
                    attendance_records.append((emp_id, emp_name, date, status, ''))
            
            cursor.executemany('''INSERT INTO attendance (employee_id, employee_name, date, status, remark)
                                VALUES (%s, %s, %s, %s, %s)''', attendance_records)
            print('✅ 考勤记录数据添加完成')
        
        conn.commit()
        conn.close()
        
    except Exception as e:
        print(f'初始化数据库时出错: {e}')

def get_db_connection():
    try:
        conn = mysql.connector.connect(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            port=DB_CONFIG['port'],
            database=DB_CONFIG['database'],
            charset='utf8'
        )
        return conn
    except Exception as e:
        print(f'数据库连接错误: {e}')
        return None

def _to_number(value, default=0):
    try:
        if value is None or value == '':
            return default
        return float(value)
    except (TypeError, ValueError):
        return default

def inventory_apply_purchase(conn, name, delta, unit=None, price=None, supplier=None, category=None):
    """采购数量变动同步库存（与采购写操作在同一事务内，由调用方 commit/rollback）。
    delta>0：同名食材库存累加，库存中不存在则按对应分类新建；
    delta<0：同名食材库存扣减，最低扣到0，库存中不存在则忽略。
    食材匹配维度：item_name（去除首尾空格精确匹配）。
    """
    if not name or not str(name).strip():
        return
    name = str(name).strip()
    delta = _to_number(delta)
    if delta == 0:
        return
    price_val = None if price in (None, '') else price
    supplier_val = None if supplier in (None, '') else supplier
    unit_val = None if unit in (None, '') else unit

    cursor = conn.cursor(dictionary=True)
    cursor.execute('SELECT id, unit FROM inventory WHERE item_name = %s ORDER BY id LIMIT 1', (name,))
    item = cursor.fetchone()
    write_cursor = conn.cursor()

    if delta > 0:
        if item:
            write_cursor.execute('''
                UPDATE inventory
                SET quantity = quantity + %s,
                    price = COALESCE(%s, price),
                    supplier = COALESCE(%s, supplier),
                    unit = COALESCE(NULLIF(unit, ''), %s),
                    updated_at = NOW()
                WHERE id = %s
            ''', (delta, price_val, supplier_val, unit_val, item['id']))
        else:
            write_cursor.execute('''
                INSERT INTO inventory (item_name, category, unit, quantity, min_quantity,
                                       max_quantity, price, supplier, location, status, updated_at)
                VALUES (%s, %s, %s, %s, 0, NULL, %s, %s, NULL, 1, NOW())
            ''', (name, category, unit_val, delta, price_val, supplier_val))
    elif item:
        write_cursor.execute('''
            UPDATE inventory
            SET quantity = GREATEST(quantity - %s, 0),
                updated_at = NOW()
            WHERE id = %s
        ''', (abs(delta), item['id']))

@app.route('/login')
def login_page():
    return send_from_directory('../frontend/templates', 'login.html')

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'success': False, 'message': '用户名和密码不能为空'})
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': '数据库连接失败'})
    
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT * FROM users WHERE username = %s AND password = %s', (username, password))
        user = cursor.fetchone()
        
        if user:
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['real_name'] = user.get('real_name', username)
            session['role'] = user.get('role', 'admin')
            return jsonify({'success': True, 'message': '登录成功', 'user': {'username': user['username'], 'real_name': user['real_name'], 'role': user['role']}})
        else:
            return jsonify({'success': False, 'message': '用户名或密码错误'})
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})
    finally:
        conn.close()

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True, 'message': '已退出登录'})

@app.route('/api/check-auth')
def check_auth():
    if 'user_id' in session:
        conn = get_db_connection()
        if conn:
            try:
                cursor = conn.cursor(dictionary=True)
                cursor.execute('SELECT created_at FROM users WHERE id = %s', (session['user_id'],))
                user = cursor.fetchone()
                conn.close()
                return jsonify({'authenticated': True, 'user': {
                    'username': session.get('username'),
                    'real_name': session.get('real_name'),
                    'role': session.get('role'),
                    'created_at': user['created_at'] if user else None
                }})
            except Exception as e:
                conn.close()
        return jsonify({'authenticated': True, 'user': {
            'username': session.get('username'),
            'real_name': session.get('real_name'),
            'role': session.get('role')
        }})
    return jsonify({'authenticated': False})

@app.route('/api/change-password', methods=['POST'])
@login_required
def change_password():
    data = request.json
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    if not current_password or not new_password:
        return jsonify({'error': '请提供当前密码和新密码'}), 400
    
    if len(new_password) < 6:
        return jsonify({'error': '新密码长度不能少于6位'}), 400
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT password FROM users WHERE id = %s', (session['user_id'],))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({'error': '用户不存在'}), 404
        
        if user['password'] != current_password:
            return jsonify({'error': '当前密码不正确'}), 400
        
        cursor.execute('UPDATE users SET password = %s WHERE id = %s', (new_password, session['user_id']))
        conn.commit()
        
        return jsonify({'message': '密码修改成功'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/')
def index():
    return send_from_directory('../frontend/templates', 'landing.html')

@app.route('/shop')
def shop_page():
    return send_from_directory('../frontend', 'index.html')

@app.route('/dashboard')
@login_required
def dashboard_page():
    return send_from_directory('../frontend/templates', 'dashboard.html')

@app.route('/dishes')
@login_required
def dishes_page():
    return send_from_directory('../frontend/templates', 'dishes.html')

@app.route('/customers')
@login_required
@role_required(['admin'])
def customers_page():
    return send_from_directory('../frontend/templates', 'customers.html')

@app.route('/orders')
@login_required
def orders_page():
    return send_from_directory('../frontend/templates', 'orders.html')

@app.route('/sales')
@login_required
def sales_page():
    return send_from_directory('../frontend/templates', 'sales.html')

@app.route('/analysis')
@login_required
def analysis_page():
    return send_from_directory('../frontend/templates', 'analysis.html')

@app.route('/chat')
@login_required
def chat_page():
    return send_from_directory('../frontend/templates', 'chat.html')

@app.route('/chat-records')
@login_required
def chat_records_page():
    return send_from_directory('../frontend/templates', 'chat_records.html')

@app.route('/users')
@login_required
@role_required(['admin'])
def users_page():
    return send_from_directory('../frontend/templates', 'users.html')

@app.route('/account')
@login_required
def account_page():
    return send_from_directory('../frontend/templates', 'account.html')

@app.route('/employees')
@login_required
def employees_page():
    return send_from_directory('../frontend/templates', 'employees.html')

@app.route('/inventory')
@login_required
def inventory_page():
    return send_from_directory('../frontend/templates', 'inventory.html')

@app.route('/vegetables')
@login_required
def vegetables_page():
    return send_from_directory('../frontend/templates', 'vegetables.html')

@app.route('/meats')
@login_required
def meats_page():
    return send_from_directory('../frontend/templates', 'meats.html')

@app.route('/fruits')
@login_required
def fruits_page():
    return send_from_directory('../frontend/templates', 'fruits.html')

@app.route('/api/dishes', methods=['GET'])
@login_required
def get_dishes():
    conn = get_db_connection()
    if not conn:
        return jsonify([])
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT * FROM dishes')
        dishes = cursor.fetchall()
        return jsonify(dishes)
    except Exception as e:
        print(f'Error: {e}')
        return jsonify([])
    finally:
        conn.close()

@app.route('/api/public/dishes', methods=['GET'])
def get_public_dishes():
    conn = get_db_connection()
    if not conn:
        return jsonify([])
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT id, name, price, category, description, status FROM dishes WHERE status = 1')
        dishes = cursor.fetchall()
        return jsonify(dishes)
    except Exception as e:
        print(f'Error: {e}')
        return jsonify([])
    finally:
        conn.close()

@app.route('/api/dishes/<int:id>', methods=['GET'])
@login_required
def get_dish(id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT * FROM dishes WHERE id = %s', (id,))
        dish = cursor.fetchone()
        if dish:
            return jsonify(dish)
        return jsonify({'error': '菜品不存在'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/dishes', methods=['POST'])
@login_required
def add_dish():
    data = request.json
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO dishes (name, price, category, description, image_url, status)
            VALUES (%s, %s, %s, %s, %s, %s)
        ''', (data['name'], data['price'], data.get('category'), 
              data.get('description'), data.get('image_url'), data.get('status', 1)))
        conn.commit()
        return jsonify({'id': cursor.lastrowid, 'message': '菜品添加成功'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/dishes/<int:id>', methods=['PUT'])
@login_required
def update_dish(id):
    data = request.json
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE dishes SET name=%s, price=%s, category=%s, description=%s, 
                              image_url=%s, status=%s WHERE id=%s
        ''', (data['name'], data['price'], data.get('category'), 
              data.get('description'), data.get('image_url'), 
              data.get('status', 1), id))
        conn.commit()
        if cursor.rowcount > 0:
            return jsonify({'message': '菜品更新成功'})
        return jsonify({'error': '菜品不存在'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/dishes/<int:id>', methods=['DELETE'])
@login_required
def delete_dish(id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM dishes WHERE id = %s', (id,))
        conn.commit()
        if cursor.rowcount > 0:
            return jsonify({'message': '菜品删除成功'})
        return jsonify({'error': '菜品不存在'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/dishes/<int:id>/ingredients', methods=['GET'])
@login_required
def get_dish_ingredients(id):
    """获取某菜品的食材配方"""
    conn = get_db_connection()
    if not conn:
        return jsonify([])
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('''
            SELECT di.id, di.dish_id, di.item_name, di.quantity, di.unit,
                   inv.category, inv.quantity AS stock
            FROM dish_ingredients di
            LEFT JOIN inventory inv ON inv.item_name = di.item_name
            WHERE di.dish_id = %s
            ORDER BY di.id
        ''', (id,))
        return jsonify(cursor.fetchall())
    except Exception as e:
        print(f'Error: {e}')
        return jsonify([])
    finally:
        conn.close()

@app.route('/api/dishes/<int:id>/ingredients', methods=['POST'])
@login_required
def save_dish_ingredients(id):
    """整体替换某菜品的食材配方。body: {ingredients: [{item_name, quantity, unit}, ...]}"""
    data = request.json or {}
    ingredients = data.get('ingredients', [])
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor()
        # 校验菜品存在
        cur = conn.cursor(dictionary=True)
        cur.execute('SELECT id FROM dishes WHERE id = %s', (id,))
        if not cur.fetchone():
            return jsonify({'error': '菜品不存在'}), 404
        # 整体替换
        cursor.execute('DELETE FROM dish_ingredients WHERE dish_id = %s', (id,))
        rows = []
        for ing in ingredients:
            name = (ing.get('item_name') or '').strip()
            if not name:
                continue
            qty = ing.get('quantity')
            if qty in (None, '', 0):
                continue
            try:
                qty = float(qty)
            except (TypeError, ValueError):
                continue
            if qty <= 0:
                continue
            rows.append((id, name, qty, ing.get('unit') or None))
        if rows:
            cursor.executemany('''
                INSERT INTO dish_ingredients (dish_id, item_name, quantity, unit)
                VALUES (%s, %s, %s, %s)
            ''', rows)
        conn.commit()
        return jsonify({'message': '配方已保存', 'count': len(rows)})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/inventory/names', methods=['GET'])
@login_required
def list_inventory_names():
    """供前端配方下拉选择：返回所有库存食材名+单位+分类"""
    conn = get_db_connection()
    if not conn:
        return jsonify([])
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT id, item_name, category, unit, quantity FROM inventory WHERE status = 1 ORDER BY item_name')
        return jsonify(cursor.fetchall())
    except Exception as e:
        print(f'Error: {e}')
        return jsonify([])
    finally:
        conn.close()


@app.route('/api/sales', methods=['GET'])
@login_required
def get_sales():
    conn = get_db_connection()
    if not conn:
        return jsonify([])
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('''
            SELECT s.*, d.name as dish_name, d.category FROM sales s 
            LEFT JOIN dishes d ON s.dish_id = d.id
            ORDER BY s.sale_date DESC
        ''')
        sales = cursor.fetchall()
        return jsonify(sales)
    except Exception as e:
        print(f'Error: {e}')
        return jsonify([])
    finally:
        conn.close()

@app.route('/api/monthly_sales', methods=['GET'])
@login_required
def get_monthly_sales():
    conn = get_db_connection()
    if not conn:
        return jsonify([])
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT * FROM monthly_sales ORDER BY month')
        sales = cursor.fetchall()
        return jsonify(sales)
    except Exception as e:
        print(f'Error: {e}')
        return jsonify([])
    finally:
        conn.close()

@app.route('/api/customers', methods=['GET'])
@login_required
@role_required(['admin'])
def get_customers():
    conn = get_db_connection()
    if not conn:
        return jsonify([])
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT * FROM customers ORDER BY total_spent DESC')
        customers = cursor.fetchall()
        return jsonify(customers)
    except Exception as e:
        print(f'Error: {e}')
        return jsonify([])
    finally:
        conn.close()

@app.route('/api/customers/<int:id>', methods=['GET'])
@login_required
@role_required(['admin'])
def get_customer(id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT * FROM customers WHERE id = %s', (id,))
        customer = cursor.fetchone()
        if customer:
            return jsonify(customer)
        return jsonify({'error': '客户不存在'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/customers', methods=['POST'])
@login_required
@role_required(['admin'])
def add_customer():
    data = request.json
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO customers (name, phone, email, visit_count, total_spent, last_visit)
            VALUES (%s, %s, %s, %s, %s, %s)
        ''', (data['name'], data.get('phone'), data.get('email'), 
              data.get('visit_count', 0), data.get('total_spent', 0), data.get('last_visit')))
        conn.commit()
        return jsonify({'id': cursor.lastrowid, 'message': '客户添加成功'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/customers/<int:id>', methods=['PUT'])
@login_required
@role_required(['admin'])
def update_customer(id):
    data = request.json
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE customers SET name=%s, phone=%s, email=%s, visit_count=%s, 
                              total_spent=%s, last_visit=%s WHERE id=%s
        ''', (data['name'], data.get('phone'), data.get('email'), 
              data.get('visit_count', 0), data.get('total_spent', 0), 
              data.get('last_visit'), id))
        conn.commit()
        if cursor.rowcount > 0:
            return jsonify({'message': '客户更新成功'})
        return jsonify({'error': '客户不存在'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/customers/<int:id>', methods=['DELETE'])
@login_required
@role_required(['admin'])
def delete_customer(id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM customers WHERE id = %s', (id,))
        conn.commit()
        if cursor.rowcount > 0:
            return jsonify({'message': '客户删除成功'})
        return jsonify({'error': '客户不存在'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/users', methods=['GET'])
@login_required
@role_required(['admin'])
def get_users():
    conn = get_db_connection()
    if not conn:
        return jsonify([])
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT id, username, real_name, role, created_at FROM users ORDER BY created_at DESC')
        users = cursor.fetchall()
        return jsonify(users)
    except Exception as e:
        print(f'Error: {e}')
        return jsonify([])
    finally:
        conn.close()

@app.route('/api/users/<int:id>', methods=['GET'])
@login_required
@role_required(['admin'])
def get_user(id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT id, username, real_name, role, created_at FROM users WHERE id = %s', (id,))
        user = cursor.fetchone()
        if user:
            return jsonify(user)
        return jsonify({'error': '用户不存在'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/users', methods=['POST'])
@login_required
@role_required(['admin'])
def add_user():
    data = request.json
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO users (username, password, real_name, role)
            VALUES (%s, %s, %s, %s)
        ''', (data['username'], data.get('password', '123456'), data.get('real_name', ''), data.get('role', 'staff')))
        conn.commit()
        return jsonify({'id': cursor.lastrowid, 'message': '用户添加成功'}), 201
    except mysql.connector.Error as e:
        if e.errno == 1062:
            return jsonify({'error': '用户名已存在'}), 400
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/users/<int:id>', methods=['PUT'])
@login_required
@role_required(['admin'])
def update_user(id):
    data = request.json
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor()
        if data.get('password'):
            cursor.execute('''
                UPDATE users SET username=%s, password=%s, real_name=%s, role=%s WHERE id=%s
            ''', (data['username'], data['password'], data.get('real_name', ''), data.get('role', 'staff'), id))
        else:
            cursor.execute('''
                UPDATE users SET username=%s, real_name=%s, role=%s WHERE id=%s
            ''', (data['username'], data.get('real_name', ''), data.get('role', 'staff'), id))
        conn.commit()
        if cursor.rowcount > 0:
            return jsonify({'message': '用户更新成功'})
        return jsonify({'error': '用户不存在'}), 404
    except mysql.connector.Error as e:
        if e.errno == 1062:
            return jsonify({'error': '用户名已存在'}), 400
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/users/<int:id>', methods=['DELETE'])
@login_required
@role_required(['admin'])
def delete_user(id):
    if id == session.get('user_id'):
        return jsonify({'error': '不能删除自己的账号'}), 400
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM users WHERE id = %s', (id,))
        conn.commit()
        if cursor.rowcount > 0:
            return jsonify({'message': '用户删除成功'})
        return jsonify({'error': '用户不存在'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/employees', methods=['GET'])
@login_required
def get_employees():
    conn = get_db_connection()
    if not conn:
        return jsonify([])
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT * FROM employees ORDER BY id DESC')
        employees = cursor.fetchall()
        return jsonify(employees)
    except Exception as e:
        print(f'Error: {e}')
        return jsonify([])
    finally:
        conn.close()

@app.route('/api/employees/<int:id>', methods=['GET'])
@login_required
def get_employee(id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT * FROM employees WHERE id = %s', (id,))
        employee = cursor.fetchone()
        if employee:
            return jsonify(employee)
        return jsonify({'error': '员工不存在'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/employees', methods=['POST'])
@login_required
def add_employee():
    data = request.json
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO employees (name, phone, position, salary, hire_date, status)
            VALUES (%s, %s, %s, %s, %s, %s)
        ''', (data['name'], data.get('phone'), data.get('position'), 
              data.get('salary'), data.get('hire_date') or None, data.get('status', 1)))
        conn.commit()
        return jsonify({'id': cursor.lastrowid, 'message': '员工添加成功'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/employees/<int:id>', methods=['PUT'])
@login_required
def update_employee(id):
    data = request.json
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor()
        hire_date = data.get('hire_date') or None  # 空字符串转NULL，避免date字段报错
        cursor.execute('''
            UPDATE employees SET name=%s, phone=%s, position=%s, salary=%s, hire_date=%s, status=%s WHERE id=%s
        ''', (data['name'], data.get('phone'), data.get('position'), 
              data.get('salary'), hire_date, data.get('status', 1), id))
        conn.commit()
        if cursor.rowcount > 0:
            return jsonify({'message': '员工更新成功'})
        return jsonify({'error': '员工不存在'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/employees/<int:id>', methods=['DELETE'])
@login_required
def delete_employee(id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM employees WHERE id = %s', (id,))
        conn.commit()
        if cursor.rowcount > 0:
            return jsonify({'message': '员工删除成功'})
        return jsonify({'error': '员工不存在'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/inventory', methods=['GET'])
@login_required
def get_inventory():
    conn = get_db_connection()
    if not conn:
        return jsonify([])
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('''SELECT id, item_name AS name, category, quantity, unit,
                          min_quantity AS min_stock, price, supplier, updated_at
                          FROM inventory ORDER BY id DESC''')
        inventory = cursor.fetchall()
        return jsonify(inventory)
    except Exception as e:
        print(f'Error: {e}')
        return jsonify([])
    finally:
        conn.close()

@app.route('/api/inventory/<int:id>', methods=['GET'])
@login_required
def get_inventory_item(id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('''SELECT id, item_name AS name, category, quantity, unit,
                          min_quantity AS min_stock, price, supplier
                          FROM inventory WHERE id = %s''', (id,))
        item = cursor.fetchone()
        if item:
            return jsonify(item)
        return jsonify({'error': '食材不存在'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/inventory', methods=['POST'])
@login_required
def add_inventory():
    data = request.json
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO inventory (item_name, category, quantity, unit, min_quantity, price, supplier)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        ''', (data['name'], data.get('category'), data.get('quantity'), 
              data.get('unit'), data.get('min_stock'), data.get('price'), data.get('supplier')))
        conn.commit()
        return jsonify({'id': cursor.lastrowid, 'message': '食材添加成功'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/inventory/<int:id>', methods=['PUT'])
@login_required
def update_inventory(id):
    data = request.json
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE inventory SET item_name=%s, category=%s, quantity=%s, unit=%s, min_quantity=%s, price=%s, supplier=%s WHERE id=%s
        ''', (data['name'], data.get('category'), data.get('quantity'), 
              data.get('unit'), data.get('min_stock'), data.get('price'), data.get('supplier'), id))
        conn.commit()
        if cursor.rowcount > 0:
            return jsonify({'message': '食材更新成功'})
        return jsonify({'error': '食材不存在'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/inventory/<int:id>', methods=['DELETE'])
@login_required
def delete_inventory(id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM inventory WHERE id = %s', (id,))
        conn.commit()
        if cursor.rowcount > 0:
            return jsonify({'message': '食材删除成功'})
        return jsonify({'error': '食材不存在'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/vegetables', methods=['GET'])
@login_required
def get_vegetables():
    conn = get_db_connection()
    if not conn:
        return jsonify([])
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT * FROM vegetable_purchases ORDER BY purchase_date DESC, id DESC')
        vegetables = cursor.fetchall()
        return jsonify(vegetables)
    except Exception as e:
        print(f'Error: {e}')
        return jsonify([])
    finally:
        conn.close()

@app.route('/api/vegetables/<int:id>', methods=['GET'])
@login_required
def get_vegetable_by_id(id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT * FROM vegetable_purchases WHERE id = %s', (id,))
        vegetable = cursor.fetchone()
        if vegetable:
            return jsonify(vegetable)
        return jsonify({'error': '蔬菜采购记录不存在'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/vegetables', methods=['POST'])
@login_required
def add_vegetable():
    data = request.json
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO vegetable_purchases (name, quantity, unit, unit_price, total_price, supplier, purchase_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        ''', (data['name'], data.get('quantity'), data.get('unit'),
              data.get('unit_price'), data.get('total_price'), data.get('supplier'), data.get('purchase_date')))
        inventory_apply_purchase(conn, data.get('name'), data.get('quantity'),
                                 unit=data.get('unit'), price=data.get('unit_price'),
                                 supplier=data.get('supplier'), category='蔬菜')
        conn.commit()
        return jsonify({'id': cursor.lastrowid, 'message': '蔬菜采购添加成功，已同步入库'}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/vegetables/<int:id>', methods=['PUT'])
@login_required
def update_vegetable(id):
    data = request.json
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        query_cursor = conn.cursor(dictionary=True)
        query_cursor.execute('SELECT name, quantity FROM vegetable_purchases WHERE id = %s', (id,))
        old = query_cursor.fetchone()
        if not old:
            return jsonify({'error': '记录不存在'}), 404
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE vegetable_purchases SET name=%s, quantity=%s, unit=%s, unit_price=%s, total_price=%s, supplier=%s, purchase_date=%s WHERE id=%s
        ''', (data['name'], data.get('quantity'), data.get('unit'),
              data.get('unit_price'), data.get('total_price'), data.get('supplier'), data.get('purchase_date'), id))
        inventory_apply_purchase(conn, old['name'], -_to_number(old['quantity']))
        inventory_apply_purchase(conn, data.get('name'), data.get('quantity'),
                                 unit=data.get('unit'), price=data.get('unit_price'),
                                 supplier=data.get('supplier'), category='蔬菜')
        conn.commit()
        return jsonify({'message': '蔬菜采购更新成功，库存已同步调整'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/vegetables/<int:id>', methods=['DELETE'])
@login_required
def delete_vegetable(id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        query_cursor = conn.cursor(dictionary=True)
        query_cursor.execute('SELECT name, quantity FROM vegetable_purchases WHERE id = %s', (id,))
        old = query_cursor.fetchone()
        if not old:
            return jsonify({'error': '记录不存在'}), 404
        cursor = conn.cursor()
        cursor.execute('DELETE FROM vegetable_purchases WHERE id = %s', (id,))
        inventory_apply_purchase(conn, old['name'], -_to_number(old['quantity']))
        conn.commit()
        return jsonify({'message': '蔬菜采购删除成功，库存已同步扣减'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/meats', methods=['GET'])
@login_required
def get_meats():
    conn = get_db_connection()
    if not conn:
        return jsonify([])
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT * FROM meat_purchases ORDER BY purchase_date DESC, id DESC')
        meats = cursor.fetchall()
        return jsonify(meats)
    except Exception as e:
        print(f'Error: {e}')
        return jsonify([])
    finally:
        conn.close()

@app.route('/api/meats/<int:id>', methods=['GET'])
@login_required
def get_meat_by_id(id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT * FROM meat_purchases WHERE id = %s', (id,))
        meat = cursor.fetchone()
        if meat:
            return jsonify(meat)
        return jsonify({'error': '肉类采购记录不存在'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/meats', methods=['POST'])
@login_required
def add_meat():
    data = request.json
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO meat_purchases (name, quantity, unit, unit_price, total_price, supplier, purchase_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        ''', (data['name'], data.get('quantity'), data.get('unit'),
              data.get('unit_price'), data.get('total_price'), data.get('supplier'), data.get('purchase_date')))
        inventory_apply_purchase(conn, data.get('name'), data.get('quantity'),
                                 unit=data.get('unit'), price=data.get('unit_price'),
                                 supplier=data.get('supplier'), category='肉类')
        conn.commit()
        return jsonify({'id': cursor.lastrowid, 'message': '肉类采购添加成功，已同步入库'}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/meats/<int:id>', methods=['PUT'])
@login_required
def update_meat(id):
    data = request.json
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        query_cursor = conn.cursor(dictionary=True)
        query_cursor.execute('SELECT name, quantity FROM meat_purchases WHERE id = %s', (id,))
        old = query_cursor.fetchone()
        if not old:
            return jsonify({'error': '记录不存在'}), 404
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE meat_purchases SET name=%s, quantity=%s, unit=%s, unit_price=%s, total_price=%s, supplier=%s, purchase_date=%s WHERE id=%s
        ''', (data['name'], data.get('quantity'), data.get('unit'),
              data.get('unit_price'), data.get('total_price'), data.get('supplier'), data.get('purchase_date'), id))
        inventory_apply_purchase(conn, old['name'], -_to_number(old['quantity']))
        inventory_apply_purchase(conn, data.get('name'), data.get('quantity'),
                                 unit=data.get('unit'), price=data.get('unit_price'),
                                 supplier=data.get('supplier'), category='肉类')
        conn.commit()
        return jsonify({'message': '肉类采购更新成功，库存已同步调整'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/meats/<int:id>', methods=['DELETE'])
@login_required
def delete_meat(id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        query_cursor = conn.cursor(dictionary=True)
        query_cursor.execute('SELECT name, quantity FROM meat_purchases WHERE id = %s', (id,))
        old = query_cursor.fetchone()
        if not old:
            return jsonify({'error': '记录不存在'}), 404
        cursor = conn.cursor()
        cursor.execute('DELETE FROM meat_purchases WHERE id = %s', (id,))
        inventory_apply_purchase(conn, old['name'], -_to_number(old['quantity']))
        conn.commit()
        return jsonify({'message': '肉类采购删除成功，库存已同步扣减'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/fruits', methods=['GET'])
@login_required
def get_fruits():
    conn = get_db_connection()
    if not conn:
        return jsonify([])
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT * FROM fruit_purchases ORDER BY purchase_date DESC')
        fruits = cursor.fetchall()
        return jsonify(fruits)
    except Exception as e:
        print(f'Error: {e}')
        return jsonify([])
    finally:
        conn.close()

@app.route('/api/fruits/<int:id>', methods=['GET'])
@login_required
def get_fruit_by_id(id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT * FROM fruit_purchases WHERE id = %s', (id,))
        fruit = cursor.fetchone()
        if fruit:
            return jsonify(fruit)
        return jsonify({'error': '水果采购记录不存在'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/fruits', methods=['POST'])
@login_required
def add_fruit():
    data = request.json
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO fruit_purchases (name, quantity, unit, price, total, supplier, purchase_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        ''', (data.get('name'), data.get('quantity'), data.get('unit'),
              data.get('price'), data.get('total'), data.get('supplier'),
              data.get('purchase_date')))
        inventory_apply_purchase(conn, data.get('name'), data.get('quantity'),
                                 unit=data.get('unit'), price=data.get('price'),
                                 supplier=data.get('supplier'), category='水果')
        conn.commit()
        return jsonify({'id': cursor.lastrowid, 'message': '水果采购记录添加成功，已同步入库'}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/fruits/<int:id>', methods=['PUT'])
@login_required
def update_fruit(id):
    data = request.json
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        query_cursor = conn.cursor(dictionary=True)
        query_cursor.execute('SELECT name, quantity FROM fruit_purchases WHERE id = %s', (id,))
        old = query_cursor.fetchone()
        if not old:
            return jsonify({'error': '记录不存在'}), 404
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE fruit_purchases SET name=%s, quantity=%s, unit=%s, price=%s,
                       total=%s, supplier=%s, purchase_date=%s WHERE id=%s
        ''', (data.get('name'), data.get('quantity'), data.get('unit'),
              data.get('price'), data.get('total'), data.get('supplier'),
              data.get('purchase_date'), id))
        inventory_apply_purchase(conn, old['name'], -_to_number(old['quantity']))
        inventory_apply_purchase(conn, data.get('name'), data.get('quantity'),
                                 unit=data.get('unit'), price=data.get('price'),
                                 supplier=data.get('supplier'), category='水果')
        conn.commit()
        return jsonify({'message': '水果采购记录更新成功，库存已同步调整'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/fruits/<int:id>', methods=['DELETE'])
@login_required
def delete_fruit(id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        query_cursor = conn.cursor(dictionary=True)
        query_cursor.execute('SELECT name, quantity FROM fruit_purchases WHERE id = %s', (id,))
        old = query_cursor.fetchone()
        if not old:
            return jsonify({'error': '记录不存在'}), 404
        cursor = conn.cursor()
        cursor.execute('DELETE FROM fruit_purchases WHERE id = %s', (id,))
        inventory_apply_purchase(conn, old['name'], -_to_number(old['quantity']))
        conn.commit()
        return jsonify({'message': '水果采购记录删除成功，库存已同步扣减'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/analysis', methods=['POST'])
@login_required
def get_analysis():
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT SUM(total_amount) as total_revenue, SUM(order_count) as total_orders FROM monthly_sales')
        overall = cursor.fetchone()
        cursor.execute('SELECT * FROM monthly_sales ORDER BY month')
        monthly_data = cursor.fetchall()
        cursor.execute('''
            SELECT d.name, SUM(s.quantity) as total_sold, SUM(s.total_price) as revenue
            FROM sales s JOIN dishes d ON s.dish_id = d.id
            GROUP BY d.id, d.name
            ORDER BY total_sold DESC
            LIMIT 10
        ''')
        top_dishes = cursor.fetchall()
        cursor.execute('''
            SELECT category, SUM(s.total_price) as revenue, COUNT(*) as count
            FROM sales s JOIN dishes d ON s.dish_id = d.id
            GROUP BY category
            ORDER BY revenue DESC
        ''')
        category_data = cursor.fetchall()
        cursor.execute('SELECT * FROM customers ORDER BY total_spent DESC LIMIT 10')
        top_customers = cursor.fetchall()
        
        data_summary = f'饭店运营数据分析报告: 总体数据: 总营业额: {overall["total_revenue"]}元, 总订单数: {overall["total_orders"]}单'
        prompt = f'假如你是一名饭店的经理，这里有一些饭店的营业额与菜品价格，每月销售额等数据，请提取信息并分析用户画像，为饭店之后的运营提供一些建议。数据: {data_summary} 请给出详细的分析报告和运营建议。'
        
        headers = {'Content-Type': 'application/json', 'Authorization': f'Bearer {LLM_CONFIG["api_key"]}'}
        payload = {'model': LLM_CONFIG["model"], 'messages': [{'role': 'user', 'content': prompt}], 'temperature': 0.7}
        
        response = requests.post(LLM_CONFIG["api_url"] + '/chat/completions', headers=headers, json=payload)
        if response.status_code == 200:
            result = response.json()
            return jsonify({'analysis': result['choices'][0]['message']['content'], 'data': {'overall': overall, 'monthly_sales': monthly_data, 'top_dishes': top_dishes, 'category_data': category_data, 'top_customers': top_customers}})
        else:
            return jsonify({'error': 'AI分析服务调用失败'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/chat', methods=['POST'])
@login_required
def chat():
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        data = request.json
        user_message = data.get('message', '')
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT SUM(total_amount) as total_revenue, SUM(order_count) as total_orders FROM monthly_sales')
        overall = cursor.fetchone()
        cursor.execute('SELECT * FROM monthly_sales ORDER BY month DESC LIMIT 6')
        recent_sales = cursor.fetchall()
        cursor.execute('''
            SELECT d.name, SUM(s.quantity) as total_sold, SUM(s.total_price) as revenue
            FROM sales s JOIN dishes d ON s.dish_id = d.id
            GROUP BY d.id, d.name
            ORDER BY total_sold DESC
            LIMIT 5
        ''')
        top_dishes = cursor.fetchall()
        cursor.execute('SELECT COUNT(*) as dish_count FROM dishes')
        dish_count = cursor.fetchone()['dish_count']
        cursor.execute('SELECT COUNT(*) as customer_count FROM customers')
        customer_count = cursor.fetchone()['customer_count']
        
        context = f'你是一位专业的饭店管理顾问。以下是当前饭店的基本数据：总体概况: 总营业额: {overall["total_revenue"] or 0}元, 总订单数: {overall["total_orders"] or 0}单, 菜品总数: {dish_count}道, 客户总数: {customer_count}位。请根据以上信息回答用户的问题。回答要专业、友好、有建设性。'
        
        headers = {'Content-Type': 'application/json', 'Authorization': f'Bearer {LLM_CONFIG["api_key"]}'}
        payload = {'model': LLM_CONFIG["model"], 'messages': [{'role': 'system', 'content': context}, {'role': 'user', 'content': user_message}], 'temperature': 0.7}
        
        response = requests.post(LLM_CONFIG["api_url"] + '/chat/completions', headers=headers, json=payload)
        if response.status_code == 200:
            result = response.json()
            ai_answer = result['choices'][0]['message']['content']
            try:
                save_cursor = conn.cursor()
                save_cursor.execute(
                    'INSERT INTO chat_records (user_id, question, answer) VALUES (%s, %s, %s)',
                    (session['user_id'], user_message, ai_answer)
                )
                conn.commit()
            except Exception as save_err:
                conn.rollback()
                print(f'⚠️ 对话记录保存失败: {save_err}')
            return jsonify({'response': ai_answer})
        else:
            return jsonify({'error': 'AI服务调用失败'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/chat/records', methods=['GET'])
@login_required
def get_chat_records():
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        limit = request.args.get('limit', 50, type=int)
        limit = min(max(limit, 1), 200)
        keyword = (request.args.get('keyword') or '').strip()
        like = f'%{keyword}%' if keyword else None
        is_admin = session.get('role') == 'admin'

        base_select = '''
            SELECT cr.id, cr.user_id, cr.question, cr.answer, cr.created_at,
                   u.real_name, u.username
            FROM chat_records cr
            LEFT JOIN users u ON cr.user_id = u.id
        '''
        if is_admin:
            if like:
                sql = base_select + '''
                    WHERE cr.question LIKE %s OR cr.answer LIKE %s
                        OR u.real_name LIKE %s OR u.username LIKE %s
                    ORDER BY cr.created_at DESC LIMIT %s
                '''
                cursor.execute(sql, (like, like, like, like, limit))
            else:
                cursor.execute(base_select + 'ORDER BY cr.created_at DESC LIMIT %s', (limit,))
        else:
            if like:
                sql = base_select + '''
                    WHERE cr.user_id = %s AND (cr.question LIKE %s OR cr.answer LIKE %s)
                    ORDER BY cr.created_at DESC LIMIT %s
                '''
                cursor.execute(sql, (session['user_id'], like, like, limit))
            else:
                cursor.execute(base_select + 'WHERE cr.user_id = %s ORDER BY cr.created_at DESC LIMIT %s',
                               (session['user_id'], limit))
        records = cursor.fetchall()
        for r in records:
            if r.get('created_at'):
                r['created_at'] = r['created_at'].strftime('%Y-%m-%d %H:%M:%S')
        return jsonify(records)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/chat/records/<int:record_id>', methods=['DELETE'])
@login_required
def delete_chat_record(record_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT user_id FROM chat_records WHERE id = %s', (record_id,))
        record = cursor.fetchone()
        if not record:
            return jsonify({'error': '对话记录不存在'}), 404
        if session.get('role') != 'admin' and record['user_id'] != session['user_id']:
            return jsonify({'error': '无权删除该记录'}), 403
        del_cursor = conn.cursor()
        del_cursor.execute('DELETE FROM chat_records WHERE id = %s', (record_id,))
        conn.commit()
        return jsonify({'message': '删除成功'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/orders', methods=['POST'])
def create_order():
    data = request.json
    customer_name = data.get('customer_name')
    customer_phone = data.get('customer_phone')
    table_number = data.get('table_number')
    items = data.get('items', [])
    total_price = data.get('total_price')
    status = data.get('status', 'pending')

    if not customer_name or not customer_phone or not table_number or len(items) == 0:
        return jsonify({'error': '请提供完整的订单信息'}), 400

    import uuid
    order_no = 'ORD' + str(uuid.uuid4()).replace('-', '')[:12].upper()

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500

    try:
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO orders (order_no, customer_name, customer_phone, 
                               table_number, total_price, status)
            VALUES (%s, %s, %s, %s, %s, %s)
        ''', (order_no, customer_name, customer_phone, table_number, float(total_price), status))
        
        order_id = cursor.lastrowid

        for item in items:
            cursor.execute('''
                INSERT INTO order_items (order_id, dish_id, dish_name, 
                                        quantity, price)
                VALUES (%s, %s, %s, %s, %s)
            ''', (order_id, item['id'], item['name'], item['quantity'], item['price']))

        if status == 'paid':
            for item in items:
                cursor.execute('''
                    INSERT INTO sales (dish_id, quantity, total_price, sale_date)
                    VALUES (%s, %s, %s, CURDATE())
                ''', (item['id'], item['quantity'], float(item['price']) * item['quantity']))

        conn.commit()

        return jsonify({
            'order_no': order_no,
            'order_id': order_id,
            'customer_name': customer_name,
            'total_price': total_price,
            'status': status,
            'items': items,
            'message': '订单创建成功'
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/orders', methods=['GET'])
@login_required
def get_orders():
    conn = get_db_connection()
    if not conn:
        return jsonify([])
    try:
        cursor = conn.cursor(dictionary=True)
        
        status = request.args.get('status')
        search = request.args.get('search')
        
        query = 'SELECT * FROM orders WHERE 1=1'
        params = []
        
        if status and status != 'all':
            query += ' AND status = %s'
            params.append(status)
        
        if search:
            query += ' AND order_no LIKE %s'
            params.append(f'%{search}%')
        
        query += ' ORDER BY created_at DESC'
        
        cursor.execute(query, tuple(params))
        orders = cursor.fetchall()
        
        for order in orders:
            cursor.execute('SELECT * FROM order_items WHERE order_id = %s', (order['id'],))
            order['items'] = cursor.fetchall()
        
        return jsonify(orders)
    except Exception as e:
        print(f'Error: {e}')
        return jsonify([])
    finally:
        conn.close()

@app.route('/api/orders/<int:id>', methods=['GET'])
@login_required
def get_order(id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT * FROM orders WHERE id = %s', (id,))
        order = cursor.fetchone()
        
        if order:
            cursor.execute('SELECT * FROM order_items WHERE order_id = %s', (id,))
            order['items'] = cursor.fetchall()
            return jsonify(order)
        
        return jsonify({'error': '订单不存在'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/orders/<int:id>', methods=['PUT'])
@login_required
def update_order_status(id):
    data = request.json
    status = data.get('status')
    
    if not status:
        return jsonify({'error': '请提供订单状态'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute('UPDATE orders SET status = %s WHERE id = %s', (status, id))
        conn.commit()
        
        if cursor.rowcount > 0:
            return jsonify({'message': '订单状态更新成功'})
        return jsonify({'error': '订单不存在'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/orders/<int:id>', methods=['DELETE'])
@login_required
def delete_order(id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM order_items WHERE order_id = %s', (id,))
        cursor.execute('DELETE FROM orders WHERE id = %s', (id,))
        conn.commit()
        
        if cursor.rowcount > 0:
            return jsonify({'message': '订单删除成功'})
        return jsonify({'error': '订单不存在'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/orders/<int:id>/confirm', methods=['POST'])
@login_required
def confirm_order(id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '数据库连接失败'}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute('SELECT * FROM orders WHERE id = %s', (id,))
        order = cursor.fetchone()
        
        if not order:
            return jsonify({'error': '订单不存在'}), 404
        
        if order['status'] == 'confirmed':
            return jsonify({'error': '订单已确认'}), 400
        
        cursor.execute('SELECT * FROM order_items WHERE order_id = %s', (id,))
        items = cursor.fetchall()

        # 库存预扣校验：按 item_name 汇总每道菜的配方消耗 × 数量
        # 查询所有相关菜品的配方
        dish_ids = [it['dish_id'] for it in items if it.get('dish_id')]
        recipe_map = {}  # {dish_id: [(item_name, qty_per_serving, unit), ...]}
        if dish_ids:
            format_ids = ','.join(['%s'] * len(dish_ids))
            cursor.execute(f'''
                SELECT dish_id, item_name, quantity
                FROM dish_ingredients
                WHERE dish_id IN ({format_ids})
            ''', tuple(dish_ids))
            for r in cursor.fetchall():
                recipe_map.setdefault(r['dish_id'], []).append((r['item_name'], float(r['quantity'])))

        # 聚合所需食材
        needed = {}  # {item_name: total_qty}
        for it in items:
            dish_id = it.get('dish_id')
            qty = int(it.get('quantity') or 0)
            if dish_id and qty > 0:
                for name, per in recipe_map.get(dish_id, []):
                    needed[name] = needed.get(name, 0) + per * qty

        # 库存校验
        if needed:
            names = list(needed.keys())
            fmt = ','.join(['%s'] * len(names))
            cursor.execute(f'SELECT item_name, quantity FROM inventory WHERE item_name IN ({fmt})', tuple(names))
            stock = {r['item_name']: float(r['quantity']) for r in cursor.fetchall()}

            shortage = []
            for name, need_qty in needed.items():
                have = stock.get(name, 0)
                if have < need_qty:
                    shortage.append(f"{name}（需{need_qty:.2f}/库存{have:.2f}）")

            if shortage:
                return jsonify({'error': '库存不足，无法完成订单：' + '；'.join(shortage)}), 400

        # 通过校验：更新订单状态 + 同步销售 + 扣减库存（同事务）
        cursor.execute('UPDATE orders SET status = %s WHERE id = %s', ('confirmed', id))

        for item in items:
            cursor.execute('''
                INSERT INTO sales (dish_id, quantity, total_price, sale_date)
                VALUES (%s, %s, %s, CURDATE())
            ''', (item['dish_id'], item['quantity'], item['price'] * item['quantity']))

        # 扣减库存
        for name, need_qty in needed.items():
            inventory_apply_purchase(conn, name, -need_qty)

        conn.commit()
        
        return jsonify({'message': '订单确认成功，已同步到销售统计并扣减库存'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

if __name__ == '__main__':
    print('\n' + '='*60)
    print('  Restaurant Management System')
    print('='*60)
    print('\nInitializing...')
    init_data_on_start()
    print('\nSystem ready!')
    print('URL: http://127.0.0.1:5000')
    print('Test accounts:')
    print('   - Admin: admin / 123456')
    print('   - Staff: staff / 123456')
    print('='*60 + '\n')
    app.run(
        host=os.environ.get('APP_HOST', '127.0.0.1'),
        port=int(os.environ.get('APP_PORT', '5000')),
        debug=os.environ.get('FLASK_DEBUG', '1') == '1',
    )

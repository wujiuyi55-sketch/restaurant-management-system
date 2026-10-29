import mysql.connector
from mysql.connector import Error

from config import DB_CONFIG

# 先不指定 database，脚本会自行创建
CONN_CONFIG = {k: v for k, v in DB_CONFIG.items() if k != 'database'}
CONN_CONFIG['charset'] = 'utf8'
DATABASE = DB_CONFIG['database']

def main():
    conn = None
    try:
        print("正在连接MySQL...")
        conn = mysql.connector.connect(**CONN_CONFIG)
        cursor = conn.cursor()
        
        print(f"创建数据库 {DATABASE}...")
        cursor.execute(f'CREATE DATABASE IF NOT EXISTS {DATABASE} CHARACTER SET utf8')
        cursor.execute(f'USE {DATABASE}')
        
        print("\n===== 创建表 =====")
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS dishes (
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
        """)
        print("- dishes 表创建成功")
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sales (
                id INT PRIMARY KEY AUTO_INCREMENT,
                dish_id INT,
                quantity INT NOT NULL,
                total_price DECIMAL(10,2) NOT NULL,
                sale_date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("- sales 表创建成功")
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS monthly_sales (
                id INT PRIMARY KEY AUTO_INCREMENT,
                month VARCHAR(7) NOT NULL UNIQUE,
                total_amount DECIMAL(12,2) NOT NULL,
                order_count INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL
            )
        """)
        print("- monthly_sales 表创建成功")
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS customers (
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
        """)
        print("- customers 表创建成功")
        
        print("\n===== 插入初始数据 =====")
        
        dishes = [
            ('红烧肉', 48.00, '热菜', '精选五花肉，色泽红亮，肥而不腻', 1),
            ('清蒸鲈鱼', 68.00, '热菜', '新鲜鲈鱼，清蒸入味，肉质鲜嫩', 1),
            ('宫保鸡丁', 38.00, '热菜', '鸡肉嫩滑，花生酥脆，微辣爽口', 1),
            ('蒜蓉西兰花', 28.00, '素菜', '新鲜西兰花，蒜蓉调味，营养健康', 1),
            ('麻婆豆腐', 22.00, '热菜', '豆腐嫩滑，麻辣鲜香，下饭佳品', 1),
            ('糖醋排骨', 58.00, '热菜', '精选肋排，酸甜适口，外酥里嫩', 1),
            ('鱼香肉丝', 32.00, '热菜', '肉丝鲜嫩，鱼香味浓，酸甜适中', 1),
            ('凉拌黄瓜', 18.00, '凉菜', '清爽可口，开胃解腻', 1),
            ('酸辣土豆丝', 16.00, '素菜', '脆爽可口，酸辣开胃', 1),
            ('水煮牛肉', 58.00, '热菜', '牛肉鲜嫩，麻辣过瘾', 1),
            ('干锅牛蛙', 78.00, '热菜', '牛蛙鲜嫩，香辣入味', 1),
            ('蒜蓉扇贝', 68.00, '海鲜', '新鲜扇贝，蒜蓉蒸制', 1),
            ('老火靓汤', 38.00, '汤品', '慢火熬制，营养丰富', 1),
            ('米饭', 3.00, '主食', '香米米饭', 1),
            ('馒头', 2.00, '主食', '白面馒头', 1)
        ]
        
        cursor.executemany("""
            INSERT IGNORE INTO dishes (name, price, category, description, status)
            VALUES (%s, %s, %s, %s, %s)
        """, dishes)
        print(f"- 插入 {cursor.rowcount} 道菜品")
        
        monthly_data = [
            ('2024-01', 15680.50, 320),
            ('2024-02', 14250.80, 290),
            ('2024-03', 18900.30, 380),
            ('2024-04', 16500.60, 340),
            ('2024-05', 21000.00, 420),
            ('2024-06', 22500.20, 450),
            ('2024-07', 24800.50, 490),
            ('2024-08', 23500.80, 470),
            ('2024-09', 19800.30, 400),
            ('2024-10', 21500.60, 430),
            ('2024-11', 20800.00, 415),
            ('2024-12', 25500.20, 510)
        ]
        
        cursor.executemany("""
            INSERT IGNORE INTO monthly_sales (month, total_amount, order_count)
            VALUES (%s, %s, %s)
        """, monthly_data)
        print(f"- 插入 {cursor.rowcount} 条月度销售记录")
        
        customers = [
            ('张三', '13800138001', 'zhangsan@example.com', 15, 880.00, '2024-12-15'),
            ('李四', '13900139002', 'lisi@example.com', 8, 520.00, '2024-12-10'),
            ('王五', '13700137003', 'wangwu@example.com', 22, 1280.00, '2024-12-18'),
            ('赵六', '13600136004', 'zhaoliu@example.com', 5, 320.00, '2024-12-08'),
            ('钱七', '13500135005', 'qianqi@example.com', 12, 680.00, '2024-12-12'),
            ('孙八', '13400134006', 'sunba@example.com', 18, 950.00, '2024-12-16'),
            ('周九', '13300133007', 'zhoujiu@example.com', 7, 450.00, '2024-12-09'),
            ('吴十', '13200132008', 'wushi@example.com', 25, 1580.00, '2024-12-19')
        ]
        
        cursor.executemany("""
            INSERT IGNORE INTO customers (name, phone, email, visit_count, total_spent, last_visit)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, customers)
        print(f"- 插入 {cursor.rowcount} 位客户")
        
        import random
        from datetime import datetime, timedelta
        
        cursor.execute("SELECT id, price FROM dishes")
        dishes_data = cursor.fetchall()
        
        sales_data = []
        for i in range(100):
            date = (datetime(2024, 12, 1) + timedelta(days=i%30)).strftime('%Y-%m-%d')
            for _ in range(random.randint(3, 10)):
                dish_id, price = random.choice(dishes_data)
                quantity = random.randint(1, 4)
                total_price = price * quantity
                sales_data.append((dish_id, quantity, total_price, date))
        
        if sales_data:
            cursor.executemany("""
                INSERT INTO sales (dish_id, quantity, total_price, sale_date)
                VALUES (%s, %s, %s, %s)
            """, sales_data)
            print(f"- 插入 {cursor.rowcount} 条销售记录")
        
        conn.commit()
        
        print("\n===== 验证数据 =====")
        cursor.execute("SELECT COUNT(*) FROM dishes")
        print(f"菜品数量: {cursor.fetchone()[0]}")
        cursor.execute("SELECT COUNT(*) FROM sales")
        print(f"销售记录: {cursor.fetchone()[0]}")
        cursor.execute("SELECT COUNT(*) FROM monthly_sales")
        print(f"月度销售: {cursor.fetchone()[0]}")
        cursor.execute("SELECT COUNT(*) FROM customers")
        print(f"客户数量: {cursor.fetchone()[0]}")
        
        print("\n✅ 数据库初始化完成！")
        
    except Error as e:
        print(f"错误: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    main()

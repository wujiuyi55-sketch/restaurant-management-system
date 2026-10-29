import mysql.connector
from config import DB_CONFIG
import random
from datetime import datetime, timedelta

def init_db_safe():
    print("🚀 正在安全初始化数据库...\n")
    
    conn = mysql.connector.connect(
        host=DB_CONFIG['host'],
        user=DB_CONFIG['user'],
        password=DB_CONFIG['password'],
        port=DB_CONFIG['port'],
        charset='utf8'
    )
    cursor = conn.cursor()
    
    # 检查数据库是否存在，不存在则创建
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_CONFIG['database']} CHARACTER SET utf8")
    cursor.execute(f"USE {DB_CONFIG['database']}")
    
    # 检查表是否存在
    cursor.execute("SHOW TABLES")
    existing_tables = [t[0] for t in cursor.fetchall()]
    
    tables_needed = ['dishes', 'sales', 'monthly_sales', 'customers']
    tables_to_create = [t for t in tables_needed if t not in existing_tables]
    
    if tables_to_create:
        print(f"📊 正在创建表: {', '.join(tables_to_create)}")
        
        if 'dishes' in tables_to_create:
            cursor.execute("""
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
            """)
        
        if 'sales' in tables_to_create:
            cursor.execute("""
                CREATE TABLE sales (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    dish_id INT,
                    quantity INT NOT NULL,
                    total_price DECIMAL(10,2) NOT NULL,
                    sale_date DATE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
        
        if 'monthly_sales' in tables_to_create:
            cursor.execute("""
                CREATE TABLE monthly_sales (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    month VARCHAR(7) NOT NULL UNIQUE,
                    total_amount DECIMAL(12,2) NOT NULL,
                    order_count INT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NULL
                )
            """)
        
        if 'customers' in tables_to_create:
            cursor.execute("""
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
            """)
    
    # 检查菜品是否需要插入
    cursor.execute("SELECT COUNT(*) FROM dishes")
    dish_count = cursor.fetchone()[0]
    
    if dish_count == 0:
        print("📊 正在插入菜品数据...")
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
            ('馒头', 2.00, '主食', '白面馒头', 1),
            ('蛋炒饭', 18.00, '主食', '粒粒分明，香气扑鼻', 1),
            ('葱油拌面', 15.00, '主食', '葱香浓郁，面条爽滑', 1),
            ('干煸四季豆', 26.00, '素菜', '脆嫩可口，香辣开胃', 1),
            ('回锅肉', 42.00, '热菜', '肥而不腻，香气四溢', 1),
            ('口水鸡', 36.00, '凉菜', '麻辣鲜香，肉质嫩滑', 1)
        ]
        
        cursor.executemany("""
            INSERT INTO dishes (name, price, category, description, status)
            VALUES (%s, %s, %s, %s, %s)
        """, dishes)
        print(f"   ✅ 菜品: {len(dishes)} 道")
    
    # 检查月度销售数据
    cursor.execute("SELECT COUNT(*) FROM monthly_sales")
    monthly_count = cursor.fetchone()[0]
    
    if monthly_count == 0:
        print("📊 正在插入月度销售数据...")
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
            INSERT INTO monthly_sales (month, total_amount, order_count)
            VALUES (%s, %s, %s)
        """, monthly_data)
        print(f"   ✅ 月度销售: {len(monthly_data)} 条")
    
    # 检查客户数据
    cursor.execute("SELECT COUNT(*) FROM customers")
    customer_count = cursor.fetchone()[0]
    
    if customer_count == 0:
        print("📊 正在插入客户数据...")
        customers = [
            ('张三', '13800138001', 'zhangsan@example.com', 15, 880.00, '2024-06-15'),
            ('李四', '13900139002', 'lisi@example.com', 8, 520.00, '2024-06-10'),
            ('王五', '13700137003', 'wangwu@example.com', 22, 1280.00, '2024-06-18'),
            ('赵六', '13600136004', 'zhaoliu@example.com', 5, 320.00, '2024-06-08'),
            ('钱七', '13500135005', 'qianqi@example.com', 12, 680.00, '2024-06-12'),
            ('孙八', '13400134006', 'sunba@example.com', 18, 950.00, '2024-06-16'),
            ('周九', '13300133007', 'zhoujiu@example.com', 7, 450.00, '2024-06-09'),
            ('吴十', '13200132008', 'wushi@example.com', 25, 1580.00, '2024-06-19'),
            ('郑十一', '13100131009', 'zheng11@example.com', 10, 720.00, '2024-06-14'),
            ('王十二', '13000130010', 'wang12@example.com', 3, 210.00, '2024-06-05'),
            ('刘十三', '12900129011', 'liu13@example.com', 14, 1050.00, '2024-06-17'),
            ('陈十四', '12800128012', 'chen14@example.com', 6, 390.00, '2024-06-06')
        ]
        
        cursor.executemany("""
            INSERT INTO customers (name, phone, email, visit_count, total_spent, last_visit)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, customers)
        print(f"   ✅ 客户: {len(customers)} 位")
    
    # 检查销售记录
    cursor.execute("SELECT COUNT(*) FROM sales")
    sale_count = cursor.fetchone()[0]
    
    if sale_count == 0:
        print(f"\n📊 正在生成销售记录...")
        
        cursor.execute("SELECT id, price FROM dishes")
        dish_list = cursor.fetchall()
        
        sales_data = []
        start_date = datetime(2024, 1, 1)
        end_date = datetime(2024, 12, 31)
        
        current_date = start_date
        
        while current_date <= end_date:
            daily_sales = random.randint(5, 20)
            
            for _ in range(daily_sales):
                dish_id, price = random.choice(dish_list)
                quantity = random.randint(1, 5)
                total_price = float(price) * quantity
                
                sales_data.append((
                    dish_id, 
                    quantity, 
                    total_price, 
                    current_date.strftime('%Y-%m-%d')
                ))
            
            current_date += timedelta(days=1)
        
        batch_size = 500
        for i in range(0, len(sales_data), batch_size):
            batch = sales_data[i:i+batch_size]
            cursor.executemany("""
                INSERT INTO sales (dish_id, quantity, total_price, sale_date)
                VALUES (%s, %s, %s, %s)
            """, batch)
            print(f"   📊 已插入: {min(i+batch_size, len(sales_data))}/{len(sales_data)}")
    
    conn.commit()
    
    # 最终统计
    cursor.execute("SELECT COUNT(*) FROM dishes")
    final_dish = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM sales")
    final_sales = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM customers")
    final_customer = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM monthly_sales")
    final_monthly = cursor.fetchone()[0]
    
    print("\n" + "="*50)
    print("✅ 数据库初始化完成！")
    print("="*50)
    print(f"📊 菜品数量: {final_dish} 道")
    print(f"📊 销售记录: {final_sales} 条")
    print(f"📊 客户数量: {final_customer} 位")
    print(f"📊 月度销售: {final_monthly} 条")
    print("="*50)
    
    conn.close()

if __name__ == '__main__':
    try:
        init_db_safe()
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()

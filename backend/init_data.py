import mysql.connector
from mysql.connector import Error
from config import DB_CONFIG

def insert_initial_data():
    connection = None
    try:
        connection = mysql.connector.connect(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            port=DB_CONFIG['port'],
            database=DB_CONFIG['database'],
            charset='utf8'
        )
        cursor = connection.cursor()
        
        dishes = [
            ("红烧肉", 48.00, "热菜", "精选五花肉，色泽红亮，肥而不腻", "dish1.jpg", 1),
            ("清蒸鲈鱼", 68.00, "热菜", "新鲜鲈鱼，清蒸入味，肉质鲜嫩", "dish2.jpg", 1),
            ("宫保鸡丁", 38.00, "热菜", "鸡肉嫩滑，花生酥脆，微辣爽口", "dish3.jpg", 1),
            ("蒜蓉西兰花", 28.00, "素菜", "新鲜西兰花，蒜蓉调味，营养健康", "dish4.jpg", 1),
            ("麻婆豆腐", 22.00, "热菜", "豆腐嫩滑，麻辣鲜香，下饭佳品", "dish5.jpg", 1),
            ("糖醋排骨", 58.00, "热菜", "精选肋排，酸甜适口，外酥里嫩", "dish6.jpg", 1),
            ("鱼香肉丝", 32.00, "热菜", "肉丝鲜嫩，鱼香味浓，酸甜适中", "dish7.jpg", 1),
            ("凉拌黄瓜", 18.00, "凉菜", "清爽可口，开胃解腻", "dish8.jpg", 1),
            ("酸辣土豆丝", 16.00, "素菜", "脆爽可口，酸辣开胃", "dish9.jpg", 1),
            ("水煮牛肉", 58.00, "热菜", "牛肉鲜嫩，麻辣过瘾", "dish10.jpg", 1),
            ("干锅牛蛙", 78.00, "热菜", "牛蛙鲜嫩，香辣入味", "dish11.jpg", 1),
            ("蒜蓉扇贝", 68.00, "海鲜", "新鲜扇贝，蒜蓉蒸制", "dish12.jpg", 1),
            ("老火靓汤", 38.00, "汤品", "慢火熬制，营养丰富", "dish13.jpg", 1),
            ("米饭", 3.00, "主食", "香米米饭", "dish14.jpg", 1),
            ("馒头", 2.00, "主食", "白面馒头", "dish15.jpg", 1)
        ]
        
        cursor.executemany("""
            INSERT IGNORE INTO dishes (name, price, category, description, image_url, status)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, dishes)
        
        import random
        from datetime import datetime, timedelta
        
        cursor.execute("SELECT id, price FROM dishes")
        dishes_data = cursor.fetchall()
        
        sales_data = []
        for i in range(365):
            date = (datetime(2024, 1, 1) + timedelta(days=i)).strftime('%Y-%m-%d')
            for _ in range(random.randint(5, 30)):
                dish_id, price = random.choice(dishes_data)
                quantity = random.randint(1, 5)
                total_price = price * quantity
                sales_data.append((dish_id, quantity, total_price, date))
        
        cursor.executemany("""
            INSERT IGNORE INTO sales (dish_id, quantity, total_price, sale_date)
            VALUES (%s, %s, %s, %s)
        """, sales_data)
        
        monthly_data = []
        for month in ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06',
                      '2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12']:
            total_amount = round(random.uniform(8000, 25000), 2)
            order_count = random.randint(300, 800)
            monthly_data.append((month, total_amount, order_count))
        
        cursor.executemany("""
            INSERT IGNORE INTO monthly_sales (month, total_amount, order_count)
            VALUES (%s, %s, %s)
        """, monthly_data)
        
        customers = [
            ("张三", "13800138001", "zhangsan@example.com", 15, 880.00, "2024-12-15"),
            ("李四", "13900139002", "lisi@example.com", 8, 520.00, "2024-12-10"),
            ("王五", "13700137003", "wangwu@example.com", 22, 1280.00, "2024-12-18"),
            ("赵六", "13600136004", "zhaoliu@example.com", 5, 320.00, "2024-12-08"),
            ("钱七", "13500135005", "qianqi@example.com", 12, 680.00, "2024-12-12"),
            ("孙八", "13400134006", "sunba@example.com", 18, 950.00, "2024-12-16"),
            ("周九", "13300133007", "zhoujiu@example.com", 7, 450.00, "2024-12-09"),
            ("吴十", "13200132008", "wushi@example.com", 25, 1580.00, "2024-12-19")
        ]
        
        cursor.executemany("""
            INSERT IGNORE INTO customers (name, phone, email, visit_count, total_spent, last_visit)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, customers)
        
        connection.commit()
        print("初始数据插入成功")
    except Error as e:
        print(f"数据插入错误: {e}")
    finally:
        if connection:
            connection.close()

if __name__ == "__main__":
    insert_initial_data()
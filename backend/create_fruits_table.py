import mysql.connector
from config import DB_CONFIG

def create_fruit_purchases_table():
    print('\n' + '='*70)
    print('  🍎 创建水果采购表')
    print('='*70)
    
    try:
        conn = mysql.connector.connect(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            port=DB_CONFIG['port'],
            database=DB_CONFIG['database'],
            charset='utf8'
        )
        cursor = conn.cursor()
        
        # 创建水果采购表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS fruit_purchases (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                quantity DECIMAL(10,2) NOT NULL,
                unit VARCHAR(20) NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                total DECIMAL(10,2) NOT NULL,
                supplier VARCHAR(100) NOT NULL,
                purchase_date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
        ''')
        
        # 检查是否需要初始化数据
        cursor.execute('SELECT COUNT(*) FROM fruit_purchases')
        count = cursor.fetchone()[0]
        
        if count == 0:
            print('\n📥 正在初始化测试数据...')
            
            fruits_data = [
                ('苹果', 50.00, '斤', 8.50, 425.00, '鑫源水果批发', '2024-01-15'),
                ('香蕉', 30.00, '斤', 4.50, 135.00, '鑫源水果批发', '2024-01-15'),
                ('橙子', 40.00, '斤', 6.00, 240.00, '鲜果源', '2024-01-16'),
                ('西瓜', 20.00, '个', 15.00, 300.00, '鲜果源', '2024-01-17'),
                ('葡萄', 25.00, '斤', 12.00, 300.00, '鑫源水果批发', '2024-01-18'),
                ('草莓', 15.00, '斤', 25.00, 375.00, '本地果园', '2024-01-19'),
                ('芒果', 18.00, '斤', 18.00, 324.00, '鲜果源', '2024-01-20'),
                ('梨', 35.00, '斤', 5.50, 192.50, '鑫源水果批发', '2024-01-21'),
                ('桃子', 22.00, '斤', 7.00, 154.00, '本地果园', '2024-01-22'),
                ('蓝莓', 10.00, '盒', 35.00, 350.00, '进口水果', '2024-01-23'),
                ('猕猴桃', 20.00, '斤', 9.00, 180.00, '鑫源水果批发', '2024-01-24'),
                ('火龙果', 12.00, '个', 8.00, 96.00, '鲜果源', '2024-01-25'),
                ('荔枝', 25.00, '斤', 22.00, 550.00, '进口水果', '2024-01-26'),
                ('龙眼', 30.00, '斤', 18.00, 540.00, '进口水果', '2024-01-27'),
                ('柚子', 15.00, '个', 12.00, 180.00, '鑫源水果批发', '2024-01-28'),
            ]
            
            cursor.executemany('''
                INSERT INTO fruit_purchases (name, quantity, unit, price, total, supplier, purchase_date)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            ''', fruits_data)
            
            conn.commit()
            print(f'✅ 成功插入 {len(fruits_data)} 条水果采购记录')
        else:
            print(f'✅ 表已存在，当前记录数: {count}')
        
        conn.close()
        
        print('\n' + '='*70)
        print('  ✅ 水果采购表创建完成')
        print('='*70)
        
    except mysql.connector.Error as e:
        print(f'\n❌ MySQL错误: {e}')
        print(f'   错误代码: {e.errno}')
    except Exception as e:
        print(f'\n❌ 错误: {e}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    create_fruit_purchases_table()

import mysql.connector
from mysql.connector import Error
import sys

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
        
        print("创建表 dishes...")
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
        
        print("创建表 sales...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sales (
                id INT PRIMARY KEY AUTO_INCREMENT,
                dish_id INT,
                quantity INT NOT NULL,
                total_price DECIMAL(10,2) NOT NULL,
                sale_date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (dish_id) REFERENCES dishes(id)
            )
        """)
        
        print("创建表 monthly_sales...")
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
        
        print("创建表 customers...")
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
        
        conn.commit()
        
        print("\n===== 数据库表创建成功! =====")
        print(f"数据库: {DATABASE}")
        print("\n表列表:")
        cursor.execute('SHOW TABLES')
        tables = cursor.fetchall()
        for table in tables:
            print(f'- {table[0]}')
        
        print("\n所有表已成功创建！")
        
    except Error as e:
        print(f"数据库操作出错: {e}")
        sys.exit(1)
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    main()

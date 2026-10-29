import mysql.connector
from mysql.connector import Error
from config import DB_CONFIG

def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            port=DB_CONFIG['port'],
            database=DB_CONFIG['database'],
            charset='utf8'
        )
        return connection
    except Error as e:
        print(f"数据库连接错误: {e}")
        return None

def init_database():
    connection = None
    try:
        connection = mysql.connector.connect(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            port=DB_CONFIG['port'],
            charset='utf8'
        )
        cursor = connection.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_CONFIG['database']} CHARACTER SET utf8")
        cursor.execute(f"USE {DB_CONFIG['database']}")
        
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
        
        connection.commit()
        print("数据库初始化成功")
    except Error as e:
        print(f"数据库初始化错误: {e}")
    finally:
        if connection:
            connection.close()

import mysql.connector
from config import DB_CONFIG

conn = mysql.connector.connect(
    host=DB_CONFIG['host'], 
    user=DB_CONFIG['user'], 
    password=DB_CONFIG['password'], 
    port=DB_CONFIG['port'], 
    charset='utf8'
)
cursor = conn.cursor()
cursor.execute(f'DROP DATABASE IF EXISTS {DB_CONFIG["database"]}')
cursor.execute(f'CREATE DATABASE {DB_CONFIG["database"]} CHARACTER SET utf8')
conn.close()
print('Database recreated')
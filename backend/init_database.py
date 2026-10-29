import mysql.connector
from config import DB_CONFIG
import random
from datetime import datetime, timedelta

def init_all_tables():
    print('\n' + '='*70)
    print('  🎉 饭店后台管理系统 - 数据库初始化')
    print('='*70)
    
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
        print(f'\n✅ 数据库 {DB_CONFIG["database"]} 已就绪')
        
        cursor.execute('SHOW TABLES')
        existing_tables = [t[0] for t in cursor.fetchall()]
        print(f'\n📋 已存在的表: {", ".join(existing_tables) if existing_tables else "无"}')
        
        print('\n🔄 检查并创建缺失的表...')
        
        if 'attendance' not in existing_tables:
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
            print('✅ 考勤记录表创建成功')
        else:
            print('⏭️  考勤记录表已存在')
        
        conn.commit()
        
        print('\n📊 检查并初始化数据...')
        
        cursor.execute('SELECT COUNT(*) FROM employees')
        emp_count = cursor.fetchone()[0]
        print(f'👥 员工数量: {emp_count}')
        
        cursor.execute('SELECT COUNT(*) FROM attendance')
        att_count = cursor.fetchone()[0]
        print(f'📅 考勤记录数量: {att_count}')
        
        if emp_count == 0:
            print('\n⚠️ 没有员工数据，请先添加员工')
            conn.close()
            return
        
        if att_count == 0:
            print('\n📝 正在生成考勤记录...')
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
            conn.commit()
            print(f'✅ 成功添加 {len(attendance_records)} 条考勤记录')
        else:
            print('⏭️  考勤记录已有数据，跳过初始化')
        
        print('\n' + '='*70)
        print('  ✅ 数据库初始化完成')
        print('='*70)
        print('\n🚀 可以启动应用了:')
        print('   cd backend')
        print('   python app.py')
        print('\n📱 访问地址: http://127.0.0.1:5000')
        print('\n🔑 测试账号:')
        print('   管理员: admin / 123456')
        print('   从业者: staff / 123456')
        print('='*70)
        
        conn.close()
        
    except mysql.connector.Error as e:
        print(f'\n❌ MySQL错误: {e}')
        if e.errno == 1045:
            print('   请检查用户名和密码是否正确')
        elif e.errno == 2003:
            print('   请确保MySQL服务已启动')
        else:
            print(f'   错误代码: {e.errno}')
    except Exception as e:
        print(f'\n❌ 错误: {e}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    init_all_tables()

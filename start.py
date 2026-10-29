import sys
import subprocess
import os

def main():
    print('\n' + '='*60)
    print('  🎉 饭店后台管理系统')
    print('='*60)
    print('\n🚀 正在启动...')
    print('📊 访问地址: http://127.0.0.1:5000')
    print('🔑 测试账号: admin / 123456')
    print('='*60 + '\n')
    
    os.chdir(os.path.join(os.path.dirname(__file__), 'backend'))
    subprocess.run([sys.executable, 'app.py'])

if __name__ == '__main__':
    main()

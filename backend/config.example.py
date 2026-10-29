# -*- coding: utf-8 -*-
"""数据库与大模型配置示例。

使用方法（在项目根目录执行）：
    cp backend/config.example.py backend/config.py     # macOS / Linux
    copy backend/config.example.py backend/config.py   # Windows

然后按自己的环境修改 config.py。config.py 已被写入 .gitignore，
不会提交到版本库，请把真实密码与密钥只放在这个文件里。
"""

DB_CONFIG = {
    'host': '127.0.0.1',        # MySQL 地址
    'user': 'root',             # MySQL 用户名
    'password': 'your-password',  # 改成你自己的 MySQL 密码
    'port': 3306,               # MySQL 端口
    'database': 'bishe',        # 数据库名，可自定义
}

# 任意兼容 OpenAI Chat Completions 协议的大模型服务均可
# 例如：阿里云百炼 https://dashscope.aliyuncs.com/compatible-mode/v1
#       DeepSeek  https://api.deepseek.com/v1
LLM_CONFIG = {
    'api_key': 'sk-your-api-key',
    'api_url': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    'model': 'qwen-plus',
}

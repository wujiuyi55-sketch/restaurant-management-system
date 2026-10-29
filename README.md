# 饭店后台管理系统

一个基于 **Flask + MySQL** 的饭店/餐厅后台管理系统，前端使用原生 HTML/CSS/JavaScript（无需 Node.js，零前端构建），覆盖菜品、订单、库存、采购、销售、员工、客户等完整业务闭环，并接入兼容 OpenAI 协议的大模型，实现 AI 经营分析与 AI 对话顾问。

![Python](https://img.shields.io/badge/Python-3.8%2B-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-2.3.3-000000?logo=flask&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-5.7%20%7C%208.0-4479A1?logo=mysql&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

## 功能模块

| 模块 | 访问路径 | 说明 |
| --- | --- | --- |
| 首页概览 | `/dashboard` | 营业额、订单数等关键指标与月度销售趋势 |
| 点餐商城 | `/shop` | 面向顾客的菜品浏览与下单 |
| 菜品管理 | `/dishes` | 菜品增删改查，可为每道菜配置食材配方 |
| 订单管理 | `/orders` | 下单、确认订单，确认时按配方自动扣减库存 |
| 库存管理 | `/inventory` | 食材库存增删改查、库存预警 |
| 蔬菜采购 | `/vegetables` | 蔬菜采购记录，自动同步库存 |
| 肉类采购 | `/meats` | 肉类采购记录，自动同步库存 |
| 水果采购 | `/fruits` | 水果采购记录，自动同步库存 |
| 销售统计 | `/sales` | 月度销售数据与热销菜品排行 |
| 客户管理 | `/customers` | 客户信息与消费记录 |
| 员工管理 | `/employees` | 员工档案与考勤管理 |
| 用户管理 | `/users` | 系统登录账号管理（仅管理员） |
| 智能分析 | `/analysis` | 一键生成 AI 经营分析报告 |
| AI 对话 | `/chat` | 与 AI 顾问实时交流 |
| 对话记录 | `/chat-records` | 历史对话查询与删除 |
| 个人中心 | `/account` | 修改密码等 |

### 核心业务联动

```
菜品配置配方 → 顾客下单 → 确认订单时校验库存
            → 库存充足：按「每份用量 × 份数」扣减库存并写入销售记录
            → 库存不足：阻止确认并提示缺少的食材
```

菜品配方保存在 `dish_ingredients` 表（`item_name` 需与 `inventory.item_name` 同名才能正确扣减），采购类模块的增删改会通过统一的库存同步函数自动更新库存，采用「先冲销旧值、再加新值」的方式避免库存翻倍或丢失。

## 技术栈

- **后端**：Python 3.8+（推荐 3.10）、Flask 2.3.3、mysql-connector-python 8.1.0
- **数据库**：MySQL 5.7 / 8.0
- **前端**：原生 HTML + CSS + JavaScript，暗色主题，全部本地资源，无 CDN 依赖，可完全离线运行
- **AI**：任意兼容 OpenAI Chat Completions 协议的服务（通义千问、DeepSeek 等）
- **鉴权**：Flask Session + 基于角色的权限控制（`admin` / `staff`）

## 快速开始

### 1. 准备环境

- Python 3.8+，MySQL 5.7/8.0 已启动
- 克隆仓库：

```bash
git clone https://github.com/wujiuyi55-sketch/restaurant-management-system.git
cd restaurant-management-system
```

### 2. 安装依赖

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. 配置数据库与 AI 接口

复制配置模板并按自己的环境修改：

```bash
# Windows
copy backend\config.example.py backend\config.py
# macOS / Linux
cp backend/config.example.py backend/config.py
```

编辑 `backend/config.py`：

```python
DB_CONFIG = {
    'host': '127.0.0.1',
    'user': 'root',
    'password': 'your-password',   # 你自己的 MySQL 密码
    'port': 3306,
    'database': 'bishe',
}

LLM_CONFIG = {
    'api_key': 'sk-your-api-key',
    'api_url': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    'model': 'qwen-plus',
}
```

> `backend/config.py` 已被 `.gitignore` 忽略，真实密码与密钥不会被提交。请勿把它改回仓库。

### 4. 启动

```bash
# 方式一：一键启动（自动进入 backend 目录）
python start.py

# 方式二：直接启动后端
cd backend
python app.py

# 方式三：PowerShell 脚本（自动释放 5000 端口）
.\start.ps1
```

首次启动会自动建库、建表并写入演示数据（菜品、库存、采购记录、账号等），无需手动导入 SQL。

浏览器打开 <http://127.0.0.1:5000>。

### 默认账号

| 角色 | 用户名 | 密码 | 权限 |
| --- | --- | --- | --- |
| 管理员 | `admin` | `123456` | 全部功能 |
| 普通员工 | `staff` | `123456` | 部分只读功能 |

> 首次登录后请在「用户管理」或「个人中心 → 修改密码」中更换默认密码。

### 可选环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `FLASK_SECRET_KEY` | 开发用占位值 | Session 签名密钥，生产环境务必设置 |
| `APP_HOST` | `127.0.0.1` | 监听地址，需局域网访问时设为 `0.0.0.0` |
| `APP_PORT` | `5000` | 监听端口 |
| `FLASK_DEBUG` | `1` | 设为 `0` 关闭调试模式 |

## 目录结构

```
restaurant-management-system/
├── backend/
│   ├── app.py                  # 后端主程序：路由、业务逻辑、建表与种子数据
│   ├── config.example.py       # 配置模板（复制为 config.py 后修改）
│   ├── db.py                   # 数据库连接工具
│   └── init_*.py / setup_db.py # 数据库初始化辅助脚本
├── frontend/
│   ├── index.html              # 入口页
│   ├── templates/              # 页面模板（dashboard / dishes / orders / ...）
│   ├── css/style.css           # 全局样式（暗色主题）
│   └── js/                     # 各页面对应的脚本
├── create_tables.sql           # 早期建表脚本（4 张表）
├── insert_data.sql             # 早期示例数据
├── check_db.sql                # 数据库检查语句
├── requirements.txt
├── start.py                    # 一键启动入口（推荐）
├── start.ps1 / run.ps1         # PowerShell 启动脚本（自动释放端口）
└── README.md
```

## 接口概览

所有业务接口以 `/api/<资源>` 命名，除登录相关外均需登录（未登录返回 `401`）：

```
/api/login  /api/logout  /api/check-auth  /api/change-password
/api/dishes  /api/dishes/<id>  /api/dishes/<id>/ingredients
/api/orders  /api/orders/<id>  /api/orders/<id>/confirm
/api/inventory  /api/inventory/<id>  /api/inventory/names
/api/vegetables  /api/meats  /api/fruits     （采购模块）
/api/sales  /api/monthly_sales
/api/customers  /api/employees  /api/users
/api/analysis  /api/chat  /api/chat/records
/api/public/dishes                          （点餐商城公开接口）
```

前端所有 `fetch` 请求需携带 `credentials: 'include'`，否则 Session 不会随请求发送。

## 常见问题

<details>
<summary><b>启动报错 Can't connect to MySQL server</b></summary>

MySQL 未启动，或 `backend/config.py` 中的 host / port / user / password 有误。

```powershell
Get-Service | Where-Object { $_.Name -like "*mysql*" }
net start MySQL57
```
</details>

<details>
<summary><b>页面提示 401 未登录</b></summary>

登录状态基于 Flask Session，请先访问 `/login` 登录；浏览器禁用 Cookie 也会导致 401。
</details>

<details>
<summary><b>端口 5000 被占用</b></summary>

`start.ps1` 已内置自动释放端口逻辑，也可手动结束占用进程：

```powershell
Get-NetTCPConnection -LocalPort 5000 | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force
}
```
</details>

<details>
<summary><b>AI 分析 / AI 对话报错</b></summary>

检查 `api_key` 是否有效、`api_url` 与 `model` 是否成对匹配、机器能否访问外网。未配置密钥时，其余业务功能不受影响，仅「智能分析」和「AI 对话」两页会提示 AI 服务调用失败。
</details>

<details>
<summary><b>订单确认提示「库存不足」</b></summary>

订单确认会按菜品配方扣减库存，请先在「蔬菜/肉类/水果采购」或「库存管理」补充对应食材，或在「菜品管理 → 配方」中调整每份用量。
</details>

## 安全说明

- 仓库不包含任何真实数据库密码或 API 密钥，配置文件 `backend/config.py` 已被忽略。
- 默认账号密码仅用于本地演示，部署到公网前请务必修改，并设置 `FLASK_SECRET_KEY`。
- 项目定位为课程设计 / 毕业设计级别演示系统：密码以明文存储、默认开启调试模式，**不建议直接用于生产环境**。

## 许可证

本项目基于 [MIT License](LICENSE) 开源。

## 致谢

- [Flask](https://flask.palletsprojects.com/)
- [MySQL Connector/Python](https://dev.mysql.com/doc/connector-python/en/)
- [阿里云百炼 / 通义千问](https://help.aliyun.com/zh/model-studio/)

-- 饭店后台管理系统数据库初始化脚本
-- 数据库: bishe

-- 创建数据库
CREATE DATABASE IF NOT EXISTS bishe CHARACTER SET utf8;
USE bishe;

-- =============================================
-- 创建表: dishes - 菜品表
-- =============================================
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
);

-- =============================================
-- 创建表: sales - 销售记录表
-- =============================================
CREATE TABLE IF NOT EXISTS sales (
    id INT PRIMARY KEY AUTO_INCREMENT,
    dish_id INT,
    quantity INT NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    sale_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dish_id) REFERENCES dishes(id)
);

-- =============================================
-- 创建表: monthly_sales - 月度销售表
-- =============================================
CREATE TABLE IF NOT EXISTS monthly_sales (
    id INT PRIMARY KEY AUTO_INCREMENT,
    month VARCHAR(7) NOT NULL UNIQUE,
    total_amount DECIMAL(12,2) NOT NULL,
    order_count INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL
);

-- =============================================
-- 创建表: customers - 客户表
-- =============================================
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
);

-- 显示创建的表
SHOW TABLES;

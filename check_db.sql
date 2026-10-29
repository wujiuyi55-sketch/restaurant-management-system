USE bishe;
SHOW TABLES;

DESCRIBE dishes;
DESCRIBE sales;
DESCRIBE monthly_sales;
DESCRIBE customers;

SELECT * FROM dishes LIMIT 5;
SELECT COUNT(*) as dish_count FROM dishes;
SELECT COUNT(*) as sale_count FROM sales;
SELECT COUNT(*) as customer_count FROM customers;

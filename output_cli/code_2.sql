-- 基础查询
SELECT * FROM table_name WHERE condition;

-- 排序查询
SELECT * FROM users ORDER BY name ASC;

-- 聚合查询
SELECT COUNT(*), AVG(age) FROM users;

-- 连接查询
SELECT u.name, o.order_date 
FROM users u 
JOIN orders o ON u.id = o.user_id;
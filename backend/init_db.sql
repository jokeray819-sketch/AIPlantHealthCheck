CREATE DATABASE IF NOT EXISTS plant_health_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE plant_health_db;

-- 用户表会由 SQLAlchemy 自动创建，但这里提供 SQL 示例供参考
-- CREATE TABLE IF NOT EXISTS users (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     username VARCHAR(50) NOT NULL UNIQUE,
--     email VARCHAR(100) NOT NULL UNIQUE,
--     hashed_password VARCHAR(255) NOT NULL,
--     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
--     updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
--     INDEX idx_username (username),
--     INDEX idx_email (email)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 会员表会由 SQLAlchemy 自动创建，但这里提供 SQL 示例供参考
-- CREATE TABLE IF NOT EXISTS memberships (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     user_id INT NOT NULL UNIQUE,
--     is_vip BOOLEAN DEFAULT FALSE NOT NULL,
--     monthly_detections INT DEFAULT 0 NOT NULL,
--     last_reset_date DATE DEFAULT CURRENT_DATE,
--     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
--     updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
--     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
--     INDEX idx_user_id (user_id)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

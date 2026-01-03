-- Migration to add shopping cart and order functionality (MySQL version)

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price VARCHAR(20) NOT NULL,
    category VARCHAR(50),
    tag VARCHAR(50),
    icon_class VARCHAR(50),
    bg_gradient VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    total_amount VARCHAR(20) NOT NULL,
    payment_method VARCHAR(20),
    transaction_hash VARCHAR(200),
    wallet_address VARCHAR(200),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    price VARCHAR(20) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders (id),
    FOREIGN KEY (product_id) REFERENCES products (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert initial product data
INSERT INTO products (name, description, price, category, tag, icon_class, bg_gradient) VALUES
('植物营养液', '全面补充植物所需营养，促进生长，改善缺肥症状', '¥29.9', '肥料', '适用: 缺肥', 'fa-leaf', 'from-green-400 to-green-600'),
('杀虫剂', '高效杀灭常见植物害虫，安全环保，快速见效', '¥39.9', '杀虫剂', '适用: 虫害', 'fa-bug', 'from-yellow-400 to-orange-500'),
('有机营养土', '富含有机质，透气排水，适合各类盆栽植物', '¥49.9', '土壤改良', '土壤改良', 'fa-tint', 'from-blue-400 to-purple-500'),
('植物修复剂', '专业治疗植物病害，修复受损叶片，增强抗性', '¥35.9', '病害治疗', '病害治疗', 'fa-medkit', 'from-red-400 to-pink-500'),
('园艺剪刀', '锋利耐用的专业园艺剪刀，适合修剪枝叶', '¥25.9', '工具', '园艺工具', 'fa-cut', 'from-gray-400 to-gray-600'),
('浇水壶', '人体工学设计，容量适中，浇水均匀', '¥18.9', '工具', '园艺工具', 'fa-shower', 'from-cyan-400 to-blue-500');

-- ============================================
-- RESTAURANT STOCK MANAGEMENT SYSTEM - SCHEMA
-- Database: local_grill_restaurant_stock_management
-- ============================================

-- ============================================
-- 1. USERS & AUTHENTICATION
-- ============================================

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role ENUM('ADMIN', 'STOCK_MANAGER', 'KITCHEN_STAFF', 'CASHIER') NOT NULL DEFAULT 'KITCHEN_STAFF',
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Roles
CREATE TABLE Role (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

-- Admin Users
CREATE TABLE AdminUser (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  roleId INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (roleId) REFERENCES Role(id)
);

-- Sessions
CREATE TABLE Session (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT,
  sessionToken VARCHAR(255) NOT NULL UNIQUE,
  expiresAt TIMESTAMP NOT NULL,
  FOREIGN KEY (userId) REFERENCES AdminUser(id)
);

-- OTP Codes
CREATE TABLE OtpCode (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT,
  codeHash VARCHAR(255) NOT NULL,
  expiresAt TIMESTAMP NOT NULL,
  FOREIGN KEY (userId) REFERENCES AdminUser(id)
);

-- Insert role
INSERT INTO Role (name) VALUES ('ADMIN');

-- Insert admin user
INSERT INTO AdminUser (email, password, roleId) VALUES
('tindanofernandamed@gmail.com', '$2b$12$9s2KW1bkZ7YOrHHk5MwS.uCZ1RnjMacewfUhztDOvB3mJxGyF/uP2', 1);

-- ============================================
-- 2. SUPPLIERS / FOURNISSEURS
-- ============================================

CREATE TABLE suppliers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL UNIQUE,
  contact_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_name (name),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. PRODUCT CATEGORIES
-- ============================================

CREATE TABLE categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_name (name),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. UNITS OF MEASUREMENT
-- ============================================

CREATE TABLE units (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL UNIQUE,
  abbreviation VARCHAR(10) NOT NULL UNIQUE,
  description TEXT,
  
  INDEX idx_name (name),
  INDEX idx_abbreviation (abbreviation)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. PRODUCTS
-- ============================================

CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  category_id INT NOT NULL,
  unit_id INT NOT NULL,
  supplier_id INT,
  sku VARCHAR(100) UNIQUE,
  description TEXT,
  minimum_stock DECIMAL(10,2) NOT NULL DEFAULT 10,
  is_perishable BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE RESTRICT,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  
  INDEX idx_name (name),
  INDEX idx_category_id (category_id),
  INDEX idx_supplier_id (supplier_id),
  INDEX idx_is_perishable (is_perishable),
  INDEX idx_is_active (is_active),
  INDEX idx_sku (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 6. STOCK BATCHES (FIFO - KEY TABLE)
-- ============================================

CREATE TABLE stock_batches (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  batch_number VARCHAR(100) NOT NULL,
  quantity_initial DECIMAL(10,2) NOT NULL,
  quantity_remaining DECIMAL(10,2) NOT NULL,
  purchase_price DECIMAL(10,2) NOT NULL,
  entry_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expiration_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  
  INDEX idx_product_id (product_id),
  INDEX idx_batch_number (batch_number),
  INDEX idx_entry_date (entry_date),
  INDEX idx_expiration_date (expiration_date),
  INDEX idx_quantity_remaining (quantity_remaining),
  UNIQUE KEY unique_batch (product_id, batch_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 7. STOCK MOVEMENTS (AUDIT TRAIL)
-- ============================================

CREATE TABLE stock_movements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  batch_id INT,
  type ENUM('IN', 'OUT', 'LOSS', 'EXPIRED', 'ADJUSTMENT') NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  reason VARCHAR(255),
  reference_number VARCHAR(100),
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id) REFERENCES stock_batches(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  
  INDEX idx_product_id (product_id),
  INDEX idx_batch_id (batch_id),
  INDEX idx_type (type),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_reference (reference_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 8. CURRENT INVENTORY (CACHE/SUMMARY)
-- ============================================

CREATE TABLE inventory_snapshots (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL UNIQUE,
  theoretical_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  real_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  difference DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  verified_at TIMESTAMP NULL,
  verified_by INT,
  
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_product_id (product_id),
  INDEX idx_difference (difference),
  INDEX idx_last_updated_at (last_updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 9. INVENTORY COUNTS (PHYSICAL VERIFICATION)
-- ============================================

CREATE TABLE inventory_counts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  theoretical_quantity DECIMAL(10,2) NOT NULL,
  real_quantity DECIMAL(10,2) NOT NULL,
  difference DECIMAL(10,2) NOT NULL,
  user_id INT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  
  INDEX idx_product_id (product_id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 10. ALERTS & NOTIFICATIONS
-- ============================================

CREATE TABLE alerts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  type ENUM('LOW_STOCK', 'EXPIRED', 'EXPIRING_SOON', 'RUPTURE', 'EXCESS') NOT NULL,
  product_id INT NOT NULL,
  severity ENUM('INFO', 'WARNING', 'CRITICAL') NOT NULL DEFAULT 'WARNING',
  message TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  
  INDEX idx_product_id (product_id),
  INDEX idx_type (type),
  INDEX idx_severity (severity),
  INDEX idx_is_resolved (is_resolved),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 11. DAILY CONSUMPTION DECLARATIONS
-- ============================================

CREATE TABLE daily_consumption (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  quantity_consumed DECIMAL(10,2) NOT NULL,
  user_id INT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  
  INDEX idx_product_id (product_id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 12. ACTIVITY LOGS (AUDIT TRAIL)
-- ============================================

CREATE TABLE activity_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INT,
  changes JSON,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  
  INDEX idx_user_id (user_id),
  INDEX idx_entity_type (entity_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 13. SYSTEM SETTINGS
-- ============================================

CREATE TABLE system_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

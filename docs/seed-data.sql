-- Sélectionner la base
USE local_grill_restaurant_stock_management;


-- ============================================
-- RESET DATABASE (SAFE ORDER)
-- ============================================

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM daily_consumption;
ALTER TABLE daily_consumption AUTO_INCREMENT = 1;

DELETE FROM alerts;
ALTER TABLE alerts AUTO_INCREMENT = 1;

DELETE FROM activity_logs;
ALTER TABLE activity_logs AUTO_INCREMENT = 1;

DELETE FROM inventory_counts;
ALTER TABLE inventory_counts AUTO_INCREMENT = 1;

DELETE FROM inventory_snapshots;
ALTER TABLE inventory_snapshots AUTO_INCREMENT = 1;

DELETE FROM stock_movements;
ALTER TABLE stock_movements AUTO_INCREMENT = 1;

DELETE FROM stock_batches;
ALTER TABLE stock_batches AUTO_INCREMENT = 1;

DELETE FROM products;
ALTER TABLE products AUTO_INCREMENT = 1;

DELETE FROM suppliers;
ALTER TABLE suppliers AUTO_INCREMENT = 1;

DELETE FROM users;
ALTER TABLE users AUTO_INCREMENT = 1;


DELETE FROM units;
ALTER TABLE units AUTO_INCREMENT = 1;

DELETE FROM categories;
ALTER TABLE categories AUTO_INCREMENT = 1;

DELETE FROM system_settings;
ALTER TABLE system_settings AUTO_INCREMENT = 1;

SET FOREIGN_KEY_CHECKS = 1;


-- ============================================
-- USERS
-- ============================================

USE local_grill_restaurant_stock_management;

INSERT INTO users (email, password_hash, full_name, role, is_active, updated_at, created_at)
VALUES
('tindanofernandamed@gmail.com',
'26444f5171485147f0bb0e19af1ae070$74c6e9dc00f80ef1366006947b89628109be4a7a63368f4d9a6557b6588159991434593a1560f9ed5917d1b21e04dfd3fd666fb64f89870186ca7f33eda47aa8',
'Admin User', 'ADMIN', TRUE, NOW(), NOW()),

('admin@localgrill-bf.com',
'96fdcc1c66e4d56ebcc0e8ea34b8f9ad$cb49b0f4750f2e309e4be8b6424c649c50bfdb47370743d0058740d540f4537e9ed1214240e476046f0155ed6bdcb70c54ca7aa9e7c60b0f652a0c80ba5e4df1',
'Admin User', 'ADMIN', TRUE, NOW(), NOW()),

('manager@localgrill-bf.com',
'4558a639b819731f72d4b1e3ffd3e027$28ffcc6e0b30fdcecce032369262c63c2eecd29935560f63380b5431a62e677669f3d8e9877a03b8b6eb0dec8a51378dfe08dab51da35bd9b3c8a9fe88d64924',
'Manager Stock', 'STOCK_MANAGER', TRUE, NOW(), NOW()),

('cuisine@localgrill-bf.com',
'4558a639b819731f72d4b1e3ffd3e027$28ffcc6e0b30fdcecce032369262c63c2eecd29935560f63380b5431a62e677669f3d8e9877a03b8b6eb0dec8a51378dfe08dab51da35bd9b3c8a9fe88d64924',
'Chef Cuisine', 'KITCHEN_STAFF', TRUE, NOW(), NOW()),

('caissier@localgrill-bf.com',
'4558a639b819731f72d4b1e3ffd3e027$28ffcc6e0b30fdcecce032369262c63c2eecd29935560f63380b5431a62e677669f3d8e9877a03b8b6eb0dec8a51378dfe08dab51da35bd9b3c8a9fe88d64924',
'Caissier', 'CASHIER', TRUE, NOW(), NOW());

-- ============================================
-- UNITS (Unités de mesure)
-- ============================================

INSERT INTO units (name, abbreviation, description) VALUES
('Kilogramme', 'kg', 'Unité de poids utilisée pour les produits solides en grande quantité'),
('Gramme', 'g', 'Sous-unité du kilogramme, utilisée pour les petites quantités'),
('Litre', 'L', 'Unité de volume utilisée pour les liquides'),
('Millilitre', 'ml', 'Sous-unité du litre, pour petites quantités liquides'),
('Pièce', 'pc', 'Unité individuelle pour produits vendus à l''unité'),
('Boîte', 'box', 'Conditionnement regroupant plusieurs unités'),
('Douzaine', 'dz', 'Lot de 12 unités (ex: œufs, pains, etc.)');

-- ============================================
-- CATEGORIES (Catégories produits)
-- ============================================

INSERT INTO categories (name, description) VALUES
('Viandes & Volailles', 'Produits carnés : bœuf, poulet, agneau, etc.'),
('Fruits & Légumes', 'Produits frais végétaux utilisés en cuisine'),
('Produits Laitiers', 'Lait, fromage, beurre, yaourt et dérivés'),
('Épices & Condiments', 'Sel, poivre, sauces, huiles et assaisonnements'),
('Produits Surgelés', 'Aliments conservés à basse température'),
('Boissons', 'Eau, jus, sodas et autres boissons'),
('Boulangerie & Pâtisserie', 'Pain, farine, viennoiseries et dérivés');

-- ============================================
-- SYSTEM SETTINGS (Paramètres système)
-- ============================================

INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('expiry_alert_days', '3', 'Nombre de jours avant expiration pour déclencher une alerte'),
('minimum_stock_threshold', '10', 'Seuil minimum global avant alerte de stock faible'),
('maximum_stock_threshold', '500', 'Seuil maximum recommandé pour éviter le surstockage'),
('low_stock_severity', 'WARNING', 'Niveau d''alerte par défaut pour stock faible'),
('critical_expiry_severity', 'CRITICAL', 'Niveau d''alerte pour produits expirés');


-- ============================================
-- SUPPLIERS
-- ============================================

INSERT INTO suppliers (name, contact_name, email, phone, city)
VALUES
('Fournisseur Viande Premium', 'Jean Dupont', 'contact@viande.sn', '+221771234567', 'Dakar'),
('Fruits & Légumes Frais', 'Marie Ndiaye', 'info@fruits.sn', '+221772345678', 'Dakar'),
('Produits Laitiers', 'Moussa Ba', 'sales@laiterie.sn', '+221773456789', 'Thiès'),
('Épices & Condiments', 'Aminata Sy', 'epices@condiments.sn', '+221774567890', 'Kaolack');

-- ============================================
-- PRODUCTS
-- ============================================

INSERT INTO products 
(name, category_id, unit_id, supplier_id, sku, description, minimum_stock, is_perishable)
VALUES
('Poulet entier frais', 1, 1, 1, 'MEAT-001', 'Poulet fermier frais', 10, TRUE),
('Carottes', 2, 1, 2, 'VEG-001', 'Carottes fraîches', 10, TRUE),
('Tomates', 2, 1, 2, 'VEG-002', 'Tomates fraîches', 10, TRUE),
('Lait frais', 3, 2, 3, 'DAIRY-001', 'Lait pasteurisé 1L', 20, TRUE),
('Ail frais', 4, 1, 4, 'SPICE-001', 'Ail frais', 5, TRUE);

-- ============================================
-- STOCK BATCHES
-- ============================================

INSERT INTO stock_batches
(product_id, batch_number, quantity_initial, quantity_remaining, purchase_price, entry_date, expiration_date)
VALUES
(1, 'POULET-B1', 50, 50, 3500, NOW(), DATE_ADD(NOW(), INTERVAL 3 DAY)),
(2, 'CAR-B1', 100, 100, 500, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY)),
(3, 'TOM-B1', 60, 60, 1000, NOW(), DATE_ADD(NOW(), INTERVAL 5 DAY)),
(4, 'LAIT-B1', 80, 80, 800, NOW(), DATE_ADD(NOW(), INTERVAL 4 DAY)),
(5, 'AIL-B1', 30, 30, 2000, NOW(), DATE_ADD(NOW(), INTERVAL 10 DAY));

-- ============================================
-- STOCK MOVEMENTS
-- ============================================

INSERT INTO stock_movements
(product_id, batch_id, type, quantity, reason, reference_number, user_id)
VALUES
(1, 1, 'OUT', 5, 'Cuisine midi', 'CONS-001', 3),
(2, 2, 'OUT', 10, 'Salade jour', 'CONS-002', 3),
(3, 3, 'OUT', 5, 'Sauce tomate', 'CONS-003', 3);

-- ============================================
-- INVENTORY SNAPSHOT
-- ============================================

INSERT INTO inventory_snapshots
(product_id, theoretical_quantity, real_quantity, difference, total_value, verified_by)
VALUES
(1, 45, 45, 0, 157500, 2),
(2, 90, 90, 0, 45000, 2),
(3, 55, 55, 0, 55000, 2),
(4, 80, 80, 0, 64000, 2),
(5, 30, 30, 0, 60000, 2);

-- ============================================
-- ALERTS
-- ============================================

INSERT INTO alerts (type, product_id, severity, message)
VALUES
('LOW_STOCK', 1, 'WARNING', 'Stock poulet proche du minimum'),
('EXPIRING_SOON', 4, 'WARNING', 'Lait expire bientôt'),
('EXPIRED', 3, 'CRITICAL', 'Tomates expirées');

-- ============================================
-- DAILY CONSUMPTION
-- ============================================

INSERT INTO daily_consumption
(product_id, quantity_consumed, user_id, notes)
VALUES
(1, 5, 3, 'Service midi'),
(2, 10, 3, 'Salades'),
(3, 5, 3, 'Sauce');

-- ============================================
-- ACTIVITY LOGS
-- ============================================

INSERT INTO activity_logs
(user_id, action, entity_type, entity_id, changes, ip_address)
VALUES
(1, 'CREATE_PRODUCT', 'products', 1, JSON_OBJECT('name','Poulet entier frais'), '127.0.0.1'),
(2, 'STOCK_OUT', 'stock_movements', 1, JSON_OBJECT('quantity',5), '127.0.0.1');

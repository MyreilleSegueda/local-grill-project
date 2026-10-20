-- ============================================
-- SCRIPT SQL D'IMPORTATION - MATÉRIELS (Suite)
-- ============================================

-- ============================================
-- MATÉRIELS - Produits d'entretien (suite)
-- ============================================
INSERT INTO `materiels` (`name`, `category_id`, `reference`, `description`, `quantity`, `minimum_stock`, `unit`, `location`, `purchase_price`, `purchase_date`, `supplier`, `is_active`, `created_at`, `updated_at`) VALUES
('Savon chanvre', 3, 'SAV-CHA', 'Savon au chanvre', 0.000000000000000000000000000000, 5.000000000000000000000000000000, 'Unité', 'Toilettes', NULL, NULL, NULL, 1, NOW(), NOW()),
('Savon pomme', 3, 'SAV-POM', 'Savon pomme', 0.000000000000000000000000000000, 5.000000000000000000000000000000, 'Unité', 'Toilettes', NULL, NULL, NULL, 1, NOW(), NOW()),
('Eau de vie', 3, 'EAU-VIE', 'Eau de vie (désinfection)', 0.000000000000000000000000000000, 2.000000000000000000000000000000, 'Bouteille', 'Réserve', NULL, NULL, NULL, 1, NOW(), NOW()),
('Diffuseur', 3, 'DIF-001', 'Diffuseur parfum', 0.000000000000000000000000000000, 3.000000000000000000000000000000, 'Unité', 'Salle', NULL, NULL, NULL, 1, NOW(), NOW());

-- ============================================
-- MATÉRIELS - Combustibles
-- ============================================
INSERT INTO `materiels` (`name`, `category_id`, `reference`, `description`, `quantity`, `minimum_stock`, `unit`, `location`, `purchase_price`, `purchase_date`, `supplier`, `is_active`, `created_at`, `updated_at`) VALUES
('Charbon', 5, 'CHA-001', 'Charbon de bois', 0.000000000000000000000000000000, 50.000000000000000000000000000000, 'Kg', 'Extérieur', NULL, NULL, NULL, 1, NOW(), NOW()),
('Gaz', 5, 'GAZ-001', 'Recharges gaz', 0.000000000000000000000000000000, 5.000000000000000000000000000000, 'Bouteille', 'Réserve', NULL, NULL, NULL, 1, NOW(), NOW());

-- ============================================
-- MATÉRIELS - Vaisselle/Contenants
-- ============================================
INSERT INTO `materiels` (`name`, `category_id`, `reference`, `description`, `quantity`, `minimum_stock`, `unit`, `location`, `purchase_price`, `purchase_date`, `supplier`, `is_active`, `created_at`, `updated_at`) VALUES
('Gobilet', 4, 'GOB-001', 'Gobelets', 0.000000000000000000000000000000, 100.000000000000000000000000000000, 'Paquet', 'Stock', NULL, NULL, NULL, 1, NOW(), NOW()),
('Caisse', 2, 'CAI-001', 'Caisse de rangement', 0.000000000000000000000000000000, 10.000000000000000000000000000000, 'Unité', 'Stock', NULL, NULL, NULL, 1, NOW(), NOW());

-- ============================================
-- RÉSUMÉ MATÉRIELS (Ajout)
-- ============================================
-- Total: 8 nouveaux matériels
--   - Entretien: 4
--   - Combustibles: 2
--   - Vaisselle: 2
-- ============================================

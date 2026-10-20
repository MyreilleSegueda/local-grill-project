-- ============================================
-- SCRIPT SQL COMPLET - LISTE FINALE (38 items)
-- Classé: Matériels vs Produits
-- ============================================

-- ============================================
-- PARTIE 1: MATÉRIELS (27 items)
-- ============================================
-- Catégories: 1=Papeterie, 2=Emballages, 3=Entretien, 4=Ustensiles

-- Papeterie (4 items)
INSERT INTO `materiels` (`name`, `category_id`, `reference`, `description`, `quantity`, `minimum_stock`, `unit`, `location`, `purchase_price`, `purchase_date`, `supplier`, `is_active`, `created_at`, `updated_at`) VALUES
('Lotus OK', 1, 'LOT-OK', 'Papier toilette Lotus OK', 0, 5, 'Paquet', 'Toilettes', NULL, NULL, NULL, 1, NOW(), NOW()),
('Lotus toilet', 1, 'LOT-TOI', 'Papier toilette Lotus toilet', 0, 5, 'Paquet', 'Toilettes', NULL, NULL, NULL, 1, NOW(), NOW()),
('Lotus style', 1, 'LOT-STY', 'Essuie-tout Lotus style', 0, 5, 'Paquet', 'Cuisine', NULL, NULL, NULL, 1, NOW(), NOW()),
('Essuie tout', 1, 'ESS-TOT', 'Essuie-tout cuisine', 0, 5, 'Rouleau', 'Cuisine', NULL, NULL, NULL, 1, NOW(), NOW());

-- Emballages (14 items)
INSERT INTO `materiels` (`name`, `category_id`, `reference`, `description`, `quantity`, `minimum_stock`, `unit`, `location`, `purchase_price`, `purchase_date`, `supplier`, `is_active`, `created_at`, `updated_at`) VALUES
('Bols salad jet', 2, 'BOL-SAL', 'Bols à salade jetables', 0, 50, 'Paquet', 'Stock', NULL, NULL, NULL, 1, NOW(), NOW()),
('Bols garni jet', 2, 'BOL-GAR', 'Bols garnis jetables', 0, 50, 'Paquet', 'Stock', NULL, NULL, NULL, 1, NOW(), NOW()),
('Bols soup jet', 2, 'BOL-SOU', 'Bols à soupe jetables', 0, 50, 'Paquet', 'Stock', NULL, NULL, NULL, 1, NOW(), NOW()),
('Beignets Cre', 2, 'BEI-CRE', 'Emballages beignets', 0, 50, 'Paquet', 'Stock', NULL, NULL, NULL, 1, NOW(), NOW()),
('Kits ovals', 2, 'KIT-OVA', 'Kits emballages ovales', 0, 30, 'Carton', 'Stock', NULL, NULL, NULL, 1, NOW(), NOW()),
('Sachets ali 1', 2, 'SAC-ALI1', 'Sachets aluminium taille 1', 0, 100, 'Paquet', 'Stock', NULL, NULL, NULL, 1, NOW(), NOW()),
('Sachets ali 2', 2, 'SAC-ALI2', 'Sachets aluminium taille 2', 0, 100, 'Paquet', 'Stock', NULL, NULL, NULL, 1, NOW(), NOW()),
('Sach al poiss', 2, 'SAC-POI', 'Sachets aluminium poisson', 0, 50, 'Paquet', 'Stock', NULL, NULL, NULL, 1, NOW(), NOW()),
('Papier alu', 2, 'PAP-ALU', 'Papier aluminium', 0, 10, 'Rouleau', 'Cuisine', NULL, NULL, NULL, 1, NOW(), NOW()),
('Sac pommes', 2, 'SAC-POM', 'Sacs pour pommes', 0, 100, 'Paquet', 'Stock', NULL, NULL, NULL, 1, NOW(), NOW()),
('Sac oignons', 2, 'SAC-OIG', 'Sacs pour oignons', 0, 100, 'Paquet', 'Stock', NULL, NULL, NULL, 1, NOW(), NOW()),
('Bols vinaigre', 2, 'BOL-VIN', 'Petits bols vinaigre', 0, 50, 'Paquet', 'Stock', NULL, NULL, NULL, 1, NOW(), NOW()),
('Bols piments', 2, 'BOL-PIM', 'Petits bols piments', 0, 50, 'Paquet', 'Stock', NULL, NULL, NULL, 1, NOW(), NOW()),
('Paquet attach', 2, 'PAC-ATT', 'Paquets attaches', 0, 20, 'Boîte', 'Stock', NULL, NULL, NULL, 1, NOW(), NOW());

-- Entretien (9 items)
INSERT INTO `materiels` (`name`, `category_id`, `reference`, `description`, `quantity`, `minimum_stock`, `unit`, `location`, `purchase_price`, `purchase_date`, `supplier`, `is_active`, `created_at`, `updated_at`) VALUES
('D tergent', 3, 'DET-TER', 'Détergent vaisselle', 0, 5, 'Bidon', 'Réserve', NULL, NULL, NULL, 1, NOW(), NOW()),
('Insecticides G', 3, 'INS-GRA', 'Insecticide grand format', 0, 3, 'Aérosol', 'Réserve', NULL, NULL, NULL, 1, NOW(), NOW()),
('Insecticide P', 3, 'INS-PET', 'Insecticide petit format', 0, 3, 'Aérosol', 'Réserve', NULL, NULL, NULL, 1, NOW(), NOW()),
('Savon 250g', 3, 'SAV-250', 'Savon solide 250g', 0, 10, 'Unité', 'Toilettes', NULL, NULL, NULL, 1, NOW(), NOW()),
('Savon liquide mains', 3, 'SAV-LIQ', 'Savon liquide pour les mains', 0, 5, 'Bidon', 'Toilettes', NULL, NULL, NULL, 1, NOW(), NOW()),
('Eponges', 3, 'EPO-MEN', 'Eponges ménagères', 0, 10, 'Paquet', 'Cuisine', NULL, NULL, NULL, 1, NOW(), NOW()),
('Serppill res', 3, 'SERPILL', 'Serpillères', 0, 5, 'Unité', 'Réserve', NULL, NULL, NULL, 1, NOW(), NOW()),
('Atti k', 3, 'ATTIK', 'Attik (produit ménager)', 0, 5, 'Bidon', 'Réserve', NULL, NULL, NULL, 1, NOW(), NOW()),
('Bidon d huile 20 l', 3, 'BID-HUI', 'Bidon huile vide 20L', 0, 5, 'Bidon', 'Réserve', NULL, NULL, NULL, 1, NOW(), NOW());

-- Ustensiles jetables (2 items)
INSERT INTO `materiels` (`name`, `category_id`, `reference`, `description`, `quantity`, `minimum_stock`, `unit`, `location`, `purchase_price`, `purchase_date`, `supplier`, `is_active`, `created_at`, `updated_at`) VALUES
('Cuiell re jet', 4, 'CUI-JET', 'Cuillères jetables', 0, 100, 'Paquet', 'Stock', NULL, NULL, NULL, 1, NOW(), NOW()),
('Fourchet jet', 4, 'FOU-JET', 'Fourchettes jetables', 0, 100, 'Paquet', 'Stock', NULL, NULL, NULL, 1, NOW(), NOW());

-- ============================================
-- PARTIE 2: PRODUITS ALIMENTAIRES (11 items)
-- ============================================
-- Catégories: 5=Épices/Condiments, 2=Légumes
-- Unité: Kg (ID=1)

INSERT INTO `products` (`id`, `name`, `category_id`, `unit_id`, `supplier_id`, `sku`, `description`, `minimum_stock`, `is_perishable`, `is_active`, `created_at`, `updated_at`) VALUES
(107, 'KETCHUP', 5, 1, NULL, NULL, NULL, 5.00, 0, 1, NOW(), NOW()),
(108, 'TOMATE PATE', 5, 1, NULL, NULL, NULL, 5.00, 0, 1, NOW(), NOW()),
(109, 'OLIVES VERTES', 5, 1, NULL, NULL, NULL, 5.00, 1, 1, NOW(), NOW()),
(110, 'MOUTARDE', 5, 1, NULL, NULL, NULL, 5.00, 0, 1, NOW(), NOW()),
(111, 'MAYONNAISE', 5, 1, NULL, NULL, NULL, 5.00, 1, 1, NOW(), NOW()),
(112, 'MAGGI', 5, 1, NULL, NULL, NULL, 10.00, 0, 1, NOW(), NOW()),
(113, 'VINAIGRE', 5, 1, NULL, NULL, NULL, 5.00, 0, 1, NOW(), NOW()),
(114, 'MIEL', 5, 1, NULL, NULL, NULL, 3.00, 0, 1, NOW(), NOW()),
(115, 'BADIA', 5, 1, NULL, NULL, NULL, 5.00, 0, 1, NOW(), NOW()),
(116, 'ECHALOTTES', 2, 1, NULL, NULL, NULL, 5.00, 1, 1, NOW(), NOW()),
(117, 'AIL', 2, 1, NULL, NULL, NULL, 5.00, 1, 1, NOW(), NOW());

-- Snapshots produits alimentaires
INSERT INTO `inventory_snapshots` (`product_id`, `theoretical_quantity`, `real_quantity`, `difference`, `total_value`, `last_updated_at`, `verified_at`, `verified_by`) VALUES
(107, 0, 0, 0, 0, NOW(), NULL, NULL),
(108, 0, 0, 0, 0, NOW(), NULL, NULL),
(109, 0, 0, 0, 0, NOW(), NULL, NULL),
(110, 0, 0, 0, 0, NOW(), NULL, NULL),
(111, 0, 0, 0, 0, NOW(), NULL, NULL),
(112, 0, 0, 0, 0, NOW(), NULL, NULL),
(113, 0, 0, 0, 0, NOW(), NULL, NULL),
(114, 0, 0, 0, 0, NOW(), NULL, NULL),
(115, 0, 0, 0, 0, NOW(), NULL, NULL),
(116, 0, 0, 0, 0, NOW(), NULL, NULL),
(117, 0, 0, 0, 0, NOW(), NULL, NULL);

-- ============================================
-- RÉSUMÉ FINAL
-- ============================================
-- Matériels: 27
--   - Papeterie: 4
--   - Emballages: 14
--   - Entretien: 9
--   - Ustensiles: 2
-- Produits alimentaires: 11
--   - Épices/Condiments: 9
--   - Légumes: 2
-- Total: 38 items
-- ============================================

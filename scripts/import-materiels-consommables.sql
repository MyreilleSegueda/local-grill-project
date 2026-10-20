-- ============================================
-- SCRIPT SQL D'IMPORTATION - MATÉRIELS/CONSOMMABLES
-- Catégorie: Consommables (ID à adapter)
-- Unités: Paquet, Unité, Carton, Bidon, etc.
-- ============================================

-- À adapter selon les IDs de catégories existantes dans categories_materiels
-- Hypothèse: ID 1 = Papeterie, ID 2 = Emballages, ID 3 = Produits d'entretien, ID 4 = Ustensiles
-- IDs matériels: à partir du dernier ID existant

-- ============================================
-- MATÉRIELS - Papeterie & Serviettes
-- ============================================
INSERT INTO `materiels` (`name`, `category_id`, `reference`, `description`, `quantity`, `minimum_stock`, `unit`, `location`, `purchase_price`, `purchase_date`, `supplier`, `is_active`, `created_at`, `updated_at`) VALUES
('Lotus OK', 1, 'LOT-OK', 'Papier toilette Lotus OK', 0.000000000000000000000000000000, 5.000000000000000000000000000000, 'Paquet', 'Toilettes', NULL, NULL, NULL, 1, NOW(), NOW()),
('Lotus toilet', 1, 'LOT-TOI', 'Papier toilette Lotus toilet', 0.000000000000000000000000000000, 5.000000000000000000000000000000, 'Paquet', 'Toilettes', NULL, NULL, NULL, 1, NOW(), NOW()),
('Lotus style', 1, 'LOT-STY', 'Essuie-tout Lotus style', 0.000000000000000000000000000000, 5.000000000000000000000000000000, 'Paquet', 'Cuisine', NULL, NULL, NULL, 1, NOW(), NOW()),
('Essuie tout', 1, 'ESS-TOT', 'Essuie-tout cuisine', 0.000000000000000000000000000000, 5.000000000000000000000000000000, 'Rouleau', 'Cuisine', NULL, NULL, NULL, 1, NOW(), NOW());

-- ============================================
-- MATÉRIELS - Emballages jetables
-- ============================================
INSERT INTO `materiels` (`name`, `category_id`, `reference`, `description`, `quantity`, `minimum_stock`, `unit`, `location`, `purchase_price`, `purchase_date`, `supplier`, `is_active`, `created_at`, `updated_at`) VALUES
('Bols salad jet', 2, 'BOL-SAL', 'Bols à salade jetables', 0.000000000000000000000000000000, 50.000000000000000000000000000000, 'Paquet', 'Stock', NULL, NULL, NULL, 1, NOW(), NOW()),
('Bols garni jet', 2, 'BOL-GAR', 'Bols garnis jetables', 0.000000000000000000000000000000, 50.000000000000000000000000000000, 'Paquet', 'Stock', NULL, NULL, NULL, 1, NOW(), NOW()),
('Bols soup jet', 2, 'BOL-SOU', 'Bols à soupe jetables', 0.000000000000000000000000000000, 50.000000000000000000000000000000, 'Paquet', 'Stock', NULL, NULL, NULL, 1, NOW(), NOW()),
('Bols vinaigre', 2, 'BOL-VIN', 'Petits bols vinaigre', 0.000000000000000000000000000000, 50.000000000000000000000000000000, 'Paquet', 'Stock', NULL, NULL, NULL, 1, NOW(), NOW()),
('Bols piments', 2, 'BOL-PIM', 'Petits bols piments', 0.000000000000000000000000000000, 50.000000000000000000000000000000, 'Paquet', 'Stock', NULL, NULL, NULL, 1, NOW(), NOW()),
('Beignets Cre', 2, 'BEI-CRE', 'Emballages beignets', 0.000000000000000000000000000000, 50.000000000000000000000000000000, 'Paquet', 'Stock', NULL, NULL, NULL, 1, NOW(), NOW()),
('Kits ovals', 2, 'KIT-OVA', 'Kits emballages ovales', 0.000000000000000000000000000000, 30.000000000000000000000000000000, 'Carton', 'Stock', NULL, NULL, NULL, 1, NOW(), NOW()),
('Sachets ali 1', 2, 'SAC-ALI1', 'Sachets aluminium taille 1', 0.000000000000000000000000000000, 100.000000000000000000000000000000, 'Paquet', 'Stock', NULL, NULL, NULL, 1, NOW(), NOW()),
('Sachets ali 2', 2, 'SAC-ALI2', 'Sachets aluminium taille 2', 0.000000000000000000000000000000, 100.000000000000000000000000000000, 'Paquet', 'Stock', NULL, NULL, NULL, 1, NOW(), NOW()),
('Sach al poiss', 2, 'SAC-POI', 'Sachets aluminium poisson', 0.000000000000000000000000000000, 50.000000000000000000000000000000, 'Paquet', 'Stock', NULL, NULL, NULL, 1, NOW(), NOW()),
('Papier alu', 2, 'PAP-ALU', 'Papier aluminium', 0.000000000000000000000000000000, 10.000000000000000000000000000000, 'Rouleau', 'Cuisine', NULL, NULL, NULL, 1, NOW(), NOW()),
('Sac pommes', 2, 'SAC-POM', 'Sacs pour pommes', 0.000000000000000000000000000000, 100.000000000000000000000000000000, 'Paquet', 'Stock', NULL, NULL, NULL, 1, NOW(), NOW()),
('Sac oignons', 2, 'SAC-OIG', 'Sacs pour oignons', 0.000000000000000000000000000000, 100.000000000000000000000000000000, 'Paquet', 'Stock', NULL, NULL, NULL, 1, NOW(), NOW()),
('Paquet attach', 2, 'PAC-ATT', 'Paquets attaches', 0.000000000000000000000000000000, 20.000000000000000000000000000000, 'Boîte', 'Stock', NULL, NULL, NULL, 1, NOW(), NOW());

-- ============================================
-- MATÉRIELS - Produits d'entretien
-- ============================================
INSERT INTO `materiels` (`name`, `category_id`, `reference`, `description`, `quantity`, `minimum_stock`, `unit`, `location`, `purchase_price`, `purchase_date`, `supplier`, `is_active`, `created_at`, `updated_at`) VALUES
('D tergent', 3, 'DET-TER', 'Détergent vaisselle', 0.000000000000000000000000000000, 5.000000000000000000000000000000, 'Bidon', 'Réserve', NULL, NULL, NULL, 1, NOW(), NOW()),
('Insecticides G', 3, 'INS-GRA', 'Insecticide grand format', 0.000000000000000000000000000000, 3.000000000000000000000000000000, 'Aérosol', 'Réserve', NULL, NULL, NULL, 1, NOW(), NOW()),
('Insecticide P', 3, 'INS-PET', 'Insecticide petit format', 0.000000000000000000000000000000, 3.000000000000000000000000000000, 'Aérosol', 'Réserve', NULL, NULL, NULL, 1, NOW(), NOW()),
('Savon 250g', 3, 'SAV-250', 'Savon solide 250g', 0.000000000000000000000000000000, 10.000000000000000000000000000000, 'Unité', 'Toilettes', NULL, NULL, NULL, 1, NOW(), NOW()),
('Savon liquide mains', 3, 'SAV-LIQ', 'Savon liquide pour les mains', 0.000000000000000000000000000000, 5.000000000000000000000000000000, 'Bidon', 'Toilettes', NULL, NULL, NULL, 1, NOW(), NOW()),
('Eponges', 3, 'EPO-MEN', 'Eponges ménagères', 0.000000000000000000000000000000, 10.000000000000000000000000000000, 'Paquet', 'Cuisine', NULL, NULL, NULL, 1, NOW(), NOW()),
('Serppill res', 3, 'SERPILL', 'Serpillères', 0.000000000000000000000000000000, 5.000000000000000000000000000000, 'Unité', 'Réserve', NULL, NULL, NULL, 1, NOW(), NOW());

-- ============================================
-- MATÉRIELS - Ustensiles jetables
-- ============================================
INSERT INTO `materiels` (`name`, `category_id`, `reference`, `description`, `quantity`, `minimum_stock`, `unit`, `location`, `purchase_price`, `purchase_date`, `supplier`, `is_active`, `created_at`, `updated_at`) VALUES
('Cuiell re jet', 4, 'CUI-JET', 'Cuillères jetables', 0.000000000000000000000000000000, 100.000000000000000000000000000000, 'Paquet', 'Stock', NULL, NULL, NULL, 1, NOW(), NOW()),
('Fourchet jet', 4, 'FOU-JET', 'Fourchettes jetables', 0.000000000000000000000000000000, 100.000000000000000000000000000000, 'Paquet', 'Stock', NULL, NULL, NULL, 1, NOW(), NOW());

-- ============================================
-- RÉSUMÉ MATÉRIELS
-- ============================================
-- Total matériels: 27
--   - Papeterie: 4
--   - Emballages: 14
--   - Entretien: 7
--   - Ustensiles: 2
-- Stock initial: 0 pour tous
-- Unités: Paquet, Carton, Bidon, Rouleau, Boîte, Aérosol, Unité
-- ============================================

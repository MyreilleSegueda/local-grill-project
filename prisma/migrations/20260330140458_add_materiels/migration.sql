-- CreateTable
CREATE TABLE `categories_materiels` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `categories_materiels_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `materiels` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `category_id` INTEGER NOT NULL,
    `reference` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `quantity` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `minimum_stock` DECIMAL(65, 30) NOT NULL DEFAULT 1,
    `unit` VARCHAR(191) NOT NULL DEFAULT 'unité',
    `location` VARCHAR(191) NULL,
    `purchase_price` DECIMAL(65, 30) NULL,
    `purchase_date` DATETIME(3) NULL,
    `supplier` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `materiels_reference_key`(`reference`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `materiel_movements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `materiel_id` INTEGER NOT NULL,
    `type` ENUM('IN', 'OUT', 'LOSS', 'BROKEN', 'OLD', 'ADJUSTMENT') NOT NULL,
    `quantity` DECIMAL(65, 30) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `reference_number` VARCHAR(191) NULL,
    `user_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `materiel_movements_materiel_id_idx`(`materiel_id`),
    INDEX `materiel_movements_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `materiels` ADD CONSTRAINT `materiels_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories_materiels`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `materiel_movements` ADD CONSTRAINT `materiel_movements_materiel_id_fkey` FOREIGN KEY (`materiel_id`) REFERENCES `materiels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `materiel_movements` ADD CONSTRAINT `materiel_movements_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

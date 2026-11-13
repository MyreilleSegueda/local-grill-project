CREATE TABLE `stock_location_balances` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `batch_id` INTEGER NOT NULL,
    `location` ENUM('GENERAL', 'STORE', 'CUISINE') NOT NULL,
    `quantity` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `stock_location_balances_batch_id_location_key` (`batch_id`, `location`),
    INDEX `stock_location_balances_location_quantity_idx` (`location`, `quantity`),
    PRIMARY KEY (`id`),
    CONSTRAINT `stock_location_balances_batch_id_fkey`
      FOREIGN KEY (`batch_id`) REFERENCES `stock_batches` (`id`)
      ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `kitchen_return_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dispatch_line_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `batch_id` INTEGER NOT NULL,
    `quantity` DECIMAL(65, 30) NOT NULL,
    `received_quantity` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `status` ENUM('PENDING', 'PARTIAL', 'RECEIVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `operation_key` VARCHAR(100) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `requested_by` INTEGER NOT NULL,
    `received_by` INTEGER NULL,
    `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `received_at` DATETIME(3) NULL,
    UNIQUE INDEX `kitchen_return_requests_operation_key_key` (`operation_key`),
    INDEX `kitchen_return_requests_status_requested_at_idx` (`status`, `requested_at`),
    INDEX `kitchen_return_requests_dispatch_line_id_requested_at_idx` (`dispatch_line_id`, `requested_at`),
    INDEX `kitchen_return_requests_batch_id_status_idx` (`batch_id`, `status`),
    PRIMARY KEY (`id`),
    CONSTRAINT `kitchen_return_requests_dispatch_line_id_fkey`
      FOREIGN KEY (`dispatch_line_id`) REFERENCES `kitchen_dispatch_lines` (`id`)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `kitchen_return_requests_product_id_fkey`
      FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `kitchen_return_requests_batch_id_fkey`
      FOREIGN KEY (`batch_id`) REFERENCES `stock_batches` (`id`)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `kitchen_return_requests_requested_by_fkey`
      FOREIGN KEY (`requested_by`) REFERENCES `user` (`id`)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `kitchen_return_requests_received_by_fkey`
      FOREIGN KEY (`received_by`) REFERENCES `user` (`id`)
      ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `stock_location_movements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_id` INTEGER NOT NULL,
    `batch_id` INTEGER NOT NULL,
    `from_location` ENUM('GENERAL', 'STORE', 'CUISINE') NOT NULL,
    `to_location` ENUM('GENERAL', 'STORE', 'CUISINE') NOT NULL,
    `quantity` DECIMAL(65, 30) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `reason` VARCHAR(191) NULL,
    `reference_number` VARCHAR(191) NULL,
    `return_request_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `stock_location_movements_return_request_id_idx` (`return_request_id`),
    INDEX `stock_location_movements_product_id_created_at_idx` (`product_id`, `created_at`),
    INDEX `stock_location_movements_batch_id_created_at_idx` (`batch_id`, `created_at`),
    INDEX `stock_location_movements_from_to_created_at_idx` (`from_location`, `to_location`, `created_at`),
    PRIMARY KEY (`id`),
    CONSTRAINT `stock_location_movements_product_id_fkey`
      FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `stock_location_movements_batch_id_fkey`
      FOREIGN KEY (`batch_id`) REFERENCES `stock_batches` (`id`)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `stock_location_movements_user_id_fkey`
      FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `stock_location_movements_return_request_id_fkey`
      FOREIGN KEY (`return_request_id`) REFERENCES `kitchen_return_requests` (`id`)
      ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `kitchen_dispatch_lines`
    MODIFY `origin_movement_id` INTEGER NULL,
    ADD COLUMN `origin_location_movement_id` INTEGER NULL,
    ADD UNIQUE INDEX `kitchen_dispatch_lines_origin_location_movement_id_key` (`origin_location_movement_id`),
    ADD CONSTRAINT `kitchen_dispatch_lines_origin_location_movement_id_fkey`
      FOREIGN KEY (`origin_location_movement_id`) REFERENCES `stock_location_movements` (`id`)
      ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO `stock_location_balances` (`batch_id`, `location`, `quantity`, `updated_at`)
SELECT `batch_id`, 'CUISINE', SUM(`sent_quantity` - `served_quantity` - `returned_quantity`), CURRENT_TIMESTAMP(3)
FROM `kitchen_dispatch_lines`
GROUP BY `batch_id`
HAVING SUM(`sent_quantity` - `served_quantity` - `returned_quantity`) > 0;

INSERT IGNORE INTO `permission` (`name`, `description`, `createdAt`, `updatedAt`)
VALUES
    ('STORE_VIEW', 'Consulter le stock et les retours du Magasin', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('STORE_TRANSFER', 'Transférer le stock Magasin vers la Cuisine', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('STORE_RECEIVE', 'Contrôler et réceptionner les retours Cuisine au Magasin', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('STORE_RETURN_STOCK', 'Transférer le stock Magasin vers le stock général', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- CreateTable
CREATE TABLE `kitchen_dispatches` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reference` VARCHAR(100) NOT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `kitchen_dispatches_reference_key`(`reference`),
    INDEX `kitchen_dispatches_created_at_idx`(`created_at`),
    INDEX `kitchen_dispatches_created_by_idx`(`created_by`),
    PRIMARY KEY (`id`),
    CONSTRAINT `kitchen_dispatches_created_by_fkey`
      FOREIGN KEY (`created_by`) REFERENCES `user`(`id`)
      ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kitchen_dispatch_lines` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dispatch_id` INTEGER NOT NULL,
    `origin_movement_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `batch_id` INTEGER NOT NULL,
    `sent_quantity` DECIMAL(65, 30) NOT NULL,
    `served_quantity` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `returned_quantity` DECIMAL(65, 30) NOT NULL DEFAULT 0,

    UNIQUE INDEX `kitchen_dispatch_lines_origin_movement_id_key`(`origin_movement_id`),
    INDEX `kitchen_dispatch_lines_dispatch_id_idx`(`dispatch_id`),
    INDEX `kitchen_dispatch_lines_product_id_idx`(`product_id`),
    INDEX `kitchen_dispatch_lines_batch_id_idx`(`batch_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `kitchen_dispatch_lines_dispatch_id_fkey`
      FOREIGN KEY (`dispatch_id`) REFERENCES `kitchen_dispatches`(`id`)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `kitchen_dispatch_lines_origin_movement_id_fkey`
      FOREIGN KEY (`origin_movement_id`) REFERENCES `stock_movements`(`id`)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `kitchen_dispatch_lines_product_id_fkey`
      FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `kitchen_dispatch_lines_batch_id_fkey`
      FOREIGN KEY (`batch_id`) REFERENCES `stock_batches`(`id`)
      ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kitchen_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dispatch_line_id` INTEGER NOT NULL,
    `type` ENUM('SERVED', 'RETURNED') NOT NULL,
    `quantity` DECIMAL(65, 30) NOT NULL,
    `actor_id` INTEGER NOT NULL,
    `stock_movement_id` INTEGER NULL,
    `operation_key` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `kitchen_events_stock_movement_id_key`(`stock_movement_id`),
    UNIQUE INDEX `kitchen_events_operation_key_key`(`operation_key`),
    INDEX `kitchen_events_dispatch_line_id_created_at_idx`(`dispatch_line_id`, `created_at`),
    INDEX `kitchen_events_actor_id_idx`(`actor_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `kitchen_events_dispatch_line_id_fkey`
      FOREIGN KEY (`dispatch_line_id`) REFERENCES `kitchen_dispatch_lines`(`id`)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `kitchen_events_actor_id_fkey`
      FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `kitchen_events_stock_movement_id_fkey`
      FOREIGN KEY (`stock_movement_id`) REFERENCES `stock_movements`(`id`)
      ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

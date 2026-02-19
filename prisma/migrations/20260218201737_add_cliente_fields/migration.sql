/*
  Warnings:

  - You are about to drop the column `direccion` on the `clientes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `clientes` DROP COLUMN `direccion`,
    ADD COLUMN `descuento` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `email` VARCHAR(100) NULL,
    ADD COLUMN `tipo` ENUM('REGULAR', 'FRECUENTE', 'MAYORISTA') NOT NULL DEFAULT 'REGULAR';

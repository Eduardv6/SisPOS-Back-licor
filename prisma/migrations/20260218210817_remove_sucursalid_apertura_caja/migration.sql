/*
  Warnings:

  - You are about to drop the column `sucursalId` on the `aperturas_caja` table. All the data in the column will be lost.
  - You are about to drop the `asignaciones_usuario_sucursal` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `aperturas_caja` DROP FOREIGN KEY `aperturas_caja_sucursalId_fkey`;

-- DropForeignKey
ALTER TABLE `asignaciones_usuario_sucursal` DROP FOREIGN KEY `asignaciones_usuario_sucursal_sucursalId_fkey`;

-- DropForeignKey
ALTER TABLE `asignaciones_usuario_sucursal` DROP FOREIGN KEY `asignaciones_usuario_sucursal_usuarioId_fkey`;

-- AlterTable
ALTER TABLE `aperturas_caja` DROP COLUMN `sucursalId`,
    MODIFY `fechaCierre` DATETIME(3) NULL;

-- DropTable
DROP TABLE `asignaciones_usuario_sucursal`;

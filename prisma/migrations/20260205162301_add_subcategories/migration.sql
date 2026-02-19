-- AlterTable
ALTER TABLE `categorias` ADD COLUMN `parentId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `categorias_parentId_idx` ON `categorias`(`parentId`);

-- AddForeignKey
ALTER TABLE `categorias` ADD CONSTRAINT `categorias_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `categorias`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE `usuarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `apellido` VARCHAR(100) NOT NULL,
    `cedula` VARCHAR(20) NOT NULL,
    `telefono` VARCHAR(20) NULL,
    `rol` ENUM('ADMINISTRADOR', 'CAJERO') NOT NULL DEFAULT 'CAJERO',
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `imagenPerfil` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `usuarios_username_key`(`username`),
    UNIQUE INDEX `usuarios_email_key`(`email`),
    UNIQUE INDEX `usuarios_cedula_key`(`cedula`),
    INDEX `usuarios_username_idx`(`username`),
    INDEX `usuarios_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sucursales` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `direccion` VARCHAR(255) NOT NULL,
    `telefono` VARCHAR(20) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asignaciones_usuario_sucursal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NOT NULL,
    `sucursalId` INTEGER NOT NULL,
    `fechaAsignacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fechaDesasignacion` DATETIME(3) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    INDEX `asignaciones_usuario_sucursal_usuarioId_idx`(`usuarioId`),
    INDEX `asignaciones_usuario_sucursal_sucursalId_idx`(`sucursalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categorias` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `color` VARCHAR(20) NULL,
    `icono` VARCHAR(20) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `productos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(200) NOT NULL,
    `codigoBarras` VARCHAR(50) NULL,
    `codigoInterno` VARCHAR(50) NOT NULL,
    `categoriaId` INTEGER NOT NULL,
    `precioVenta` DECIMAL(10, 2) NOT NULL,
    `precioCompra` DECIMAL(10, 2) NOT NULL,
    `stockMinimo` INTEGER NOT NULL DEFAULT 10,
    `unidadMedida` VARCHAR(20) NOT NULL DEFAULT 'UNIDAD',
    `marca` VARCHAR(100) NULL,
    `imagen` VARCHAR(255) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `productos_codigoBarras_key`(`codigoBarras`),
    UNIQUE INDEX `productos_codigoInterno_key`(`codigoInterno`),
    INDEX `productos_categoriaId_idx`(`categoriaId`),
    INDEX `productos_codigoBarras_idx`(`codigoBarras`),
    INDEX `productos_codigoInterno_idx`(`codigoInterno`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `historial_precios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productoId` INTEGER NOT NULL,
    `precioAnterior` DECIMAL(10, 2) NOT NULL,
    `precioNuevo` DECIMAL(10, 2) NOT NULL,
    `costoAnterior` DECIMAL(10, 2) NOT NULL,
    `costoNuevo` DECIMAL(10, 2) NOT NULL,
    `motivo` TEXT NULL,
    `usuarioId` INTEGER NOT NULL,
    `fechaCambio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `historial_precios_productoId_idx`(`productoId`),
    INDEX `historial_precios_fechaCambio_idx`(`fechaCambio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productoId` INTEGER NOT NULL,
    `sucursalId` INTEGER NOT NULL,
    `stockActual` INTEGER NOT NULL DEFAULT 0,
    `stockReservado` INTEGER NOT NULL DEFAULT 0,
    `ultimaActualizacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `inventarios_productoId_idx`(`productoId`),
    INDEX `inventarios_sucursalId_idx`(`sucursalId`),
    INDEX `inventarios_stockActual_idx`(`stockActual`),
    UNIQUE INDEX `inventarios_productoId_sucursalId_key`(`productoId`, `sucursalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `movimientos_inventario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inventarioId` INTEGER NOT NULL,
    `productoId` INTEGER NOT NULL,
    `tipo` ENUM('ENTRADA_COMPRA', 'ENTRADA_DEVOLUCION', 'ENTRADA_AJUSTE', 'SALIDA_VENTA', 'SALIDA_MERMA', 'SALIDA_AJUSTE', 'TRANSFERENCIA_SALIDA', 'TRANSFERENCIA_ENTRADA') NOT NULL,
    `cantidad` INTEGER NOT NULL,
    `cantidadAnterior` INTEGER NOT NULL,
    `cantidadNueva` INTEGER NOT NULL,
    `motivo` TEXT NULL,
    `referencia` VARCHAR(100) NULL,
    `usuarioId` INTEGER NOT NULL,
    `fechaMovimiento` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `movimientos_inventario_inventarioId_idx`(`inventarioId`),
    INDEX `movimientos_inventario_productoId_idx`(`productoId`),
    INDEX `movimientos_inventario_tipo_idx`(`tipo`),
    INDEX `movimientos_inventario_fechaMovimiento_idx`(`fechaMovimiento`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transferencias_sucursales` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numeroTransferencia` VARCHAR(50) NOT NULL,
    `sucursalOrigenId` INTEGER NOT NULL,
    `sucursalDestinoId` INTEGER NOT NULL,
    `estado` ENUM('PENDIENTE', 'EN_TRANSITO', 'RECIBIDA', 'CANCELADA') NOT NULL DEFAULT 'PENDIENTE',
    `fechaSolicitud` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fechaEnvio` DATETIME(3) NULL,
    `fechaRecepcion` DATETIME(3) NULL,
    `observaciones` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `transferencias_sucursales_numeroTransferencia_key`(`numeroTransferencia`),
    INDEX `transferencias_sucursales_numeroTransferencia_idx`(`numeroTransferencia`),
    INDEX `transferencias_sucursales_sucursalOrigenId_idx`(`sucursalOrigenId`),
    INDEX `transferencias_sucursales_sucursalDestinoId_idx`(`sucursalDestinoId`),
    INDEX `transferencias_sucursales_estado_idx`(`estado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `detalles_transferencia` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transferenciaId` INTEGER NOT NULL,
    `productoId` INTEGER NOT NULL,
    `cantidadSolicitada` INTEGER NOT NULL,
    `cantidadEnviada` INTEGER NULL,
    `cantidadRecibida` INTEGER NULL,

    INDEX `detalles_transferencia_transferenciaId_idx`(`transferenciaId`),
    INDEX `detalles_transferencia_productoId_idx`(`productoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ventas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numeroVenta` VARCHAR(50) NOT NULL,
    `sucursalId` INTEGER NOT NULL,
    `usuarioId` INTEGER NOT NULL,
    `clienteId` INTEGER NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `subtotal` DECIMAL(10, 2) NOT NULL,
    `descuento` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(10, 2) NOT NULL,
    `metodoPago` ENUM('EFECTIVO', 'QR') NOT NULL,
    `estado` ENUM('PENDIENTE', 'COMPLETADA', 'CANCELADA', 'DEVUELTA') NOT NULL DEFAULT 'COMPLETADA',
    `observaciones` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ventas_numeroVenta_key`(`numeroVenta`),
    INDEX `ventas_numeroVenta_idx`(`numeroVenta`),
    INDEX `ventas_sucursalId_idx`(`sucursalId`),
    INDEX `ventas_usuarioId_idx`(`usuarioId`),
    INDEX `ventas_clienteId_idx`(`clienteId`),
    INDEX `ventas_fecha_idx`(`fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `detalles_venta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ventaId` INTEGER NOT NULL,
    `productoId` INTEGER NOT NULL,
    `cantidad` INTEGER NOT NULL,
    `precioUnitario` DECIMAL(10, 2) NOT NULL,
    `subtotal` DECIMAL(10, 2) NOT NULL,
    `descuento` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(10, 2) NOT NULL,

    INDEX `detalles_venta_ventaId_idx`(`ventaId`),
    INDEX `detalles_venta_productoId_idx`(`productoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clientes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `apellido` VARCHAR(100) NOT NULL,
    `cedula` VARCHAR(50) NOT NULL,
    `telefono` VARCHAR(20) NOT NULL,
    `direccion` VARCHAR(255) NULL,
    `totalCompras` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `clientes_cedula_key`(`cedula`),
    INDEX `clientes_cedula_idx`(`cedula`),
    INDEX `clientes_telefono_idx`(`telefono`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `aperturas_caja` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sucursalId` INTEGER NOT NULL,
    `usuarioId` INTEGER NOT NULL,
    `fechaApertura` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fechaCierre` DATETIME(3) NOT NULL,
    `montoInicial` DECIMAL(10, 2) NOT NULL,
    `montoFinal` DECIMAL(10, 2) NULL,
    `totalVentas` DECIMAL(10, 2) NULL,
    `totalEfectivo` DECIMAL(10, 2) NULL,
    `totalQr` DECIMAL(10, 2) NULL,
    `diferencia` DECIMAL(10, 2) NULL,
    `observaciones` TEXT NULL,
    `estado` ENUM('ABIERTA', 'CERRADA') NOT NULL DEFAULT 'ABIERTA',

    INDEX `aperturas_caja_sucursalId_idx`(`sucursalId`),
    INDEX `aperturas_caja_usuarioId_idx`(`usuarioId`),
    INDEX `aperturas_caja_fechaApertura_idx`(`fechaApertura`),
    INDEX `aperturas_caja_estado_idx`(`estado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `movimientos_caja` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `aperturaCajaId` INTEGER NOT NULL,
    `tipo` ENUM('VENTA', 'RETIRO', 'INGRESO_EXTRA', 'GASTO') NOT NULL,
    `monto` DECIMAL(10, 2) NOT NULL,
    `metodoPago` ENUM('EFECTIVO', 'QR') NOT NULL,
    `concepto` VARCHAR(255) NOT NULL,
    `referencia` VARCHAR(100) NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `movimientos_caja_aperturaCajaId_idx`(`aperturaCajaId`),
    INDEX `movimientos_caja_fecha_idx`(`fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NOT NULL,
    `accion` VARCHAR(100) NOT NULL,
    `tabla` VARCHAR(100) NOT NULL,
    `registroId` INTEGER NULL,
    `datosAnteriores` JSON NULL,
    `datosNuevos` JSON NULL,
    `ipAddress` VARCHAR(45) NULL,
    `userAgent` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_usuarioId_idx`(`usuarioId`),
    INDEX `audit_logs_accion_idx`(`accion`),
    INDEX `audit_logs_tabla_idx`(`tabla`),
    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `configuracion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clave` VARCHAR(100) NOT NULL,
    `valor` TEXT NOT NULL,
    `descripcion` VARCHAR(255) NULL,
    `tipo` VARCHAR(50) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `configuracion_clave_key`(`clave`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `asignaciones_usuario_sucursal` ADD CONSTRAINT `asignaciones_usuario_sucursal_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asignaciones_usuario_sucursal` ADD CONSTRAINT `asignaciones_usuario_sucursal_sucursalId_fkey` FOREIGN KEY (`sucursalId`) REFERENCES `sucursales`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productos` ADD CONSTRAINT `productos_categoriaId_fkey` FOREIGN KEY (`categoriaId`) REFERENCES `categorias`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historial_precios` ADD CONSTRAINT `historial_precios_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `productos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventarios` ADD CONSTRAINT `inventarios_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `productos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventarios` ADD CONSTRAINT `inventarios_sucursalId_fkey` FOREIGN KEY (`sucursalId`) REFERENCES `sucursales`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos_inventario` ADD CONSTRAINT `movimientos_inventario_inventarioId_fkey` FOREIGN KEY (`inventarioId`) REFERENCES `inventarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos_inventario` ADD CONSTRAINT `movimientos_inventario_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `productos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos_inventario` ADD CONSTRAINT `movimientos_inventario_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transferencias_sucursales` ADD CONSTRAINT `transferencias_sucursales_sucursalOrigenId_fkey` FOREIGN KEY (`sucursalOrigenId`) REFERENCES `sucursales`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transferencias_sucursales` ADD CONSTRAINT `transferencias_sucursales_sucursalDestinoId_fkey` FOREIGN KEY (`sucursalDestinoId`) REFERENCES `sucursales`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `detalles_transferencia` ADD CONSTRAINT `detalles_transferencia_transferenciaId_fkey` FOREIGN KEY (`transferenciaId`) REFERENCES `transferencias_sucursales`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `detalles_transferencia` ADD CONSTRAINT `detalles_transferencia_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `productos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ventas` ADD CONSTRAINT `ventas_sucursalId_fkey` FOREIGN KEY (`sucursalId`) REFERENCES `sucursales`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ventas` ADD CONSTRAINT `ventas_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ventas` ADD CONSTRAINT `ventas_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `clientes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `detalles_venta` ADD CONSTRAINT `detalles_venta_ventaId_fkey` FOREIGN KEY (`ventaId`) REFERENCES `ventas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `detalles_venta` ADD CONSTRAINT `detalles_venta_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `productos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `aperturas_caja` ADD CONSTRAINT `aperturas_caja_sucursalId_fkey` FOREIGN KEY (`sucursalId`) REFERENCES `sucursales`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `aperturas_caja` ADD CONSTRAINT `aperturas_caja_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos_caja` ADD CONSTRAINT `movimientos_caja_aperturaCajaId_fkey` FOREIGN KEY (`aperturaCajaId`) REFERENCES `aperturas_caja`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

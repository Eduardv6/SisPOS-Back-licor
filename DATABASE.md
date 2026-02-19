# 📊 DOCUMENTACIÓN DE BASE DE DATOS - INVENTIBAR

## 🗄️ Estructura General

La base de datos está organizada en **8 módulos principales**:

1. **Autenticación y Usuarios** (2 tablas)
2. **Sucursales** (2 tablas)
3. **Productos y Categorías** (3 tablas)
4. **Inventario** (2 tablas)
5. **Transferencias entre Sucursales** (2 tablas)
6. **Ventas** (3 tablas)
7. **Caja** (2 tablas)
8. **Auditoría y Configuración** (2 tablas)

**Total: 18 tablas**

---

## 📋 MÓDULO 1: AUTENTICACIÓN Y USUARIOS

### Tabla: `usuarios`
Almacena la información de los usuarios del sistema.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT (PK) | Identificador único |
| username | VARCHAR(50) UNIQUE | Nombre de usuario |
| email | VARCHAR(100) UNIQUE | Correo electrónico |
| password | VARCHAR(255) | Contraseña hasheada (bcrypt) |
| nombre | VARCHAR(100) | Nombre real |
| apellido | VARCHAR(100) | Apellido |
| telefono | VARCHAR(20) | Teléfono |
| rol | ENUM | ADMINISTRADOR, GERENTE, VENDEDOR, INVENTARIO, REPORTES |
| activo | BOOLEAN | Usuario activo/inactivo |
| imagenPerfil | VARCHAR(255) | URL de imagen |
| createdAt | DATETIME | Fecha de creación |
| updatedAt | DATETIME | Fecha de actualización |

**Relaciones:**
- `1:N` con `asignaciones_usuario_sucursal`
- `1:N` con `ventas`
- `1:N` con `aperturas_caja`
- `1:N` con `movimientos_inventario`
- `1:N` con `audit_logs`

**Índices:**
- `username` (búsqueda rápida de login)
- `email` (búsqueda por email)

---

## 📋 MÓDULO 2: SUCURSALES

### Tabla: `sucursales`
Información de las diferentes sucursales del negocio.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT (PK) | Identificador único |
| nombre | VARCHAR(100) | Nombre de la sucursal |
| codigo | VARCHAR(20) UNIQUE | Código interno |
| direccion | VARCHAR(255) | Dirección física |
| telefono | VARCHAR(20) | Teléfono |
| email | VARCHAR(100) | Email |
| ciudad | VARCHAR(100) | Ciudad |
| encargado | VARCHAR(100) | Nombre del encargado |
| activo | BOOLEAN | Sucursal activa |
| createdAt | DATETIME | Fecha de creación |
| updatedAt | DATETIME | Fecha de actualización |

**Relaciones:**
- `1:N` con `asignaciones_usuario_sucursal`
- `1:N` con `inventarios`
- `1:N` con `ventas`
- `1:N` con `aperturas_caja`
- `1:N` con `transferencias_sucursales` (origen y destino)

### Tabla: `asignaciones_usuario_sucursal`
Relaciona usuarios con sucursales (un usuario puede trabajar en varias sucursales).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT (PK) | Identificador único |
| usuarioId | INT (FK) | Usuario asignado |
| sucursalId | INT (FK) | Sucursal asignada |
| fechaAsignacion | DATETIME | Fecha de asignación |
| fechaDesasignacion | DATETIME | Fecha de fin |
| activo | BOOLEAN | Asignación activa |

**Relaciones:**
- `N:1` con `usuarios`
- `N:1` con `sucursales`

---

## 📋 MÓDULO 3: PRODUCTOS Y CATEGORÍAS

### Tabla: `categorias`
Clasificación de productos (Cervezas, Vinos, Licores, etc.).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT (PK) | Identificador único |
| nombre | VARCHAR(100) | Nombre de la categoría |
| descripcion | TEXT | Descripción |
| color | VARCHAR(20) | Color para UI |
| icono | VARCHAR(50) | Icono para UI |
| activo | BOOLEAN | Categoría activa |
| createdAt | DATETIME | Fecha de creación |
| updatedAt | DATETIME | Fecha de actualización |

**Relaciones:**
- `1:N` con `productos`

### Tabla: `productos`
Catálogo de productos de la licorería.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT (PK) | Identificador único |
| nombre | VARCHAR(200) | Nombre del producto |
| descripcion | TEXT | Descripción detallada |
| codigoBarras | VARCHAR(50) UNIQUE | Código de barras |
| codigoInterno | VARCHAR(50) UNIQUE | Código interno |
| categoriaId | INT (FK) | Categoría del producto |
| precioVenta | DECIMAL(10,2) | Precio de venta |
| precioCompra | DECIMAL(10,2) | Costo de compra |
| stockMinimo | INT | Stock mínimo alerta |
| unidadMedida | VARCHAR(20) | UNIDAD, CAJA, etc. |
| marca | VARCHAR(100) | Marca |
| volumen | VARCHAR(50) | "750ml", "1L", etc. |
| gradoAlcoholico | DECIMAL(5,2) | % de alcohol |
| imagen | VARCHAR(255) | URL de imagen |
| activo | BOOLEAN | Producto activo |
| createdAt | DATETIME | Fecha de creación |
| updatedAt | DATETIME | Fecha de actualización |

**Relaciones:**
- `N:1` con `categorias`
- `1:N` con `inventarios`
- `1:N` con `detalles_venta`
- `1:N` con `movimientos_inventario`
- `1:N` con `historial_precios`
- `1:N` con `detalles_transferencia`

**Índices:**
- `categoriaId`
- `codigoBarras` (búsqueda por scanner)
- `codigoInterno`

### Tabla: `historial_precios`
Registro de cambios de precios de productos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT (PK) | Identificador único |
| productoId | INT (FK) | Producto modificado |
| precioAnterior | DECIMAL(10,2) | Precio anterior |
| precioNuevo | DECIMAL(10,2) | Precio nuevo |
| costoAnterior | DECIMAL(10,2) | Costo anterior |
| costoNuevo | DECIMAL(10,2) | Costo nuevo |
| motivo | TEXT | Razón del cambio |
| usuarioId | INT | Usuario que hizo el cambio |
| fechaCambio | DATETIME | Fecha del cambio |

**Relaciones:**
- `N:1` con `productos`

---

## 📋 MÓDULO 4: INVENTARIO

### Tabla: `inventarios`
Stock de productos por sucursal.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT (PK) | Identificador único |
| productoId | INT (FK) | Producto |
| sucursalId | INT (FK) | Sucursal |
| stockActual | INT | Cantidad disponible |
| stockReservado | INT | Cantidad reservada |
| ubicacion | VARCHAR(100) | Ubicación física |
| lote | VARCHAR(50) | Número de lote |
| fechaVencimiento | DATETIME | Fecha de vencimiento |
| ultimaActualizacion | DATETIME | Última actualización |

**Relaciones:**
- `N:1` con `productos`
- `N:1` con `sucursales`
- `1:N` con `movimientos_inventario`

**Constraint UNIQUE:** `(productoId, sucursalId)` - Un producto por sucursal

**Índices:**
- `productoId`
- `sucursalId`
- `stockActual` (para consultas de stock bajo)

### Tabla: `movimientos_inventario`
Trazabilidad completa de todos los movimientos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT (PK) | Identificador único |
| inventarioId | INT (FK) | Inventario afectado |
| productoId | INT (FK) | Producto |
| tipo | ENUM | Tipo de movimiento |
| cantidad | INT | Cantidad del movimiento |
| cantidadAnterior | INT | Stock antes |
| cantidadNueva | INT | Stock después |
| motivo | TEXT | Razón del movimiento |
| referencia | VARCHAR(100) | # Factura, venta, etc. |
| usuarioId | INT (FK) | Usuario responsable |
| fechaMovimiento | DATETIME | Fecha del movimiento |

**Tipos de Movimiento (ENUM):**
- `ENTRADA_COMPRA` - Compra a proveedor
- `ENTRADA_DEVOLUCION` - Devolución de cliente
- `ENTRADA_AJUSTE` - Ajuste manual positivo
- `SALIDA_VENTA` - Venta a cliente
- `SALIDA_MERMA` - Pérdida por rotura/vencimiento
- `SALIDA_AJUSTE` - Ajuste manual negativo
- `TRANSFERENCIA_SALIDA` - Envío a otra sucursal
- `TRANSFERENCIA_ENTRADA` - Recepción de otra sucursal

**Relaciones:**
- `N:1` con `inventarios`
- `N:1` con `productos`
- `N:1` con `usuarios`

**Índices:**
- `inventarioId`
- `productoId`
- `tipo`
- `fechaMovimiento` (para reportes por período)

---

## 📋 MÓDULO 5: TRANSFERENCIAS ENTRE SUCURSALES

### Tabla: `transferencias_sucursales`
Transferencias de productos entre sucursales.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT (PK) | Identificador único |
| numeroTransferencia | VARCHAR(50) UNIQUE | # de transferencia |
| sucursalOrigenId | INT (FK) | Sucursal que envía |
| sucursalDestinoId | INT (FK) | Sucursal que recibe |
| estado | ENUM | Estado actual |
| fechaSolicitud | DATETIME | Fecha de solicitud |
| fechaEnvio | DATETIME | Fecha de envío |
| fechaRecepcion | DATETIME | Fecha de recepción |
| observaciones | TEXT | Notas |
| createdAt | DATETIME | Fecha de creación |
| updatedAt | DATETIME | Fecha de actualización |

**Estados (ENUM):**
- `PENDIENTE` - Solicitada pero no enviada
- `EN_TRANSITO` - Enviada pero no recibida
- `RECIBIDA` - Completada
- `CANCELADA` - Cancelada

**Relaciones:**
- `N:1` con `sucursales` (origen)
- `N:1` con `sucursales` (destino)
- `1:N` con `detalles_transferencia`

### Tabla: `detalles_transferencia`
Productos incluidos en cada transferencia.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT (PK) | Identificador único |
| transferenciaId | INT (FK) | Transferencia |
| productoId | INT (FK) | Producto |
| cantidadSolicitada | INT | Cantidad solicitada |
| cantidadEnviada | INT | Cantidad enviada |
| cantidadRecibida | INT | Cantidad recibida |

**Relaciones:**
- `N:1` con `transferencias_sucursales` (ON DELETE CASCADE)
- `N:1` con `productos`

---

## 📋 MÓDULO 6: VENTAS

### Tabla: `ventas`
Registro de ventas realizadas.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT (PK) | Identificador único |
| numeroVenta | VARCHAR(50) UNIQUE | # de venta |
| sucursalId | INT (FK) | Sucursal de venta |
| usuarioId | INT (FK) | Vendedor |
| clienteId | INT (FK) | Cliente (opcional) |
| fecha | DATETIME | Fecha de venta |
| subtotal | DECIMAL(10,2) | Subtotal |
| descuento | DECIMAL(10,2) | Descuento aplicado |
| total | DECIMAL(10,2) | Total a pagar |
| metodoPago | ENUM | Método de pago |
| estado | ENUM | Estado de la venta |
| observaciones | TEXT | Notas |
| createdAt | DATETIME | Fecha de creación |
| updatedAt | DATETIME | Fecha de actualización |

**Métodos de Pago (ENUM):**
- `EFECTIVO`
- `TARJETA_DEBITO`
- `TARJETA_CREDITO`
- `TRANSFERENCIA`
- `QR`
- `MIXTO`

**Estados (ENUM):**
- `PENDIENTE` - No completada
- `COMPLETADA` - Finalizada exitosamente
- `CANCELADA` - Cancelada
- `DEVUELTA` - Devuelta

**Relaciones:**
- `N:1` con `sucursales`
- `N:1` con `usuarios`
- `N:1` con `clientes` (opcional)
- `1:N` con `detalles_venta`

**Índices:**
- `numeroVenta`
- `sucursalId`
- `usuarioId`
- `clienteId`
- `fecha` (para reportes)

### Tabla: `detalles_venta`
Productos vendidos en cada venta.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT (PK) | Identificador único |
| ventaId | INT (FK) | Venta |
| productoId | INT (FK) | Producto vendido |
| cantidad | INT | Cantidad vendida |
| precioUnitario | DECIMAL(10,2) | Precio unitario |
| subtotal | DECIMAL(10,2) | Subtotal |
| descuento | DECIMAL(10,2) | Descuento |
| total | DECIMAL(10,2) | Total línea |

**Relaciones:**
- `N:1` con `ventas` (ON DELETE CASCADE)
- `N:1` con `productos`

### Tabla: `clientes`
Base de datos de clientes.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT (PK) | Identificador único |
| nombre | VARCHAR(100) | Nombre |
| apellido | VARCHAR(100) | Apellido |
| documento | VARCHAR(50) UNIQUE | CI/NIT |
| tipoDocumento | VARCHAR(20) | Tipo de documento |
| email | VARCHAR(100) | Email |
| telefono | VARCHAR(20) | Teléfono |
| direccion | VARCHAR(255) | Dirección |
| fechaNacimiento | DATETIME | Fecha de nacimiento |
| totalCompras | DECIMAL(10,2) | Total histórico |
| activo | BOOLEAN | Cliente activo |
| createdAt | DATETIME | Fecha de creación |
| updatedAt | DATETIME | Fecha de actualización |

**Relaciones:**
- `1:N` con `ventas`

**Índices:**
- `documento`
- `telefono`

---

## 📋 MÓDULO 7: CAJA

### Tabla: `aperturas_caja`
Apertura y cierre de caja diario.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT (PK) | Identificador único |
| sucursalId | INT (FK) | Sucursal |
| usuarioId | INT (FK) | Cajero |
| fechaApertura | DATETIME | Fecha/hora apertura |
| fechaCierre | DATETIME | Fecha/hora cierre |
| montoInicial | DECIMAL(10,2) | Fondo inicial |
| montoFinal | DECIMAL(10,2) | Efectivo final |
| totalVentas | DECIMAL(10,2) | Total de ventas |
| totalEfectivo | DECIMAL(10,2) | Ventas en efectivo |
| totalTarjeta | DECIMAL(10,2) | Ventas con tarjeta |
| totalTransferencia | DECIMAL(10,2) | Transferencias |
| diferencia | DECIMAL(10,2) | Diferencia (faltante/sobrante) |
| observaciones | TEXT | Notas |
| estado | ENUM | ABIERTA, CERRADA |

**Relaciones:**
- `N:1` con `sucursales`
- `N:1` con `usuarios`
- `1:N` con `movimientos_caja`

**Índices:**
- `sucursalId`
- `usuarioId`
- `fechaApertura`
- `estado`

### Tabla: `movimientos_caja`
Movimientos de dinero en caja.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT (PK) | Identificador único |
| aperturaCajaId | INT (FK) | Caja relacionada |
| tipo | ENUM | Tipo de movimiento |
| monto | DECIMAL(10,2) | Monto |
| metodoPago | ENUM | Método de pago |
| concepto | VARCHAR(255) | Descripción |
| referencia | VARCHAR(100) | # de referencia |
| fecha | DATETIME | Fecha del movimiento |

**Tipos (ENUM):**
- `VENTA` - Venta realizada
- `RETIRO` - Retiro de efectivo
- `INGRESO_EXTRA` - Ingreso adicional
- `GASTO` - Gasto realizado

**Relaciones:**
- `N:1` con `aperturas_caja` (ON DELETE CASCADE)

---

## 📋 MÓDULO 8: AUDITORÍA Y CONFIGURACIÓN

### Tabla: `audit_logs`
Registro de todas las acciones importantes del sistema.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT (PK) | Identificador único |
| usuarioId | INT (FK) | Usuario que realizó la acción |
| accion | VARCHAR(100) | CREATE, UPDATE, DELETE, etc. |
| tabla | VARCHAR(100) | Tabla afectada |
| registroId | INT | ID del registro afectado |
| datosAnteriores | JSON | Datos antes del cambio |
| datosNuevos | JSON | Datos después del cambio |
| ipAddress | VARCHAR(45) | IP del usuario |
| userAgent | VARCHAR(255) | Navegador/dispositivo |
| createdAt | DATETIME | Fecha de la acción |

**Relaciones:**
- `N:1` con `usuarios`

**Índices:**
- `usuarioId`
- `accion`
- `tabla`
- `createdAt` (para consultas por fecha)

### Tabla: `configuracion`
Configuraciones globales del sistema.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT (PK) | Identificador único |
| clave | VARCHAR(100) UNIQUE | Nombre de la configuración |
| valor | TEXT | Valor de la configuración |
| descripcion | VARCHAR(255) | Descripción |
| tipo | VARCHAR(50) | string, number, boolean, json |
| updatedAt | DATETIME | Última actualización |

**Ejemplos de configuraciones:**
- `empresa_nombre` - Nombre de la empresa
- `empresa_nit` - NIT de la empresa
- `backup_automatico` - true/false
- `backup_hora` - "03:00"
- `moneda` - "BOB"
- `iva_porcentaje` - "13"

---

## 📊 DIAGRAMA DE RELACIONES (ERD)

```
┌─────────────┐
│  usuarios   │──┐
└─────────────┘  │
                 │ 1:N
┌────────────────▼──────────────┐
│ asignaciones_usuario_sucursal │
└────────────────┬──────────────┘
                 │ N:1
┌────────────────▼──┐
│    sucursales     │──┬──────────┐
└───────────────────┘  │          │
                       │ 1:N      │ 1:N
┌──────────────────────▼─┐   ┌────▼─────────┐
│     inventarios        │   │    ventas    │
└──────┬─────────────────┘   └──────┬───────┘
       │ N:1                        │ 1:N
       │                            │
┌──────▼──────────┐        ┌────────▼────────┐
│   productos     │────────│ detalles_venta  │
└─────────────────┘  N:1   └─────────────────┘
       │ N:1
┌──────▼──────────┐
│   categorias    │
└─────────────────┘

┌─────────────────────────┐
│ transferencias_sucursales│
└──────────┬──────────────┘
           │ 1:N
┌──────────▼──────────────┐
│ detalles_transferencia  │
└─────────────────────────┘

┌─────────────────┐
│ aperturas_caja  │
└────────┬────────┘
         │ 1:N
┌────────▼────────┐
│ movimientos_caja│
└─────────────────┘
```

---

## 🔐 CONSIDERACIONES DE SEGURIDAD

### Contraseñas
- Usar **bcrypt** con salt rounds >= 10
- Nunca almacenar contraseñas en texto plano

### Autenticación
- Implementar **JWT** para sesiones
- Refresh tokens para renovación
- Expiración de tokens (15-30 minutos)

### Permisos por Rol

**ADMINISTRADOR:**
- Acceso total al sistema
- Gestión de usuarios
- Configuración global

**GERENTE:**
- Acceso a reportes completos
- Gestión de productos e inventario
- Visualización de ventas

**VENDEDOR:**
- Solo POS
- Consulta de productos
- Sus propias ventas

**INVENTARIO:**
- Gestión de stock
- Movimientos de inventario
- Transferencias

**REPORTES:**
- Solo lectura
- Generación de reportes
- Exportación de datos

---

## 📈 ÍNDICES RECOMENDADOS

### Índices Críticos para Performance

```sql
-- Búsquedas frecuentes
CREATE INDEX idx_productos_codigo_barras ON productos(codigoBarras);
CREATE INDEX idx_productos_categoria ON productos(categoriaId);
CREATE INDEX idx_inventarios_stock ON inventarios(stockActual);

-- Reportes y análisis
CREATE INDEX idx_ventas_fecha ON ventas(fecha);
CREATE INDEX idx_ventas_sucursal_fecha ON ventas(sucursalId, fecha);
CREATE INDEX idx_movimientos_fecha ON movimientos_inventario(fechaMovimiento);

-- Auditoría
CREATE INDEX idx_audit_usuario_fecha ON audit_logs(usuarioId, createdAt);
CREATE INDEX idx_audit_tabla ON audit_logs(tabla);
```

---

## 🔄 TRIGGERS RECOMENDADOS

### 1. Actualizar Stock en Venta
```sql
-- Al insertar detalle_venta, actualizar inventario
TRIGGER after_venta_insert
```

### 2. Registrar Auditoría
```sql
-- Al modificar producto, registrar en historial_precios
TRIGGER after_producto_update_precio
```

### 3. Validar Stock
```sql
-- Antes de venta, verificar stock disponible
TRIGGER before_venta_insert
```

---

## 📝 CONSULTAS COMUNES

### Productos con Stock Bajo
```sql
SELECT p.*, i.stockActual, i.stockMinimo
FROM productos p
JOIN inventarios i ON p.id = i.productoId
WHERE i.stockActual <= p.stockMinimo
AND i.sucursalId = ?
```

### Reporte de Ventas del Día
```sql
SELECT 
  v.numeroVenta,
  v.total,
  v.metodoPago,
  u.nombre as vendedor,
  DATE_FORMAT(v.fecha, '%H:%i') as hora
FROM ventas v
JOIN usuarios u ON v.usuarioId = u.id
WHERE DATE(v.fecha) = CURDATE()
AND v.sucursalId = ?
ORDER BY v.fecha DESC
```

### Top 10 Productos Más Vendidos
```sql
SELECT 
  p.nombre,
  SUM(dv.cantidad) as total_vendido,
  SUM(dv.total) as total_ingresos
FROM detalles_venta dv
JOIN productos p ON dv.productoId = p.id
JOIN ventas v ON dv.ventaId = v.id
WHERE v.fecha >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY p.id
ORDER BY total_vendido DESC
LIMIT 10
```

---

## 🚀 PRÓXIMOS PASOS

1. ✅ Crear base de datos MySQL
2. ✅ Ejecutar `prisma migrate dev`
3. ✅ Generar Prisma Client
4. ⏳ Implementar seeders con datos de prueba
5. ⏳ Crear controladores y rutas en Express
6. ⏳ Implementar validaciones con Zod
7. ⏳ Agregar middleware de autenticación
8. ⏳ Documentar API con Swagger

---

**Base de datos diseñada por:** Claude AI  
**Versión:** 1.0  
**Fecha:** Febrero 2026

# 🍾 InventiBar Backend API

Backend completo para sistema de inventario de licorería desarrollado con Node.js, Express, Prisma y MySQL.

## 🚀 Tecnologías

- **Node.js** 18+
- **Express.js** - Framework web
- **Prisma** - ORM para MySQL
- **MySQL** 8.0 - Base de datos
- **JWT** - Autenticación
- **Bcrypt** - Encriptación de contraseñas
- **Zod** - Validación de datos

## 📋 Requisitos Previos

- Node.js 18 o superior
- MySQL 8.0 o superior
- npm o yarn

## ⚙️ Instalación

### 1. Clonar e Instalar Dependencias

```bash
cd backend-licoreria
npm install
```

### 2. Configurar Variables de Entorno

```bash
cp .env.example .env
```

Editar `.env` con tus credenciales:

```env
DATABASE_URL="mysql://usuario:password@localhost:3306/inventibar_db"
JWT_SECRET="tu-secreto-super-seguro"
PORT=5000
```

### 3. Crear Base de Datos

```bash
# Conectarse a MySQL
mysql -u root -p

# Crear base de datos
CREATE DATABASE inventibar_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit;
```

### 4. Ejecutar Migraciones

```bash
# Generar y ejecutar migraciones
npx prisma migrate dev --name init

# Generar Prisma Client
npx prisma generate
```

### 5. Cargar Datos de Prueba (Seed)

```bash
npm run seed
```

### 6. Iniciar Servidor

```bash
# Modo desarrollo
npm run dev

# Modo producción
npm start
```

El servidor estará disponible en `http://localhost:5000`

## 📊 Estructura de Base de Datos

La base de datos consta de **18 tablas** organizadas en 8 módulos:

1. **Autenticación y Usuarios** - usuarios
2. **Sucursales** - sucursales, asignaciones_usuario_sucursal
3. **Productos** - productos, categorias, historial_precios
4. **Inventario** - inventarios, movimientos_inventario
5. **Transferencias** - transferencias_sucursales, detalles_transferencia
6. **Ventas** - ventas, detalles_venta, clientes
7. **Caja** - aperturas_caja, movimientos_caja
8. **Sistema** - audit_logs, configuracion

Ver [DATABASE.md](./DATABASE.md) para documentación completa del esquema.

## 🔌 Endpoints API

### Autenticación

```
POST   /api/auth/login          - Iniciar sesión
POST   /api/auth/register       - Registrar usuario
POST   /api/auth/refresh        - Renovar token
GET    /api/auth/me             - Usuario actual
POST   /api/auth/logout         - Cerrar sesión
```

### Productos

```
GET    /api/productos           - Listar todos los productos
GET    /api/productos/:id       - Obtener producto por ID
POST   /api/productos           - Crear producto
PUT    /api/productos/:id       - Actualizar producto
DELETE /api/productos/:id       - Eliminar producto
GET    /api/productos/barcode/:codigo - Buscar por código de barras
```

### Categorías

```
GET    /api/categorias          - Listar categorías
POST   /api/categorias          - Crear categoría
PUT    /api/categorias/:id      - Actualizar categoría
DELETE /api/categorias/:id      - Eliminar categoría
```

### Inventario

```
GET    /api/inventario          - Listar inventario
GET    /api/inventario/sucursal/:id - Inventario por sucursal
POST   /api/inventario/ajuste   - Ajustar stock
GET    /api/inventario/movimientos - Historial de movimientos
GET    /api/inventario/bajo-stock - Productos con stock bajo
```

### Ventas

```
GET    /api/ventas              - Listar ventas
GET    /api/ventas/:id          - Detalle de venta
POST   /api/ventas              - Crear venta
GET    /api/ventas/dia          - Ventas del día
GET    /api/ventas/periodo      - Ventas por período
```

### Clientes

```
GET    /api/clientes            - Listar clientes
GET    /api/clientes/:id        - Detalle de cliente
POST   /api/clientes            - Crear cliente
PUT    /api/clientes/:id        - Actualizar cliente
DELETE /api/clientes/:id        - Eliminar cliente
GET    /api/clientes/:id/historial - Historial de compras
```

### Usuarios

```
GET    /api/usuarios            - Listar usuarios
GET    /api/usuarios/:id        - Detalle de usuario
POST   /api/usuarios            - Crear usuario
PUT    /api/usuarios/:id        - Actualizar usuario
DELETE /api/usuarios/:id        - Eliminar usuario
PUT    /api/usuarios/:id/rol    - Cambiar rol
```

### Sucursales

```
GET    /api/sucursales          - Listar sucursales
GET    /api/sucursales/:id      - Detalle de sucursal
POST   /api/sucursales          - Crear sucursal
PUT    /api/sucursales/:id      - Actualizar sucursal
DELETE /api/sucursales/:id      - Eliminar sucursal
```

### Caja

```
POST   /api/caja/abrir          - Abrir caja
POST   /api/caja/cerrar         - Cerrar caja
GET    /api/caja/actual         - Caja actual abierta
GET    /api/caja/historial      - Historial de cajas
POST   /api/caja/movimiento     - Registrar movimiento
```

### Reportes

```
GET    /api/reportes/ventas     - Reporte de ventas
GET    /api/reportes/inventario - Reporte de inventario
GET    /api/reportes/quincenal  - Reporte quincenal
GET    /api/reportes/mensual    - Reporte mensual
GET    /api/reportes/productos-vendidos - Productos más vendidos
```

### Configuración

```
GET    /api/configuracion       - Obtener todas las configuraciones
GET    /api/configuracion/:clave - Obtener configuración específica
PUT    /api/configuracion/:clave - Actualizar configuración
```

## 🔐 Autenticación

Todas las rutas (excepto `/auth/login` y `/auth/register`) requieren autenticación mediante JWT.

### Uso del Token

```javascript
// Headers de la petición
{
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

### Ejemplo de Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

Respuesta:

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "usuario": {
      "id": 1,
      "username": "admin",
      "nombre": "Administrador",
      "rol": "ADMINISTRADOR"
    }
  }
}
```

## 👤 Usuarios de Prueba (Seed)

| Usuario | Password | Rol |
|---------|----------|-----|
| admin | admin123 | ADMINISTRADOR |
| ana.lopez | vendedor123 | VENDEDOR |
| carlos.mendez | vendedor123 | VENDEDOR |

## 🛡️ Middleware de Autenticación

```javascript
// Proteger rutas
import { authenticate } from './middlewares/auth.middleware.js'
import { authorize } from './middlewares/auth.middleware.js'

// Solo usuarios autenticados
router.get('/productos', authenticate, getProductos)

// Solo administradores
router.post('/usuarios', authenticate, authorize('ADMINISTRADOR'), crearUsuario)

// Múltiples roles
router.get('/reportes', authenticate, authorize('ADMINISTRADOR', 'GERENTE'), getReportes)
```

## 📝 Validación de Datos

Usando Zod para validación:

```javascript
import { z } from 'zod'

const crearProductoSchema = z.object({
  nombre: z.string().min(3).max(200),
  codigoBarras: z.string().optional(),
  categoriaId: z.number().int().positive(),
  precioVenta: z.number().positive(),
  precioCompra: z.number().positive(),
  stockMinimo: z.number().int().min(0)
})
```

## 🔍 Prisma Studio

Explorar base de datos visualmente:

```bash
npx prisma studio
```

Abrirá interfaz en `http://localhost:5555`

## 📦 Comandos Útiles de Prisma

```bash
# Generar migración
npx prisma migrate dev --name nombre_migracion

# Aplicar migraciones en producción
npx prisma migrate deploy

# Resetear base de datos (¡CUIDADO!)
npx prisma migrate reset

# Generar Prisma Client
npx prisma generate

# Ver estado de migraciones
npx prisma migrate status

# Formatear schema
npx prisma format
```

## 🔧 Scripts NPM

```bash
npm run dev          # Desarrollo con nodemon
npm start            # Producción
npm run migrate      # Ejecutar migraciones
npm run seed         # Cargar datos de prueba
npm run studio       # Abrir Prisma Studio
npm run generate     # Generar Prisma Client
```

## 📁 Estructura del Proyecto

```
backend-licoreria/
├── prisma/
│   ├── schema.prisma          # Esquema de base de datos
│   ├── seed.js                # Datos de prueba
│   └── migrations/            # Migraciones generadas
├── src/
│   ├── controllers/           # Lógica de negocio
│   │   ├── auth.controller.js
│   │   ├── productos.controller.js
│   │   ├── ventas.controller.js
│   │   └── ...
│   ├── routes/                # Rutas de la API
│   │   ├── auth.routes.js
│   │   ├── productos.routes.js
│   │   └── ...
│   ├── middlewares/           # Middlewares personalizados
│   │   ├── auth.middleware.js
│   │   ├── validate.middleware.js
│   │   └── error.middleware.js
│   ├── utils/                 # Utilidades
│   │   ├── jwt.js
│   │   ├── response.js
│   │   └── validators.js
│   └── server.js              # Punto de entrada
├── uploads/                   # Archivos subidos
├── .env                       # Variables de entorno
├── .env.example               # Ejemplo de .env
├── package.json
├── DATABASE.md                # Documentación de BD
└── README.md
```

## 🚀 Deploy en Producción

### 1. Configurar Variables de Entorno

```env
DATABASE_URL="mysql://usuario:password@host:3306/db_produccion"
NODE_ENV="production"
JWT_SECRET="secreto-super-seguro-produccion"
```

### 2. Ejecutar Migraciones

```bash
npx prisma migrate deploy
```

### 3. Iniciar con PM2

```bash
npm install -g pm2
pm2 start src/server.js --name "inventibar-api"
pm2 save
pm2 startup
```

## 🐛 Debugging

### Habilitar logs de Prisma

```javascript
// prisma/client.js
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error']
})
```

### Ver queries SQL

```bash
DEBUG=prisma:query npm run dev
```

## 📊 Monitoreo y Logs

### Logs con Morgan

```javascript
// Ya configurado en server.js
app.use(morgan('combined'))
```

### Health Check

```bash
curl http://localhost:5000/health
```

Respuesta:

```json
{
  "status": "OK",
  "timestamp": "2026-02-03T20:00:00.000Z",
  "uptime": 123.456
}
```

## 🔐 Seguridad

### Helmet.js
Protección de headers HTTP

### Rate Limiting
100 requests por 15 minutos por IP

### CORS
Configurado para dominios específicos

### Validación de Inputs
Sanitización con Zod

### Passwords
Hasheadas con bcrypt (10 rounds)

## 🧪 Testing (Próximamente)

```bash
npm test
npm run test:watch
npm run test:coverage
```

## 📚 Recursos

- [Prisma Docs](https://www.prisma.io/docs)
- [Express Docs](https://expressjs.com/)
- [JWT Docs](https://jwt.io/)
- [Zod Docs](https://zod.dev/)

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📝 Licencia

Proyecto interno - Todos los derechos reservados

---

**Desarrollado con ❤️ para InventiBar**

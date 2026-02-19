import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed de base de datos...");
  // ==========================================
  // CATEGORÍAS
  // ==========================================
  console.log("📁 Creando categorías...");

  const categorias = await Promise.all([
    prisma.categoria.create({
      data: {
        nombre: "Cervezas",
        color: "yellow",
        icono: "beer",
      },
    }),
    prisma.categoria.create({
      data: {
        nombre: "Vinos",
        color: "purple",
        icono: "wine",
      },
    }),
    prisma.categoria.create({
      data: {
        nombre: "Licores",
        color: "green",
        icono: "bottle",
      },
    }),
    prisma.categoria.create({
      data: {
        nombre: "Whisky",
        color: "orange",
        icono: "whisky",
      },
    }),
    prisma.categoria.create({
      data: {
        nombre: "Ron",
        color: "red",
        icono: "rum",
      },
    }),
    prisma.categoria.create({
      data: {
        nombre: "Vodka",
        color: "blue",
        icono: "vodka",
      },
    }),
  ]);

  console.log(`✅ ${categorias.length} categorías creadas`);

  // ==========================================
  // SUCURSALES
  // ==========================================
  console.log("🏢 Creando sucursales...");

  const sucursales = await Promise.all([
    prisma.sucursal.create({
      data: {
        nombre: "Sucursal Centro",
        direccion: "Av. Principal 123",
        telefono: "2234567",
      },
    }),
    prisma.sucursal.create({
      data: {
        nombre: "Sucursal Norte",
        direccion: "Calle Comercio 456",
        telefono: "2345678",
      },
    }),
  ]);

  console.log(`✅ ${sucursales.length} sucursales creadas`);

  // ==========================================
  // USUARIOS
  // ==========================================
  console.log("👤 Creando usuarios...");

  const hashedPassword = await bcrypt.hash("admin123", 10);

  const usuarios = await Promise.all([
    prisma.usuario.create({
      data: {
        username: "admin",
        email: "admin@licoreria.com",
        password: hashedPassword,
        nombre: "Administrador",
        apellido: "admin",
        cedula: "0000000",
        telefono: "70000000",
        rol: "ADMINISTRADOR",
      },
    }),
    prisma.usuario.create({
      data: {
        username: "ana.lopez",
        email: "ana@licoreria.com",
        password: await bcrypt.hash("vendedor123", 10),
        nombre: "Ana",
        apellido: "López",
        cedula: "1111111",
        telefono: "71111111",
        rol: "CAJERO",
      },
    }),
    prisma.usuario.create({
      data: {
        username: "carlos.mendez",
        email: "carlos@licoreria.com",
        password: await bcrypt.hash("vendedor123", 10),
        nombre: "Carlos",
        apellido: "Méndez",
        cedula: "2222222",
        telefono: "72222222",
        rol: "CAJERO",
      },
    }),
  ]);

  console.log(`✅ ${usuarios.length} usuarios creados`);
  console.log(`   👤 Admin - username: admin, password: admin123`);

  // ==========================================
  // ASIGNACIONES USUARIO-SUCURSAL
  // ==========================================
  console.log("🔗 Asignando usuarios a sucursales...");

  await Promise.all([
    prisma.asignacionUsuarioSucursal.create({
      data: {
        usuarioId: usuarios[1].id, // Ana López
        sucursalId: sucursales[0].id, // Sucursal Centro
      },
    }),
    prisma.asignacionUsuarioSucursal.create({
      data: {
        usuarioId: usuarios[2].id, // Carlos Méndez
        sucursalId: sucursales[1].id, // Sucursal Norte
      },
    }),
  ]);

  console.log("✅ Asignaciones creadas");

  // ==========================================
  // PRODUCTOS
  // ==========================================
  console.log("🏷️  Creando productos...");

  const productos = await Promise.all([
    // Cervezas
    prisma.producto.create({
      data: {
        nombre: "Cerveza Paceña 620ml",
        codigoBarras: "7891234567890",
        codigoInterno: "CERV-001",
        categoriaId: categorias[0].id,
        precioVenta: 10.0,
        precioCompra: 7.5,
        stockMinimo: 20,
        marca: "Paceña",
      },
    }),
    prisma.producto.create({
      data: {
        nombre: "Cerveza Huari 355ml",
        codigoBarras: "7891234567895",
        codigoInterno: "CERV-002",
        categoriaId: categorias[0].id,
        precioVenta: 8.0,
        precioCompra: 6.0,
        stockMinimo: 30,
        marca: "Huari",
      },
    }),

    // Licores
    prisma.producto.create({
      data: {
        nombre: "Singani Rujero 750ml",
        codigoBarras: "7891234567891",
        codigoInterno: "LIC-001",
        categoriaId: categorias[2].id,
        precioVenta: 95.0,
        precioCompra: 70.0,
        stockMinimo: 15,
        marca: "Rujero",
      },
    }),
    prisma.producto.create({
      data: {
        nombre: "Ron Santa Teresa",
        codigoBarras: "7891234567893",
        codigoInterno: "RON-001",
        categoriaId: categorias[4].id,
        precioVenta: 120.0,
        precioCompra: 90.0,
        stockMinimo: 15,
        marca: "Santa Teresa",
      },
    }),

    // Vinos
    prisma.producto.create({
      data: {
        nombre: "Vino Kohlberg Tinto",
        codigoBarras: "7891234567892",
        codigoInterno: "VINO-001",
        categoriaId: categorias[1].id,
        precioVenta: 85.0,
        precioCompra: 65.0,
        stockMinimo: 10,
        marca: "Kohlberg",
      },
    }),

    // Whisky
    prisma.producto.create({
      data: {
        nombre: "Whisky Johnnie Walker Red Label",
        codigoBarras: "7891234567894",
        codigoInterno: "WHIS-001",
        categoriaId: categorias[3].id,
        precioVenta: 280.0,
        precioCompra: 220.0,
        stockMinimo: 10,
        marca: "Johnnie Walker",
      },
    }),
  ]);

  console.log(`✅ ${productos.length} productos creados`);

  // ==========================================
  // INVENTARIO
  // ==========================================
  console.log("📦 Creando inventario inicial...");

  const inventarios = [];
  for (const sucursal of sucursales) {
    for (const producto of productos) {
      const stockInicial = Math.floor(Math.random() * 100) + 50;
      inventarios.push(
        await prisma.inventario.create({
          data: {
            productoId: producto.id,
            sucursalId: sucursal.id,
            stockActual: stockInicial,
            stockReservado: 0,
          },
        }),
      );

      // Crear movimiento inicial
      await prisma.movimientoInventario.create({
        data: {
          inventarioId: inventarios[inventarios.length - 1].id,
          productoId: producto.id,
          tipo: "ENTRADA_COMPRA",
          cantidad: stockInicial,
          cantidadAnterior: 0,
          cantidadNueva: stockInicial,
          motivo: "Inventario inicial",
          referencia: "INIT-001",
          usuarioId: usuarios[0].id,
        },
      });
    }
  }

  console.log(`✅ ${inventarios.length} registros de inventario creados`);

  // ==========================================
  // CLIENTES
  // ==========================================
  console.log("👥 Creando clientes de prueba...");

  const clientes = await Promise.all([
    prisma.cliente.create({
      data: {
        nombre: "Juan",
        apellido: "Pérez",
        cedula: "1234567",
        telefono: "71234567",
        direccion: "Zona Sur, Calle 1",
      },
    }),
    prisma.cliente.create({
      data: {
        nombre: "María",
        apellido: "García",
        cedula: "7654321",
        telefono: "72345678",
        direccion: "Zona Centro, Av. 2",
      },
    }),
  ]);

  console.log(`✅ ${clientes.length} clientes creados`);

  // ==========================================
  // CONFIGURACIÓN
  // ==========================================
  console.log("⚙️  Creando configuración...");

  await Promise.all([
    prisma.configuracion.create({
      data: {
        clave: "empresa_nombre",
        valor: "Licorería El Buen Gusto",
        descripcion: "Nombre de la empresa",
        tipo: "string",
      },
    }),
    prisma.configuracion.create({
      data: {
        clave: "empresa_nit",
        valor: "123456789",
        descripcion: "NIT de la empresa",
        tipo: "string",
      },
    }),
    prisma.configuracion.create({
      data: {
        clave: "backup_automatico",
        valor: "true",
        descripcion: "Activar respaldos automáticos",
        tipo: "boolean",
      },
    }),
    prisma.configuracion.create({
      data: {
        clave: "backup_hora",
        valor: "03:00",
        descripcion: "Hora de respaldo automático",
        tipo: "string",
      },
    }),
    prisma.configuracion.create({
      data: {
        clave: "moneda",
        valor: "BOB",
        descripcion: "Moneda del sistema",
        tipo: "string",
      },
    }),
  ]);

  console.log("✅ Configuración creada");

  console.log("\n✨ Seed completado exitosamente!\n");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

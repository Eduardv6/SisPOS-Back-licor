import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed de base de datos...");
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
        valor: "Licorería Brasil",
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

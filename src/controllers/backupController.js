import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

export const exportData = async (req, res) => {
  try {
    const data = {
      usuarios: await prisma.usuario.findMany(),
      sucursales: await prisma.sucursal.findMany(),
      categorias: await prisma.categoria.findMany(),
      productos: await prisma.producto.findMany(),
      historial_precios: await prisma.historialPrecio.findMany(),
      inventarios: await prisma.inventario.findMany(),
      movimientos_inventario: await prisma.movimientoInventario.findMany(),
      transferencias_sucursales: await prisma.transferenciaSucursal.findMany(),
      detalles_transferencia: await prisma.detalleTransferencia.findMany(),
      ventas: await prisma.venta.findMany(),
      detalles_venta: await prisma.detalleVenta.findMany(),
      clientes: await prisma.cliente.findMany(),
      aperturas_caja: await prisma.aperturaCaja.findMany(),
      movimientos_caja: await prisma.movimientoCaja.findMany(),
      audit_logs: await prisma.auditLog.findMany(),
      configuracion: await prisma.configuracion.findMany(),
      metadata: {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        exportedBy: req.user?.username || "sistema",
      },
    };

    // Registrar el respaldo en la base de datos
    await prisma.backup.create({
      data: {
        nombre: `backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
        tamano:
          (JSON.stringify(data).length / (1024 * 1024)).toFixed(2) + " MB",
        tipo: "Manual",
        usuarioId: req.user?.id || null,
      },
    });

    res.json(data);
  } catch (error) {
    console.error("Export Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error al exportar los datos" });
  }
};

export const importData = async (req, res) => {
  const data = req.body;

  if (!data || typeof data !== "object") {
    return res
      .status(400)
      .json({ success: false, message: "Datos de respaldo inválidos" });
  }

  try {
    // Usar una transacción masiva para asegurar integridad
    await prisma.$transaction(
      async (tx) => {
        // 1. Deshabilitar temporalmente los logs si fuera necesario o simplemente limpiar en orden inverso de dependencia

        // ELIMINAR DATOS EXISTENTES (Orden de dependencia inverso)
        await tx.auditLog.deleteMany();
        await tx.movimientoCaja.deleteMany();
        await tx.aperturaCaja.deleteMany();
        await tx.detalleVenta.deleteMany();
        await tx.venta.deleteMany();
        await tx.detalleTransferencia.deleteMany();
        await tx.transferenciaSucursal.deleteMany();
        await tx.movimientoInventario.deleteMany();
        await tx.inventario.deleteMany();
        await tx.historialPrecio.deleteMany();
        await tx.producto.deleteMany();
        await tx.categoria.deleteMany();
        await tx.sucursal.deleteMany();
        await tx.cliente.deleteMany();
        await tx.configuracion.deleteMany();
        // Opcional: No borrar usuarios para no perder acceso, o borrar y re-insertar todos asegurando que el actual esté.
        // Por seguridad en este flujo, borraremos todos y el usuario deberá re-loguear si su ID o pass cambió.
        await tx.usuario.deleteMany();

        // INSERTAR DATOS (Orden de dependencia correcto)
        if (data.usuarios) await tx.usuario.createMany({ data: data.usuarios });
        if (data.sucursales)
          await tx.sucursal.createMany({ data: data.sucursales });
        if (data.categorias)
          await tx.categoria.createMany({ data: data.categorias });
        if (data.clientes) await tx.cliente.createMany({ data: data.clientes });
        if (data.productos)
          await tx.producto.createMany({ data: data.productos });
        if (data.historial_precios)
          await tx.historialPrecio.createMany({ data: data.historial_precios });
        if (data.inventarios)
          await tx.inventario.createMany({ data: data.inventarios });
        if (data.movimientos_inventario)
          await tx.movimientoInventario.createMany({
            data: data.movimientos_inventario,
          });
        if (data.transferencias_sucursales)
          await tx.transferenciaSucursal.createMany({
            data: data.transferencias_sucursales,
          });
        if (data.detalles_transferencia)
          await tx.detalleTransferencia.createMany({
            data: data.detalles_transferencia,
          });
        if (data.ventas) await tx.venta.createMany({ data: data.ventas });
        if (data.detalles_venta)
          await tx.detalleVenta.createMany({ data: data.detalles_venta });
        if (data.aperturas_caja)
          await tx.aperturaCaja.createMany({ data: data.aperturas_caja });
        if (data.movimientos_caja)
          await tx.movimientoCaja.createMany({ data: data.movimientos_caja });
        if (data.audit_logs)
          await tx.auditLog.createMany({ data: data.audit_logs });
        if (data.configuracion)
          await tx.configuracion.createMany({ data: data.configuracion });
      },
      {
        timeout: 30000, // Aumentar timeout para backups grandes
      },
    );

    res.json({
      success: true,
      message: "Base de datos restaurada correctamente",
    });
  } catch (error) {
    console.error("Import Error:", error);
    res.status(500).json({
      success: false,
      message: "Error al restaurar los datos: " + error.message,
    });
  }
};

export const getBackupHistory = async (req, res) => {
  try {
    const history = await prisma.backup.findMany({
      orderBy: { fecha: "desc" },
      include: {
        usuario: {
          select: { nombre: true, username: true },
        },
      },
    });
    res.json(history);
  } catch (error) {
    console.error("History Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error al obtener el historial" });
  }
};
// Función interna para el cron (sin req/res)
export const runAutomaticBackupInternal = async () => {
  try {
    const data = {
      usuarios: await prisma.usuario.findMany(),
      sucursales: await prisma.sucursal.findMany(),
      categorias: await prisma.categoria.findMany(),
      productos: await prisma.producto.findMany(),
      historial_precios: await prisma.historialPrecio.findMany(),
      inventarios: await prisma.inventario.findMany(),
      movimientos_inventario: await prisma.movimientoInventario.findMany(),
      transferencias_sucursales: await prisma.transferenciaSucursal.findMany(),
      detalles_transferencia: await prisma.detalleTransferencia.findMany(),
      ventas: await prisma.venta.findMany(),
      detalles_venta: await prisma.detalleVenta.findMany(),
      clientes: await prisma.cliente.findMany(),
      aperturas_caja: await prisma.aperturaCaja.findMany(),
      movimientos_caja: await prisma.movimientoCaja.findMany(),
      audit_logs: await prisma.auditLog.findMany(),
      configuracion: await prisma.configuracion.findMany(),
      metadata: {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        exportedBy: "sistema_automatico",
      },
    };

    const filename = `backup_auto_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    const backupsDir = path.join(__dirname, "../../backups");

    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const filePath = path.join(backupsDir, filename);
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, content);

    // Registrar en BD
    await prisma.backup.create({
      data: {
        nombre: filename,
        tamano: (content.length / (1024 * 1024)).toFixed(2) + " MB",
        tipo: "Automático",
        usuarioId: null,
      },
    });

    console.log(`[Cron] Respaldo automático completado: ${filename}`);
  } catch (error) {
    console.error("[Cron] Error en respaldo automático:", error);
  }
};

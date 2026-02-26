import { PrismaClient } from "@prisma/client";
import { registrarAuditoria } from "../services/audit.service.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../config/cloudinary.js";

const prisma = new PrismaClient();

// --- Product Controller ---

export const getProducts = async (req, res) => {
  try {
    const products = await prisma.producto.findMany({
      where: {
        activo: true,
      },
      include: {
        categoria: true,
        inventarios: true,
        presentaciones: {
          where: { activo: true },
          orderBy: { cantidadBase: "asc" },
        },
      },
    });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener productos" });
  }
};

export const createProduct = async (req, res) => {
  try {
    const {
      nombre,
      codigoInterno,
      codigoBarras,
      categoriaId,
      precioVenta,
      precioCompra,
      stockMinimo,
      unidadMedida,
      marca,
      stockInicial,
      usuarioId,
      sucursalId,
      presentaciones, // JSON string: [{ nombre, cantidadBase, precioVenta }]
    } = req.body;

    let imagen = null;
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, "products");
      imagen = result.url;
    }

    // Parse presentaciones if it's a string
    let parsedPresentaciones = [];
    try {
      if (presentaciones) {
        parsedPresentaciones =
          typeof presentaciones === "string"
            ? JSON.parse(presentaciones)
            : presentaciones;
      }
    } catch (e) {
      console.error("Error parsing presentaciones:", e);
    }

    // 1. Create Product
    const newProduct = await prisma.producto.create({
      data: {
        nombre,
        codigoInterno,
        codigoBarras: codigoBarras || null,
        categoriaId: parseInt(categoriaId),
        precioVenta: parseFloat(precioVenta),
        precioCompra: parseFloat(precioCompra),
        stockMinimo: parseInt(stockMinimo) || 10,
        unidadMedida: unidadMedida || "UNIDAD",
        marca: marca || null,
        imagen: imagen || null,
        // Crear presentación default "Unidad" + las adicionales
        presentaciones: {
          create: [
            {
              nombre: "Unidad",
              cantidadBase: 1,
              precioVenta: parseFloat(precioVenta),
              esDefault: true,
            },
            ...parsedPresentaciones.map((p) => ({
              nombre: p.nombre,
              cantidadBase: parseInt(p.cantidadBase),
              precioVenta: parseFloat(p.precioVenta),
              esDefault: false,
            })),
          ],
        },
      },
      include: {
        categoria: true,
        presentaciones: true,
      },
    });

    // 2. Initial Inventory (Default to sucursalId 1 if not provided)
    const activeSucursalId = parseInt(sucursalId) || 1;

    const inventory = await prisma.inventario.upsert({
      where: {
        productoId_sucursalId: {
          productoId: newProduct.id,
          sucursalId: activeSucursalId,
        },
      },
      update: {
        stockActual: { increment: parseInt(stockInicial) || 0 },
      },
      create: {
        productoId: newProduct.id,
        sucursalId: activeSucursalId,
        stockActual: parseInt(stockInicial) || 0,
      },
    });

    // Log initial movement if stock > 0
    if (parseInt(stockInicial) > 0 && usuarioId) {
      await prisma.movimientoInventario.create({
        data: {
          inventarioId: inventory.id,
          productoId: newProduct.id,
          tipo: "ENTRADA_AJUSTE",
          cantidad: parseInt(stockInicial),
          cantidadAnterior: 0,
          cantidadNueva: parseInt(stockInicial),
          motivo: "Inventario Inicial",
          usuarioId: parseInt(usuarioId),
        },
      });
    }

    res.json(newProduct);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      const target = error.meta?.target;
      let msg = "Ya existe un producto con ese dato único.";
      if (target?.includes("codigoBarras"))
        msg = "El Código de Barras ya está registrado.";
      if (target?.includes("codigoInterno"))
        msg = "El Código Interno ya está registrado.";

      return res.status(400).json({ message: msg });
    }
    res
      .status(500)
      .json({ message: "Error al crear el producto", error: error.message });
  }
};

export const updateProduct = async (req, res) => {
  const { id } = req.params;
  const {
    nombre,
    codigoInterno,
    codigoBarras,
    categoriaId,
    stockMinimo,
    precioCompra,
    precioVenta,
    unidadMedida,
    marca,
    sucursalId,
    presentaciones, // JSON string: [{ id?, nombre, cantidadBase, precioVenta }]
  } = req.body;
  const usuarioId = req.user?.id;

  try {
    const productoAnterior = await prisma.producto.findUnique({
      where: { id: parseInt(id) },
      include: { presentaciones: true },
    });

    if (!productoAnterior) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    const updateData = {
      nombre,
      codigoInterno,
      codigoBarras: codigoBarras || null,
      categoriaId: parseInt(categoriaId),
      stockMinimo: parseInt(stockMinimo),
      precioCompra: parseFloat(precioCompra),
      precioVenta: parseFloat(precioVenta),
      unidadMedida,
      marca: marca || null,
    };

    if (req.file) {
      if (productoAnterior.imagen) {
        await deleteFromCloudinary(productoAnterior.imagen);
      }
      const result = await uploadToCloudinary(req.file.buffer, "products");
      updateData.imagen = result.url;
    }

    const productoNuevo = await prisma.producto.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    // Update presentaciones
    let parsedPresentaciones = [];
    try {
      if (presentaciones) {
        parsedPresentaciones =
          typeof presentaciones === "string"
            ? JSON.parse(presentaciones)
            : presentaciones;
      }
    } catch (e) {
      console.error("Error parsing presentaciones:", e);
    }

    if (parsedPresentaciones.length > 0) {
      // Get existing presentacion IDs
      const existingIds = productoAnterior.presentaciones.map((p) => p.id);
      const incomingIds = parsedPresentaciones
        .filter((p) => p.id)
        .map((p) => p.id);

      // Delete presentaciones that are no longer in the list (except default)
      const toDelete = existingIds.filter(
        (existingId) =>
          !incomingIds.includes(existingId) &&
          !productoAnterior.presentaciones.find(
            (p) => p.id === existingId && p.esDefault,
          ),
      );

      if (toDelete.length > 0) {
        await prisma.presentacion.deleteMany({
          where: { id: { in: toDelete } },
        });
      }

      // Upsert each presentacion
      for (const pres of parsedPresentaciones) {
        if (pres.id) {
          // Update existing
          await prisma.presentacion.update({
            where: { id: pres.id },
            data: {
              nombre: pres.nombre,
              cantidadBase: parseInt(pres.cantidadBase),
              precioVenta: parseFloat(pres.precioVenta),
            },
          });
        } else {
          // Create new
          await prisma.presentacion.create({
            data: {
              productoId: parseInt(id),
              nombre: pres.nombre,
              cantidadBase: parseInt(pres.cantidadBase),
              precioVenta: parseFloat(pres.precioVenta),
              esDefault: false,
            },
          });
        }
      }

      // Always sync default "Unidad" presentation price with product precioVenta
      const existingDefault = await prisma.presentacion.findFirst({
        where: { productoId: parseInt(id), esDefault: true },
      });
      if (existingDefault) {
        await prisma.presentacion.update({
          where: { id: existingDefault.id },
          data: { precioVenta: parseFloat(precioVenta) },
        });
      } else {
        // Create default if it doesn't exist (for products created before presentations system)
        await prisma.presentacion.create({
          data: {
            productoId: parseInt(id),
            nombre: "Unidad",
            cantidadBase: 1,
            precioVenta: parseFloat(precioVenta),
            esDefault: true,
          },
        });
      }
    }

    // Always ensure default "Unidad" presentation exists (even if no presentations were sent)
    const defaultExists = await prisma.presentacion.findFirst({
      where: { productoId: parseInt(id), esDefault: true },
    });
    if (!defaultExists) {
      await prisma.presentacion.create({
        data: {
          productoId: parseInt(id),
          nombre: "Unidad",
          cantidadBase: 1,
          precioVenta: parseFloat(precioVenta),
          esDefault: true,
        },
      });
    }

    // Registrar cambios de precio en historial si cambiaron
    if (
      (productoAnterior.precioVenta.toNumber() !==
        productoNuevo.precioVenta.toNumber() ||
        productoAnterior.precioCompra.toNumber() !==
          productoNuevo.precioCompra.toNumber()) &&
      usuarioId
    ) {
      await prisma.historialPrecio.create({
        data: {
          productoId: productoNuevo.id,
          precioAnterior: productoAnterior.precioVenta,
          precioNuevo: productoNuevo.precioVenta,
          costoAnterior: productoAnterior.precioCompra,
          costoNuevo: productoNuevo.precioCompra,
          motivo: "Actualización manual de producto",
          usuarioId: parseInt(usuarioId),
        },
      });
    }

    // Auditoría
    if (usuarioId) {
      await registrarAuditoria({
        usuarioId,
        accion: "UPDATE_PRODUCT",
        tabla: "productos",
        registroId: productoNuevo.id,
        datosAnteriores: productoAnterior,
        datosNuevos: productoNuevo,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
    }

    // Return updated product with presentaciones
    const result = await prisma.producto.findUnique({
      where: { id: parseInt(id) },
      include: {
        categoria: true,
        presentaciones: {
          where: { activo: true },
          orderBy: { cantidadBase: "asc" },
        },
        inventarios: true,
      },
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      const target = error.meta?.target;
      let msg = "Ya existe un producto con ese dato único.";
      if (target?.includes("codigoBarras"))
        msg = "El Código de Barras ya está registrado.";
      if (target?.includes("codigoInterno"))
        msg = "El Código Interno ya está registrado.";

      return res.status(400).json({ message: msg });
    }
    res
      .status(500)
      .json({ message: "Error al actualizar producto", error: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  const { id } = req.params;
  const usuarioId = req.user?.id;

  try {
    const producto = await prisma.producto.findUnique({
      where: { id: parseInt(id) },
    });
    if (!producto)
      return res.status(404).json({ message: "Producto no encontrado" });

    // Soft Delete: Set activo = false
    const productoEliminado = await prisma.producto.update({
      where: { id: parseInt(id) },
      data: { activo: false },
    });

    if (usuarioId) {
      await registrarAuditoria({
        usuarioId,
        accion: "DELETE_PRODUCT_SOFT",
        tabla: "productos",
        registroId: parseInt(id),
        datosAnteriores: producto,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
    }

    res.json({ success: true, message: "Producto eliminado correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al eliminar producto" });
  }
};

import { PrismaClient } from "@prisma/client";
import { registrarAuditoria } from "../services/audit.service.js";

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
        inventarios: true, // Include inventory to get stock
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
      marca, // New field
      // stockActual - handled via inventory
      stockInicial, // Optional: for initial inventory
      usuarioId,
      sucursalId,
    } = req.body;

    const imagen = req.file ? `/uploads/products/${req.file.filename}` : null;

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
      },
      include: {
        categoria: true,
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
    sucursalId, // For audit if needed, or if we track specific updates per branch context
  } = req.body;
  const usuarioId = req.user?.id;

  try {
    const productoAnterior = await prisma.producto.findUnique({
      where: { id: parseInt(id) },
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
      updateData.imagen = `/uploads/products/${req.file.filename}`;
    }

    const productoNuevo = await prisma.producto.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

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

    res.json(productoNuevo);
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

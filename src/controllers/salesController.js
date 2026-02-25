import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Obtener productos para el POS (optimizado)
export const getPosProducts = async (req, res) => {
  try {
    const { search, category } = req.query;

    const where = {
      activo: true, // Solo productos activos
    };

    if (search) {
      where.OR = [
        { nombre: { contains: search } },
        { codigoInterno: { contains: search } },
        { codigoBarras: { contains: search } },
      ];
    }

    if (category && category !== "all" && category !== "") {
      if (!isNaN(parseInt(category))) {
        where.categoriaId = parseInt(category);
      }
    }

    // Buscar productos con sus inventarios
    const products = await prisma.producto.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        // codigo: true, // codigo no existe en schema, es codigoInterno o codigoBarras
        codigoInterno: true,
        codigoBarras: true,
        precioVenta: true,
        imagen: true,
        categoria: {
          select: { nombre: true },
        },
        inventarios: {
          select: { stockActual: true },
        },
      },
      take: 50,
    });

    // Filtrar y mapear stock
    const mappedProducts = products
      .map((p) => {
        const totalStock = p.inventarios.reduce(
          (sum, inv) => sum + inv.stockActual,
          0,
        );
        return {
          id: p.id,
          nombre: p.nombre,
          codigo: p.codigoInterno,
          precio: parseFloat(p.precioVenta), // Mapping price to 'precio' or 'price' expected by frontend? Frontend uses 'precioVenta'?
          // Frontend POS.jsx uses: product.precioVenta (rendering) and product.stock.
          // Actually frontend implementation:
          // product.precioVenta (rendering) and product.stock.
          // So we return 'precioVenta' and 'stock'.
          precioVenta: parseFloat(p.precioVenta),
          stock: totalStock,
          category: p.categoria?.nombre,
          imagen: p.imagen,
          codigoBarras: p.codigoBarras,
          codigoInterno: p.codigoInterno,
        };
      })
      .filter((p) => p.stock > 0);

    res.json(mappedProducts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener productos" });
  }
};

// Crear nueva venta
export const createSale = async (req, res) => {
  try {
    const {
      items,
      metodoPago,
      clienteId,
      descuento = 0,
      montoRecibido,
    } = req.body;
    const usuarioId = req.user.id;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "El carrito está vacío" });
    }

    // 1. Verificar Caja Abierta del Usuario
    const aperturaCaja = await prisma.aperturaCaja.findFirst({
      where: {
        usuarioId: usuarioId,
        estado: "ABIERTA",
      },
    });

    if (!aperturaCaja) {
      return res.status(400).json({
        message:
          "No tienes una caja abierta. Por favor abre caja antes de vender.",
      });
    }

    // 2. Calcular totales y preparar transacciones
    let subtotal = 0;
    const detallesVenta = [];

    // We need to update INVENTARIO, not Producto.
    // Assuming Sucursal Principal (ID 1) for now since logic for branches is undefined/removed.
    const sucursalId = 1;

    // Validar stock y precios
    for (const item of items) {
      // Fetch Product and specific Inventory
      const producto = await prisma.producto.findUnique({
        where: { id: item.id },
        include: {
          inventarios: {
            where: { sucursalId },
            take: 1,
          },
        },
      });

      if (!producto) {
        return res
          .status(404)
          .json({ message: `Producto no encontrado: ID ${item.id}` });
      }

      const inventario = producto.inventarios[0];

      if (!inventario) {
        return res.status(400).json({
          message: `Producto ${producto.nombre} no tiene inventario en Sucursal Principal`,
        });
      }

      if (inventario.stockActual < item.quantity) {
        return res.status(400).json({
          message: `Stock insuficiente para ${producto.nombre}. Disponible: ${inventario.stockActual}`,
        });
      }

      const itemTotal = Number(producto.precioVenta) * item.quantity;
      subtotal += itemTotal;

      detallesVenta.push({
        productoId: producto.id,
        cantidad: item.quantity,
        precioUnitario: producto.precioVenta,
        subtotal: itemTotal,
        total: itemTotal, // Asumiendo sin descuento por item por ahora
      });
    }

    const total = subtotal - (parseFloat(descuento) || 0);

    // Generar número de venta simple
    const numeroVenta = `V-${Date.now()}`;

    // 3. Transacción
    await prisma.$transaction(async (tx) => {
      // a) Crear Venta
      const nuevaVenta = await tx.venta.create({
        data: {
          numeroVenta,
          sucursalId,
          usuarioId,
          clienteId: clienteId ? parseInt(clienteId) : null,
          subtotal,
          descuento,
          total,
          metodoPago: metodoPago, // 'QR' or 'EFECTIVO'
          estado: "COMPLETADA",
          detalles: {
            create: detallesVenta,
          },
        },
      });

      // b) Actualizar Inventario (Stock)
      for (const item of items) {
        // Find inventario id again or updateMany
        await tx.inventario.updateMany({
          where: {
            productoId: item.id,
            sucursalId,
          },
          data: {
            stockActual: { decrement: item.quantity },
          },
        });

        // Registrar movimiento inventario (SALIDA_VENTA)
        // Need to find inventario ID for relation
        const inv = await tx.inventario.findUnique({
          where: {
            productoId_sucursalId: { productoId: item.id, sucursalId },
          },
        });

        if (inv) {
          await tx.movimientoInventario.create({
            data: {
              inventarioId: inv.id,
              productoId: item.id,
              tipo: "SALIDA_VENTA", // Ensure this enum exists or use SALIDA
              cantidad: item.quantity,
              cantidadAnterior: inv.stockActual + item.quantity, // approximate (before decrement)
              cantidadNueva: inv.stockActual,
              motivo: `Venta #${numeroVenta}`,
              referencia: numeroVenta,
              usuarioId,
            },
          });
        }
      }

      // c) Registrar Movimiento de Caja
      await tx.movimientoCaja.create({
        data: {
          aperturaCajaId: aperturaCaja.id,
          tipo: "VENTA",
          monto: total,
          metodoPago: metodoPago, // 'QR' or 'EFECTIVO'
          concepto: `Venta #${numeroVenta}`,
          fecha: new Date(),
        },
      });

      return nuevaVenta;
    });

    res.status(201).json({
      message: "Venta realizada con éxito",
      ventaId: numeroVenta,
      cambio: montoRecibido ? montoRecibido - total : 0,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error al procesar la venta", error: error.message });
  }
};

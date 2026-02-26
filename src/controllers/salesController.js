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

    // Buscar productos con sus inventarios y presentaciones
    const products = await prisma.producto.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        codigoInterno: true,
        codigoBarras: true,
        precioVenta: true,
        imagen: true,
        unidadMedida: true,
        categoria: {
          select: { nombre: true },
        },
        inventarios: {
          select: { stockActual: true },
        },
        presentaciones: {
          where: { activo: true },
          select: {
            id: true,
            nombre: true,
            cantidadBase: true,
            precioVenta: true,
            esDefault: true,
          },
          orderBy: { cantidadBase: "asc" },
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
          precioVenta: parseFloat(p.precioVenta),
          stock: totalStock,
          category: p.categoria?.nombre,
          imagen: p.imagen,
          codigoBarras: p.codigoBarras,
          codigoInterno: p.codigoInterno,
          unidadMedida: p.unidadMedida,
          presentaciones: p.presentaciones.map((pres) => ({
            id: pres.id,
            nombre: pres.nombre,
            cantidadBase: pres.cantidadBase,
            precioVenta: parseFloat(pres.precioVenta),
            esDefault: pres.esDefault,
          })),
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

    const sucursalId = 1;

    // Validar stock y precios
    for (const item of items) {
      const producto = await prisma.producto.findUnique({
        where: { id: item.id },
        include: {
          inventarios: {
            where: { sucursalId },
            take: 1,
          },
          presentaciones: true,
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

      // Determinar presentación y cantidad real de unidades base
      let precioUnitario;
      let cantidadBaseTotal;

      if (item.presentacionId) {
        // Buscar la presentación
        const presentacion = producto.presentaciones.find(
          (p) => p.id === item.presentacionId,
        );
        if (!presentacion) {
          return res.status(400).json({
            message: `Presentación no encontrada para ${producto.nombre}`,
          });
        }
        precioUnitario = Number(presentacion.precioVenta);
        cantidadBaseTotal = item.quantity * presentacion.cantidadBase;
      } else {
        // Sin presentación → usar precio del producto directamente (compatibilidad)
        precioUnitario = Number(producto.precioVenta);
        cantidadBaseTotal = item.quantity;
      }

      if (inventario.stockActual < cantidadBaseTotal) {
        return res.status(400).json({
          message: `Stock insuficiente para ${producto.nombre}. Disponible: ${inventario.stockActual} unidades base, requerido: ${cantidadBaseTotal}`,
        });
      }

      const itemTotal = precioUnitario * item.quantity;
      subtotal += itemTotal;

      detallesVenta.push({
        productoId: producto.id,
        cantidad: item.quantity,
        precioUnitario: precioUnitario,
        subtotal: itemTotal,
        total: itemTotal,
        // Store real base quantity for inventory deduction
        _cantidadBaseTotal: cantidadBaseTotal,
        _inventarioId: inventario.id,
        _stockAnterior: inventario.stockActual,
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
          metodoPago: metodoPago,
          estado: "COMPLETADA",
          detalles: {
            create: detallesVenta.map((d) => ({
              productoId: d.productoId,
              cantidad: d.cantidad,
              precioUnitario: d.precioUnitario,
              subtotal: d.subtotal,
              total: d.total,
            })),
          },
        },
      });

      // b) Actualizar Inventario (Stock) — descontar en unidades base
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const detalle = detallesVenta[i];

        await tx.inventario.updateMany({
          where: {
            productoId: item.id,
            sucursalId,
          },
          data: {
            stockActual: { decrement: detalle._cantidadBaseTotal },
          },
        });

        // Registrar movimiento inventario (SALIDA_VENTA)
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
              tipo: "SALIDA_VENTA",
              cantidad: detalle._cantidadBaseTotal,
              cantidadAnterior: detalle._stockAnterior,
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
          metodoPago: metodoPago,
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

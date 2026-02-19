import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Obtener estadísticas para el dashboard
export const getInventoryStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Ingresos de hoy (suma de cantidades positivas en movimientos de hoy)
    const ingresosHoy = await prisma.movimientoInventario.aggregate({
      _sum: {
        cantidad: true,
      },
      where: {
        fechaMovimiento: {
          gte: today,
        },
        tipo: {
          in: [
            "ENTRADA_COMPRA",
            "ENTRADA_DEVOLUCION",
            "ENTRADA_AJUSTE",
            "TRANSFERENCIA_ENTRADA",
          ],
        },
      },
    });

    // 2. Salidas de hoy (suma de cantidades en movimientos de salida de hoy)
    const salidasHoy = await prisma.movimientoInventario.aggregate({
      _sum: {
        cantidad: true,
      },
      where: {
        fechaMovimiento: {
          gte: today,
        },
        tipo: {
          in: [
            "SALIDA_VENTA",
            "SALIDA_MERMA",
            "SALIDA_AJUSTE",
            "TRANSFERENCIA_SALIDA",
          ],
        },
      },
    });

    // 3. Total de productos con stock > 0 (o total de items físicos)
    // Opción A: Suma total de stock de todos los inventarios
    const totalStock = await prisma.inventario.aggregate({
      _sum: {
        stockActual: true,
      },
    });

    // Opción B: Cantidad de productos únicos con stock (como dice "1,247 productos")
    const productosConStock = await prisma.inventario.count({
      where: {
        stockActual: {
          gt: 0,
        },
      },
    });

    // 4. Movimientos del mes
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const movimientosMes = await prisma.movimientoInventario.count({
      where: {
        fechaMovimiento: {
          gte: firstDayOfMonth,
        },
      },
    });

    // Check previous month for comparison (mocking +15% logic or calculating real)
    // For now returning raw numbers

    res.json({
      ingresosHoy: ingresosHoy._sum.cantidad || 0,
      salidasHoy: Math.abs(salidasHoy._sum.cantidad || 0),
      totalProductosStock: totalStock._sum.stockActual || 0, // Total items count
      productosUnicos: productosConStock,
      movimientosMes: movimientosMes,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener estadísticas" });
  }
};

// Obtener historial de movimientos con filtros
export const getMovements = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      type,
      warehouseId,
      startDate,
      endDate,
    } = req.query;
    const skip = (page - 1) * limit;

    const where = {};

    // Filtro por tipo
    if (type) {
      // Map frontend types to backend enums
      // ingreso -> ENTRADA_COMPRA, ENTRADA_...
      // salida -> SALIDA_...
      if (type === "ingreso")
        where.tipo = {
          in: ["ENTRADA_COMPRA", "ENTRADA_DEVOLUCION", "ENTRADA_AJUSTE"],
        };
      else if (type === "salida")
        where.tipo = { in: ["SALIDA_VENTA", "SALIDA_MERMA", "SALIDA_AJUSTE"] };
      else if (type === "transferencia")
        where.tipo = { in: ["TRANSFERENCIA_ENTRADA", "TRANSFERENCIA_SALIDA"] };
      else if (type === "ajuste")
        where.tipo = { in: ["ENTRADA_AJUSTE", "SALIDA_AJUSTE"] }; // Ajuste can be both
    }

    // Filtro por almacén (sucursal)
    if (warehouseId) {
      where.inventario = {
        sucursalId: parseInt(warehouseId),
      };
    }

    // Filtro por fechas
    if (startDate && endDate) {
      where.fechaMovimiento = {
        gte: new Date(startDate),
        lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    }

    // Búsqueda (Producto o Usuario)
    if (search) {
      where.OR = [
        { producto: { nombre: { contains: search } } },
        { producto: { codigoInterno: { contains: search } } },
        { usuario: { nombre: { contains: search } } },
        { motivo: { contains: search } },
      ];
    }

    const [movements, total] = await Promise.all([
      prisma.movimientoInventario.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { fechaMovimiento: "desc" },
        include: {
          producto: {
            select: { nombre: true, codigoInterno: true },
          },
          usuario: {
            select: { username: true, nombre: true, apellido: true },
          },
          inventario: {
            include: { sucursal: true },
          },
        },
      }),
      prisma.movimientoInventario.count({ where }),
    ]);

    res.json({
      data: movements,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener movimientos" });
  }
};

// Registrar un nuevo movimiento (Ingreso, Salida, Ajuste)
export const createMovement = async (req, res) => {
  const {
    tipo, // ingreso, salida, ajuste
    productoId,
    cantidad,
    almacenOrigenId,
    motivo,
    observaciones,
    usuarioId,
  } = req.body;

  if (!productoId || !cantidad || !almacenOrigenId || !tipo) {
    return res.status(400).json({ message: "Faltan datos requeridos" });
  }

  const cant = parseInt(cantidad);
  if (cant <= 0)
    return res.status(400).json({ message: "La cantidad debe ser mayor a 0" });

  try {
    // Iniciar transacción para asegurar integridad
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verificar inventario existente
      let inventario = await tx.inventario.findUnique({
        where: {
          productoId_sucursalId: {
            productoId: parseInt(productoId),
            sucursalId: parseInt(almacenOrigenId),
          },
        },
      });

      // Si no existe inventario y es ingreso/ajuste positivo, crearlo
      if (!inventario) {
        if (tipo === "salida" || (tipo === "ajuste" && cant < 0)) {
          // This logic depends on how frontend sends adjustment quantity
          throw new Error(
            "No existe inventario para este producto en el almacén seleccionado.",
          );
        }
        inventario = await tx.inventario.create({
          data: {
            productoId: parseInt(productoId),
            sucursalId: parseInt(almacenOrigenId),
            stockActual: 0,
          },
        });
      }

      let nuevoStock = inventario.stockActual;
      let tipoMovimientoDB = "";
      let cantidadCambio = 0; // Para guardar en MovimientoInventario

      // 2. Determinar tipo y nuevo stock
      if (tipo === "ingreso") {
        nuevoStock += cant;
        tipoMovimientoDB = "ENTRADA_COMPRA"; // Default for ingreso button
        if (motivo === "compra") tipoMovimientoDB = "ENTRADA_COMPRA";
        cantidadCambio = cant;
      } else if (tipo === "salida") {
        if (inventario.stockActual < cant) {
          throw new Error(
            `Stock insuficiente. Disponible: ${inventario.stockActual}`,
          );
        }
        nuevoStock -= cant;
        tipoMovimientoDB = "SALIDA_VENTA"; // Default
        if (motivo === "venta") tipoMovimientoDB = "SALIDA_VENTA";
        cantidadCambio = -cant; // Negative for output
      } else if (tipo === "ajuste") {
        // For Ajuste, frontend might send positive or negative or we rely on explicit user choice.
        // Usually ajuste modal has "Cantidad" input.
        // Logic: If user says "Ajuste" and rationale is "Daño", it's usually negative.
        // If rationale is "Inventario Inicial olvido", positive.
        // Let's assume frontend sends a signed integer OR we infer from context?
        // The screenshot shows "Ajuste" and "Productos dañados" with "-3".
        // So frontend sends positive number likely, but logic determines sign?
        // Or frontend sends signed number?

        // Simplification: We will trust the sign coming from frontend if it allows it, OR
        // we need a field "tipoAjuste" (Increase/Decrease).

        // Standardizing: Assume `cantidad` is absolute. check `motivo` or specific `subtipo`.
        // If frontend sends generic "ajuste", we default to check if it's positive/negative logic?
        // WAITING: For now, I'll assume 'ingreso' adds and 'salida' subtracts.
        // 'ajuste' is tricky. Let's look at frontend modal. It just has "Cantidad".
        // We'll treat 'ajuste' as: if 'observaciones' or specific param says Decrease, we decrease.

        // BETTER APPROACH: Add `operacion` param (sumar/restar) or deduce from `tipo`.
        // Screenshot has "Ajuste" -3.

        // Let's assume for now Ajuste is Negative unless specified? No that's risky.
        // Let's map certain motives to negative.
        const motivosRestar = [
          "daño",
          "merma",
          "robo",
          "vencimiento",
          "perdida",
          "consumo",
        ];
        const isNegative =
          motivosRestar.some((m) => motivo.toLowerCase().includes(m)) ||
          motivo.toLowerCase().includes("salida");

        if (isNegative) {
          if (inventario.stockActual < cant)
            throw new Error("Stock insuficiente para ajuste negativo");
          nuevoStock -= cant;
          tipoMovimientoDB = "SALIDA_AJUSTE";
          cantidadCambio = -cant;
        } else {
          nuevoStock += cant;
          tipoMovimientoDB = "ENTRADA_AJUSTE";
          cantidadCambio = cant;
        }
      }

      // 3. Actualizar Inventario
      await tx.inventario.update({
        where: { id: inventario.id },
        data: { stockActual: nuevoStock },
      });

      // 4. Registrar Movimiento
      const movimiento = await tx.movimientoInventario.create({
        data: {
          inventarioId: inventario.id,
          productoId: parseInt(productoId),
          tipo: tipoMovimientoDB,
          cantidad: cantidadCambio, // Save signed amount
          cantidadAnterior: inventario.stockActual,
          cantidadNueva: nuevoStock,
          motivo: motivo || "Manual",
          referencia: observaciones,
          usuarioId: parseInt(usuarioId),
        },
      });

      return movimiento;
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res
      .status(400)
      .json({ message: error.message || "Error al registrar movimiento" });
  }
};

// Transferencia entre sucursales
export const createTransfer = async (req, res) => {
  const {
    productoId,
    cantidad,
    almacenOrigenId,
    almacenDestinoId,
    motivo,
    observaciones,
    usuarioId,
  } = req.body;

  if (!productoId || !cantidad || !almacenOrigenId || !almacenDestinoId) {
    return res
      .status(400)
      .json({ message: "Datos incompletos para transferencia" });
  }

  // Simplification: Direct Transfer (Immediate) for now, or create TransferenciaSucursal ticket
  // Given the "Registrar Movimiento" modal simplicity, it looks like an immediate action.
  // However, schema has `TransferenciaSucursal`.
  // Let's implement immediate movement for now to match the "Movimiento" logic.
  // We will create TWO movements: Out from Origin, In to Destination.

  try {
    const cant = parseInt(cantidad);

    await prisma.$transaction(async (tx) => {
      // 1. Validate Origin Stock
      const invOrigen = await tx.inventario.findUnique({
        where: {
          productoId_sucursalId: {
            productoId: parseInt(productoId),
            sucursalId: parseInt(almacenOrigenId),
          },
        },
      });

      if (!invOrigen || invOrigen.stockActual < cant) {
        throw new Error("Stock insuficiente en origen");
      }

      // 2. Deduct from Origin
      await tx.inventario.update({
        where: { id: invOrigen.id },
        data: { stockActual: invOrigen.stockActual - cant },
      });

      await tx.movimientoInventario.create({
        data: {
          inventarioId: invOrigen.id,
          productoId: parseInt(productoId),
          tipo: "TRANSFERENCIA_SALIDA",
          cantidad: -cant,
          cantidadAnterior: invOrigen.stockActual,
          cantidadNueva: invOrigen.stockActual - cant,
          motivo: `Transferencia a Sucursal ${almacenDestinoId}`,
          usuarioId: parseInt(usuarioId),
          referencia: observaciones,
        },
      });

      // 3. Add to Destination
      // Find or create dest inventory
      let invDest = await tx.inventario.findUnique({
        where: {
          productoId_sucursalId: {
            productoId: parseInt(productoId),
            sucursalId: parseInt(almacenDestinoId),
          },
        },
      });

      if (!invDest) {
        invDest = await tx.inventario.create({
          data: {
            productoId: parseInt(productoId),
            sucursalId: parseInt(almacenDestinoId),
            stockActual: 0,
          },
        });
      }

      await tx.inventario.update({
        where: { id: invDest.id },
        data: { stockActual: invDest.stockActual + cant },
      });

      await tx.movimientoInventario.create({
        data: {
          inventarioId: invDest.id,
          productoId: parseInt(productoId),
          tipo: "TRANSFERENCIA_ENTRADA",
          cantidad: cant,
          cantidadAnterior: invDest.stockActual,
          cantidadNueva: invDest.stockActual + cant,
          motivo: `Recepción de Sucursal ${almacenOrigenId}`,
          usuarioId: parseInt(usuarioId),
          referencia: observaciones,
        },
      });
    });

    res.json({ message: "Transferencia realizada con éxito" });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message });
  }
};

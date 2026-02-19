import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 1. Dashboard Stats
export const getDashboardStats = async (req, res) => {
  try {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    if (endDate) endDate.setHours(23, 59, 59, 999);

    const where = { estado: "COMPLETADA" };
    if (startDate && endDate) {
      where.fecha = {
        gte: startDate,
        lte: endDate,
      };
    }

    const aggregate = await prisma.venta.aggregate({
      _sum: { total: true },
      _count: { id: true },
      where,
    });

    const totalVentas = Number(aggregate._sum.total || 0);
    const totalTransacciones = aggregate._count.id;
    const ticketPromedio =
      totalTransacciones > 0 ? totalVentas / totalTransacciones : 0;

    const uniqueClients = await prisma.venta.groupBy({
      by: ["clienteId"],
      where: { ...where, clienteId: { not: null } },
    });
    const clientesAtendidos = uniqueClients.length;

    res.json({
      totalVentas,
      totalTransacciones,
      ticketPromedio,
      clientesAtendidos,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error al obtener estadísticas generales" });
  }
};

// 2. Sales Chart
export const getSalesChart = async (req, res) => {
  try {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : new Date(new Date().setDate(new Date().getDate() - 7));
    const endDate = req.query.endDate
      ? new Date(req.query.endDate)
      : new Date();
    endDate.setHours(23, 59, 59, 999);
    startDate.setHours(0, 0, 0, 0);

    const ventas = await prisma.venta.findMany({
      where: {
        estado: "COMPLETADA",
        fecha: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { fecha: true, total: true },
      orderBy: { fecha: "asc" },
    });

    const grouped = {};
    ventas.forEach((v) => {
      const d = v.fecha.toISOString().split("T")[0];
      grouped[d] = (grouped[d] || 0) + Number(v.total);
    });

    const chartData = Object.keys(grouped)
      .map((date) => ({
        name: date,
        ventas: grouped[date],
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json(chartData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener gráfico de ventas" });
  }
};

// 3. Top Products
export const getTopProducts = async (req, res) => {
  try {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    if (endDate) endDate.setHours(23, 59, 59, 999);

    const where = {};
    if (startDate && endDate) {
      where.venta = {
        fecha: { gte: startDate, lte: endDate },
        estado: "COMPLETADA",
      };
    }

    const topProducts = await prisma.detalleVenta.groupBy({
      by: ["productoId"],
      _sum: {
        cantidad: true,
        total: true,
      },
      where,
      orderBy: {
        _sum: {
          total: "desc",
        },
      },
      take: 5,
    });

    const productDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.producto.findUnique({
          where: { id: item.productoId },
          include: { categoria: true },
        });
        return {
          id: item.productoId,
          name: product?.nombre || "Desconocido",
          category: product?.categoria?.nombre || "Sin categoría",
          units: item._sum.cantidad || 0,
          income: Number(item._sum.total || 0),
          percent: 0, // Calculated later if needed
        };
      }),
    );

    const totalIncome = productDetails.reduce(
      (acc, curr) => acc + curr.income,
      0,
    );
    const result = productDetails.map((p) => ({
      ...p,
      percent: totalIncome > 0 ? Math.round((p.income / totalIncome) * 100) : 0,
    }));

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener top productos" });
  }
};

// 4. Product Stats (Stock)
export const getProductStats = async (req, res) => {
  try {
    const totalProducts = await prisma.producto.count({
      where: { activo: true },
    });

    // Stock logic requires checking inventory. Assuming sucursalId=1 or aggregating all.
    // Simplification: sum all stock for product across all inventories (or specific sucursal if passed)
    // Let's get all active products with their inventories
    const products = await prisma.producto.findMany({
      where: { activo: true },
      include: { inventarios: true },
    });

    let stockTotal = 0;
    let stockLow = 0;
    let outOfStock = 0;
    const lowStockList = [];

    products.forEach((p) => {
      const currentStock = p.inventarios.reduce(
        (sum, inv) => sum + inv.stockActual,
        0,
      );
      if (currentStock === 0) outOfStock++;
      else if (currentStock <= p.stockMinimo) {
        stockLow++;
        if (lowStockList.length < 10) {
          lowStockList.push({
            id: p.id,
            name: p.nombre,
            code: p.codigoInterno,
            stock: currentStock,
            min: p.stockMinimo,
            status: currentStock === 0 ? "Crítico" : "Bajo",
            lastSale: "-", // Requires complex query to get last sale date
          });
        }
      }
      stockTotal += currentStock;
    });

    res.json({
      totalProducts,
      stockAvailable: products.length - outOfStock,
      stockLow,
      outOfStock,
      lowStockList,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error al obtener estadísticas de productos" });
  }
};

// 5. Inventory Stats
export const getInventoryStats = async (req, res) => {
  try {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    if (endDate) endDate.setHours(23, 59, 59, 999);

    const where = {};
    if (startDate && endDate) {
      where.fechaMovimiento = { gte: startDate, lte: endDate };
    }

    const movements = await prisma.movimientoInventario.groupBy({
      by: ["tipo"],
      _sum: { cantidad: true },
      where,
    });

    let totalIngresos = 0;
    let totalSalidas = 0;

    movements.forEach((m) => {
      if (m.tipo.startsWith("ENTRADA")) totalIngresos += m._sum.cantidad || 0;
      if (m.tipo.startsWith("SALIDA")) totalSalidas += m._sum.cantidad || 0;
    });

    const totalMovimientos = await prisma.movimientoInventario.count({ where });

    res.json({
      totalIngresos,
      totalSalidas,
      diferencia: totalIngresos - totalSalidas,
      totalMovimientos,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error al obtener estadísticas de inventario" });
  }
};

// 6. Cash Stats
export const getCashStats = async (req, res) => {
  try {
    // Current open cash registers summary
    const openRegisters = await prisma.aperturaCaja.findMany({
      where: { estado: "ABIERTA" },
      include: { movimientos: true },
    });

    let totalEfectivo = 0;
    let totalOtros = 0;
    let totalRecaudado = 0;

    openRegisters.forEach((caja) => {
      let cash = Number(caja.montoInicial);
      let other = 0;

      caja.movimientos.forEach((m) => {
        const monto = Number(m.monto);
        if (m.metodoPago === "EFECTIVO") {
          if (m.tipo === "VENTA" || m.tipo === "INGRESO_EXTRA") cash += monto;
          if (m.tipo === "RETIRO" || m.tipo === "GASTO") cash -= monto;
        } else {
          if (m.tipo === "VENTA") other += monto;
        }
      });

      totalEfectivo += cash;
      totalOtros += other;
    });

    totalRecaudado = totalEfectivo + totalOtros;

    // Closing History
    const history = await prisma.aperturaCaja.findMany({
      where: { estado: "CERRADA" },
      orderBy: { fechaCierre: "desc" },
      take: 10,
      include: { usuario: true },
    });

    const formattedHistory = history.map((h) => ({
      id: h.id,
      date: h.fechaCierre.toLocaleDateString(),
      cashier: h.usuario.nombre + " " + h.usuario.apellido,
      open: Number(h.montoInicial),
      sales: Number(h.totalVentas || 0),
      salesCash: Number(h.totalVentas || 0) - Number(h.totalQr || 0),
      salesQr: Number(h.totalQr || 0),
      close: Number(h.montoFinal || 0),
      diff: Number(h.diferencia || 0),
      status:
        Math.abs(Number(h.diferencia)) < 1 ? "Correcto" : "Faltante/Sobrante",
    }));

    res.json({
      efectivoEnCaja: totalEfectivo,
      otrosMetodos: totalOtros,
      totalRecaudado,
      turnosHoy: openRegisters.length,
      history: formattedHistory,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener estadísticas de caja" });
  }
};

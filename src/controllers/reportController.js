import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 1. Dashboard Stats
export const getDashboardStats = async (req, res) => {
  try {
    const startDate = req.query.startDate
      ? new Date(`${req.query.startDate}T00:00:00-04:00`)
      : null;
    const endDate = req.query.endDate
      ? new Date(`${req.query.endDate}T23:59:59.999-04:00`)
      : null;

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

    const salesDetails = await prisma.detalleVenta.findMany({
      where: { venta: where },
      include: {
        producto: {
          include: {
            categoria: {
              include: { parent: true },
            },
          },
        },
      },
    });

    const categorySalesMap = {};
    salesDetails.forEach((item) => {
      const rootCat =
        item.producto?.categoria?.parent || item.producto?.categoria;
      if (!rootCat) return;
      const catName = rootCat.nombre;
      const amount = Number(item.total);
      categorySalesMap[catName] = (categorySalesMap[catName] || 0) + amount;
    });

    const colors = [
      "#ef4444",
      "#10b981",
      "#f59e0b",
      "#3b82f6",
      "#8b5cf6",
      "#ec4899",
    ];
    let salesByCategory = Object.keys(categorySalesMap)
      .map((name, index) => ({
        name,
        value: categorySalesMap[name],
        color: colors[index % colors.length],
      }))
      .sort((a, b) => b.value - a.value);

    if (salesByCategory.length > 5) {
      const top5 = salesByCategory.slice(0, 5);
      const othersValue = salesByCategory
        .slice(5)
        .reduce((sum, item) => sum + item.value, 0);
      top5.push({ name: "Otros", value: othersValue, color: "#94a3b8" });
      salesByCategory = top5;
    }

    res.json({
      totalVentas,
      totalTransacciones,
      ticketPromedio,
      clientesAtendidos,
      salesByCategory,
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
      ? new Date(`${req.query.startDate}T00:00:00-04:00`)
      : new Date(new Date().setDate(new Date().getDate() - 7));
    const endDate = req.query.endDate
      ? new Date(`${req.query.endDate}T23:59:59.999-04:00`)
      : new Date();

    if (!req.query.endDate) endDate.setHours(23, 59, 59, 999);
    if (!req.query.startDate) startDate.setHours(0, 0, 0, 0);

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
      ? new Date(`${req.query.startDate}T00:00:00-04:00`)
      : null;
    const endDate = req.query.endDate
      ? new Date(`${req.query.endDate}T23:59:59.999-04:00`)
      : null;

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

    // Category distribution (only root categories)
    const productsForDistribution = await prisma.producto.findMany({
      where: { activo: true },
      include: {
        categoria: {
          include: { parent: true },
        },
      },
    });

    const rootCategoryMap = {};
    productsForDistribution.forEach((p) => {
      const rootCat = p.categoria.parent || p.categoria;
      const catName = rootCat.nombre;
      rootCategoryMap[catName] = (rootCategoryMap[catName] || 0) + 1;
    });

    const distribution = Object.keys(rootCategoryMap)
      .map((name) => ({
        name,
        value: rootCategoryMap[name],
      }))
      .sort((a, b) => b.value - a.value);

    // Rotation logic (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesDetails = await prisma.detalleVenta.groupBy({
      by: ["productoId"],
      _sum: { cantidad: true },
      where: {
        venta: {
          fecha: { gte: thirtyDaysAgo },
          estado: "COMPLETADA",
        },
      },
    });

    const salesMap = {};
    salesDetails.forEach((item) => {
      salesMap[item.productoId] = item._sum.cantidad || 0;
    });

    let alta = 0;
    let media = 0;
    let baja = 0;
    let sinMov = 0;

    products.forEach((p) => {
      const units = salesMap[p.id] || 0;
      if (units > 30) alta++;
      else if (units >= 10) media++;
      else if (units > 0) baja++;
      else sinMov++;
    });

    const rotation = [
      { name: "Alta", value: alta, color: "#10b981" },
      { name: "Media", value: media, color: "#3b82f6" },
      { name: "Baja", value: baja, color: "#f59e0b" },
      { name: "Sin Mov.", value: sinMov, color: "#ef4444" },
    ];

    res.json({
      totalProducts,
      stockAvailable: products.length - outOfStock,
      stockLow,
      outOfStock,
      lowStockList,
      distribution,
      rotation,
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
      ? new Date(`${req.query.startDate}T00:00:00-04:00`)
      : null;
    const endDate = req.query.endDate
      ? new Date(`${req.query.endDate}T23:59:59.999-04:00`)
      : null;

    const where = {};
    if (startDate && endDate) {
      where.fechaMovimiento = { gte: startDate, lte: endDate };
    }

    const movements = await prisma.movimientoInventario.findMany({
      where: {
        ...where,
        tipo: {
          notIn: ["TRANSFERENCIA_SALIDA", "TRANSFERENCIA_ENTRADA"],
        },
      },
    });

    let ingresos = 0;
    let salidas = 0;
    let ajustes = 0;

    movements.forEach((m) => {
      const type = m.tipo;
      if (type === "ENTRADA_COMPRA" || type === "ENTRADA_DEVOLUCION") {
        ingresos += m.cantidad;
      } else if (type === "SALIDA_VENTA" || type === "SALIDA_MERMA") {
        salidas += m.cantidad;
      } else if (type === "ENTRADA_AJUSTE") {
        ajustes += m.cantidad;
      } else if (type === "SALIDA_AJUSTE") {
        ajustes -= m.cantidad;
      }
    });

    const movementsByType = [
      { name: "Ingresos", value: ingresos, color: "#10b981" },
      { name: "Salidas", value: Math.abs(salidas), color: "#f59e0b" },
      { name: "Ajustes", value: Math.abs(ajustes), color: "#3b82f6" },
    ];

    // Stock Trend (last 4 weeks)
    const weeks = [];
    const now = new Date();
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      weeks.push(d);
    }

    // Get current total stock
    const inventories = await prisma.inventario.findMany({
      select: { stockActual: true },
    });
    const currentTotalStock = inventories.reduce(
      (sum, inv) => sum + inv.stockActual,
      0,
    );

    // Get movements from the earliest week until now to backtrack
    const earliestDate = weeks[0];
    const historicalMovements = await prisma.movimientoInventario.findMany({
      where: {
        fechaMovimiento: { gte: earliestDate },
      },
      select: { cantidad: true, tipo: true, fechaMovimiento: true },
    });

    const trendData = weeks.map((weekDate, index) => {
      // Find net change from this weekDate until now
      const netChangeFromThen = historicalMovements
        .filter((m) => m.fechaMovimiento > weekDate)
        .reduce((sum, m) => {
          if (m.tipo.startsWith("ENTRADA")) return sum + m.cantidad;
          if (m.tipo.startsWith("SALIDA")) return sum - m.cantidad;
          return sum;
        }, 0);

      const stockAtDate = currentTotalStock - netChangeFromThen;
      return {
        name: `Sem ${index + 1}`,
        stock: stockAtDate < 0 ? 0 : stockAtDate,
      };
    });

    res.json({
      totalIngresos: ingresos,
      totalSalidas: Math.abs(salidas),
      diferencia: ingresos - Math.abs(salidas),
      totalMovimientos: movements.length,
      movementsByType,
      stockTrend: trendData,
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
      take: 20,
      include: {
        usuario: true,
        movimientos: {
          orderBy: { fecha: "asc" },
        },
      },
    });

    const formattedHistory = history.map((h) => {
      let incomes = 0;
      let retiros = 0;
      const incomeDetails = [];
      const withdrawalDetails = [];

      h.movimientos.forEach((m) => {
        const monto = Number(m.monto);
        if (m.tipo === "INGRESO_EXTRA") {
          incomes += monto;
          incomeDetails.push({
            id: m.id,
            description: m.concepto,
            amount: monto,
            date: m.fecha,
          });
        } else if (m.tipo === "RETIRO" || m.tipo === "GASTO") {
          retiros += monto;
          withdrawalDetails.push({
            id: m.id,
            description: m.concepto,
            amount: monto,
            date: m.fecha,
          });
        }
      });

      const salesCash = Number(h.totalVentas || 0) - Number(h.totalQr || 0);
      const expectedBalance =
        Number(h.montoInicial) + salesCash + incomes - retiros;

      return {
        id: h.id,
        date: h.fechaCierre.toLocaleDateString(),
        fullDate: h.fechaCierre,
        openingDate: h.fechaApertura,
        cashier: h.usuario.nombre + " " + h.usuario.apellido,
        open: Number(h.montoInicial),
        sales: Number(h.totalVentas || 0),
        salesCash,
        salesQr: Number(h.totalQr || 0),
        incomes,
        retiros,
        expectedBalance,
        close: Number(h.montoFinal || 0),
        diff: Number(h.diferencia || 0),
        status:
          Math.abs(Number(h.diferencia)) < 1 ? "Correcto" : "Faltante/Sobrante",
        incomeDetails,
        withdrawalDetails,
      };
    });

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

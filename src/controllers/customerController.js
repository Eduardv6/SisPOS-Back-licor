import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Obtener estadísticas de clientes
export const getCustomerStats = async (req, res) => {
  try {
    const totalClientes = await prisma.cliente.count({
      where: { activo: true },
    });

    // Ventas del mes actual
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const ventasMes = await prisma.venta.aggregate({
      _sum: { total: true },
      where: {
        fecha: { gte: firstDayOfMonth },
        estado: "COMPLETADA",
        clienteId: { not: null },
      },
    });

    // Clientes activos (con compras en los últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const clientesActivos = await prisma.cliente.count({
      where: {
        activo: true,
        ventas: {
          some: {
            fecha: { gte: thirtyDaysAgo },
            estado: "COMPLETADA",
          },
        },
      },
    });

    // Clientes con descuento
    const conDescuento = await prisma.cliente.count({
      where: {
        activo: true,
        descuento: { gt: 0 },
      },
    });

    res.json({
      totalClientes,
      ventasMes: ventasMes._sum.total || 0,
      clientesActivos,
      conDescuento,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener estadísticas" });
  }
};

// Listar clientes con paginación y filtros
export const getCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, tipo } = req.query;
    const skip = (page - 1) * limit;

    const where = { activo: true };

    if (tipo) {
      where.tipo = tipo;
    }

    if (search) {
      where.OR = [
        { nombre: { contains: search } },
        { apellido: { contains: search } },
        { cedula: { contains: search } },
        { telefono: { contains: search } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.cliente.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { ventas: true },
          },
        },
      }),
      prisma.cliente.count({ where }),
    ]);

    res.json({
      data: customers,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener clientes" });
  }
};

// Crear cliente
export const createCustomer = async (req, res) => {
  try {
    const { nombre, apellido, cedula, telefono, email, tipo, descuento } =
      req.body;

    if (!nombre || !telefono) {
      return res
        .status(400)
        .json({ message: "Nombre y teléfono son requeridos" });
    }

    const customer = await prisma.cliente.create({
      data: {
        nombre,
        apellido: apellido || "",
        cedula: cedula || `AUTO-${Date.now()}`,
        telefono,
        email: email || null,
        tipo: tipo || "REGULAR",
        descuento: descuento ? parseFloat(descuento) : 0,
      },
    });

    res.status(201).json(customer);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ message: "Ya existe un cliente con esa cédula" });
    }
    res.status(500).json({ message: "Error al crear cliente" });
  }
};

// Actualizar cliente
export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, cedula, telefono, email, tipo, descuento } =
      req.body;

    const customer = await prisma.cliente.update({
      where: { id: parseInt(id) },
      data: {
        ...(nombre !== undefined && { nombre }),
        ...(apellido !== undefined && { apellido }),
        ...(cedula !== undefined && { cedula }),
        ...(telefono !== undefined && { telefono }),
        ...(email !== undefined && { email: email || null }),
        ...(tipo !== undefined && { tipo }),
        ...(descuento !== undefined && {
          descuento: parseFloat(descuento),
        }),
      },
    });

    res.json(customer);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ message: "Ya existe un cliente con esa cédula" });
    }
    res.status(500).json({ message: "Error al actualizar cliente" });
  }
};

// Eliminar cliente (soft delete)
export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.cliente.update({
      where: { id: parseInt(id) },
      data: { activo: false },
    });

    res.json({ message: "Cliente eliminado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al eliminar cliente" });
  }
};

// Historial de compras de un cliente
export const getCustomerHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const cliente = await prisma.cliente.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        tipo: true,
        totalCompras: true,
      },
    });

    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    const [ventas, totalVentas, stats] = await Promise.all([
      prisma.venta.findMany({
        where: {
          clienteId: parseInt(id),
          estado: "COMPLETADA",
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { fecha: "desc" },
        select: {
          id: true,
          numeroVenta: true,
          fecha: true,
          total: true,
          metodoPago: true,
          detalles: {
            select: {
              cantidad: true,
              productoId: true,
            },
          },
        },
      }),
      prisma.venta.count({
        where: {
          clienteId: parseInt(id),
          estado: "COMPLETADA",
        },
      }),
      prisma.venta.aggregate({
        _sum: { total: true },
        _count: true,
        where: {
          clienteId: parseInt(id),
          estado: "COMPLETADA",
        },
      }),
    ]);

    // Última compra
    const ultimaCompra = ventas.length > 0 ? ventas[0].fecha : null;

    // Ticket promedio
    const totalGastado = parseFloat(stats._sum.total || 0);
    const cantidadCompras = stats._count || 0;
    const ticketPromedio =
      cantidadCompras > 0 ? totalGastado / cantidadCompras : 0;

    res.json({
      cliente,
      stats: {
        totalCompras: cantidadCompras,
        totalGastado,
        ticketPromedio: Math.round(ticketPromedio * 100) / 100,
        ultimaCompra,
      },
      ventas: ventas.map((v) => ({
        ...v,
        itemsCount: v.detalles.reduce((sum, d) => sum + d.cantidad, 0),
      })),
      meta: {
        total: totalVentas,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalVentas / limit),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener historial del cliente" });
  }
};

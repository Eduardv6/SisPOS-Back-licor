import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Obtener estadísticas de cajas
export const getCashRegisterStats = async (req, res) => {
  try {
    const abiertas = await prisma.aperturaCaja.count({
      where: { estado: "ABIERTA" },
    });
    const cerradas = await prisma.aperturaCaja.count({
      where: {
        estado: "CERRADA",
        fechaCierre: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    // Total en caja (sum of montoInicial + movimientos for open cajas)
    const cajasAbiertas = await prisma.aperturaCaja.findMany({
      where: { estado: "ABIERTA" },
      select: {
        montoInicial: true,
        movimientos: {
          select: { monto: true, tipo: true, metodoPago: true },
        },
      },
    });

    let totalEnCaja = 0;
    cajasAbiertas.forEach((caja) => {
      let saldo = parseFloat(caja.montoInicial);
      caja.movimientos.forEach((m) => {
        if (
          (m.tipo === "VENTA" && m.metodoPago === "EFECTIVO") ||
          m.tipo === "INGRESO_EXTRA"
        ) {
          saldo += parseFloat(m.monto);
        } else if (m.tipo === "RETIRO" || m.tipo === "GASTO") {
          saldo -= parseFloat(m.monto);
        }
      });
      totalEnCaja += saldo;
    });

    // Ventas de hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const ventasHoy = await prisma.movimientoCaja.count({
      where: {
        tipo: "VENTA",
        fecha: { gte: hoy },
      },
    });

    res.json({
      abiertas,
      cerradas,
      totalEnCaja: Math.round(totalEnCaja * 100) / 100,
      ventasHoy,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener estadísticas" });
  }
};

// Listar el estado actual de las cajas (Una por usuario)
export const getCashRegisters = async (req, res) => {
  try {
    const requestingUser = await prisma.usuario.findUnique({
      where: { id: req.user.id },
    });

    let usersToFetch = [];

    // Si es ADMIN, ve a todos los cajeros y administradores
    if (requestingUser.rol === "ADMINISTRADOR") {
      usersToFetch = await prisma.usuario.findMany({
        where: {
          activo: true,
          rol: { in: ["ADMINISTRADOR", "CAJERO"] },
        },
        select: { id: true, nombre: true, apellido: true, rol: true },
      });
    } else {
      // Si es CAJERO, solo se ve a sí mismo
      usersToFetch = [requestingUser];
    }

    const cajasData = await Promise.all(
      usersToFetch.map(async (user) => {
        // Buscar la última apertura (open or closed)
        const lastApertura = await prisma.aperturaCaja.findFirst({
          where: { usuarioId: user.id },
          orderBy: { fechaApertura: "desc" },
          include: {
            movimientos: {
              select: { tipo: true, monto: true, metodoPago: true },
            },
          },
        });

        if (!lastApertura) {
          // Usuario nunca ha abierto caja
          return {
            id: 0, // ID 0 indica que no hay sesión real
            cajero: `${user.nombre} ${user.apellido}`,
            cajeroId: user.id,
            fechaApertura: null,
            fechaCierre: null,
            montoInicial: 0,
            saldo: 0,
            estado: "CERRADA",
            ventas: 0,
            ingresos: 0,
            retiros: 0,
            isNew: true, // Flag para indicar que es virgen
          };
        }

        // Calcular saldo si está abierta o usar datos guardados
        let saldo = parseFloat(lastApertura.montoInicial);
        let ventas = 0;
        let ingresos = 0;
        let retiros = 0;

        if (lastApertura.estado === "ABIERTA") {
          lastApertura.movimientos.forEach((m) => {
            const monto = parseFloat(m.monto);
            if (m.tipo === "VENTA") {
              if (m.metodoPago === "EFECTIVO") {
                saldo += monto;
              }
              ventas++;
            } else if (m.tipo === "INGRESO_EXTRA") {
              saldo += monto;
              ingresos++;
            } else if (m.tipo === "RETIRO" || m.tipo === "GASTO") {
              saldo -= monto;
              retiros++;
            }
          });
        } else {
          // Si está cerrada, usamos los valores finales (o recalculamos si se prefiere)
          // Para consistencia visual, mostramos el saldo final
          saldo = lastApertura.montoFinal
            ? parseFloat(lastApertura.montoFinal)
            : 0;
          // Stats de esa sesión
          lastApertura.movimientos.forEach((m) => {
            if (m.tipo === "VENTA") ventas++;
            else if (m.tipo === "INGRESO_EXTRA") ingresos++;
            else if (m.tipo === "RETIRO" || m.tipo === "GASTO") retiros++;
          });
        }

        return {
          id: lastApertura.id,
          cajero: `${user.nombre} ${user.apellido}`,
          cajeroId: user.id,
          fechaApertura: lastApertura.fechaApertura,
          fechaCierre: lastApertura.fechaCierre,
          montoInicial: parseFloat(lastApertura.montoInicial),
          montoFinal: lastApertura.montoFinal
            ? parseFloat(lastApertura.montoFinal)
            : null,
          saldo: Math.round(saldo * 100) / 100,
          estado: lastApertura.estado,
          ventas,
          ingresos,
          retiros,
          observaciones: lastApertura.observaciones,
          diferencia: lastApertura.diferencia
            ? parseFloat(lastApertura.diferencia)
            : null,
        };
      }),
    );

    res.json({ data: cajasData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener cajas" });
  }
};

// Abrir caja
export const openCashRegister = async (req, res) => {
  try {
    const { montoInicial } = req.body;
    const usuarioId = req.user.id;

    if (montoInicial === undefined || montoInicial === null) {
      return res.status(400).json({ message: "El monto inicial es requerido" });
    }

    // Check if user already has an open caja
    const cajaAbierta = await prisma.aperturaCaja.findFirst({
      where: {
        usuarioId,
        estado: "ABIERTA",
      },
    });

    if (cajaAbierta) {
      return res
        .status(400)
        .json({ message: "Ya tienes una caja abierta. Ciérrala primero." });
    }

    const caja = await prisma.aperturaCaja.create({
      data: {
        usuarioId,
        montoInicial: parseFloat(montoInicial),
      },
      include: {
        usuario: {
          select: { nombre: true, apellido: true },
        },
      },
    });

    res.status(201).json(caja);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al abrir caja" });
  }
};

// Cerrar caja

// Registrar movimiento (Ingreso/Retiro)
export const addMovement = async (req, res) => {
  try {
    const { monto, tipo, concepto } = req.body;
    const usuarioId = req.user.id;

    if (!monto || !tipo || !concepto) {
      return res.status(400).json({ message: "Faltan datos requeridos" });
    }

    // Buscar caja abierta del usuario
    const cajaAbierta = await prisma.aperturaCaja.findFirst({
      where: {
        usuarioId,
        estado: "ABIERTA",
      },
    });

    if (!cajaAbierta) {
      return res.status(400).json({ message: "No tienes una caja abierta" });
    }

    const movimiento = await prisma.movimientoCaja.create({
      data: {
        aperturaCajaId: cajaAbierta.id,
        tipo,
        monto: parseFloat(monto),
        metodoPago: "EFECTIVO",
        concepto,
        fecha: new Date(),
      },
    });

    res.status(201).json(movimiento);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al registrar movimiento" });
  }
};

export const closeCashRegister = async (req, res) => {
  try {
    const { id } = req.params;
    const { montoFinal, observaciones } = req.body;

    if (montoFinal === undefined || montoFinal === null) {
      return res.status(400).json({ message: "El monto final es requerido" });
    }

    const caja = await prisma.aperturaCaja.findUnique({
      where: { id: parseInt(id) },
      include: {
        movimientos: {
          select: { tipo: true, monto: true, metodoPago: true },
        },
      },
    });

    if (!caja) {
      return res.status(404).json({ message: "Caja no encontrada" });
    }

    if (caja.estado === "CERRADA") {
      return res.status(400).json({ message: "La caja ya está cerrada" });
    }

    // Calculate expected total
    let totalVentas = 0;
    let totalEfectivo = 0;
    let totalQr = 0;

    caja.movimientos.forEach((m) => {
      const monto = parseFloat(m.monto);
      if (m.tipo === "VENTA") {
        totalVentas += monto;
        if (m.metodoPago === "EFECTIVO") totalEfectivo += monto;
        else if (m.metodoPago === "QR") totalQr += monto;
      } else if (m.tipo === "INGRESO_EXTRA") {
        totalEfectivo += monto;
      } else if (m.tipo === "RETIRO" || m.tipo === "GASTO") {
        totalEfectivo -= monto;
      }
    });

    const saldoEsperado = parseFloat(caja.montoInicial) + totalEfectivo;
    const diferencia = parseFloat(montoFinal) - saldoEsperado;

    const updated = await prisma.aperturaCaja.update({
      where: { id: parseInt(id) },
      data: {
        estado: "CERRADA",
        fechaCierre: new Date(),
        montoFinal: parseFloat(montoFinal),
        totalVentas,
        totalEfectivo: parseFloat(caja.montoInicial) + totalEfectivo,
        totalQr,
        diferencia,
        observaciones: observaciones || null,
      },
    });

    res.json({
      ...updated,
      resumen: {
        montoInicial: parseFloat(caja.montoInicial),
        totalVentas,
        totalEfectivo,
        totalQr,
        saldoEsperado,
        montoFinal: parseFloat(montoFinal),
        diferencia,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al cerrar caja" });
  }
};

// Obtener detalle de una caja
export const getCashRegisterDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const caja = await prisma.aperturaCaja.findUnique({
      where: { id: parseInt(id) },
      include: {
        usuario: {
          select: { nombre: true, apellido: true },
        },
        movimientos: {
          orderBy: { fecha: "desc" },
          select: {
            id: true,
            tipo: true,
            monto: true,
            metodoPago: true,
            concepto: true,
            referencia: true,
            fecha: true,
          },
        },
      },
    });

    if (!caja) {
      return res.status(404).json({ message: "Caja no encontrada" });
    }

    res.json(caja);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener detalle" });
  }
};

// Movimientos recientes (de todas las cajas abiertas hoy)
export const getRecentMovements = async (req, res) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const movimientos = await prisma.movimientoCaja.findMany({
      where: {
        fecha: { gte: hoy },
      },
      orderBy: { fecha: "desc" },
      take: 10,
      include: {
        aperturaCaja: {
          select: {
            id: true,
            usuario: {
              select: { nombre: true, apellido: true },
            },
          },
        },
      },
    });

    const data = movimientos.map((m) => ({
      id: m.id,
      hora: new Date(m.fecha).toLocaleTimeString("es-BO", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      cajaId: m.aperturaCaja.id,
      caja: `Caja #${m.aperturaCaja.id}`,
      tipo: m.tipo,
      desc: m.concepto,
      monto: parseFloat(m.monto),
      metodoPago: m.metodoPago,
      usuario: `${m.aperturaCaja.usuario.nombre} ${m.aperturaCaja.usuario.apellido}`,
    }));

    res.json({ data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener movimientos" });
  }
};

// Consultar estado de caja de un usuario
export const checkCashRegisterStatus = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const cajaAbierta = await prisma.aperturaCaja.findFirst({
      where: {
        usuarioId,
        estado: "ABIERTA",
      },
    });

    res.json({ isOpen: !!cajaAbierta });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al verificar estado de caja" });
  }
};

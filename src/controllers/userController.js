import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Listar todos los usuarios
export const getUsers = async (req, res) => {
  try {
    const { search } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { nombre: { contains: search } },
        { apellido: { contains: search } },
        { username: { contains: search } },
        { email: { contains: search } },
        { cedula: { contains: search } },
      ];
    }

    const users = await prisma.usuario.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        email: true,
        nombre: true,
        apellido: true,
        cedula: true,
        telefono: true,
        rol: true,
        activo: true,
        createdAt: true,
      },
    });

    res.json({ data: users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener usuarios" });
  }
};

// Obtener estadísticas
export const getUserStats = async (req, res) => {
  try {
    const total = await prisma.usuario.count();
    const admins = await prisma.usuario.count({
      where: { rol: "ADMINISTRADOR" },
    });
    const cajeros = await prisma.usuario.count({
      where: { rol: "CAJERO" },
    });
    const activos = await prisma.usuario.count({
      where: { activo: true },
    });

    res.json({ total, admins, cajeros, activos });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener estadísticas" });
  }
};

// Crear usuario
export const createUser = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      nombre,
      apellido,
      cedula,
      telefono,
      rol,
    } = req.body;

    if (!username || !email || !password || !nombre || !apellido || !cedula) {
      return res.status(400).json({ message: "Faltan campos requeridos" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "La contraseña debe tener al menos 6 caracteres" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.usuario.create({
      data: {
        username,
        email,
        password: hashedPassword,
        nombre,
        apellido,
        cedula,
        telefono: telefono || "",
        rol: rol || "CAJERO",
      },
      select: {
        id: true,
        username: true,
        email: true,
        nombre: true,
        apellido: true,
        cedula: true,
        telefono: true,
        rol: true,
        activo: true,
        createdAt: true,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      const field = error.meta?.target?.[0];
      const fieldNames = {
        username: "nombre de usuario",
        email: "email",
        cedula: "cédula",
      };
      return res.status(400).json({
        message: `Ya existe un usuario con ese ${fieldNames[field] || "dato"}`,
      });
    }
    res.status(500).json({ message: "Error al crear usuario" });
  }
};

// Actualizar usuario
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      username,
      email,
      password,
      nombre,
      apellido,
      cedula,
      telefono,
      rol,
      activo,
    } = req.body;

    const data = {};
    if (username !== undefined) data.username = username;
    if (email !== undefined) data.email = email;
    if (nombre !== undefined) data.nombre = nombre;
    if (apellido !== undefined) data.apellido = apellido;
    if (cedula !== undefined) data.cedula = cedula;
    if (telefono !== undefined) data.telefono = telefono;
    if (rol !== undefined) data.rol = rol;
    if (activo !== undefined) data.activo = activo;

    if (password && password.length > 0) {
      if (password.length < 6) {
        return res
          .status(400)
          .json({ message: "La contraseña debe tener al menos 6 caracteres" });
      }
      data.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.usuario.update({
      where: { id: parseInt(id) },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        nombre: true,
        apellido: true,
        cedula: true,
        telefono: true,
        rol: true,
        activo: true,
        createdAt: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      const field = error.meta?.target?.[0];
      const fieldNames = {
        username: "nombre de usuario",
        email: "email",
        cedula: "cédula",
      };
      return res.status(400).json({
        message: `Ya existe un usuario con ese ${fieldNames[field] || "dato"}`,
      });
    }
    res.status(500).json({ message: "Error al actualizar usuario" });
  }
};

// Eliminar usuario (soft delete - desactivar)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (req.user?.id === parseInt(id)) {
      return res
        .status(400)
        .json({ message: "No puedes eliminar tu propia cuenta" });
    }

    await prisma.usuario.update({
      where: { id: parseInt(id) },
      data: { activo: false },
    });

    res.json({ message: "Usuario desactivado correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al eliminar usuario" });
  }
};

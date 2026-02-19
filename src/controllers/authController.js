import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export const register = async (req, res) => {
  try {
    const { username, email, password, nombre, apellido, cedula, telefono } =
      req.body;

    const userFound = await prisma.usuario.findFirst({
      where: {
        OR: [{ email }, { username }, { cedula }],
      },
    });

    if (userFound) {
      return res.status(400).json({
        success: false,
        message: "El usuario, email o cédula ya existe",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.usuario.create({
      data: {
        username,
        email,
        password: passwordHash,
        nombre,
        apellido,
        cedula,
        telefono,
      },
    });

    res.status(201).json({
      success: true,
      message: "Usuario creado exitosamente",
      data: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.rol,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error al registrar el usuario",
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // Allow login with either email or username (frontend sends 'username' field sometimes)
    const identifier = email || username;

    const userFound = await prisma.usuario.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    if (!userFound) {
      return res.status(400).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    const isMatch = await bcrypt.compare(password, userFound.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Contraseña incorrecta",
      });
    }

    const token = jwt.sign(
      { id: userFound.id, role: userFound.rol },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "1d" },
    );

    res.json({
      success: true,
      message: "Login exitoso",
      token,
      user: {
        id: userFound.id,
        username: userFound.username,
        email: userFound.email,
        role: userFound.rol,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error al iniciar sesión",
    });
  }
};

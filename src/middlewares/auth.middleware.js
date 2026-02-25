import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(403).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");

    // Optional: Check if user still exists
    const user = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: { id: true, rol: true, username: true, activo: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.activo) {
      return res.status(401).json({ message: "Account is inactive" });
    }

    req.user = user; // Attach user to request
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

export const isAdmin = async (req, res, next) => {
  if (req.user?.rol !== "ADMINISTRADOR") {
    return res.status(403).json({ message: "Require Admin Role" });
  }
  next();
};

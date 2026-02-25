import { PrismaClient } from "@prisma/client";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../config/cloudinary.js";

const prisma = new PrismaClient();

// Obtener todas las configuraciones
export const getSettings = async (req, res) => {
  try {
    const settings = await prisma.configuracion.findMany();

    // Convertir array de {clave, valor} a un objeto plano
    const settingsObj = {};
    settings.forEach((s) => {
      let valor = s.valor;
      // Convertir tipos si es necesario
      if (s.tipo === "number") valor = Number(s.valor);
      if (s.tipo === "boolean") valor = s.valor === "true";
      if (s.tipo === "json") {
        try {
          valor = JSON.parse(s.valor);
        } catch (e) {
          valor = s.valor;
        }
      }
      settingsObj[s.clave] = valor;
    });

    res.json(settingsObj);
  } catch (error) {
    console.error("Error al obtener configuraciones:", error);
    res.status(500).json({ message: "Error al obtener configuraciones" });
  }
};

// Actualizar múltiples configuraciones
export const updateSettings = async (req, res) => {
  try {
    const data = req.body;
    const entries = Object.entries(data);

    // Usar una transacción para asegurar que todo se guarde o nada
    await prisma.$transaction(
      entries.map(([clave, valor]) => {
        let stringValue =
          typeof valor === "object" ? JSON.stringify(valor) : String(valor);
        let tipo =
          typeof valor === "number"
            ? "number"
            : typeof valor === "boolean"
              ? "boolean"
              : typeof valor === "object"
                ? "json"
                : "string";

        return prisma.configuracion.upsert({
          where: { clave },
          update: { valor: stringValue, tipo },
          create: { clave, valor: stringValue, tipo },
        });
      }),
    );

    res.json({ success: true, message: "Configuración actualizada con éxito" });
  } catch (error) {
    console.error("Error al actualizar configuraciones:", error);
    res.status(500).json({ message: "Error al actualizar configuraciones" });
  }
};

// Subir logotipo
export const uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "No se ha subido ningún archivo" });
    }

    // Delete old logo from Cloudinary if exists
    const oldLogo = await prisma.configuracion.findUnique({
      where: { clave: "empresa_logo" },
    });
    if (oldLogo?.valor) {
      await deleteFromCloudinary(oldLogo.valor);
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, "business");
    const logoPath = result.url;

    // Guardar en la base de datos
    await prisma.configuracion.upsert({
      where: { clave: "empresa_logo" },
      update: { valor: logoPath, tipo: "string" },
      create: { clave: "empresa_logo", valor: logoPath, tipo: "string" },
    });

    res.json({
      success: true,
      message: "Logotipo actualizado con éxito",
      logoUrl: logoPath,
    });
  } catch (error) {
    console.error("Error al subir logotipo:", error);
    res.status(500).json({ message: "Error al subir logotipo" });
  }
};

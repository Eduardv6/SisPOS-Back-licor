import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Registra una acción de auditoría
 * @param {Object} params
 * @param {number} params.usuarioId - ID del usuario que realiza la acción
 * @param {string} params.accion - Descripción de la acción (ej: 'CREATE', 'UPDATE', 'DELETE')
 * @param {string} params.tabla - Nombre de la tabla afectada
 * @param {number} [params.registroId] - ID del registro afectado
 * @param {Object} [params.datosAnteriores] - Datos antes del cambio
 * @param {Object} [params.datosNuevos] - Datos después del cambio
 * @param {string} [params.ipAddress] - IP del usuario
 * @param {string} [params.userAgent] - User Agent del usuario
 */
export const registrarAuditoria = async ({
  usuarioId,
  accion,
  tabla,
  registroId,
  datosAnteriores,
  datosNuevos,
  ipAddress,
  userAgent,
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        usuarioId,
        accion,
        tabla,
        registroId,
        datosAnteriores: datosAnteriores || undefined,
        datosNuevos: datosNuevos || undefined,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error("Error al registrar auditoría:", error);
    // No lanzamos el error para no interrumpir el flujo principal
  }
};

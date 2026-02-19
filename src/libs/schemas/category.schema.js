import { z } from "zod";

export const createCategorySchema = z.object({
  nombre: z.string({
    required_error: "El nombre es requerido",
  }),
  color: z.string().optional(),
  icono: z.string().optional(),
  parentId: z.number().optional().nullable(),
});

export const updateCategorySchema = z.object({
  nombre: z.string().optional(),
  color: z.string().optional(),
  icono: z.string().optional(),
  parentId: z.number().optional().nullable(),
});

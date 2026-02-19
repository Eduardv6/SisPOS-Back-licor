import { z } from "zod";

export const loginSchema = z
  .object({
    email: z.string().email({ message: "Email inválido" }).optional(),
    username: z.string().optional(),
    password: z
      .string({
        required_error: "La contraseña es requerida",
      })
      .min(8, {
        message: "La contraseña debe tener al menos 8 caracteres",
      }),
  })
  .refine((data) => data.email || data.username, {
    message: "Debe proporcionar email o nombre de usuario",
    path: ["username"], // Attach error to username field
  });

export const registerSchema = z.object({
  username: z
    .string({
      required_error: "El nombre de usuario es requerido",
    })
    .min(3, {
      message: "El nombre de usuario debe tener al menos 3 caracteres",
    }),
  email: z
    .string({
      required_error: "El email es requerido",
    })
    .email({
      message: "Email inválido",
    }),
  password: z
    .string({
      required_error: "La contraseña es requerida",
    })
    .min(8, {
      message: "La contraseña debe tener al menos 8 caracteres",
    }),
  nombre: z.string({
    required_error: "El nombre es requerido",
  }),
  apellido: z.string({
    required_error: "El apellido es requerido",
  }),
  cedula: z.string({
    required_error: "La cédula es requerida",
  }),
});

import { Router } from "express";
import { login, register } from "../controllers/authController.js";
import { validateSchema } from "../middlewares/validate.middleware.js";
import { loginSchema, registerSchema } from "../libs/schemas/auth.schema.js";

const router = Router();

router.post("/register", validateSchema(registerSchema), register);
router.post("/login", validateSchema(loginSchema), login);

export default router;

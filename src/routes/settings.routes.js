import { Router } from "express";
import {
  getSettings,
  updateSettings,
  uploadLogo,
} from "../controllers/settingController.js";
import { verifyToken, isAdmin } from "../middlewares/auth.middleware.js";
import { uploadLogoMiddleware } from "../middlewares/logo.middleware.js";

const router = Router();

// GET: accesible para todos (se necesita para obtener logo, nombre, etc.)
router.get("/", verifyToken, getSettings);

// POST: solo administrador puede modificar configuración
router.post("/", verifyToken, isAdmin, updateSettings);
router.post(
  "/logo",
  verifyToken,
  isAdmin,
  uploadLogoMiddleware.single("logo"),
  uploadLogo,
);

export default router;

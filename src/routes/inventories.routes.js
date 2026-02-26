import { Router } from "express";

const router = Router();

import {
  getInventoryStats,
  getMovements,
  createMovement,
  createTransfer,
} from "../controllers/inventoryController.js";
import { verifyToken, isAdmin } from "../middlewares/auth.middleware.js";

// Prefix: /api/inventory
// Todas las rutas de inventario son solo para administrador

router.get("/stats", verifyToken, isAdmin, getInventoryStats);
router.get("/movements", verifyToken, isAdmin, getMovements);
router.post("/movements", verifyToken, isAdmin, createMovement);
router.post("/transfer", verifyToken, isAdmin, createTransfer);

export default router;

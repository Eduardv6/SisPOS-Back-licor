import { Router } from "express";

const router = Router();

import {
  getInventoryStats,
  getMovements,
  createMovement,
  createTransfer,
} from "../controllers/inventoryController.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

// Prefix: /api/inventory

router.get("/stats", verifyToken, getInventoryStats);
router.get("/movements", verifyToken, getMovements);
router.post("/movements", verifyToken, createMovement);
router.post("/transfer", verifyToken, createTransfer);

export default router;

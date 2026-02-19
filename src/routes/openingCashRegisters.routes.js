import { Router } from "express";
import {
  getCashRegisterStats,
  getCashRegisters,
  openCashRegister,
  closeCashRegister,
  getCashRegisterDetail,
  getRecentMovements,
  addMovement,
} from "../controllers/openingCashRegisterController.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();

// Prefix: /api/openingCashRegisters
router.get("/stats", verifyToken, getCashRegisterStats);
router.get("/movements", verifyToken, getRecentMovements);
router.post("/movements", verifyToken, addMovement);
router.get("/", verifyToken, getCashRegisters);
router.post("/open", verifyToken, openCashRegister);
router.put("/:id/close", verifyToken, closeCashRegister);
router.get("/:id", verifyToken, getCashRegisterDetail);

export default router;

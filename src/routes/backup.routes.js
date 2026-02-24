import express from "express";
import {
  exportData,
  importData,
  getBackupHistory,
} from "../controllers/backupController.js";
import { verifyToken, isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/export", verifyToken, isAdmin, exportData);
router.get("/history", verifyToken, isAdmin, getBackupHistory);
router.post("/import", verifyToken, isAdmin, importData);

export default router;

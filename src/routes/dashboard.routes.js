import { Router } from "express";
import { getDashboardData } from "../controllers/dashboardController.js";
import { verifyToken, isAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// Solo administrador puede ver el dashboard
router.get("/", verifyToken, isAdmin, getDashboardData);

export default router;

import { Router } from "express";
import { getDashboardData } from "../controllers/dashboardController.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", verifyToken, getDashboardData);

export default router;

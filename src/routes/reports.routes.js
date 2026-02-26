import { Router } from "express";
import * as reportController from "../controllers/reportController.js";
import { verifyToken, isAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// Todas las rutas de reportes son solo para administrador
router.use(verifyToken, isAdmin);

router.get("/dashboard", reportController.getDashboardStats);
router.get("/sales-chart", reportController.getSalesChart);
router.get("/top-products", reportController.getTopProducts);
router.get("/products", reportController.getProductStats);
router.get("/inventory", reportController.getInventoryStats);
router.get("/cash", reportController.getCashStats);
router.get("/sales-history", reportController.getSalesHistory);

export default router;

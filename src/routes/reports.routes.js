import { Router } from "express";
import * as reportController from "../controllers/reportController.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyToken);

router.get("/dashboard", reportController.getDashboardStats);
router.get("/sales-chart", reportController.getSalesChart);
router.get("/top-products", reportController.getTopProducts);
router.get("/products", reportController.getProductStats);
router.get("/inventory", reportController.getInventoryStats);
router.get("/cash", reportController.getCashStats);

export default router;

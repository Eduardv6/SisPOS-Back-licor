import { Router } from "express";
import { createSale, getPosProducts } from "../controllers/salesController.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/products", verifyToken, getPosProducts);
router.post("/", verifyToken, createSale);

export default router;

import { Router } from "express";
import {
  getCustomers,
  getCustomerStats,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerHistory,
} from "../controllers/customerController.js";
import { verifyToken, isAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// Prefix: /api/customers
// Todas las rutas de clientes son solo para administrador

router.get("/stats", verifyToken, isAdmin, getCustomerStats);
router.get("/", verifyToken, isAdmin, getCustomers);
router.post("/", verifyToken, isAdmin, createCustomer);
router.put("/:id", verifyToken, isAdmin, updateCustomer);
router.delete("/:id", verifyToken, isAdmin, deleteCustomer);
router.get("/:id/history", verifyToken, isAdmin, getCustomerHistory);

export default router;

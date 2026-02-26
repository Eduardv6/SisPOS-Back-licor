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
// GET: accesible para todos (cajero necesita buscar/seleccionar clientes en POS)
// POST, PUT, DELETE: solo administrador

router.get("/stats", verifyToken, getCustomerStats);
router.get("/", verifyToken, getCustomers);
router.post("/", verifyToken, isAdmin, createCustomer);
router.put("/:id", verifyToken, isAdmin, updateCustomer);
router.delete("/:id", verifyToken, isAdmin, deleteCustomer);
router.get("/:id/history", verifyToken, getCustomerHistory);

export default router;

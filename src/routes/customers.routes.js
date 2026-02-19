import { Router } from "express";
import {
  getCustomers,
  getCustomerStats,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerHistory,
} from "../controllers/customerController.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();

// Prefix: /api/customers

router.get("/stats", verifyToken, getCustomerStats);
router.get("/", verifyToken, getCustomers);
router.post("/", verifyToken, createCustomer);
router.put("/:id", verifyToken, updateCustomer);
router.delete("/:id", verifyToken, deleteCustomer);
router.get("/:id/history", verifyToken, getCustomerHistory);

export default router;

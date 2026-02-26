import { Router } from "express";

import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";

import { verifyToken, isAdmin } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = Router();

// GET: todos los usuarios autenticados (cajero necesita ver productos en POS)
router.get("/", verifyToken, getProducts);

// POST, PUT, DELETE: solo administrador
router.post("/", verifyToken, isAdmin, upload.single("imagen"), createProduct);
router.put(
  "/:id",
  verifyToken,
  isAdmin,
  upload.single("imagen"),
  updateProduct,
);
router.delete("/:id", verifyToken, isAdmin, deleteProduct);

export default router;

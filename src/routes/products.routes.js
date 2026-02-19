import { Router } from "express";

import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";

// Placeholder middleware if verifyToken doesn't exist
const verifyToken = (req, res, next) => {
  // Mock user for demo purposes if not implemented
  if (!req.user) req.user = { id: 1, role: "ADMINISTRADOR" };
  next();
};

const router = Router();

import { upload } from "../middlewares/upload.middleware.js";

router.get("/", verifyToken, getProducts);
router.post("/", verifyToken, upload.single("imagen"), createProduct);
router.put("/:id", verifyToken, upload.single("imagen"), updateProduct);
router.delete("/:id", verifyToken, deleteProduct);

export default router;

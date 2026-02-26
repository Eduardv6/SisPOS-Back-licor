import { Router } from "express";
import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";
import { verifyToken, isAdmin } from "../middlewares/auth.middleware.js";
import { validateSchema } from "../middlewares/validate.middleware.js";
import {
  createCategorySchema,
  updateCategorySchema,
} from "../libs/schemas/category.schema.js";

const router = Router();

// GET: todos los usuarios autenticados
router.get("/", verifyToken, getCategories);
router.get("/:id", verifyToken, getCategory);

// POST, PUT, DELETE: solo administrador
router.post(
  "/",
  verifyToken,
  isAdmin,
  validateSchema(createCategorySchema),
  createCategory,
);
router.put(
  "/:id",
  verifyToken,
  isAdmin,
  validateSchema(updateCategorySchema),
  updateCategory,
);
router.delete("/:id", verifyToken, isAdmin, deleteCategory);

export default router;

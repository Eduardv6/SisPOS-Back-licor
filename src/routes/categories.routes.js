import { Router } from "express";
import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";
import { validateSchema } from "../middlewares/validate.middleware.js";
import {
  createCategorySchema,
  updateCategorySchema,
} from "../libs/schemas/category.schema.js";

const router = Router();

router.get("/", getCategories);
router.get("/:id", getCategory);
router.post("/", validateSchema(createCategorySchema), createCategory);
router.put("/:id", validateSchema(updateCategorySchema), updateCategory);
router.delete("/:id", deleteCategory);

export default router;

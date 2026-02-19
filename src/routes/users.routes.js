import { Router } from "express";
import {
  getUsers,
  getUserStats,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/userController.js";
import { verifyToken, isAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// Prefix: /api/users
router.get("/stats", verifyToken, getUserStats);
router.get("/", verifyToken, getUsers);
router.post("/", verifyToken, isAdmin, createUser);
router.put("/:id", verifyToken, isAdmin, updateUser);
router.delete("/:id", verifyToken, isAdmin, deleteUser);

export default router;

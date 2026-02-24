import { Router } from "express";
import {
  getSettings,
  updateSettings,
  uploadLogo,
} from "../controllers/settingController.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { uploadLogoMiddleware } from "../middlewares/logo.middleware.js";

const router = Router();

router.get("/", verifyToken, getSettings);
router.post("/", verifyToken, updateSettings);
router.post(
  "/logo",
  verifyToken,
  uploadLogoMiddleware.single("logo"),
  uploadLogo,
);

export default router;

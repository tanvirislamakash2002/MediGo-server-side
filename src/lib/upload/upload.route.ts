import express, { Router } from "express";
import { uploadController, uploadMiddleware } from "../../lib/upload/upload.controller";

const router = express.Router();

router.post("/avatar", uploadMiddleware, uploadController.uploadAvatar);

export const uploadRouter: Router = router;
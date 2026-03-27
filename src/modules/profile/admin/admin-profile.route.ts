import express, { Router } from "express";
import { adminProfileController } from "./admin-profile.controller";
import auth from "../../../middlewares/auth";
import { Role } from "../../../../generated/prisma/enums";

const router = express.Router();

// All profile routes require authentication
router.use(auth(Role.ADMIN));

router.get("/", adminProfileController.getProfile);
router.patch("/", adminProfileController.updateProfile);

// Use type assertion to fix the error
router.post("/avatar", adminProfileController.uploadAvatar as any);

router.post("/change-password", adminProfileController.changePassword);
router.get("/sessions", adminProfileController.getActiveSessions);
router.delete("/sessions/:sessionId", adminProfileController.terminateSession);
router.post("/sessions/logout-all", adminProfileController.logoutOtherSessions);
router.get("/activity-logs", adminProfileController.getActivityLogs);
router.patch("/preferences", adminProfileController.updatePreferences);
router.get("/activity-logs/export", adminProfileController.exportActivityLogs);
router.get("/account/export", adminProfileController.exportAccountData);
router.delete("/account", adminProfileController.deleteAccount);

export const adminProfileRouter: Router = router;
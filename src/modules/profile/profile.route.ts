import express, { Router } from "express";
import { profileController } from "./profile.controller";
import auth from "../../middlewares/auth";
import { Role } from "../../../generated/prisma/enums";

const router = express.Router();

// All profile routes require authentication
router.use(auth(Role.ADMIN));

router.get("/", profileController.getProfile);
router.patch("/", profileController.updateProfile);

// Use type assertion to fix the error
router.post("/avatar", profileController.uploadAvatar as any);

router.post("/change-password", profileController.changePassword);
router.get("/sessions", profileController.getActiveSessions);
router.delete("/sessions/:sessionId", profileController.terminateSession);
router.post("/sessions/logout-all", profileController.logoutOtherSessions);
router.get("/activity-logs", profileController.getActivityLogs);
router.patch("/preferences", profileController.updatePreferences);
router.get("/activity-logs/export", profileController.exportActivityLogs);
router.get("/account/export", profileController.exportAccountData);
router.delete("/account", profileController.deleteAccount);

export const profileRouter: Router = router;
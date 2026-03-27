import express, { Router } from "express";
import { sellerProfileController } from "./seller-profile.controller";
import auth from "../../../middlewares/auth";
import { Role } from "../../../../generated/prisma/enums";

const router = express.Router();

// All seller profile routes require seller authentication
router.use(auth(Role.SELLER));

// Profile routes
router.get("/", sellerProfileController.getProfile);
router.patch("/personal", sellerProfileController.updatePersonalInfo);
router.post("/avatar", sellerProfileController.uploadAvatar as any);
router.post("/change-password", sellerProfileController.changePassword);

// Store management
router.get("/settings", sellerProfileController.getStoreSettings);
router.patch("/store", sellerProfileController.updateStoreInfo);
router.post("/store/logo", sellerProfileController.uploadStoreLogo as any);
router.patch("/hours", sellerProfileController.updateBusinessHours);
router.patch("/shipping", sellerProfileController.updateShippingSettings);
router.patch("/return-policy", sellerProfileController.updateReturnPolicy);
router.patch("/payout", sellerProfileController.updatePayoutInfo);
router.patch("/notifications", sellerProfileController.updateNotificationPreferences);

// Session management
router.get("/sessions", sellerProfileController.getActiveSessions);
router.delete("/sessions/:sessionId", sellerProfileController.terminateSession);
router.post("/sessions/logout-all", sellerProfileController.logoutOtherSessions);

// Documents
router.post("/documents", sellerProfileController.uploadDocument as any);
router.delete("/documents/:documentId", sellerProfileController.deleteDocument);

// Store status
router.post("/pause", sellerProfileController.pauseStore);
router.post("/close", sellerProfileController.closeStore);

// Account management
router.delete("/account", sellerProfileController.deleteAccount);

export const sellerProfileRouter: Router = router;
import express, { Router } from "express";
import { customerProfileController } from "./customer-profile.controller";
import auth from "../../../middlewares/auth";
import { Role } from "../../../../generated/prisma/enums";

const router = express.Router();

// All customer profile routes require customer authentication
router.use(auth(Role.CUSTOMER));

// Profile routes
router.get("/", customerProfileController.getProfile);
router.patch("/", customerProfileController.updateProfile);
router.post("/avatar", customerProfileController.uploadAvatar as any);
router.post("/change-password", customerProfileController.changePassword);

// Address management
router.get("/addresses", customerProfileController.getAddresses);
router.post("/addresses", customerProfileController.addAddress);
router.patch("/addresses/:addressId", customerProfileController.updateAddress);
router.delete("/addresses/:addressId", customerProfileController.deleteAddress);
router.patch("/addresses/:addressId/default", customerProfileController.setDefaultAddress);

// Order management
router.get("/orders", customerProfileController.getOrders);

// Wishlist management
router.get("/wishlist", customerProfileController.getWishlist);

// Review management
router.get("/reviews", customerProfileController.getReviews);
router.delete("/reviews/:reviewId", customerProfileController.deleteReview);

// Session management
router.get("/sessions", customerProfileController.getActiveSessions);
router.delete("/sessions/:sessionId", customerProfileController.terminateSession);
router.post("/sessions/logout-all", customerProfileController.logoutOtherSessions);

// Notification preferences
router.patch("/notifications", customerProfileController.updateNotificationPreferences);

// Account management
router.delete("/account", customerProfileController.deleteAccount);

export const customerProfileRouter: Router = router;
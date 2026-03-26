import express, { Router } from "express";
import { userController } from "./user.controller";
import auth from "../../middlewares/auth";
import { Role } from "../../../generated/prisma/enums";

const router = express.Router();

// All user management routes require admin authentication
router.use(auth(Role.ADMIN));

router.get("/", userController.getAllUsers);
router.get("/:userId", userController.getUserById);
router.post("/:userId/ban", userController.banUser);
router.post("/:userId/unban", userController.unbanUser);
router.patch("/:userId/role", userController.changeUserRole);
router.post("/:userId/verify", userController.verifyUserEmail);
router.delete("/:userId", userController.deleteUser);

export const userRouter: Router = router;
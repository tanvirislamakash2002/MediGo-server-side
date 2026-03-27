import express, { Router } from "express";
import { dashboardController } from "./dashboard.controller";
import auth from "../../middlewares/auth";
import { Role } from "../../../generated/prisma/enums";

const router = express.Router();

router.get(
    "/admin",
    auth(Role.ADMIN),
    dashboardController.getAdminDashboardStats
);

router.get(
    "/seller",
    auth(Role.SELLER),
    dashboardController.getSellerDashboardStats
);

export const dashboardRouter: Router = router;
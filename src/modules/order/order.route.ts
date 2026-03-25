import express, { Router } from "express";
import { orderController } from "./order.controller";
import { Role } from "../../../generated/prisma/enums";
import auth from "../../middlewares/auth";

const router = express.Router();

// Customer routes
router.get(
    '/',
    auth(Role.CUSTOMER),
    orderController.getMyOrders
);

router.get(
    '/:orderId',
    auth(Role.CUSTOMER, Role.SELLER),
    orderController.getOrderById
);

router.post(
    '/',
    auth(Role.CUSTOMER),
    orderController.createOrder
);

// Seller routes
router.get(
    '/seller/orders',
    auth(Role.SELLER),
    orderController.getSellerOrders
);

router.patch(
    '/seller/orders/:orderId/status',
    auth(Role.SELLER),
    orderController.updateOrderStatus
);

export const orderRouter: Router = router;
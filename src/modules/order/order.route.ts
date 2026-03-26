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

router.post(
    '/:orderId/cancel',
    auth(Role.CUSTOMER),
    orderController.cancelOrder
);

// Admin routes 
router.get(
    '/admin/orders',
    auth(Role.ADMIN),
    orderController.getAllOrders
);

router.patch(
    '/admin/orders/:orderId/status',
    auth(Role.ADMIN),
    orderController.adminUpdateOrderStatus
);

router.post(
    '/admin/orders/:orderId/cancel',
    auth(Role.ADMIN),
    orderController.adminCancelOrder
);

export const orderRouter: Router = router;
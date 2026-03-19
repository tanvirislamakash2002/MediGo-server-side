import express, { Router } from "express"
import { orderController } from "./order.controller";
import { Role } from "../../../generated/prisma/enums";
import auth from "../../middlewares/auth";

const router = express.Router()

router.get(
    '/',
    auth(Role.CUSTOMER),
    orderController.getMyOrder
)

router.post(
    '/',
    auth(Role.CUSTOMER),
    orderController.createOrder
)

export const orderRouter: Router = router;
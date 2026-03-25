import express, { Router } from "express";
import { cartController } from "./cart.controller";
import auth from "../../middlewares/auth";
import { Role } from "../../../generated/prisma/enums";

const router = express.Router();
router.use(auth(Role.CUSTOMER, Role.SELLER, Role.ADMIN));
router.get("/", cartController.getCart);
router.get("/count", cartController.getCartCount);

router.post("/selected", cartController.getSelectedCartItems);

router.post(
    "/",
    auth(Role.CUSTOMER),
    cartController.addToCart
);

router.post("/merge", cartController.mergeCart);
router.patch("/items/:itemId", cartController.updateCartItem);

router.delete(
    "/items/:itemId",
    auth(Role.CUSTOMER),
    cartController.removeCartItem
);

router.delete("/", cartController.clearCart);

export const cartRouter: Router = router;
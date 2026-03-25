import { Request, Response, NextFunction } from "express";
import { cartService } from "./cart.service";

export const cartController = {
    // Get cart
    getCart: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
            }

            const result = await cartService.getCart(user.id);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    // Add to cart
    addToCart: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
            }

            const { medicineId, quantity } = req.body;

            if (!medicineId) {
                return res.status(400).json({
                    success: false,
                    message: "Medicine ID is required"
                });
            }

            const itemQuantity = quantity && quantity > 0 ? quantity : 1;

            const result = await cartService.addToCart(user.id, medicineId, itemQuantity);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    // Update cart item
    updateCartItem: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
            }

            const { itemId } = req.params;
            const { quantity } = req.body;

            if (!itemId) {
                return res.status(400).json({
                    success: false,
                    message: "Item ID is required"
                });
            }

            if (quantity === undefined || quantity === null) {
                return res.status(400).json({
                    success: false,
                    message: "Quantity is required"
                });
            }
            const itemIdString = itemId as string;
            const result = await cartService.updateCartItem(user.id, itemIdString, quantity);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    // Remove cart item
    removeCartItem: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
            }

            const { itemId } = req.params;

            if (!itemId) {
                return res.status(400).json({
                    success: false,
                    message: "Item ID is required"
                });
            }
            const itemIdString = itemId as string;

            const result = await cartService.removeCartItem(user.id, itemIdString);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    // Clear cart
    clearCart: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
            }

            const result = await cartService.clearCart(user.id);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    // Merge guest cart after login
    mergeCart: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
            }

            const { items } = req.body;

            if (!items || !Array.isArray(items)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid cart items"
                });
            }

            const result = await cartService.mergeCart(user.id, items);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    // Get cart count
    getCartCount: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user;
            if (!user) {
                return res.status(200).json({ success: true, data: 0 });
            }

            const result = await cartService.getCartCount(user.id);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },
    // Get selected cart items
    getSelectedCartItems: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
            }

            const { itemIds } = req.body;

            if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Item IDs are required"
                });
            }

            const result = await cartService.getSelectedCartItems(user.id, itemIds);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },
};
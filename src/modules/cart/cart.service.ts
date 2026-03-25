import { prisma } from "../../lib/prisma";
import { Prisma } from "../../../generated/prisma/client";

export const cartService = {
    // Get cart for logged-in user
    getCart: async (userId: string) => {
        try {
            let cart = await prisma.cart.findUnique({
                where: { userId },
                include: {
                    items: {
                        include: {
                            medicine: {
                                include: {
                                    category: true
                                }
                            }
                        }
                    }
                }
            });

            if (!cart) {
                // Create cart if doesn't exist
                cart = await prisma.cart.create({
                    data: { userId },
                    include: {
                        items: {
                            include: {
                                medicine: {
                                    include: {
                                        category: true
                                    }
                                }
                            }
                        }
                    }
                });
            }

            const cartItems = cart.items.map(item => ({
                id: item.id,
                medicineId: item.medicineId,
                name: item.medicine.name,
                price: item.medicine.price,
                quantity: item.quantity,
                stock: item.medicine.stock,
                manufacturer: item.medicine.manufacturer,
                imageUrl: item.medicine.imageUrl,
                requiresPrescription: item.medicine.requiresPrescription,
                category: item.medicine.category
            }));

            return {
                success: true,
                data: {
                    items: cartItems,
                    totalItems: cartItems.reduce((sum, item) => sum + item.quantity, 0),
                    totalPrice: cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                }
            };
        } catch (error) {
            console.error("Get cart error:", error);
            throw new Error("Failed to fetch cart");
        }
    },

    // Add item to cart
    addToCart: async (userId: string, medicineId: string, quantity: number) => {
        try {
            // Check if medicine exists and has enough stock
            const medicine = await prisma.medicine.findUnique({
                where: { id: medicineId }
            });

            if (!medicine) {
                throw new Error("Medicine not found");
            }

            if (medicine.stock < quantity) {
                throw new Error(`Only ${medicine.stock} items available`);
            }

            // Get or create cart
            let cart = await prisma.cart.findUnique({
                where: { userId }
            });

            if (!cart) {
                cart = await prisma.cart.create({
                    data: { userId }
                });
            }

            // Check if item already exists in cart
            const existingItem = await prisma.cartItem.findFirst({
                where: {
                    cartId: cart.id,
                    medicineId
                }
            });

            let cartItem;
            if (existingItem) {
                // Update quantity
                const newQuantity = existingItem.quantity + quantity;
                if (medicine.stock < newQuantity) {
                    throw new Error(`Only ${medicine.stock} items available`);
                }

                cartItem = await prisma.cartItem.update({
                    where: { id: existingItem.id },
                    data: { quantity: newQuantity },
                    include: {
                        medicine: true
                    }
                });
            } else {
                // Create new cart item
                cartItem = await prisma.cartItem.create({
                    data: {
                        cartId: cart.id,
                        medicineId,
                        quantity
                    },
                    include: {
                        medicine: true
                    }
                });
            }

            return {
                success: true,
                data: {
                    id: cartItem.id,
                    medicineId: cartItem.medicineId,
                    name: cartItem.medicine.name,
                    price: cartItem.medicine.price,
                    quantity: cartItem.quantity,
                    stock: cartItem.medicine.stock,
                    manufacturer: cartItem.medicine.manufacturer,
                    imageUrl: cartItem.medicine.imageUrl,
                    requiresPrescription: cartItem.medicine.requiresPrescription
                }
            };
        } catch (error) {
            console.error("Add to cart error:", error);
            throw error;
        }
    },

    // Update cart item quantity
    updateCartItem: async (userId: string, itemId: string, quantity: number) => {
        try {
            // Verify item belongs to user's cart
            const cartItem = await prisma.cartItem.findFirst({
                where: {
                    id: itemId,
                    cart: {
                        userId
                    }
                },
                include: {
                    medicine: true
                }
            });

            if (!cartItem) {
                throw new Error("Cart item not found");
            }

            if (quantity <= 0) {
                // Delete item if quantity is 0
                await prisma.cartItem.delete({
                    where: { id: itemId }
                });

                return {
                    success: true,
                    data: { deleted: true }
                };
            }

            // Check stock
            if (cartItem.medicine.stock < quantity) {
                throw new Error(`Only ${cartItem.medicine.stock} items available`);
            }

            const updatedItem = await prisma.cartItem.update({
                where: { id: itemId },
                data: { quantity },
                include: {
                    medicine: true
                }
            });

            return {
                success: true,
                data: {
                    id: updatedItem.id,
                    medicineId: updatedItem.medicineId,
                    name: updatedItem.medicine.name,
                    price: updatedItem.medicine.price,
                    quantity: updatedItem.quantity,
                    stock: updatedItem.medicine.stock,
                    manufacturer: updatedItem.medicine.manufacturer,
                    imageUrl: updatedItem.medicine.imageUrl,
                    requiresPrescription: updatedItem.medicine.requiresPrescription
                }
            };
        } catch (error) {
            console.error("Update cart error:", error);
            throw error;
        }
    },

    // Remove item from cart
    removeCartItem: async (userId: string, itemId: string) => {
        try {
            // Verify item belongs to user's cart
            const cartItem = await prisma.cartItem.findFirst({
                where: {
                    id: itemId,
                    cart: {
                        userId
                    }
                }
            });

            if (!cartItem) {
                throw new Error("Cart item not found");
            }

            await prisma.cartItem.delete({
                where: { id: itemId }
            });

            return {
                success: true,
                data: { deleted: true }
            };
        } catch (error) {
            console.error("Remove cart error:", error);
            throw error;
        }
    },

    // Clear entire cart
    clearCart: async (userId: string) => {
        try {
            const cart = await prisma.cart.findUnique({
                where: { userId }
            });

            if (cart) {
                await prisma.cartItem.deleteMany({
                    where: { cartId: cart.id }
                });
            }

            return {
                success: true,
                data: { cleared: true }
            };
        } catch (error) {
            console.error("Clear cart error:", error);
            throw error;
        }
    },

    // Merge guest cart with user cart on login
    mergeCart: async (userId: string, guestCartItems: any[]) => {
        try {
            // Get or create cart
            let cart = await prisma.cart.findUnique({
                where: { userId }
            });

            if (!cart) {
                cart = await prisma.cart.create({
                    data: { userId }
                });
            }

            // Process each guest item
            for (const guestItem of guestCartItems) {
                // Check if medicine exists
                const medicine = await prisma.medicine.findUnique({
                    where: { id: guestItem.medicineId }
                });

                if (!medicine) continue;

                // Check if item already exists in cart
                const existingItem = await prisma.cartItem.findFirst({
                    where: {
                        cartId: cart.id,
                        medicineId: guestItem.medicineId
                    }
                });

                if (existingItem) {
                    // Update quantity (cap at available stock)
                    const newQuantity = Math.min(
                        existingItem.quantity + guestItem.quantity,
                        medicine.stock
                    );
                    await prisma.cartItem.update({
                        where: { id: existingItem.id },
                        data: { quantity: newQuantity }
                    });
                } else {
                    // Create new cart item (cap at available stock)
                    const quantity = Math.min(guestItem.quantity, medicine.stock);
                    await prisma.cartItem.create({
                        data: {
                            cartId: cart.id,
                            medicineId: guestItem.medicineId,
                            quantity
                        }
                    });
                }
            }

            return {
                success: true,
                data: { merged: true }
            };
        } catch (error) {
            console.error("Merge cart error:", error);
            throw error;
        }
    },

    // Get cart count for header badge
    getCartCount: async (userId: string) => {
        try {
            const cart = await prisma.cart.findUnique({
                where: { userId },
                include: {
                    items: {
                        select: { quantity: true }
                    }
                }
            });

            if (!cart) {
                return { success: true, data: 0 };
            }

            const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
            return { success: true, data: count };
        } catch (error) {
            console.error("Get cart count error:", error);
            return { success: true, data: 0 };
        }
    },
    // Get selected cart items by IDs
    getSelectedCartItems: async (userId: string, selectedItemIds: string[]) => {
        try {
            const cart = await prisma.cart.findUnique({
                where: { userId },
                include: {
                    items: {
                        where: {
                            id: {
                                in: selectedItemIds
                            }
                        },
                        include: {
                            medicine: {
                                include: {
                                    category: true
                                }
                            }
                        }
                    }
                }
            });

            if (!cart) {
                return {
                    success: true,
                    data: {
                        items: [],
                        totalItems: 0,
                        totalPrice: 0
                    }
                };
            }

            const cartItems = cart.items.map(item => ({
                id: item.id,
                medicineId: item.medicineId,
                name: item.medicine.name,
                price: item.medicine.price,
                quantity: item.quantity,
                stock: item.medicine.stock,
                manufacturer: item.medicine.manufacturer,
                imageUrl: item.medicine.imageUrl,
                requiresPrescription: item.medicine.requiresPrescription,
                category: item.medicine.category
            }));

            return {
                success: true,
                data: {
                    items: cartItems,
                    totalItems: cartItems.reduce((sum, item) => sum + item.quantity, 0),
                    totalPrice: cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                }
            };
        } catch (error) {
            console.error("Get selected cart items error:", error);
            throw new Error("Failed to fetch selected items");
        }
    }
};

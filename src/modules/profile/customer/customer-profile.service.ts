import { prisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs";
import FormData from "form-data";
import axios from "axios";

const customerProfileService = {
    // Get customer profile
    getProfile: async (userId: string) => {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                phone: true,
                address: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                emailVerified: true,
                isActive: true
            }
        });

        if (!user) {
            throw new Error("User not found");
        }

        if (user.role !== "CUSTOMER") {
            throw new Error("User is not a customer");
        }

        // Get last login from session
        const lastSession = await prisma.session.findFirst({
            where: { userId },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true }
        });

        return {
            success: true,
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
                phone: user.phone,
                address: user.address,
                role: user.role,
                createdAt: user.createdAt,
                lastLogin: lastSession?.createdAt || null,
                emailVerified: user.emailVerified,
                isActive: user.isActive
            }
        };
    },

    // Update profile
    updateProfile: async (userId: string, data: { name?: string; email?: string; phone?: string; address?: string }) => {
        if (data.email) {
            const existingUser = await prisma.user.findFirst({
                where: {
                    email: data.email,
                    id: { not: userId }
                }
            });
            if (existingUser) {
                throw new Error("Email already in use");
            }
        }

        const updateData: any = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.phone !== undefined) updateData.phone = data.phone;
        if (data.address !== undefined) updateData.address = data.address;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                address: true,
                role: true
            }
        });

        return {
            success: true,
            data: updatedUser
        };
    },

    // Upload avatar
    uploadAvatar: async (userId: string, fileBuffer?: Buffer, fileName?: string) => {
        let imageUrl: string | null = null;
        
        if (fileBuffer) {
            if (fileBuffer.length > 2 * 1024 * 1024) {
                throw new Error("Image size must be less than 2MB");
            }
            
            const formData = new FormData();
            const base64Image = fileBuffer.toString('base64');
            formData.append('image', base64Image);
            
            if (fileName) {
                const name = fileName.split('.')[0];
                formData.append('name', `customer_${userId}_${Date.now()}_${name}`);
            }
            
            const response = await axios.post(
                `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
                formData,
                {
                    headers: { ...formData.getHeaders() },
                    timeout: 30000
                }
            );
            
            if (response.data.success) {
                imageUrl = response.data.data.url;
            } else {
                throw new Error(response.data.error?.message || 'Imgbb upload failed');
            }
        }
        
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { image: imageUrl }
        });
        
        return {
            success: true,
            data: {
                url: updatedUser.image,
                message: imageUrl ? "Avatar uploaded successfully" : "Avatar removed"
            }
        };
    },

    // Change password
    changePassword: async (userId: string, currentPassword: string, newPassword: string) => {
        const account = await prisma.account.findFirst({
            where: { userId },
            select: { id: true, password: true }
        });

        if (!account || !account.password) {
            throw new Error("No password set for this account");
        }

        const isValid = await bcrypt.compare(currentPassword, account.password);
        if (!isValid) {
            throw new Error("Current password is incorrect");
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.account.update({
            where: { id: account.id },
            data: { password: hashedPassword }
        });

        return {
            success: true,
            data: { message: "Password changed successfully" }
        };
    },

    // Address management
    getAddresses: async (userId: string) => {
        const addresses = await prisma.customerAddress.findMany({
            where: { userId },
            orderBy: { isDefault: "desc" }
        });

        return {
            success: true,
            data: addresses
        };
    },

    addAddress: async (userId: string, data: any) => {
        const { recipientName, street, city, state, postalCode, country, phone, isDefault } = data;

        // If this is the first address or isDefault is true, set all others to false
        const existingAddresses = await prisma.customerAddress.count({
            where: { userId }
        });

        let shouldBeDefault = isDefault;
        if (existingAddresses === 0) {
            shouldBeDefault = true;
        }

        if (shouldBeDefault) {
            await prisma.customerAddress.updateMany({
                where: { userId, isDefault: true },
                data: { isDefault: false }
            });
        }

        const address = await prisma.customerAddress.create({
            data: {
                userId,
                recipientName,
                street,
                city,
                state,
                postalCode,
                country,
                phone,
                isDefault: shouldBeDefault
            }
        });

        return {
            success: true,
            data: address
        };
    },

    updateAddress: async (addressId: string, userId: string, data: any) => {
        // Verify address belongs to user
        const existingAddress = await prisma.customerAddress.findFirst({
            where: { id: addressId, userId }
        });

        if (!existingAddress) {
            throw new Error("Address not found");
        }

        const { isDefault } = data;

        if (isDefault) {
            await prisma.customerAddress.updateMany({
                where: { userId, isDefault: true },
                data: { isDefault: false }
            });
        }

        const updateData: any = { ...data };
        
        const updatedAddress = await prisma.customerAddress.update({
            where: { id: addressId },
            data: updateData
        });

        return {
            success: true,
            data: updatedAddress
        };
    },

    deleteAddress: async (addressId: string, userId: string) => {
        const address = await prisma.customerAddress.findFirst({
            where: { id: addressId, userId }
        });

        if (!address) {
            throw new Error("Address not found");
        }

        await prisma.customerAddress.delete({
            where: { id: addressId }
        });

        // If deleted address was default, set another as default
        if (address.isDefault) {
            const nextAddress = await prisma.customerAddress.findFirst({
                where: { userId }
            });

            if (nextAddress) {
                await prisma.customerAddress.update({
                    where: { id: nextAddress.id },
                    data: { isDefault: true }
                });
            }
        }

        return {
            success: true,
            data: { message: "Address deleted successfully" }
        };
    },

    setDefaultAddress: async (addressId: string, userId: string) => {
        const address = await prisma.customerAddress.findFirst({
            where: { id: addressId, userId }
        });

        if (!address) {
            throw new Error("Address not found");
        }

        await prisma.customerAddress.updateMany({
            where: { userId, isDefault: true },
            data: { isDefault: false }
        });

        await prisma.customerAddress.update({
            where: { id: addressId },
            data: { isDefault: true }
        });

        return {
            success: true,
            data: { message: "Default address updated" }
        };
    },

    // Order management
    getOrders: async (userId: string, page: number = 1, limit: number = 10) => {
        const skip = (page - 1) * limit;

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where: { customerId: userId },
                include: {
                    orderItems: {
                        include: {
                            medicine: true
                        }
                    }
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit
            }),
            prisma.order.count({
                where: { customerId: userId }
            })
        ]);

        return {
            success: true,
            data: {
                orders,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        };
    },

    // Wishlist management
    getWishlist: async (userId: string) => {
        // If you have a Wishlist model, use it. Otherwise, return empty array
        // This is a placeholder - you'll need to add a Wishlist model to your schema
        const wishlist = await prisma.wishlist.findMany({
            where: { userId },
            include: {
                medicine: true
            },
            orderBy: { createdAt: "desc" }
        }).catch(() => []);

        return {
            success: true,
            data: wishlist
        };
    },

    // Review management
    getReviews: async (userId: string, page: number = 1, limit: number = 10) => {
        const skip = (page - 1) * limit;

        const [reviews, total] = await Promise.all([
            prisma.review.findMany({
                where: { customerId: userId },
                include: {
                    medicine: true
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit
            }),
            prisma.review.count({
                where: { customerId: userId }
            })
        ]);

        return {
            success: true,
            data: {
                reviews,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        };
    },

    deleteReview: async (reviewId: string, userId: string) => {
        const review = await prisma.review.findFirst({
            where: { id: reviewId, customerId: userId }
        });

        if (!review) {
            throw new Error("Review not found");
        }

        await prisma.review.delete({
            where: { id: reviewId }
        });

        return {
            success: true,
            data: { message: "Review deleted successfully" }
        };
    },

    // Session management
    getActiveSessions: async (userId: string) => {
        const sessions = await prisma.session.findMany({
            where: {
                userId,
                expiresAt: { gt: new Date() }
            },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                createdAt: true,
                expiresAt: true,
                ipAddress: true,
                userAgent: true
            }
        });

        const formattedSessions = sessions.map((session, index) => ({
            id: session.id,
            device: parseUserAgent(session.userAgent || ""),
            browser: parseBrowser(session.userAgent || ""),
            ip: session.ipAddress || "Unknown",
            location: "Unknown",
            lastActive: formatTimeAgo(session.createdAt),
            isCurrent: index === 0
        }));

        return { success: true, data: formattedSessions };
    },

    terminateSession: async (sessionId: string, userId: string) => {
        const session = await prisma.session.findFirst({
            where: { id: sessionId, userId }
        });

        if (!session) throw new Error("Session not found");

        await prisma.session.delete({ where: { id: sessionId } });
        return { success: true, data: { message: "Session terminated" } };
    },

    logoutOtherSessions: async (userId: string, currentSessionId: string) => {
        await prisma.session.deleteMany({
            where: { userId, id: { not: currentSessionId } }
        });
        return { success: true, data: { message: "Logged out from all other devices" } };
    },

    // Notification preferences
    updateNotificationPreferences: async (userId: string, preferences: any) => {
        // Store preferences in user metadata or separate table
        // For now, we'll just return success
        // You can add a notification_preferences JSON field to User model
        await prisma.user.update({
            where: { id: userId },
            data: {
                // notificationPreferences: preferences
            }
        });

        return {
            success: true,
            data: { message: "Notification preferences updated" }
        };
    },

    // Delete account
    deleteAccount: async (userId: string, reason?: string) => {
        if (reason) {
            console.log(`Customer account deletion requested for ${userId}. Reason: ${reason}`);
        }

        await prisma.user.delete({
            where: { id: userId }
        });

        return {
            success: true,
            data: { message: "Account deleted successfully" }
        };
    }
};

// Helper functions
const parseUserAgent = (userAgent: string): string => {
    if (userAgent.includes("Windows")) return "Windows";
    if (userAgent.includes("Mac")) return "Mac";
    if (userAgent.includes("iPhone")) return "iPhone";
    if (userAgent.includes("Android")) return "Android";
    if (userAgent.includes("Linux")) return "Linux";
    return "Unknown Device";
};

const parseBrowser = (userAgent: string): string => {
    if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) return "Chrome";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) return "Safari";
    if (userAgent.includes("Edg")) return "Edge";
    if (userAgent.includes("Opera")) return "Opera";
    return "Unknown Browser";
};

const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    return `${Math.floor(hours / 24)} days ago`;
};

export default customerProfileService;
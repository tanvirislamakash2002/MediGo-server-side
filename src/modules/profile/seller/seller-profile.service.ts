import { prisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs";
import FormData from "form-data";
import axios from "axios";

const sellerProfileService = {
    // Get seller profile with store info from Seller table
    getProfile: async (userId: string) => {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                seller: {
                    include: {
                        documents: true
                    }
                }
            }
        });

        if (!user) {
            throw new Error("User not found");
        }

        if (user.role !== "SELLER") {
            throw new Error("User is not a seller");
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
                role: user.role,
                createdAt: user.createdAt,
                lastLogin: lastSession?.createdAt || null,
                emailVerified: user.emailVerified,
                isActive: user.isActive,
                store: user.seller ? {
                    storeName: user.seller.storeName,
                    storeDescription: user.seller.storeDescription,
                    storeLogo: user.seller.storeLogo,
                    isActive: user.seller.isActive,
                    isPaused: user.seller.isPaused,
                    documents: user.seller.documents
                } : null
            }
        };
    },

    // Update personal info
    updatePersonalInfo: async (userId: string, data: { name?: string; email?: string; phone?: string }) => {
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

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
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
                formData.append('name', `seller_${userId}_${Date.now()}_${name}`);
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

    // Get store settings from Seller table

    getStoreSettings: async (userId: string) => {
        let seller = await prisma.seller.findUnique({
            where: { userId },
            include: {
                documents: true
            }
        });

        // If seller doesn't exist, create one with default values
        if (!seller) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { name: true, image: true }
            });

            // Build create data without undefined values
            const createData: any = {
                userId,
                storeName: `${user?.name}'s Store`,
                storeDescription: "Welcome to my pharmacy store",
                businessHours: {
                    monday: { open: "09:00", close: "18:00", closed: false },
                    tuesday: { open: "09:00", close: "18:00", closed: false },
                    wednesday: { open: "09:00", close: "18:00", closed: false },
                    thursday: { open: "09:00", close: "18:00", closed: false },
                    friday: { open: "09:00", close: "18:00", closed: false },
                    saturday: { open: "10:00", close: "16:00", closed: false },
                    sunday: { closed: true }
                },
                shippingSettings: {
                    freeShippingThreshold: 500,
                    shippingFee: 50,
                    estimatedDelivery: "3-5 business days"
                },
                returnPolicy: {
                    allowed: true,
                    days: 7,
                    message: "Items can be returned within 7 days of delivery. Items must be unused and in original packaging."
                },
                notificationPreferences: {
                    email: true,
                    sms: false,
                    newOrder: true,
                    orderUpdate: true,
                    lowStock: true
                },
                isActive: true,
                isPaused: false
            };

            // Only add storeLogo if it exists (not undefined)
            if (user?.image) {
                createData.storeLogo = user.image;
            }

            // Create default seller record
            seller = await prisma.seller.create({
                data: createData,
                include: {
                    documents: true
                }
            });
        }

        // Calculate real performance data
        const [totalProducts, totalOrders, totalSales, reviews, completedOrders] = await Promise.all([
            // Total products
            prisma.medicine.count({
                where: { sellerId: userId }
            }),

            // Total orders (from order items)
            prisma.orderItem.count({
                where: { sellerId: userId }
            }),

            // Total sales
            prisma.orderItem.aggregate({
                where: { sellerId: userId },
                _sum: { price: true }
            }),

            // Reviews for seller's products
            prisma.review.findMany({
                where: {
                    medicine: {
                        sellerId: userId
                    }
                },
                select: { rating: true }
            }),

            // Completed orders for completion rate
            prisma.orderItem.count({
                where: {
                    sellerId: userId,
                    order: {
                        status: "DELIVERED"
                    }
                }
            })
        ]);

        // Calculate average rating
        const averageRating = reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;

        // Calculate completion rate
        const completionRate = totalOrders > 0
            ? (completedOrders / totalOrders) * 100
            : 100;

        return {
            success: true,
            data: {
                ...seller,
                documents: seller.documents || [],
                performance: {
                    rating: averageRating,
                    totalReviews: reviews.length,
                    totalProducts: totalProducts,
                    totalOrders: totalOrders,
                    totalSales: totalSales._sum.price || 0,
                    completionRate: Math.round(completionRate),
                    responseTime: "24 hours",
                    satisfactionRate: Math.round(averageRating * 20)
                }
            }
        };
    },

    // Update store info
    // Update store info
    updateStoreInfo: async (userId: string, data: { storeName?: string; storeDescription?: string }) => {
        // Build update data object without undefined values
        const updateData: any = {};

        if (data.storeName !== undefined) {
            updateData.storeName = data.storeName;
        }

        if (data.storeDescription !== undefined) {
            updateData.storeDescription = data.storeDescription;
        }

        const updatedSeller = await prisma.seller.update({
            where: { userId },
            data: updateData
        });

        return {
            success: true,
            data: updatedSeller
        };
    },

    // Upload store logo
    uploadStoreLogo: async (userId: string, fileBuffer?: Buffer, fileName?: string) => {
        let logoUrl: string | null = null;

        if (fileBuffer) {
            if (fileBuffer.length > 2 * 1024 * 1024) {
                throw new Error("Logo size must be less than 2MB");
            }

            const formData = new FormData();
            const base64Image = fileBuffer.toString('base64');
            formData.append('image', base64Image);

            if (fileName) {
                const name = fileName.split('.')[0];
                formData.append('name', `seller_logo_${userId}_${Date.now()}_${name}`);
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
                logoUrl = response.data.data.url;
            } else {
                throw new Error(response.data.error?.message || 'Imgbb upload failed');
            }
        }

        const updatedSeller = await prisma.seller.update({
            where: { userId },
            data: { storeLogo: logoUrl }
        });

        return {
            success: true,
            data: {
                url: updatedSeller.storeLogo,
                message: logoUrl ? "Logo uploaded successfully" : "Logo removed"
            }
        };
    },

    // Update business hours
    updateBusinessHours: async (userId: string, businessHours: any) => {
        const updatedSeller = await prisma.seller.update({
            where: { userId },
            data: { businessHours }
        });

        return { success: true, data: updatedSeller };
    },

    // Update shipping settings
    updateShippingSettings: async (userId: string, shippingSettings: any) => {
        const updatedSeller = await prisma.seller.update({
            where: { userId },
            data: { shippingSettings }
        });

        return { success: true, data: updatedSeller };
    },

    // Update return policy
    updateReturnPolicy: async (userId: string, returnPolicy: any) => {
        const updatedSeller = await prisma.seller.update({
            where: { userId },
            data: { returnPolicy }
        });

        return { success: true, data: updatedSeller };
    },

    // Update payout info
    updatePayoutInfo: async (userId: string, payoutInfo: any) => {
        const updatedSeller = await prisma.seller.update({
            where: { userId },
            data: { payoutInfo }
        });

        return { success: true, data: updatedSeller };
    },

    // Update notification preferences
    updateNotificationPreferences: async (userId: string, notificationPreferences: any) => {
        const updatedSeller = await prisma.seller.update({
            where: { userId },
            data: { notificationPreferences }
        });

        return { success: true, data: updatedSeller };
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

    // Document upload to SellerDocument table
    uploadDocument: async (userId: string, fileBuffer?: Buffer, fileName?: string, documentType?: string) => {
        let documentUrl: string | null = null;

        if (fileBuffer) {
            if (fileBuffer.length > 5 * 1024 * 1024) {
                throw new Error("Document size must be less than 5MB");
            }

            const formData = new FormData();
            const base64Image = fileBuffer.toString('base64');
            formData.append('image', base64Image);

            if (fileName) {
                const name = fileName.split('.')[0];
                formData.append('name', `seller_doc_${userId}_${Date.now()}_${name}`);
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
                documentUrl = response.data.data.url;
            } else {
                throw new Error(response.data.error?.message || 'Upload failed');
            }
        }

        // First get the seller record
        const seller = await prisma.seller.findUnique({
            where: { userId }
        });

        if (!seller) {
            throw new Error("Seller profile not found");
        }

        // Create document record
        const document = await prisma.sellerDocument.create({
            data: {
                sellerId: seller.id,
                documentType: documentType || "BUSINESS_LICENSE",
                documentUrl: documentUrl || "",
                status: "PENDING"
            }
        });

        return {
            success: true,
            data: document
        };
    },

    // Delete document
    deleteDocument: async (documentId: string, userId: string) => {
        // First verify the document belongs to this seller
        const document = await prisma.sellerDocument.findFirst({
            where: {
                id: documentId,
                seller: {
                    userId
                }
            }
        });

        if (!document) {
            throw new Error("Document not found");
        }

        await prisma.sellerDocument.delete({
            where: { id: documentId }
        });

        return {
            success: true,
            data: { message: "Document deleted" }
        };
    },

    // Pause store
    pauseStore: async (userId: string, reason?: string) => {
        const updatedSeller = await prisma.seller.update({
            where: { userId },
            data: {
                isPaused: true,
                pausedReason: reason || null
            }
        });

        return {
            success: true,
            data: {
                message: "Store paused successfully",
                store: updatedSeller
            }
        };
    },

    // Close store
    closeStore: async (userId: string, reason?: string) => {
        const updatedSeller = await prisma.seller.update({
            where: { userId },
            data: {
                isActive: false,
                pausedReason: reason || null
            }
        });

        return {
            success: true,
            data: {
                message: "Store closed successfully",
                store: updatedSeller
            }
        };
    },

    // Delete account
    deleteAccount: async (userId: string, reason?: string) => {
        if (reason) {
            console.log(`Seller account deletion requested for ${userId}. Reason: ${reason}`);
        }

        // Delete user and all associated data (cascades will handle seller and documents)
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

export default sellerProfileService;
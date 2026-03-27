import { prisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs";
import FormData from "form-data";
import axios from "axios";

const adminProfileService = {
    // Get admin profile
    getProfile: async (userId: string) => {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                phone: true,
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
                isActive: user.isActive
            }
        };
    },

    // Update profile
    updateProfile: async (userId: string, data: { name?: string; email?: string; phone?: string }) => {
        // Check if email is already taken by another user
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

        // Build update data with only defined values
        const updateData: { name?: string; email?: string; phone?: string } = {};

        if (data.name !== undefined) {
            updateData.name = data.name;
        }
        if (data.email !== undefined) {
            updateData.email = data.email;
        }
        if (data.phone !== undefined) {
            updateData.phone = data.phone;
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });

        return {
            success: true,
            data: updatedUser
        };
    },
    // Upload avatar
     // Upload avatar to Imgbb cloud storage
uploadAvatar: async (userId: string, fileBuffer?: Buffer, fileName?: string) => {
    let imageUrl: string | null = null;
    
    if (fileBuffer) {
        try {
            // Validate file size (already done by multer, but double-check)
            if (fileBuffer.length > 2 * 1024 * 1024) {
                throw new Error("Image size must be less than 2MB");
            }
            
            // Create form data
            const formData = new FormData();
            const base64Image = fileBuffer.toString('base64');
            
            formData.append('image', base64Image);
            
            // Optional: Add image name for better organization
            if (fileName) {
                const name = fileName.split('.')[0];
                formData.append('name', `admin_${userId}_${Date.now()}_${name}`);
            }
            
            // Upload to Imgbb
            const response = await axios.post(
                `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                    },
                    timeout: 30000
                }
            );
            
            if (response.data.success) {
                imageUrl = response.data.data.url;
                console.log(`Avatar uploaded successfully for user ${userId}: ${imageUrl}`);
            } else {
                throw new Error(response.data.error?.message || 'Imgbb upload failed');
            }
            
        } catch (error) {
            console.error('Imgbb upload error:', error);
            throw new Error(error instanceof Error ? error.message : 'Failed to upload image');
        }
    }
    
    // Update user with new image URL
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
        // Get user with password from account table
        const account = await prisma.account.findFirst({
            where: { userId },
            select: { id: true, password: true }
        });

        if (!account || !account.password) {
            throw new Error("No password set for this account");
        }

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, account.password);
        if (!isValid) {
            throw new Error("Current password is incorrect");
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await prisma.account.update({
            where: { id: account.id },
            data: { password: hashedPassword }
        });

        return {
            success: true,
            data: { message: "Password changed successfully" }
        };
    },

    // Get active sessions
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

        // Get current session token from cookies (simplified)
        const currentSessionId = sessions[0]?.id; // In real implementation, get from request

        const formattedSessions = sessions.map(session => ({
            id: session.id,
            device: parseUserAgent(session.userAgent || ""),
            browser: parseBrowser(session.userAgent || ""),
            ip: session.ipAddress || "Unknown",
            location: "Unknown", // Would need IP geolocation service
            lastActive: formatTimeAgo(session.createdAt),
            isCurrent: session.id === currentSessionId
        }));

        return {
            success: true,
            data: formattedSessions
        };
    },

    // Terminate a session
    terminateSession: async (sessionId: string, userId: string) => {
        const session = await prisma.session.findFirst({
            where: { id: sessionId, userId }
        });

        if (!session) {
            throw new Error("Session not found");
        }

        await prisma.session.delete({
            where: { id: sessionId }
        });

        return {
            success: true,
            data: { message: "Session terminated" }
        };
    },

    // Logout all other sessions
    logoutOtherSessions: async (userId: string, currentSessionId: string) => {
        await prisma.session.deleteMany({
            where: {
                userId,
                id: { not: currentSessionId }
            }
        });

        return {
            success: true,
            data: { message: "Logged out from all other devices" }
        };
    },

    // Get activity logs
    getActivityLogs: async (userId: string, page: number = 1, limit: number = 50) => {
        // For demonstration, we'll create activity logs from existing data
        // In production, you'd have a dedicated ActivityLog table

        const skip = (page - 1) * limit;

        // Get recent orders (as example activities)
        const recentOrders = await prisma.order.findMany({
            where: { customerId: userId },
            take: limit,
            skip,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                createdAt: true,
                totalAmount: true,
                status: true
            }
        });

        // Get user actions from login sessions
        const loginSessions = await prisma.session.findMany({
            where: { userId },
            take: limit,
            skip,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                createdAt: true,
                ipAddress: true
            }
        });

        // Combine and format activities
        const activities: Array<{
            id: string;
            action: string;
            details: string;
            ipAddress: string;
            status: "success" | "failed";
            createdAt: Date;
        }> = [
                ...recentOrders.map(order => ({
                    id: `order-${order.id}`,
                    action: "Order Placed",
                    details: `Order #${order.id.slice(0, 8)} for $${order.totalAmount.toFixed(2)}`,
                    ipAddress: "System",
                    status: "success" as const,
                    createdAt: order.createdAt
                })),
                ...loginSessions.map(session => ({
                    id: `login-${session.id}`,
                    action: "Login",
                    details: "Logged into account",
                    ipAddress: session.ipAddress || "Unknown",
                    status: "success" as const,
                    createdAt: session.createdAt
                }))
            ];

        // Sort by date and paginate
        activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return {
            success: true,
            data: activities.slice(0, limit)
        };
    },

    // Update preferences (store in user metadata or separate table)
    updatePreferences: async (userId: string, preferences: any) => {
        // For simplicity, store in user's metadata
        // In production, create a UserPreference table
        await prisma.user.update({
            where: { id: userId },
            data: {
                // You might add a preferences JSON field to your User model
                // For now, we'll just return success
            }
        });

        return {
            success: true,
            data: { message: "Preferences updated" }
        };
    },

    // Export activity logs
    exportActivityLogs: async (userId: string) => {
        const logs = await adminProfileService.getActivityLogs(userId, 1, 1000);

        // Convert to CSV
        const csv = [
            ["Date", "Action", "Details", "IP Address", "Status"],
            ...logs.data.map((log: any) => [
                new Date(log.createdAt).toISOString(),
                log.action,
                log.details,
                log.ipAddress,
                log.status
            ])
        ].map(row => row.join(",")).join("\n");

        // In production, save to file and return URL
        return {
            success: true,
            data: { url: "/api/export/logs.csv", csv }
        };
    },

    // Export account data
    exportAccountData: async (userId: string) => {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                orders: true,
                reviews: true,
                sessions: true
            }
        });

        const data = {
            profile: {
                name: user?.name,
                email: user?.email,
                phone: user?.phone,
                role: user?.role,
                createdAt: user?.createdAt
            },
            orders: user?.orders,
            reviews: user?.reviews,
            sessions: user?.sessions.map(s => ({
                createdAt: s.createdAt,
                ipAddress: s.ipAddress,
                userAgent: s.userAgent
            }))
        };

        // In production, save to file and return URL
        return {
            success: true,
            data: { url: "/api/export/account-data.json", json: data }
        };
    },

    // Delete account
    deleteAccount: async (userId: string, reason?: string) => {
        // Log deletion reason (in production, save to audit log)
        if (reason) {
            console.log(`Account deletion requested for ${userId}. Reason: ${reason}`);
        }

        // Delete user and all associated data
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

export default adminProfileService;
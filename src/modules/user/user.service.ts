import { prisma } from "../../lib/prisma";
import { GetAllUsersParams, UserWithStats } from "../../types/user.types";

const userService = {
    // Get all users with filters and pagination
    getAllUsers: async (params: GetAllUsersParams) => {
        const page = params.page || 1;
        const limit = params.limit || 10;
        const skip = (page - 1) * limit;

        // Build where conditions
        const where: any = {};

        // Role filter
        if (params.role && params.role !== "all") {
            where.role = params.role;
        }

        // Status filter (active/banned)
        if (params.status === "active") {
            where.isActive = true;
        } else if (params.status === "banned") {
            where.isActive = false;
        }

        // Verified filter
        if (params.verified === "verified") {
            where.emailVerified = true;
        } else if (params.verified === "unverified") {
            where.emailVerified = false;
        }

        // Search filter
        if (params.search) {
            where.OR = [
                { name: { contains: params.search, mode: "insensitive" } },
                { email: { contains: params.search, mode: "insensitive" } }
            ];
        }

        // Build orderBy
        let orderBy: any = {};
        switch (params.sort) {
            case "newest":
                orderBy = { createdAt: "desc" };
                break;
            case "oldest":
                orderBy = { createdAt: "asc" };
                break;
            case "name_asc":
                orderBy = { name: "asc" };
                break;
            case "name_desc":
                orderBy = { name: "desc" };
                break;
            case "orders":
                // Will handle after fetch
                orderBy = { createdAt: "desc" };
                break;
            default:
                orderBy = { createdAt: "desc" };
        }

        // Get users with order counts
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                include: {
                    orders: {
                        select: {
                            totalAmount: true
                        }
                    },
                    _count: {
                        select: { orders: true }
                    }
                },
                orderBy,
                skip,
                take: limit
            }),
            prisma.user.count({ where })
        ]);

        // Transform users to include stats 
        const formattedUsers: UserWithStats[] = users.map(user => {
            const baseUser: UserWithStats = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role || "CUSTOMER",
                isActive: user.isActive ?? true,
                emailVerified: user.emailVerified,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                orderCount: user._count.orders,
                totalSpent: user.orders.reduce((sum, order) => sum + order.totalAmount, 0)
            };

            // Only add phone if it exists (not null/undefined)
            if (user.phone) {
                baseUser.phone = user.phone;
            }

            // Only add address if it exists (not null/undefined)
            if (user.address) {
                baseUser.address = user.address;
            }

            return baseUser;
        });

        // Sort by order count if needed
        if (params.sort === "orders") {
            formattedUsers.sort((a, b) => b.orderCount - a.orderCount);
        }

        // Calculate stats
        const stats = {
            total: await prisma.user.count(),
            customers: await prisma.user.count({ where: { role: "CUSTOMER" } }),
            sellers: await prisma.user.count({ where: { role: "SELLER" } }),
            admins: await prisma.user.count({ where: { role: "ADMIN" } }),
            active: await prisma.user.count({ where: { isActive: true } }),
            banned: await prisma.user.count({ where: { isActive: false } }),
            verified: await prisma.user.count({ where: { emailVerified: true } }),
            unverified: await prisma.user.count({ where: { emailVerified: false } })
        };

        return {
            success: true,
            data: {
                users: formattedUsers,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                },
                stats
            }
        };
    },

    // Get single user by ID
    getUserById: async (userId: string) => {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                orders: {
                    select: {
                        id: true,
                        totalAmount: true,
                        status: true,
                        createdAt: true
                    },
                    orderBy: { createdAt: "desc" },
                    take: 10
                },
                _count: {
                    select: { orders: true }
                }
            }
        });

        if (!user) {
            throw new Error("User not found");
        }

        
        const userWithStats: UserWithStats = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role || "CUSTOMER",
            isActive: user.isActive ?? true,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            orderCount: user._count.orders,
            totalSpent: user.orders.reduce((sum, order) => sum + order.totalAmount, 0)
        };

        // Only add phone if it exists (not null/undefined)
        if (user.phone) {
            userWithStats.phone = user.phone;
        }

        // Only add address if it exists (not null/undefined)
        if (user.address) {
            userWithStats.address = user.address;
        }

        return {
            success: true,
            data: {
                user: userWithStats,
                recentOrders: user.orders
            }
        };
    },

    // Ban user
    banUser: async (userId: string) => {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new Error("User not found");
        }

        // Prevent banning the last admin
        if (user.role === "ADMIN") {
            const adminCount = await prisma.user.count({
                where: { role: "ADMIN", isActive: true }
            });

            if (adminCount === 1) {
                throw new Error("Cannot ban the last admin user");
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { isActive: false }
        });

        return {
            success: true,
            data: updatedUser
        };
    },

    // Unban user
    unbanUser: async (userId: string) => {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new Error("User not found");
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { isActive: true }
        });

        return {
            success: true,
            data: updatedUser
        };
    },

    // Change user role
    changeUserRole: async (userId: string, newRole: string) => {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new Error("User not found");
        }

        // Prevent removing the last admin
        if (user.role === "ADMIN" && newRole !== "ADMIN") {
            const adminCount = await prisma.user.count({
                where: { role: "ADMIN", isActive: true }
            });

            if (adminCount === 1) {
                throw new Error("Cannot demote the last admin user");
            }
        }

        // Validate new role
        const validRoles = ["CUSTOMER", "SELLER", "ADMIN"];
        if (!validRoles.includes(newRole)) {
            throw new Error("Invalid role");
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { role: newRole }
        });

        return {
            success: true,
            data: updatedUser
        };
    },

    // Verify user email
    verifyUserEmail: async (userId: string) => {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new Error("User not found");
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { emailVerified: true }
        });

        return {
            success: true,
            data: updatedUser
        };
    },

    // Delete user
    deleteUser: async (userId: string) => {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new Error("User not found");
        }

        // Prevent deleting the last admin
        if (user.role === "ADMIN") {
            const adminCount = await prisma.user.count({
                where: { role: "ADMIN", isActive: true }
            });

            if (adminCount === 1) {
                throw new Error("Cannot delete the last admin user");
            }
        }

        await prisma.user.delete({
            where: { id: userId }
        });

        return {
            success: true,
            data: { deleted: true }
        };
    }
};

export default userService;
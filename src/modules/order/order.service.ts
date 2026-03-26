import { prisma } from "../../lib/prisma";
import { OrderStatus } from "../../../generated/prisma/enums";

interface OrderItemInput {
    cartItemId?: string;  // Add this for cart item deletion
    medicineId: string;
    quantity: number;
    price?: number;
}

interface CreateOrderInput {
    customerId: string;
    shippingAddress: {
        fullName: string;
        phone: string;
        addressLine1: string;
        addressLine2?: string;
        city: string;
        postalCode: string;
    };
    deliveryInstructions?: string;
    items: OrderItemInput[];
    totalAmount?: number;
    promoCode?: string;
}

interface GetMyOrdersParams {
    customerId: string;
    status?: string;
    statuses?: string[];
    search?: string;
    fromDate?: Date;
    toDate?: Date;
    minAmount?: number;
    maxAmount?: number;
    page: number;
    limit: number;
    skip: number;
    sortBy: string;
    sortOrder: string;
}

const createOrder = async (data: CreateOrderInput) => {
    const { customerId, shippingAddress, deliveryInstructions, items, promoCode } = data;

    const result = await prisma.$transaction(async (tx) => {
        let totalAmount = 0;
        const orderItems = [];

        for (const item of items) {
            const medicine = await tx.medicine.findUnique({
                where: { id: item.medicineId },
                include: { seller: true }
            });

            if (!medicine) {
                throw new Error(`Medicine not found: ${item.medicineId}`);
            }

            if (medicine.stock < item.quantity) {
                throw new Error(`Insufficient stock for ${medicine.name}. Available: ${medicine.stock}`);
            }

            // Update stock
            await tx.medicine.update({
                where: { id: item.medicineId },
                data: {
                    stock: {
                        decrement: item.quantity
                    }
                }
            });

            // Use provided price or current medicine price
            const itemPrice = item.price || medicine.price;
            const itemTotal = itemPrice * item.quantity;
            totalAmount += itemTotal;

            orderItems.push({
                medicineId: item.medicineId,
                quantity: item.quantity,
                price: itemPrice,
                sellerId: medicine.sellerId
            });
        }

        // Format shipping address as string
        const shippingAddressString = `${shippingAddress.addressLine1}${shippingAddress.addressLine2 ? ', ' + shippingAddress.addressLine2 : ''}, ${shippingAddress.city}, ${shippingAddress.postalCode}`;

        // Create order
        const order = await tx.order.create({
            data: {
                customerId,
                totalAmount,
                shippingAddress: shippingAddressString,
                phone: shippingAddress.phone,
                status: OrderStatus.PLACED,
                orderItems: {
                    create: orderItems
                }
            },
            include: {
                orderItems: {
                    include: {
                        medicine: {
                            select: {
                                id: true,
                                name: true,
                                imageUrl: true,
                                price: true,
                                manufacturer: true
                            }
                        }
                    }
                }
            }
        });

        // After order is created, delete the cart items that were ordered
        const cartItemIds = items
            .map(item => item.cartItemId)
            .filter((id): id is string => id !== undefined && id !== '');

        if (cartItemIds.length > 0) {
            await tx.cartItem.deleteMany({
                where: {
                    id: {
                        in: cartItemIds
                    }
                }
            });
        }

        return order;
    });

    return {
        success: true,
        data: result
    };
};

const getMyOrders = async (params: GetMyOrdersParams) => {
    const {
        customerId,
        status,
        statuses,
        search,
        fromDate,
        toDate,
        minAmount,
        maxAmount,
        page,
        limit,
        skip,
        sortBy,
        sortOrder
    } = params;

    // Build where conditions array
    const whereConditions: any[] = [];

    // Always filter by customer ID
    whereConditions.push({ customerId });

    // Status filter (single or multiple)
    if (status) {
        whereConditions.push({ status });
    }

    if (statuses && statuses.length > 0) {
        whereConditions.push({
            status: {
                in: statuses
            }
        });
    }

    // Search filter (by order ID or medicine name)
    if (search) {
        whereConditions.push({
            OR: [
                {
                    id: {
                        contains: search,
                        mode: "insensitive"
                    }
                },
                {
                    orderItems: {
                        some: {
                            medicine: {
                                name: {
                                    contains: search,
                                    mode: "insensitive"
                                }
                            }
                        }
                    }
                }
            ]
        });
    }

    // Date range filter
    if (fromDate || toDate) {
        const dateCondition: any = {};
        if (fromDate) dateCondition.gte = fromDate;
        if (toDate) dateCondition.lte = toDate;
        whereConditions.push({ createdAt: dateCondition });
    }

    // Amount range filter
    if (minAmount !== undefined || maxAmount !== undefined) {
        const amountCondition: any = {};
        if (minAmount !== undefined) amountCondition.gte = minAmount;
        if (maxAmount !== undefined) amountCondition.lte = maxAmount;
        whereConditions.push({ totalAmount: amountCondition });
    }

    // Build final where clause
    const where = {
        AND: whereConditions
    };

    // Build orderBy object
    const orderBy: any = {};

    // Map sortBy to database field
    const sortFieldMap: { [key: string]: string } = {
        "newest": "createdAt",
        "oldest": "createdAt",
        "highest": "totalAmount",
        "lowest": "totalAmount",
        "createdAt": "createdAt",
        "totalAmount": "totalAmount",
        "status": "status"
    };

    const dbSortBy = sortFieldMap[sortBy] || "createdAt";
    orderBy[dbSortBy] = sortOrder;

    // Execute queries with pagination
    const [orders, total] = await Promise.all([
        prisma.order.findMany({
            where,
            include: {
                orderItems: {
                    include: {
                        medicine: {
                            select: {
                                id: true,
                                name: true,
                                imageUrl: true,
                                price: true,
                                manufacturer: true,
                                requiresPrescription: true
                            }
                        }
                    }
                }
            },
            orderBy,
            take: limit,
            skip
        }),
        prisma.order.count({ where })
    ]);

    // Transform data for frontend
    const formattedOrders = orders.map(order => ({
        id: order.id,
        createdAt: order.createdAt,
        status: order.status,
        totalAmount: order.totalAmount,
        shippingAddress: order.shippingAddress,
        phone: order.phone,
        deliveryInstructions: (order as any).deliveryInstructions,
        estimatedDeliveryDate: (order as any).estimatedDeliveryDate,
        items: order.orderItems.map(item => ({
            id: item.id,
            medicineId: item.medicineId,
            name: item.medicine.name,
            price: item.price,
            quantity: item.quantity,
            imageUrl: item.medicine.imageUrl,
            manufacturer: item.medicine.manufacturer,
            requiresPrescription: item.medicine.requiresPrescription
        }))
    }));

    return {
        success: true,
        data: {
            orders: formattedOrders,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            },
            filters: {
                status: status || statuses,
                search,
                dateRange: { fromDate, toDate },
                amountRange: { minAmount, maxAmount }
            }
        }
    };
};

const getOrderById = async (orderId: string, customerId?: string, sellerId?: string) => {
    const where: any = { id: orderId };

    if (customerId) {
        where.customerId = customerId;
    }

    const result = await prisma.order.findFirst({
        where,
        include: {
            orderItems: {
                include: {
                    medicine: {
                        select: {
                            id: true,
                            name: true,
                            imageUrl: true,
                            price: true,
                            manufacturer: true,
                            requiresPrescription: true,
                            sellerId: true  // Include sellerId to check access
                        }
                    }
                }
            },
            customer: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    address: true
                }
            }
        }
    });

    if (!result) {
        throw new Error("Order not found");
    }

    // If seller is requesting, verify they have at least one item in this order
    if (sellerId) {
        const hasSellerItems = result.orderItems.some(
            item => item.medicine.sellerId === sellerId
        );

        if (!hasSellerItems) {
            throw new Error("Unauthorized: This order does not contain your products");
        }
    }

    // Transform orderItems to items for frontend compatibility
    const transformedData = {
        ...result,
        items: result.orderItems.map(item => ({
            id: item.id,
            medicineId: item.medicineId,
            name: item.medicine.name,
            price: item.price,
            quantity: item.quantity,
            imageUrl: item.medicine.imageUrl,
            manufacturer: item.medicine.manufacturer,
            requiresPrescription: item.medicine.requiresPrescription,
            sellerId: item.medicine.sellerId
        }))
    };

    return {
        success: true,
        data: transformedData
    };
};

const getSellerOrders = async (
    sellerId: string,
    params?: {
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: string;
        status?: string;
        search?: string;
        fromDate?: Date;
        toDate?: Date;
    }
) => {
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const skip = (page - 1) * limit;
    const sortBy = params?.sortBy || "createdAt";
    const sortOrder = params?.sortOrder || "desc";

    // Build where conditions for filtering
    const whereConditions: any[] = [];

    // Filter by seller
    whereConditions.push({ sellerId });

    // Filter by order status
    if (params?.status && params.status !== "all") {
        whereConditions.push({
            order: {
                status: params.status
            }
        });
    }

    // Search by order ID or medicine name
    if (params?.search) {
        whereConditions.push({
            OR: [
                {
                    order: {
                        id: {
                            contains: params.search,
                            mode: "insensitive"
                        }
                    }
                },
                {
                    medicine: {
                        name: {
                            contains: params.search,
                            mode: "insensitive"
                        }
                    }
                }
            ]
        });
    }

    // Filter by date range
    if (params?.fromDate || params?.toDate) {
        const dateCondition: any = {};
        if (params?.fromDate) dateCondition.gte = params.fromDate;
        if (params?.toDate) dateCondition.lte = params.toDate;
        whereConditions.push({
            order: {
                createdAt: dateCondition
            }
        });
    }

    // Build orderBy object
    const orderBy: any = {};
    const sortFieldMap: { [key: string]: string } = {
        "newest": "createdAt",
        "oldest": "createdAt",
        "highest": "totalAmount",
        "lowest": "totalAmount",
        "createdAt": "createdAt",
        "totalAmount": "totalAmount",
        "status": "status"
    };

    const dbSortBy = sortFieldMap[sortBy] || "createdAt";

    // Handle special sorting cases
    if (sortBy === "newest") {
        orderBy.createdAt = "desc";
    } else if (sortBy === "oldest") {
        orderBy.createdAt = "asc";
    } else if (sortBy === "highest") {
        orderBy.totalAmount = "desc";
    } else if (sortBy === "lowest") {
        orderBy.totalAmount = "asc";
    } else {
        orderBy[dbSortBy] = sortOrder;
    }

    // Get total count for pagination
    const total = await prisma.orderItem.count({
        where: {
            AND: whereConditions
        }
    });

    // Get paginated results
    const result = await prisma.orderItem.findMany({
        where: {
            AND: whereConditions
        },
        orderBy: {
            order: orderBy
        },
        skip,
        take: limit,
        include: {
            order: {
                include: {
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                            address: true,
                        }
                    }
                }
            },
            medicine: {
                select: {
                    id: true,
                    name: true,
                    imageUrl: true,
                    price: true,
                    manufacturer: true
                }
            }
        }
    });

    // Group by order for better structure
    const ordersMap = new Map();

    result.forEach(item => {
        const orderId = item.order.id;
        if (!ordersMap.has(orderId)) {
            ordersMap.set(orderId, {
                id: item.order.id,
                totalAmount: item.order.totalAmount,
                status: item.order.status,
                createdAt: item.order.createdAt,
                shippingAddress: item.order.shippingAddress,
                phone: item.order.phone,
                customer: item.order.customer,
                items: []
            });
        }

        ordersMap.get(orderId).items.push({
            id: item.id,
            medicineId: item.medicineId,
            name: item.medicine.name,
            price: item.price,
            quantity: item.quantity,
            imageUrl: item.medicine.imageUrl,
            manufacturer: item.medicine.manufacturer
        });
    });

    // Calculate stats
    const stats = {
        total: total,
        pending: await prisma.orderItem.count({
            where: {
                sellerId,
                order: { status: "PLACED" }
            }
        }),
        processing: await prisma.orderItem.count({
            where: {
                sellerId,
                order: { status: "PROCESSING" }
            }
        }),
        shipped: await prisma.orderItem.count({
            where: {
                sellerId,
                order: { status: "SHIPPED" }
            }
        }),
        delivered: await prisma.orderItem.count({
            where: {
                sellerId,
                order: { status: "DELIVERED" }
            }
        }),
        cancelled: await prisma.orderItem.count({
            where: {
                sellerId,
                order: { status: "CANCELLED" }
            }
        })
    };

    return {
        success: true,
        data: {
            orders: Array.from(ordersMap.values()),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            },
            stats
        }
    };
};

const updateOrderStatus = async (orderId: string, sellerId: string, status: OrderStatus) => {
    // Verify order belongs to seller
    const orderItem = await prisma.orderItem.findFirst({
        where: {
            orderId,
            sellerId
        }
    });

    if (!orderItem) {
        throw new Error("Order not found or unauthorized");
    }

    const result = await prisma.order.update({
        where: { id: orderId },
        data: { status },
        include: {
            orderItems: {
                include: {
                    medicine: true
                }
            }
        }
    });

    return {
        success: true,
        data: result
    };
};

const cancelOrder = async (orderId: string, customerId: string) => {
    // First, find the order and verify it belongs to the customer
    const order = await prisma.order.findFirst({
        where: {
            id: orderId,
            customerId: customerId
        },
        include: {
            orderItems: true
        }
    });

    if (!order) {
        throw new Error("Order not found");
    }

    // Check if order can be cancelled (only PLACED or PROCESSING)
    if (order.status !== "PLACED" && order.status !== "PROCESSING") {
        throw new Error("Order cannot be cancelled. It has already been processed or shipped.");
    }

    // Use transaction to restore stock and update order status
    const result = await prisma.$transaction(async (tx) => {
        // Restore stock for each item
        for (const item of order.orderItems) {
            await tx.medicine.update({
                where: { id: item.medicineId },
                data: {
                    stock: {
                        increment: item.quantity
                    }
                }
            });
        }

        // Update order status to CANCELLED
        const cancelledOrder = await tx.order.update({
            where: { id: orderId },
            data: {
                status: "CANCELLED",
                updatedAt: new Date()
            },
            include: {
                orderItems: {
                    include: {
                        medicine: {
                            select: {
                                id: true,
                                name: true,
                                imageUrl: true,
                                price: true,
                                manufacturer: true
                            }
                        }
                    }
                }
            }
        });

        return cancelledOrder;
    });

    return {
        success: true,
        data: result
    };
};

const getAllOrders = async (params?: {
    status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    fromDate?: Date;
    toDate?: Date;
}) => {
    const page = params?.page || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const sortBy = params?.sortBy || "createdAt";
    const sortOrder = params?.sortOrder || "desc";

    // Build where conditions
    const whereConditions: any[] = [];

    // Status filter
    if (params?.status && params.status !== "all") {
        whereConditions.push({ status: params.status });
    }

    // Search filter (by order ID or customer name/email)
    if (params?.search) {
        whereConditions.push({
            OR: [
                { id: { contains: params.search, mode: "insensitive" } },
                { customer: { name: { contains: params.search, mode: "insensitive" } } },
                { customer: { email: { contains: params.search, mode: "insensitive" } } }
            ]
        });
    }

    // Date range filter
    if (params?.fromDate || params?.toDate) {
        const dateCondition: any = {};
        if (params?.fromDate) dateCondition.gte = params.fromDate;
        if (params?.toDate) dateCondition.lte = params.toDate;
        whereConditions.push({ createdAt: dateCondition });
    }

    // Build where clause
    const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

    // Get orders with pagination
    const [orders, total] = await Promise.all([
        prisma.order.findMany({
            where,
            include: {
                orderItems: {
                    include: {
                        medicine: {
                            select: {
                                id: true,
                                name: true,
                                imageUrl: true,
                                price: true,
                                manufacturer: true,
                                requiresPrescription: true
                            }
                        }
                    }
                },
                customer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        address: true
                    }
                }
            },
            orderBy: { [sortBy]: sortOrder },
            take: limit,
            skip
        }),
        prisma.order.count({ where })
    ]);

    // Transform data
    const formattedOrders = orders.map(order => ({
        id: order.id,
        createdAt: order.createdAt,
        status: order.status,
        totalAmount: order.totalAmount,
        shippingAddress: order.shippingAddress,
        phone: order.phone,
        deliveryInstructions: (order as any).deliveryInstructions,
        customer: order.customer,
        items: order.orderItems.map(item => ({
            id: item.id,
            medicineId: item.medicineId,
            name: item.medicine.name,
            price: item.price,
            quantity: item.quantity,
            imageUrl: item.medicine.imageUrl,
            manufacturer: item.medicine.manufacturer,
            requiresPrescription: item.medicine.requiresPrescription
        }))
    }));

    // Calculate stats
    const stats = {
        total: await prisma.order.count(),
        placed: await prisma.order.count({ where: { status: "PLACED" } }),
        processing: await prisma.order.count({ where: { status: "PROCESSING" } }),
        shipped: await prisma.order.count({ where: { status: "SHIPPED" } }),
        delivered: await prisma.order.count({ where: { status: "DELIVERED" } }),
        cancelled: await prisma.order.count({ where: { status: "CANCELLED" } })
    };

    return {
        success: true,
        data: {
            orders: formattedOrders,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            },
            stats
        }
    };
};

const adminUpdateOrderStatus = async (orderId: string, status: string, reason?: string, adminId?: string) => {
    // Get current order to restore stock if cancelling
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { orderItems: true }
    });

    if (!order) {
        throw new Error("Order not found");
    }

    const result = await prisma.$transaction(async (tx) => {
        // If cancelling, restore stock
        if (status === "CANCELLED" && order.status !== "CANCELLED") {
            for (const item of order.orderItems) {
                await tx.medicine.update({
                    where: { id: item.medicineId },
                    data: { stock: { increment: item.quantity } }
                });
            }
        }

        // Update order status
        const updatedOrder = await tx.order.update({
            where: { id: orderId },
            data: { status: status as OrderStatus },
            include: {
                orderItems: {
                    include: {
                        medicine: true
                    }
                },
                customer: true
            }
        });

        // Log admin action (if you have an audit log table)
        // await tx.adminLog.create({
        //     data: {
        //         adminId,
        //         orderId,
        //         action: "UPDATE_STATUS",
        //         oldStatus: order.status,
        //         newStatus: status,
        //         reason
        //     }
        // });

        return updatedOrder;
    });

    return {
        success: true,
        data: result
    };
};

const adminCancelOrder = async (orderId: string, reason?: string, adminId?: string) => {
    return await adminUpdateOrderStatus(orderId, "CANCELLED", reason, adminId);
};

// Add to exports
export const orderService = {
    createOrder,
    getMyOrders,
    getOrderById,
    getSellerOrders,
    updateOrderStatus,
    cancelOrder,
    getAllOrders,           // NEW
    adminUpdateOrderStatus, // NEW
    adminCancelOrder        // NEW
};
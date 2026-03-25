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
        }
    });

    if (!result) {
        throw new Error("Order not found");
    }

    return {
        success: true,
        data: result
    };
};

const getSellerOrders = async (sellerId: string) => {
    const result = await prisma.orderItem.findMany({
        where: {
            sellerId
        },
        orderBy: {
            createdAt: 'desc'
        },
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

    return {
        success: true,
        data: Array.from(ordersMap.values())
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

export const orderService = {
    createOrder,
    getMyOrders,
    getOrderById,
    getSellerOrders,
    updateOrderStatus
};
import { prisma } from "../../lib/prisma";

interface OrderItemInput {
    medicineId: string,
    quantity: number
}

interface CreateOrderInput {
    customerId: string;
    shippingAddress: string;
    phone: string;
    items: OrderItemInput[]
}

const createOrder = async (data: CreateOrderInput) => {

    const { customerId, shippingAddress, phone, items } = data

    const result = await prisma.$transaction(async (tx) => {

        let totalAmount = 0;
        const orderItems = [];

        for (const item of items) {
            const medicine = await tx.medicine.findUnique({
                where: { id: item.medicineId },
                include: { seller: true }
            })
            if (!medicine) {
                throw new Error('medicine not found')
            }
            if (medicine.stock < item.quantity) {
                throw new Error('Insufficient Stock')
            }

            await tx.medicine.update({
                where: { id: item.medicineId },
                data: {
                    stock: {
                        decrement: item.quantity
                    }
                }
            })
            const itemTotal = medicine.price * item.quantity;
            totalAmount += itemTotal;

            orderItems.push({
                medicineId: item.medicineId,
                quantity: item.quantity,
                price: medicine.price,
                sellerId: medicine.sellerId
            })
        }
        const order = await tx.order.create({
            data: {
                customerId,
                totalAmount,
                shippingAddress,
                phone,
                orderItems: {
                    create: orderItems
                }
            }
            // ,
            // include: {
            //     orderItems: {
            //         include: {
            //             medicine: true
            //         }
            //     }
            // }
        })
        return order;
    })
    return result;
}

const getMyOrder = async (customerId: string) => {
    const result = await prisma.order.findMany({
        where: {
            customerId
        },
        orderBy:{
            createdAt:'desc'
        }
    })
    return result
}


export const orderService = {
    createOrder,
    getMyOrder
}
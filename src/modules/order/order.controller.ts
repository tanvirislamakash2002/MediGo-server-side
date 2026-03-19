import { NextFunction, Request, Response } from "express";
import { orderService } from "./order.service";

const createOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const orderData = {
            ...req.body,
            customerId: user?.id
        }
        const result = await orderService.createOrder(orderData)
        res.status(201).json(result)
    } catch (error) {
        next(error)
    }
}

const getMyOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user
        const result = await orderService.getMyOrders(user?.id as string)
        res.status(201).json(result)
    } catch (error) {
        next(error)
    }
}

const getSellerOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user
        const result = await orderService.getSellerOrders(user?.id as string)
        res.status(201).json(result)
    } catch (error) {
        next(error)
    }
}

export const orderController = {
    createOrder,
    getMyOrders,
    getSellerOrders
}
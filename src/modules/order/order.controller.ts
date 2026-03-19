import { NextFunction, Request, Response } from "express";
import { orderService } from "./order.service";

const createOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const orderData = {
            ...req.body,
            customerId:user?.id
        }
        const result = await orderService.createOrder(orderData)
        res.status(201).json(result)
    } catch (error) {
        next(error)
    }
}

export const orderController = {
    createOrder
}
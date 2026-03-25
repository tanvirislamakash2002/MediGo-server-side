import { NextFunction, Request, Response } from "express";
import { orderService } from "./order.service";
import paginationSortingHelper from "../../helpers/paginationSortingHelper";

const createOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const orderData = {
            ...req.body,
            customerId: user?.id
        };

        const result = await orderService.createOrder(orderData);
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
};

const getMyOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }
        
        // Get query parameters
        const status = req.query.status as string | undefined;
        const search = req.query.search as string | undefined;
        const statuses = req.query.statuses 
            ? (req.query.statuses as string).split(',')
            : undefined;
        
        const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : undefined;
        const toDate = req.query.toDate ? new Date(req.query.toDate as string) : undefined;
        
        const minAmount = req.query.minAmount ? Number(req.query.minAmount) : undefined;
        const maxAmount = req.query.maxAmount ? Number(req.query.maxAmount) : undefined;
        
        // Get pagination and sorting params
        const {
            page,
            limit,
            skip,
            sortBy,
            sortOrder
        } = paginationSortingHelper(req.query);
        
        // Build params object with only defined values
        const params: any = {
            customerId: user.id,
            page,
            limit,
            skip,
            sortBy,
            sortOrder
        };
        
        // Add optional params only if defined
        if (status !== undefined) params.status = status;
        if (statuses !== undefined) params.statuses = statuses;
        if (search !== undefined) params.search = search;
        if (fromDate !== undefined) params.fromDate = fromDate;
        if (toDate !== undefined) params.toDate = toDate;
        if (minAmount !== undefined) params.minAmount = minAmount;
        if (maxAmount !== undefined) params.maxAmount = maxAmount;
        
        const result = await orderService.getMyOrders(params);
        
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const getOrderById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const { orderId } = req.params;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "Order ID is required"
            });
        }

        const result = await orderService.getOrderById(orderId as string, user?.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const getSellerOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        if (user.role !== "SELLER") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Seller only."
            });
        }

        const result = await orderService.getSellerOrders(user?.id as string);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const { orderId } = req.params;
        const { status } = req.body;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        if (user.role !== "SELLER") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Seller only."
            });
        }

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "Order ID is required"
            });
        }

        if (!status) {
            return res.status(400).json({
                success: false,
                message: "Status is required"
            });
        }

        const result = await orderService.updateOrderStatus(orderId as string, user.id, status);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const orderController = {
    createOrder,
    getMyOrders,
    getOrderById,
    getSellerOrders,
    updateOrderStatus
};
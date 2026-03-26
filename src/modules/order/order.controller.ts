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

        let result;

        // If user is a seller, pass sellerId for verification
        if (user?.role === "SELLER") {
            result = await orderService.getOrderById(orderId as string, undefined, user.id);
        }
        // If user is a customer, pass customerId
        else if (user?.role === "CUSTOMER") {
            result = await orderService.getOrderById(orderId as string, user.id);
        }
        // Admin can access any order
        else {
            result = await orderService.getOrderById(orderId as string);
        }

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

        // Get pagination params
        const page = req.query.page ? parseInt(req.query.page as string) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

        // Get sorting params
        const sortBy = req.query.sortBy as string || "createdAt";
        const sortOrder = req.query.sortOrder as string || "desc";

        // Get filter params
        const status = req.query.status as string;
        const search = req.query.search as string;
        const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : undefined;
        const toDate = req.query.toDate ? new Date(req.query.toDate as string) : undefined;

        // Map frontend sort value to backend
        let sortField = sortBy;
        let sortDir = sortOrder;

        if (sortBy === "newest") {
            sortField = "createdAt";
            sortDir = "desc";
        } else if (sortBy === "oldest") {
            sortField = "createdAt";
            sortDir = "asc";
        } else if (sortBy === "highest") {
            sortField = "totalAmount";
            sortDir = "desc";
        } else if (sortBy === "lowest") {
            sortField = "totalAmount";
            sortDir = "asc";
        }

        // Build params object with only defined values
        const params: {
            page?: number;
            limit?: number;
            sortBy?: string;
            sortOrder?: string;
            status?: string;
            search?: string;
            fromDate?: Date;
            toDate?: Date;
        } = {
            page,
            limit,
            sortBy: sortField,
            sortOrder: sortDir
        };

        // Only add optional params if they are defined
        if (status && status !== "all") params.status = status;
        if (search) params.search = search;
        if (fromDate) params.fromDate = fromDate;
        if (toDate) params.toDate = toDate;

        const result = await orderService.getSellerOrders(user.id, params);

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

const cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const { orderId } = req.params;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "Order ID is required"
            });
        }

        // Only customers can cancel their own orders
        if (user.role !== "CUSTOMER") {
            return res.status(403).json({
                success: false,
                message: "Only customers can cancel orders"
            });
        }

        const result = await orderService.cancelOrder(orderId as string, user.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const getAllOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        if (user.role !== "ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin only."
            });
        }

        // Get query parameters
        const status = req.query.status as string;
        const search = req.query.search as string;
        const sort = req.query.sort as string || "newest";
        const page = req.query.page ? parseInt(req.query.page as string) : 1;
        const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : undefined;
        const toDate = req.query.toDate ? new Date(req.query.toDate as string) : undefined;

        // Map sort values
        let sortBy = "createdAt";
        let sortOrder = "desc";

        switch (sort) {
            case "newest":
                sortBy = "createdAt";
                sortOrder = "desc";
                break;
            case "oldest":
                sortBy = "createdAt";
                sortOrder = "asc";
                break;
            case "highest":
                sortBy = "totalAmount";
                sortOrder = "desc";
                break;
            case "lowest":
                sortBy = "totalAmount";
                sortOrder = "asc";
                break;
        }

        // Build params object with only defined values
        const params: {
            status?: string;
            search?: string;
            sortBy?: string;
            sortOrder?: string;
            page?: number;
            fromDate?: Date;
            toDate?: Date;
        } = {
            sortBy,
            sortOrder,
            page
        };

        // Only add optional params if they are defined
        if (status && status !== "all") params.status = status;
        if (search) params.search = search;
        if (fromDate) params.fromDate = fromDate;
        if (toDate) params.toDate = toDate;

        const result = await orderService.getAllOrders(params);

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const adminUpdateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const { orderId } = req.params;
        const { status, reason } = req.body;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        if (user.role !== "ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin only."
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

        const result = await orderService.adminUpdateOrderStatus(orderId as string, status, reason, user.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const adminCancelOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const { orderId } = req.params;
        const { reason } = req.body;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        if (user.role !== "ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin only."
            });
        }

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "Order ID is required"
            });
        }

        const result = await orderService.adminCancelOrder(orderId as string, reason, user.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

// Add to exports
export const orderController = {
    createOrder,
    getMyOrders,
    getOrderById,
    getSellerOrders,
    updateOrderStatus,
    cancelOrder,
    getAllOrders,
    adminUpdateOrderStatus,
    adminCancelOrder
};
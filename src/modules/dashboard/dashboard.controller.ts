import { NextFunction, Request, Response } from "express";
import dashboardService from "./dashboard.service";

const getAdminDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        
        if (!user || user.role !== "ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin only."
            });
        }
        
        const range = req.query.range as string || "week";
        const result = await dashboardService.getAdminDashboardStats(range);
        
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const getSellerDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        
        if (!user || user.role !== "SELLER") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Seller only."
            });
        }
        
        const range = req.query.range as string || "week";
        const result = await dashboardService.getSellerDashboardStats(user.id, range);
        
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const dashboardController = {
    getAdminDashboardStats,
    getSellerDashboardStats
};
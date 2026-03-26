import { NextFunction, Request, Response } from "express";
import userService from "./user.service";

const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;

        // Check if user is admin
        if (!user || user.role !== "ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin only."
            });
        }

        const role = req.query.role as string;
        const status = req.query.status as string;
        const verified = req.query.verified as string;
        const search = req.query.search as string;
        const sort = req.query.sort as string;
        const page = req.query.page ? parseInt(req.query.page as string) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

        const result = await userService.getAllUsers({
            role,
            status,
            verified,
            search,
            sort,
            page,
            limit
        });

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const getUserById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const { userId } = req.params;

        if (!user || user.role !== "ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin only."
            });
        }

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        const result = await userService.getUserById(userId as string);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const banUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const { userId } = req.params;

        if (!user || user.role !== "ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin only."
            });
        }

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        const result = await userService.banUser(userId as string);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const unbanUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const { userId } = req.params;

        if (!user || user.role !== "ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin only."
            });
        }

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        const result = await userService.unbanUser(userId as string);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const changeUserRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const { userId } = req.params;
        const { role } = req.body;

        if (!user || user.role !== "ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin only."
            });
        }

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        if (!role) {
            return res.status(400).json({
                success: false,
                message: "Role is required"
            });
        }

        const result = await userService.changeUserRole(userId as string, role);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const verifyUserEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const { userId } = req.params;

        if (!user || user.role !== "ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin only."
            });
        }

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        const result = await userService.verifyUserEmail(userId as string);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const { userId } = req.params;

        if (!user || user.role !== "ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin only."
            });
        }

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        const result = await userService.deleteUser(userId as string);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const userController = {
    getAllUsers,
    getUserById,
    banUser,
    unbanUser,
    changeUserRole,
    verifyUserEmail,
    deleteUser
};
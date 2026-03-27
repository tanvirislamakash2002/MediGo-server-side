import { NextFunction, Request, Response } from "express";
import multer from "multer";
import profileService from "./profile.service";

// Configure multer
const storage = multer.memoryStorage();

const fileFilter = (req: any, file: any, cb: any) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only image files are allowed"), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB limit
    }
});

// Extend Express Request type
interface RequestWithFile extends Request {
    file?: Express.Multer.File;
}

// Define the upload middleware separately
const uploadAvatarMiddleware = upload.single("avatar");

// Define the handler separately with proper typing
const uploadAvatarHandler = async (
    req: RequestWithFile,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }
        
        const file = req.file;
        const result = await profileService.uploadAvatar(
            user.id,
            file?.buffer,
            file?.originalname
        );
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

// Combine them into a single handler array
const uploadAvatar = [uploadAvatarMiddleware, uploadAvatarHandler];

// ... rest of your controller functions

const getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const result = await profileService.getProfile(user.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const { name, email, phone } = req.body;
        const result = await profileService.updateProfile(user.id, { name, email, phone });
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const { currentPassword, newPassword } = req.body;
        const result = await profileService.changePassword(user.id, currentPassword, newPassword);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const getActiveSessions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const result = await profileService.getActiveSessions(user.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const terminateSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const { sessionId } = req.params;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const result = await profileService.terminateSession(sessionId as string, user.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const logoutOtherSessions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const currentSessionId = req.cookies["better-auth.session_token"] || "";

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const result = await profileService.logoutOtherSessions(user.id, currentSessionId);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const getActivityLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const page = req.query.page ? parseInt(req.query.page as string) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const result = await profileService.getActivityLogs(user.id, page, limit);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const updatePreferences = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const result = await profileService.updatePreferences(user.id, req.body);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const exportActivityLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const result = await profileService.exportActivityLogs(user.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const exportAccountData = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const result = await profileService.exportAccountData(user.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const { reason } = req.body;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const result = await profileService.deleteAccount(user.id, reason);

        // Clear session cookie
        res.clearCookie("better-auth.session_token");
        res.clearCookie("better-auth.session_data");

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const profileController = {
    getProfile,
    updateProfile,
    uploadAvatar, 
    changePassword,
    getActiveSessions,
    terminateSession,
    logoutOtherSessions,
    getActivityLogs,
    updatePreferences,
    exportActivityLogs,
    exportAccountData,
    deleteAccount
};
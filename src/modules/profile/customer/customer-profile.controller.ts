import { NextFunction, Request, Response } from "express";
import multer from "multer";
import customerProfileService from "./customer-profile.service";

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

interface RequestWithFile extends Request {
    file?: Express.Multer.File;
}

// Avatar upload
const uploadAvatarMiddleware = upload.single("avatar");
const uploadAvatarHandler = async (req: RequestWithFile, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        
        const result = await customerProfileService.uploadAvatar(
            user.id,
            req.file?.buffer,
            req.file?.originalname
        );
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
const uploadAvatar = [uploadAvatarMiddleware, uploadAvatarHandler];

// Profile functions
const getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await customerProfileService.getProfile(user.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { name, email, phone, address } = req.body;
        const result = await customerProfileService.updateProfile(user.id, { name, email, phone, address });
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { currentPassword, newPassword } = req.body;
        const result = await customerProfileService.changePassword(user.id, currentPassword, newPassword);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

// Address management
const getAddresses = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await customerProfileService.getAddresses(user.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const addAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await customerProfileService.addAddress(user.id, req.body);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const updateAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const { addressId } = req.params;

        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (!addressId || typeof addressId !== 'string') {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid address ID" 
            });
        }

        const result = await customerProfileService.updateAddress(addressId, user.id, req.body);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const deleteAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const { addressId } = req.params;

        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (!addressId || typeof addressId !== 'string') {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid address ID" 
            });
        }

        const result = await customerProfileService.deleteAddress(addressId, user.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const setDefaultAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const { addressId } = req.params;

        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (!addressId || typeof addressId !== 'string') {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid address ID" 
            });
        }

        const result = await customerProfileService.setDefaultAddress(addressId, user.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

// Order management
const getOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const page = req.query.page ? parseInt(req.query.page as string) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

        const result = await customerProfileService.getOrders(user.id, page, limit);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

// Wishlist management
const getWishlist = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await customerProfileService.getWishlist(user.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

// Review management
const getReviews = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const page = req.query.page ? parseInt(req.query.page as string) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

        const result = await customerProfileService.getReviews(user.id, page, limit);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const deleteReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const { reviewId } = req.params;

        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (!reviewId || typeof reviewId !== 'string') {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid review ID" 
            });
        }

        const result = await customerProfileService.deleteReview(reviewId, user.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

// Session management
const getActiveSessions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await customerProfileService.getActiveSessions(user.id);
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
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (!sessionId || typeof sessionId !== 'string') {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid session ID" 
            });
        }

        const result = await customerProfileService.terminateSession(sessionId, user.id);
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
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await customerProfileService.logoutOtherSessions(user.id, currentSessionId);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

// Notification preferences
const updateNotificationPreferences = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await customerProfileService.updateNotificationPreferences(user.id, req.body);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

// Account management
const deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const { reason } = req.body;

        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await customerProfileService.deleteAccount(user.id, reason);

        // Clear session cookies
        res.clearCookie("better-auth.session_token");
        res.clearCookie("better-auth.session_data");

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const customerProfileController = {
    getProfile,
    updateProfile,
    uploadAvatar,
    changePassword,
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    getOrders,
    getWishlist,
    getReviews,
    deleteReview,
    getActiveSessions,
    terminateSession,
    logoutOtherSessions,
    updateNotificationPreferences,
    deleteAccount
};
import { NextFunction, Request, Response } from "express";
import multer from "multer";
import sellerProfileService from "./seller-profile.service";

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

// Configure multer for documents (larger size)
const documentUpload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit for documents
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
        
        const result = await sellerProfileService.uploadAvatar(
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

// Store logo upload
const uploadLogoMiddleware = upload.single("logo");
const uploadLogoHandler = async (req: RequestWithFile, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        
        const result = await sellerProfileService.uploadStoreLogo(
            user.id,
            req.file?.buffer,
            req.file?.originalname
        );
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
const uploadStoreLogo = [uploadLogoMiddleware, uploadLogoHandler];

// Document upload
const uploadDocumentMiddleware = documentUpload.single("document");
const uploadDocumentHandler = async (req: RequestWithFile, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        
        const { documentType } = req.body;
        const result = await sellerProfileService.uploadDocument(
            user.id,
            req.file?.buffer,
            req.file?.originalname,
            documentType
        );
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
const uploadDocument = [uploadDocumentMiddleware, uploadDocumentHandler];

// Profile functions
const getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await sellerProfileService.getProfile(user.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const updatePersonalInfo = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { name, email, phone } = req.body;
        const result = await sellerProfileService.updatePersonalInfo(user.id, { name, email, phone });
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
        const result = await sellerProfileService.changePassword(user.id, currentPassword, newPassword);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const getStoreSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await sellerProfileService.getStoreSettings(user.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const updateStoreInfo = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { storeName, storeDescription } = req.body;
        const result = await sellerProfileService.updateStoreInfo(user.id, { storeName, storeDescription });
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const updateBusinessHours = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await sellerProfileService.updateBusinessHours(user.id, req.body);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const updateShippingSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await sellerProfileService.updateShippingSettings(user.id, req.body);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const updateReturnPolicy = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await sellerProfileService.updateReturnPolicy(user.id, req.body);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const updatePayoutInfo = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await sellerProfileService.updatePayoutInfo(user.id, req.body);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const updateNotificationPreferences = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await sellerProfileService.updateNotificationPreferences(user.id, req.body);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const getActiveSessions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await sellerProfileService.getActiveSessions(user.id);
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

        // Validate sessionId
        if (!sessionId || typeof sessionId !== 'string') {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid session ID" 
            });
        }

        const result = await sellerProfileService.terminateSession(sessionId, user.id);
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

        const result = await sellerProfileService.logoutOtherSessions(user.id, currentSessionId);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const deleteDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const { documentId } = req.params;

        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        // Validate documentId
        if (!documentId || typeof documentId !== 'string') {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid document ID" 
            });
        }

        const result = await sellerProfileService.deleteDocument(documentId, user.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const pauseStore = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const { reason } = req.body;

        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await sellerProfileService.pauseStore(user.id, reason);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const closeStore = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const { reason } = req.body;

        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await sellerProfileService.closeStore(user.id, reason);
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
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await sellerProfileService.deleteAccount(user.id, reason);

        // Clear session cookies
        res.clearCookie("better-auth.session_token");
        res.clearCookie("better-auth.session_data");

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const sellerProfileController = {
    getProfile,
    updatePersonalInfo,
    uploadAvatar,
    changePassword,
    getStoreSettings,
    updateStoreInfo,
    uploadStoreLogo,
    updateBusinessHours,
    updateShippingSettings,
    updateReturnPolicy,
    updatePayoutInfo,
    updateNotificationPreferences,
    getActiveSessions,
    terminateSession,
    logoutOtherSessions,
    uploadDocument,
    deleteDocument,
    pauseStore,
    closeStore,
    deleteAccount
};
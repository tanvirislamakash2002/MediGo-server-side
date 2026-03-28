import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { uploadService } from "./upload.service";

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
    limits: { fileSize: 2 * 1024 * 1024 }
});

export const uploadController = {
    uploadAvatar: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const file = (req as any).file;
            if (!file) {
                return res.status(400).json({ success: false, message: "No file uploaded" });
            }

            const imageUrl = await uploadService.uploadImage(file.buffer, file.originalname);

            res.json({
                success: true,
                data: { url: imageUrl }
            });
        } catch (error) {
            next(error);
        }
    }
};

export const uploadMiddleware = upload.single("avatar");
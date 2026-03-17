import { Request, Response } from "express";
import { categoryService } from "./category.service";

const createCategory = async (req: Request, res: Response) => {
    try {
        const result = await categoryService.createCategory(req.body, req.user.id)
        res.status(201).json(result)
    } catch (error) {
        res.status(400).json({
            error: "Post creation failed",
            details: error
        })
    }
}

export const categoryController = {
    createCategory
}
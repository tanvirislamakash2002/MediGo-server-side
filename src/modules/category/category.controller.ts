import { NextFunction, Request, Response } from "express";
import { categoryService } from "./category.service";

const createCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await categoryService.createCategory(req.body);
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
};

const getAllCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const search = req.query.search as string;
        const sort = req.query.sort as string;
        const page = req.query.page ? parseInt(req.query.page as string) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

        const result = await categoryService.getAllCategories({
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

const getCategoryById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { categoryId } = req.params;
        const result = await categoryService.getCategoryById(categoryId as string);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { categoryId } = req.params;
        const result = await categoryService.updateCategory(categoryId as string, req.body);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { categoryId } = req.params;
        const result = await categoryService.deleteCategory(categoryId as string);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

// Add to exports
export const categoryController = {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory
};
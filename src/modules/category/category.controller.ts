import { NextFunction, Request, Response } from "express";
import { categoryService } from "./category.service";

const createCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await categoryService.createCategory(req.body)
        res.status(201).json(result)
    } catch (error) {
        next(error)
    }
}

const getAllCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { search } = req.query;
        const searchString = typeof search === 'string' ? search : undefined;
        const result = await categoryService.getAllCategories({ search: searchString })
        res.status(200).json(result)
    } catch (error) {
        next(error)
    }
}

export const categoryController = {
    createCategory,
    getAllCategories
}
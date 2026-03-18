import { NextFunction, Request, Response } from "express";
import { medicineService } from "./medicine.service";
import paginationSortingHelper from "../../helpers/paginationSortingHelper";

const createMedicine = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user
        if (!user) {
            return res.status(400).json({
                error: "Unauthorized"
            })
        }

        const result = await medicineService.createMedicine(req.body, user.id as string)
        res.status(201).json(result)
    } catch (error) {
        next(error)
    }
}

const getAllMedicine = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { search } = req.query;
        const searchString = typeof search === 'string' ? search : undefined;

        const categoryId = req.query.categoryId as string | undefined

        // filter by price
        const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
        const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;

        const manufacturer = req.query.manufacturer as string | undefined

        const requiresPrescription = req.query.requiresPrescription
            ? req.query.requiresPrescription === 'true'
                ? true
                : req.query.requiresPrescription === 'false'
                    ? false
                    : undefined
            : undefined

        const inStock = req.query.inStock
            ? req.query.inStock === 'true'
                ? true
                : undefined
            : undefined

        const sellerId = req.query.sellerId as string | undefined

        const {
            page,
            limit,
            skip,
            sortBy,
            sortOrder
        } = paginationSortingHelper(req.query)

        const result = await medicineService.getAllMedicine({
            search: searchString,
            categoryId,
            minPrice,
            maxPrice,
            manufacturer,
            requiresPrescription,
            inStock,
            sellerId,
            page,
            limit,
            skip,
            sortBy,
            sortOrder
        })
        res.status(200).json(result)
    } catch (error) {
        next(error)
    }
}

const getMedicineById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { medicineId } = req.params;
        if (!medicineId) {
            throw new Error("Medicine Id is required")
        }
        const result = await medicineService.getMedicineById(medicineId as string)
        res.status(200).json(result)
    } catch (error) {
        next(error)
    }
}

const deleteMedicine = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const { medicineId } = req.params;
        const result = await medicineService.deleteMedicine(medicineId as string, user?.id as string)
        res.status(200).json(result)
    } catch (error) {
        next(error)
    }
}

export const medicineController = {
    createMedicine,
    getAllMedicine,
    getMedicineById,
    deleteMedicine
}
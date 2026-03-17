import { Request, Response } from "express";
import { medicineService } from "./medicine.service";

const createMedicine = async (req: Request, res: Response) => {
    try {
        const result = await medicineService.createMedicine(req.body)
        res.status(201).json(result)
    } catch (error) {
        res.status(400).json({
            error: "Post creation failed",
            details: error
        })
    }
}

export const medicineController = {
    createMedicine
}
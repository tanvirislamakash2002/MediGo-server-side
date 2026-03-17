import { Request, Response } from "express";
import { medicineService } from "./medicine.service";

const createMedicine = async (req: Request, res: Response) => {
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
        res.status(400).json({
            error: "Post creation failed",
            details: error
        })
    }
}

export const medicineController = {
    createMedicine
}
import { Medicine } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

const createMedicine = async (data: Omit<Medicine, "id" | "createdAt" | "updatedAt" | "sellerId">, userId: string) => {
    const result = await prisma.medicine.create({
        data: {
            ...data,
            sellerId: userId
        }
    })
    return result
}

export const medicineService = {
    createMedicine
}
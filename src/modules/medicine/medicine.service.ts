import { Medicine } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

const createMedicine = async (data: Omit<Medicine, "id" | "createdAt" | "updatedAt">) => {
    const result = await prisma.medicine.create({
        data
    })
    return result
}

export const medicineService = {
    createMedicine
}
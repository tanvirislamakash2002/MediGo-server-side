
import { Category } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

const createCategory = async (data: Omit<Category, "id" | "createdAt" | "updatedAt">) => {
    const result = await prisma.category.create({
        data
    })
    return result
}

const getAllCategories = async () => {
    const result = await prisma.category.findMany()
    return result
}

export const categoryService = {
    createCategory,
    getAllCategories
}
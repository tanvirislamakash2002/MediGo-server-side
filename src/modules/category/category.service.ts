
import { Category } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

const createCategory = async (data: Omit<Category, "id" | "createdAt" | "updatedAt">) => {
    const result = await prisma.category.create({
        data
    })
    return result
}

const getAllCategories = async (payload: { search: string | undefined }) => {
    const result = await prisma.category.findMany({
        where: {
            OR:
                [
                    {
                        name: {
                            contains: payload.search as string,
                            mode: "insensitive"
                        }
                    },
                    {
                        description: {
                            contains: payload.search as string,
                            mode: "insensitive"
                        }
                    }
                ]
        }
    })
    return result
}

export const categoryService = {
    createCategory,
    getAllCategories
}
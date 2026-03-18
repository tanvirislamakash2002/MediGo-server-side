import { Medicine, Prisma } from "../../../generated/prisma/client";
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

const getAllMedicine = async ({
    search,
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
}
    : {
        search: string | undefined,
        categoryId: string | undefined,
        minPrice: number | undefined,
        maxPrice: number | undefined,
        manufacturer: string | undefined,
        requiresPrescription: boolean | undefined,
        inStock: boolean | undefined,
        sellerId: string | undefined,
        page: number,
        limit: number,
        skip: number,
        sortBy: string,
        sortOrder: string | undefined
    }) => {

    const andConditions: Prisma.MedicineWhereInput[] = []
    if (search) {
        andConditions.push({
            OR:
                [
                    {
                        name: {
                            contains: search,
                            mode: "insensitive"
                        }
                    },
                    {
                        description: {
                            contains: search,
                            mode: "insensitive"
                        }
                    },
                    {
                        manufacturer: {
                            contains: search,
                            mode: "insensitive"
                        }
                    }
                ]
        })
    }
    if (categoryId) {
        andConditions.push({
            categoryId
        })
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
        const priceCondition: Prisma.FloatFilter = {}
        if (minPrice !== undefined) {
            priceCondition.gte = minPrice
        }
        if (maxPrice !== undefined) {
            priceCondition.lte = maxPrice
        }
        andConditions.push({
            price: priceCondition
        })
    }
    if (manufacturer) {
        andConditions.push({
            manufacturer: {
                contains: manufacturer,
                mode: "insensitive"
            }
        })
    }
    if (typeof requiresPrescription === 'boolean') {
        andConditions.push({
            requiresPrescription
        })
    }
    if (inStock) {
        andConditions.push({
            stock: {
                gt: 0
            }
        })
    }
    if (sellerId) {
        andConditions.push({
            sellerId
        })
    }
    const result = await prisma.medicine.findMany({
        take: limit,
        skip,
        where: {
            AND: andConditions
        },
        orderBy: {
            [sortBy]: sortOrder
        }
    })
    const total = await prisma.medicine.count({
        where: {
            AND: andConditions
        },
    })
    return {
        data: result,
        pagination: {
            total,
            page,
            limit,
            totalPage: Math.ceil(total / limit)
        }
    }
}

const getMedicineById = async (medicineId: string) => {
    const result = await prisma.medicine.findUnique({
        where: {
            id: medicineId
        }
    })
    return result
}

const deleteMedicine = async (medicineId: string, sellerId: string) => {
    const medicineData = await prisma.medicine.findFirst({
        where: {
            id: medicineId,
            sellerId
        },
        select: {
            id: true
        }
    })
    if (!medicineData) {
        throw new Error("Your provided input is invalid")
    }

    const result = await prisma.medicine.delete({
        where: {
            id: medicineData.id
        }
    })
    return result;
}

export const medicineService = {
    createMedicine,
    getAllMedicine,
    getMedicineById,
    deleteMedicine
}
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
    categoryName,
    categoryIds,
    minPrice,
    maxPrice,
    manufacturer,
    manufacturerList,
    requiresPrescription,
    inStock,
    sellerId,
    page,
    limit,
    skip,
    sortBy,
    sortOrder
}: {
    search: string | undefined,
    categoryId: string | undefined,
    categoryName: string | undefined,
    categoryIds: string[] | undefined,
    minPrice: number | undefined,
    maxPrice: number | undefined,
    manufacturer: string | undefined,
    manufacturerList: string[] | undefined,
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
            OR: [
                { name: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                { manufacturer: { contains: search, mode: "insensitive" } },
                // NEW: also search in category name
                {
                    category: {
                        name: { contains: search, mode: "insensitive" }
                    }
                }
            ]
        })
    }


    if (categoryId) {
        andConditions.push({ categoryId })
    }


    if (categoryIds && categoryIds.length > 0) {
        andConditions.push({
            categoryId: {
                in: categoryIds
            }
        })
    }

    if (categoryName) {
        andConditions.push({
            category: {
                name: {
                    contains: categoryName,
                    mode: "insensitive"
                }
            }
        })
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
        const priceCondition: Prisma.FloatFilter = {}
        if (minPrice !== undefined) priceCondition.gte = minPrice
        if (maxPrice !== undefined) priceCondition.lte = maxPrice
        andConditions.push({ price: priceCondition })
    }

    if (manufacturer) {
        andConditions.push({
            manufacturer: {
                contains: manufacturer,
                mode: "insensitive"
            }
        })
    }


    if (manufacturerList && manufacturerList.length > 0) {
        andConditions.push({
            manufacturer: {
                in: manufacturerList
            }
        })
    }


    if (typeof requiresPrescription === 'boolean') {
        andConditions.push({ requiresPrescription })
    }


    if (inStock) {
        andConditions.push({ stock: { gt: 0 } })
    }


    if (sellerId) {
        andConditions.push({ sellerId })
    }

    const result = await prisma.medicine.findMany({
        take: limit,
        skip,
        where: {
            AND: andConditions
        },
        orderBy: {
            [sortBy]: sortOrder
        },
        include: {
            category: true
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
        },
        include: {
            category: {
                select: {
                    id: true,
                    name: true
                }
            },
            seller: {
                select: {
                    id: true,
                    name: true
                }
            }
        }
    })
    return result
}

const getMyMedicine = async (sellerId: string) => {
    const result = await prisma.medicine.findMany({
        where: {
            sellerId
        },
        orderBy: {
            createdAt: "desc"
        }
    })
    const total = await prisma.medicine.count({
        where: {
            sellerId
        }
    })
    return {
        data: result,
        total
    }
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

const updateMedicine = async (medicineId: string, sellerId: string, data: Partial<Omit<Medicine, "id" | "createdAt" | "updatedAt" | "sellerId">>) => {
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

    const result = await prisma.medicine.update({
        where: {
            id: medicineData.id
        },
        data

    })

    return result
}

const getPriceRange = async () => {

    const result = await prisma.medicine.aggregate({
        _min: { price: true },
        _max: { price: true }
    });

    return {
        min: result._min.price || 0,
        max: result._max.price || 100
    };



};

const getManufacturers = async () => {

    const result = await prisma.medicine.findMany({
        select: { manufacturer: true },
        distinct: ['manufacturer'],
        orderBy: { manufacturer: 'asc' }
    });

    return result.map(item => item.manufacturer);

};

export const medicineService = {
    createMedicine,
    getAllMedicine,
    getMedicineById,
    getMyMedicine,
    deleteMedicine,
    updateMedicine,
    getPriceRange,
    getManufacturers
}
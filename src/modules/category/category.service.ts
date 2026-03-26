import { prisma } from "../../lib/prisma";
import { Category } from "../../../generated/prisma/client";

const createCategory = async (data: Omit<Category, "id" | "createdAt" | "updatedAt">) => {
    const result = await prisma.category.create({
        data
    });
    return result;
};

const getAllCategories = async (params?: {
    search?: string;
    sort?: string;
    page?: number;
    limit?: number;
}) => {
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const skip = (page - 1) * limit;
    
    // Build where conditions for search
    const where: any = {};
    if (params?.search) {
        where.OR = [
            { name: { contains: params.search, mode: "insensitive" } },
            { description: { contains: params.search, mode: "insensitive" } }
        ];
    }
    
    // Build orderBy for sorting
    let orderBy: any = {};
    const sort = params?.sort || "name";
    
    switch (sort) {
        case "name":
            orderBy = { name: "asc" };
            break;
        case "name_desc":
            orderBy = { name: "desc" };
            break;
        case "newest":
            orderBy = { createdAt: "desc" };
            break;
        case "oldest":
            orderBy = { createdAt: "asc" };
            break;
        case "products":
            // Will handle after fetching
            break;
        default:
            orderBy = { name: "asc" };
    }
    
    // Get categories with pagination
    const categories = await prisma.category.findMany({
        where,
        orderBy: sort === "products" ? undefined : orderBy,
        skip,
        take: limit,
    });
    
    // Get product counts for each category
    const categoriesWithCount = await Promise.all(
        categories.map(async (category) => {
            const productCount = await prisma.medicine.count({
                where: { categoryId: category.id }
            });
            return {
                ...category,
                productCount
            };
        })
    );
    
    // Sort by product count if needed
    let sortedCategories = categoriesWithCount;
    if (sort === "products") {
        sortedCategories = categoriesWithCount.sort((a, b) => b.productCount - a.productCount);
    }
    
    // Get total count for pagination
    const total = await prisma.category.count({ where });
    
    return {
        success: true,
        data: {
            categories: sortedCategories,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        }
    };
};

const getCategoryById = async (id: string) => {
    const result = await prisma.category.findUnique({
        where: { id }
    });
    return result;
};

const updateCategory = async (id: string, data: { name?: string; description?: string }) => {
    const result = await prisma.category.update({
        where: { id },
        data
    });
    return result;
};

const deleteCategory = async (id: string) => {
    // Check if category has products
    const productCount = await prisma.medicine.count({
        where: { categoryId: id }
    });
    
    if (productCount > 0) {
        throw new Error(`Cannot delete category with ${productCount} products. Reassign products first.`);
    }
    
    const result = await prisma.category.delete({
        where: { id }
    });
    return result;
};

// Add to exports
export const categoryService = {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory
};
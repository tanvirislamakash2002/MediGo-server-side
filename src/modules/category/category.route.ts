import express, { Router } from "express";
import { categoryController } from "./category.controller";
import auth from "../../middlewares/auth";
import { Role } from "../../../generated/prisma/enums";

const router = express.Router();

// Public routes
router.get('/', categoryController.getAllCategories);
router.get('/:categoryId', categoryController.getCategoryById);

// Admin only routes
router.post('/', auth(Role.ADMIN), categoryController.createCategory);
router.patch('/:categoryId', auth(Role.ADMIN), categoryController.updateCategory);
router.delete('/:categoryId', auth(Role.ADMIN), categoryController.deleteCategory);

export const categoryRouter: Router = router;
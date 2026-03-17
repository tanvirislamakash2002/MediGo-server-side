import express, { NextFunction, Request, Response, Router } from "express"
import { categoryController } from "./category.controller";

const router = express.Router()

router.get(
    '/',
    categoryController.getAllCategories
)

router.post(
    '/',
    categoryController.createCategory
)

export const categoryRouter: Router = router;
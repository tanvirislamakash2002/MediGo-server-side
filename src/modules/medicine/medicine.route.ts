import express, { Router } from "express"
import { Role } from "../../../generated/prisma/enums";
import { medicineController } from "./medicine.controller";
import auth from "../../middlewares/auth";

const router = express.Router()

router.post(
    '/',
    auth(Role.SELLER),
    medicineController.createMedicine
)

export const medicineRouter: Router = router;
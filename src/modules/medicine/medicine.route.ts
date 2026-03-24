import express, { Router } from "express"
import { Role } from "../../../generated/prisma/enums";
import { medicineController } from "./medicine.controller";
import auth from "../../middlewares/auth";

const router = express.Router()

router.get(
    '/',
    medicineController.getAllMedicine
)
router.get(
    '/price-range',
    medicineController.getPriceRange
);
router.get(
    '/manufacturers',
    medicineController.getManufacturers
);
router.get(
    '/my-medicines',
    auth(Role.SELLER),
    medicineController.getMyMedicine
)
router.get(
    '/:medicineId',
    medicineController.getMedicineById
)

router.post(
    '/',
    auth(Role.SELLER),
    medicineController.createMedicine
)
router.delete(
    '/:medicineId',
    auth(Role.SELLER),
    medicineController.deleteMedicine
)
router.patch(
    '/:medicineId',
    auth(Role.SELLER),
    medicineController.updateMedicine
)

export const medicineRouter: Router = router;
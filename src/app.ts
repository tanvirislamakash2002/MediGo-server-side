import { toNodeHandler } from "better-auth/node";
import express, { Application } from "express"
import { auth } from "./lib/auth";
import cors from "cors"
import { medicineRouter } from "./modules/medicine/medicine.route";
import { categoryRouter } from "./modules/category/category.route";
import { orderRouter } from "./modules/order/order.route";
import errorHandler from "./middlewares/globalErrorHandler";
import { notFound } from "./middlewares/notFound";
import { cartRouter } from "./modules/cart/cart.route";
import { userRouter } from "./modules/user/user.route";

const app: Application = express()


app.use(cors({
    origin: process.env.APP_URL || "http://localhost:3000",
    credentials: true
}))
app.use(express.json())

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use('/api/v1/admin/users', userRouter);
app.use('/api/v1/category', categoryRouter)
app.use('/api/v1/medicine', medicineRouter)
app.use('/api/v1/cart', cartRouter);
app.use('/api/v1/order', orderRouter)
app.get("/", (req, res) => {
    res.send("Hello, World!")
})
app.use(notFound)
app.use(errorHandler)

export default app;
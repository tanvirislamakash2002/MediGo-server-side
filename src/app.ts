import { toNodeHandler } from "better-auth/node";
import express, { Application } from "express"
import { auth } from "./lib/auth";
import cors from "cors"
import { medicineRouter } from "./modules/medicine/medicine.route";
import { categoryRouter } from "./modules/category/category.route";

const app: Application = express()

app.use(express.json())

app.use(cors({
    origin: process.env.APP_URL || "http://localhost:4000",
    credentials: true
}))

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use('/api/v1/medicine', medicineRouter)
app.use('/api/v1/category', categoryRouter)

app.get("/", (req, res) => {
    res.send("Hello, World!")
})

export default app;
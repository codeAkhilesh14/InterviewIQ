import express from 'express'
import dotenv from 'dotenv'
dotenv.config()
import connectDB from './config/db.js'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import authRouter from './routes/auth.routes.js'
import userRouter from './routes/user.routes.js'
import kitRouter from './routes/kit.routes.js'
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.js'

const app = express()
const PORT = process.env.PORT || 8000

app.use(express.json({ limit: '2mb' }))
app.use(cookieParser())
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true
}))

app.get("/api/health", (req, res) => res.status(200).json({ status: "ok" }))

app.use("/api/auth", authRouter)
app.use("/api/user", userRouter)
app.use("/api/kit", kitRouter)

app.use(notFoundHandler)
app.use(errorHandler)

app.listen(PORT, () => {
    connectDB()
    console.log(`Server is running at ${PORT}`)
})

import express from "express"
import rateLimit from "express-rate-limit"
import { register, login, logOut } from "../controllers/auth.controller.js"

const authRouter = express.Router()

// Slow down credential-guessing without needing a captcha/service.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many attempts, please try again later" }
})

authRouter.post("/register", authLimiter, register)
authRouter.post("/login", authLimiter, login)
authRouter.post("/logout", logOut)

export default authRouter

import express from "express"
import isAuth from "../middlewares/isAuth.js"
import { getCurrentUser, updateProfile, updatePassword } from "../controllers/user.controller.js"

const userRouter = express.Router()

userRouter.get("/current", isAuth, getCurrentUser)
userRouter.put("/profile", isAuth, updateProfile)
userRouter.put("/password", isAuth, updatePassword)

export default userRouter

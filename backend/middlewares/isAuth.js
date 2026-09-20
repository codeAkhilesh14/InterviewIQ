import jwt from "jsonwebtoken"
import User from "../models/user.model.js"

const isAuth = async (req, res, next) => {
    try {
        const token = req.cookies.token
        if (!token) {
            return res.status(401).json({ message: "Not authenticated" })
        }

        let decoded
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET)
        } catch (err) {
            // Covers both an expired token and a tampered/invalid one - either way
            // the client should be treated as signed out, not as a server error.
            res.clearCookie("token")
            return res.status(401).json({ message: "Session expired, please log in again" })
        }

        const user = await User.findById(decoded.id)
        if (!user) {
            res.clearCookie("token")
            return res.status(401).json({ message: "User no longer exists" })
        }

        req.user = user
        next()
    } catch (error) {
        return res.status(500).json({ message: `isAuth error: ${error.message}` })
    }
}

export default isAuth

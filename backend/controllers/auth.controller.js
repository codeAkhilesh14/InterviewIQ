import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import User from "../models/user.model.js"

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
}

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" })

export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body

        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email and password are required" })
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" })
        }

        const existing = await User.findOne({ email: email.toLowerCase().trim() })
        if (existing) {
            return res.status(409).json({ message: "An account with this email already exists" })
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        const user = await User.create({ name: name.trim(), email: email.toLowerCase().trim(), password: hashedPassword })

        const token = signToken(user._id)
        res.cookie("token", token, COOKIE_OPTIONS)

        return res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            theme: user.theme
        })
    } catch (error) {
        return res.status(500).json({ message: `Register error: ${error.message}` })
    }
}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" })
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password")
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" })
        }

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" })
        }

        const token = signToken(user._id)
        res.cookie("token", token, COOKIE_OPTIONS)

        return res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            theme: user.theme
        })
    } catch (error) {
        return res.status(500).json({ message: `Login error: ${error.message}` })
    }
}

export const logOut = async (req, res) => {
    try {
        res.clearCookie("token", COOKIE_OPTIONS)
        return res.status(200).json({ message: "Successfully logged out" })
    } catch (error) {
        return res.status(500).json({ message: `LogOut error: ${error.message}` })
    }
}

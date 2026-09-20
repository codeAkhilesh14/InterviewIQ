import bcrypt from "bcryptjs"
import User from "../models/user.model.js"

export const getCurrentUser = async (req, res) => {
    try {
        return res.status(200).json(req.user)
    } catch (error) {
        return res.status(500).json({ message: `GetCurrentUser error: ${error.message}` })
    }
}

export const updateProfile = async (req, res) => {
    try {
        const { name, theme } = req.body
        const update = {}
        if (name) update.name = name.trim()
        if (theme && ["light", "dark"].includes(theme)) update.theme = theme

        const user = await User.findByIdAndUpdate(req.user._id, update, { new: true })
        return res.status(200).json(user)
    } catch (error) {
        return res.status(500).json({ message: `UpdateProfile error: ${error.message}` })
    }
}

export const updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Current and new password are required" })
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: "New password must be at least 6 characters" })
        }

        const user = await User.findById(req.user._id).select("+password")
        const isMatch = await bcrypt.compare(currentPassword, user.password)
        if (!isMatch) {
            return res.status(401).json({ message: "Current password is incorrect" })
        }

        user.password = await bcrypt.hash(newPassword, 10)
        await user.save()

        return res.status(200).json({ message: "Password updated successfully" })
    } catch (error) {
        return res.status(500).json({ message: `UpdatePassword error: ${error.message}` })
    }
}

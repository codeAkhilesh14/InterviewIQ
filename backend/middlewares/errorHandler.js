// Last-resort handler so an unexpected exception returns a structured JSON error
// instead of an HTML stack trace or a hung connection (Section 13: "return useful,
// structured messages to the interface").
export const notFoundHandler = (req, res) => {
    res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` })
}

export const errorHandler = (err, req, res, next) => {
    console.error(err)
    if (res.headersSent) return next(err)
    res.status(err.status || 500).json({ message: err.message || "Internal server error" })
}

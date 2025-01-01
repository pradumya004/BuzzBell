import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
    const token = req.cookies.jwt;
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    jwt.verify(token, process.env.JWT_KEY, async (err, payload) => {
        if (err) {
            return res.status(403).json({ message: "Forbidden" });
        }
        req.userId = payload.userId;
        next();
    });
}
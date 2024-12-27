import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
    // console.log(req.cookies);
    const token = req.cookies.jwt;
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    // console.log({ token });
    jwt.verify(token, process.env.JWT_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ message: "Forbidden" });
        }
        req.userId = user.userId;
        next();
    });
}
const jwt = require("jsonwebtoken");

function auth(req, res, next) {
    const token = req.cookies["token"];
    if (!token) {
        return res.status(401).json({ message: "Non autorisée" });
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: "Non autorisée" });
        }

        user = decoded;
        req.userId = user.userId;
        next();
    });
}

module.exports = auth;

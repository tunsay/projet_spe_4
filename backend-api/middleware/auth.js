const jwt = require("jsonwebtoken");

function auth(req, res, next) {
    const tempUserId = req.header("X-User-ID-Test");

    console.log(tempUserId);
    // 2. Si l'en-tête est là, on l'utilise. Sinon, on utilise un ID connu (Bob User)
    req.userId = tempUserId || "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

    //------------------------------------
    const token = req.cookies["token"];
    if (!token) {
        return res.status(401).json({ message: "Non autorisée" });
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: "Non autorisée" });
        }
        next();
    });
}

module.exports = auth;

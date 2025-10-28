const jwt = require("jsonwebtoken");
const db = require("../models");
const User = db.User;

function auth(req, res, next) {
  const token = req.cookies["token"];
  if (!token) {
    return res.status(401).json({ message: "Non autorisé" });
  }
  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Non autorisé" });
    }
    //recupération de l'utilisateur et vérification du rôle
    const user = await User.findOne({ where : { email: decoded.userEmail }})
    if (user === null) {
      return res.status(401).json({ message: "Non autorisé" });
    }
    if(user.role !== "admin") {
      return res.status(401).json({ message: "Non autorisé" });
    }
    next();
  });
}

module.exports = auth;
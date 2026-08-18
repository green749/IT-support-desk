import { verifyAccessToken } from "../utils/jwt.js";
import User from "../models/User.js";

export async function authenticateToken(req, res, next) {
  try {
    let accessToken = req.cookies.accessToken;

    if (!accessToken && req.headers.authorization?.startsWith("Bearer ")) {
      accessToken = req.headers.authorization.split(" ")[1];
    }

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: "Access token is required",
      });
    }

    const decoded = verifyAccessToken(accessToken);

    if (decoded.type !== "access") {
      return res.status(401).json({
        success: false,
        message: "Invalid access token",
      });
    }

    
    const user = await User.findByPk(decoded.userId, {
      attributes: ["id", "name", "email", "role", "isActive"],
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "User is not available",
      });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token",
    });
  }
}

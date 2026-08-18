import User from "../models/User.js";

import {
  hashPassword,
  comparePassword,
} from "../utils/password.js";

import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";

import { generateCsrfToken } from "../utils/csrf.js";


// ===============================
// REGISTER
// ===============================

export async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }

    const passwordHash = await hashPassword(password);

    const user = await User.create({
      name,
      email,
      passwordHash,
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}


// ===============================
// LOGIN
// ===============================

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Use scope to retrieve the passwordHash securely for verification
    const user = await User.scope("withPassword").findOne({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "User account is inactive",
      });
    }

    const isPasswordValid = await comparePassword(
      password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    const csrfToken = generateCsrfToken();

    const isProd = process.env.NODE_ENV === "production";
    const sameSite = isProd ? "none" : "lax";
    const secure = isProd;

    // ===============================
    // ACCESS TOKEN COOKIE
    // ===============================
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure,
      sameSite,
      path: "/",
      maxAge: 15 * 60 * 1000,
    });

    // ===============================
    // REFRESH TOKEN COOKIE
    // ===============================
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure,
      sameSite,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // ===============================
    // CSRF TOKEN COOKIE
    // ===============================
    res.cookie("csrfToken", csrfToken, {
      httpOnly: false,
      secure,
      sameSite,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}


// ===============================
// REFRESH TOKEN
// ===============================

export async function refresh(req, res) {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Make sure this is actually a refresh token
    if (decoded.type !== "refresh") {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    // Find user using userId from JWT (without loading passwordHash)
    const user = await User.findByPk(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "User is not available",
      });
    }

    // ===============================
    // ROTATION
    // ===============================
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    const newCsrfToken = generateCsrfToken();

    const isProd = process.env.NODE_ENV === "production";
    const sameSite = isProd ? "none" : "lax";
    const secure = isProd;

    // Replace access token
    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure,
      sameSite,
      path: "/",
      maxAge: 15 * 60 * 1000,
    });

    // Replace refresh token
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure,
      sameSite,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Replace CSRF token
    res.cookie("csrfToken", newCsrfToken, {
      httpOnly: false,
      secure,
      sameSite,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Tokens refreshed successfully",
    });

  } catch (error) {
    const isExpectedAuthFailure =
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError" ||
      error.message?.includes("jwt") ||
      error.message?.includes("signature");

    if (!isExpectedAuthFailure) {
      console.error("Refresh token error:", error);
    }

    const isProd = process.env.NODE_ENV === "production";
    const sameSite = isProd ? "none" : "lax";
    const secure = isProd;

    // Clear invalid cookies
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure,
      sameSite,
      path: "/",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure,
      sameSite,
      path: "/",
    });

    res.clearCookie("csrfToken", {
      httpOnly: false,
      secure,
      sameSite,
      path: "/",
    });

    return res.status(401).json({
      success: false,
      message: "Session expired or invalid. Please log in again.",
    });
  }
}


// ===============================
// LOGOUT
// ===============================

export async function logout(req, res) {
  try {
    const isProd = process.env.NODE_ENV === "production";
    const sameSite = isProd ? "none" : "lax";
    const secure = isProd;

    res.clearCookie("accessToken", {
      httpOnly: true,
      secure,
      sameSite,
      path: "/",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure,
      sameSite,
      path: "/",
    });

    res.clearCookie("csrfToken", {
      httpOnly: false,
      secure,
      sameSite,
      path: "/",
    });

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });

  } catch (error) {
    console.error("Logout error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function getCurrentUser(req, res) {
  try {
    const user = await User.findByPk(req.user.id, { attributes: ["id", "name", "email", "role", "isActive", "createdAt"] });
    if (!user || !user.isActive) return res.status(401).json({ success: false, message: "User is not available" });
    return res.json({ success: true, user });
  } catch {
    return res.status(500).json({ success: false, message: "Unable to load profile" });
  }
}

export async function updateProfile(req, res) {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user || !user.isActive) return res.status(401).json({ success: false, message: "User is not available" });
    const updates = {};
    if (req.body.name?.trim()) updates.name = req.body.name.trim();
    if (req.body.email?.trim() && req.body.email.trim().toLowerCase() !== user.email) {
      const email = req.body.email.trim().toLowerCase();
      if (await User.findOne({ where: { email } })) return res.status(409).json({ success: false, message: "Email is already registered" });
      updates.email = email;
    }
    await user.update(updates);
    return res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive, createdAt: user.createdAt } });
  } catch {
    return res.status(500).json({ success: false, message: "Unable to update profile" });
  }
}

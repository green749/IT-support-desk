import express from "express";

import {
  register,
  login,
  refresh,
  logout,
  getCurrentUser,
  updateProfile,
} from "../controllers/auth.controller.js";

import { authenticateToken } from "../middleware/auth.middleware.js";

import {
  registerValidation,
  loginValidation,
  handleValidationErrors,
} from "../middleware/auth.validation.js";

import { csrfProtection } from "../middleware/csrf.middleware.js";

const router = express.Router();


// REGISTER
router.post(
  "/register",
  registerValidation,
  handleValidationErrors,
  register
);


// LOGIN
router.post(
  "/login",
  loginValidation,
  handleValidationErrors,
  login
);


// REFRESH TOKEN
router.post(
  "/refresh",
  csrfProtection,
  refresh
);


// LOGOUT
router.post(
  "/logout",
  csrfProtection,
  logout
);


// CURRENT USER
router.get(
  "/me",
  authenticateToken,
  getCurrentUser
);

// PROFILE
router.patch("/profile", authenticateToken, csrfProtection, updateProfile);


export default router;

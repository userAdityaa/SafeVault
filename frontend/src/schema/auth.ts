/**
 * Authentication form validation schemas using Zod.
 * 
 * Provides reusable validation schemas for login and signup forms
 * with comprehensive error messages and type safety.
 */

import { z } from "zod";

/**
 * Login form validation schema.
 * 
 * Validates user credentials for authentication including:
 * - Email format validation
 * - Password minimum length requirement
 * 
 * @example
 * ```typescript
 * const loginData = { email: "user@example.com", password: "password123" };
 * const result = loginSchema.safeParse(loginData);
 * 
 * if (result.success) {
 *   // Form data is valid
 *   console.log(result.data.email);
 * } else {
 *   // Show validation errors
 *   console.log(result.error.issues);
 * }
 * ```
 */
export const loginSchema = z.object({
  /** User's email address with format validation */
  email: z.string().email({ message: "Invalid email address" }),
  /** Password with minimum length requirement */
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

/**
 * Signup form validation schema.
 * 
 * Extends the login schema with additional fields for user registration:
 * - Password confirmation field
 * - Cross-field validation to ensure passwords match
 * 
 * @example
 * ```typescript
 * const signupData = {
 *   email: "user@example.com",
 *   password: "password123",
 *   confirmPassword: "password123"
 * };
 * 
 * const result = signupSchema.safeParse(signupData);
 * 
 * if (result.success) {
 *   // Registration data is valid
 *   const { email, password } = result.data;
 * } else {
 *   // Show validation errors (including password mismatch)
 *   result.error.issues.forEach(issue => console.log(issue.message));
 * }
 * ```
 */
export const signupSchema = loginSchema.extend({
  /** Password confirmation field */
  confirmPassword: z.string().min(1, "Confirm password is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
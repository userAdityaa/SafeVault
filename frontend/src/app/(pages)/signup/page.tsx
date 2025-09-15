"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signupSchema } from "@/schema/auth";
import { toast, Toaster } from "sonner";

export default function SignUp() {
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    // Clear error for the field being edited
    setErrors((prevErrors) => ({ ...prevErrors, [name]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form using Zod
    const result = signupSchema.safeParse(form);

    if (!result.success) {
      const fieldErrors: any = {};
      result.error.issues.forEach(err => {
        fieldErrors[err.path[0]] = err.message;
        toast.error(err.message, { description: `Error in ${err.path} field` });
      });
      setErrors(fieldErrors);
      return;
    }

    // Clear client-side errors if validation passed
    setErrors({});

    // GraphQL mutation for signup
    const mutation = `
      mutation Signup($input: SignupInput!) {
        signup(input: $input) {
          token
          user {
            id
            email
          }
        }
      }
    `;

    try {
      const response = await fetch("http://localhost:8080/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: mutation,
          variables: {
            input: {
              email: form.email,
              password: form.password,
            },
          },
        }),
      });

      const result = await response.json();

      if (result.errors && result.errors.length > 0) {
        const errorMessage = String(result.errors[0].message)
          .split(" ")
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
        toast.error(errorMessage, { description: "Signup failed" });
        return;
      }

      // Store user and token in localStorage
      localStorage.setItem("token", result.data.signup.token);
      localStorage.setItem("user", JSON.stringify(result.data.signup.user));

      // Clear form fields
      setForm({ email: "", password: "", confirmPassword: "" });

      // Show success toast
      toast.success("Account created successfully!", {
        description: "Redirecting to login...",
      });

      // Redirect to login page after a short delay to allow toast to be seen
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      toast.error("An error occurred while signing up. Please try again.", {
        description: "Network or server error",
      });
    }
  };

  return (
    <div className="flex h-screen">
      {/* Toaster component for notifications */}
      <Toaster richColors position="top-right" />
      {/* Left Section with Sign-Up Form */}
      <div className="flex-1 p-12 flex flex-col justify-center items-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-6">Sign Up</h2>
          <form className="flex flex-col w-80" onSubmit={handleSubmit}>
            <label className="mb-2 text-left">
              Email address <span className="text-red-600">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter email address"
              className="mb-1 p-2 border rounded"
            />
            {errors.email && <p className="text-red-600 mb-2 text-sm text-left">{errors.email}</p>}

            <label className="mb-2 text-left">
              Password <span className="text-red-600">*</span>
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter password"
              className="mb-1 p-2 border rounded"
            />
            {errors.password && <p className="text-red-600 mb-2 text-sm text-left">{errors.password}</p>}

            <label className="mb-2 text-left">
              Confirm Password <span className="text-red-600">*</span>
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm password"
              className="mb-1 p-2 border rounded"
            />
            {errors.confirmPassword && <p className="text-red-600 mb-2 text-sm text-left">{errors.confirmPassword}</p>}

            <a href="#" className="text-blue-500 no-underline mb-2">
              Forgot password?
            </a>
            <button
              type="submit"
              className="bg-blue-500 text-white p-2 rounded mt-5 hover:bg-blue-600 w-full"
            >
              Sign Up
            </button>
          </form>

          <p className="mt-4">
            Already have an account? <a href="/login" className="text-blue-500">Log in</a>
          </p>
        </div>
      </div>

      {/* Right Section with Texture */}
      <div className="flex-1 bg-[url('/login_texture.png')] bg-cover" />
    </div>
  );
}
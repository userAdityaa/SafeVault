"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginSchema } from "@/schema/auth";
import { toast } from "sonner";
import { GoogleLogin } from "@react-oauth/google";
import Loader from "@/app/components/Loader";
import { GRAPHQL_ENDPOINT } from "@/lib/backend";
import { useAuth } from "@/lib/auth-context";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value.trim() });
    setErrors((prevErrors) => ({ ...prevErrors, [name]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = loginSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: any = {};
      result.error.issues.forEach((err) => {
        fieldErrors[err.path[0]] = err.message;
        toast.error(err.message, { description: `Error in ${err.path} field` });
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    const mutation = `
      mutation Login($input: LoginInput!) {
        login(input: $input) {
          token
          user {
            id
            email
            name
            picture
            isAdmin
          }
        }
      }
    `;

    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: mutation,
          variables: { input: form },
        }),
      });

      const result = await response.json();

      if (result.errors && result.errors.length > 0) {
        setIsLoading(false);
        const errorMessage = String(result.errors[0].message)
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
        toast.error(errorMessage, { description: "Login failed" });
        return;
      }

      localStorage.setItem("token", result.data.login.token);
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: result.data.login.user.id,
          email: result.data.login.user.email,
          name: result.data.login.user.name || result.data.login.user.email,
          picture: result.data.login.user.picture || "",
          isGoogle: false,
          isAdmin: result.data.login.user.isAdmin || false,
        })
      );

      // Use auth context login function
      login(result.data.login.token, {
        id: result.data.login.user.id,
        email: result.data.login.user.email,
        name: result.data.login.user.name || result.data.login.user.email,
        picture: result.data.login.user.picture || "",
        isGoogle: false,
        isAdmin: result.data.login.user.isAdmin || false,
      });

      setForm({ email: "", password: "" });

      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err) {
      setIsLoading(false);
      toast.error("An error occurred while logging in. Please try again.", {
        description: "Network or server error",
      });
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const idToken = credentialResponse.credential;
      if (!idToken) {
        toast.error("Google login failed", { description: "No credential received" });
        return;
      }

      setIsLoading(true);

      const mutation = `
        mutation GoogleLogin($input: GoogleLoginInput!) { 
          googleLogin(input: $input) {
            token
            user {
              id
              email
              name
              picture
              isAdmin
            }
          }
        }
      `;

      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: mutation,
          variables: { input: { idToken: idToken } },
        }),
      });

      const result = await res.json();

      if (result.errors && result.errors.length > 0) {
        setIsLoading(false);
        toast.error("Google login failed", { description: result.errors[0].message });
        return;
      }

      localStorage.setItem("token", result.data.googleLogin.token);
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: result.data.googleLogin.user.id,
          email: result.data.googleLogin.user.email,
          name: result.data.googleLogin.user.name || result.data.googleLogin.user.email,
          picture: result.data.googleLogin.user.picture || "",
          isGoogle: true,
          isAdmin: result.data.googleLogin.user.isAdmin || false,
        })
      );

      // Use auth context login function
      login(result.data.googleLogin.token, {
        id: result.data.googleLogin.user.id,
        email: result.data.googleLogin.user.email,
        name: result.data.googleLogin.user.name || result.data.googleLogin.user.email,
        picture: result.data.googleLogin.user.picture || "",
        isGoogle: true,
        isAdmin: result.data.googleLogin.user.isAdmin || false,
      });

      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err) {
      setIsLoading(false);
      toast.error("Google login error", { description: "Network or server error" });
    }
  };

  return (
    <div className="flex h-screen">
      {isLoading && (
        <div className="fixed inset-0 bg-white flex items-center justify-center z-1000">
          <Loader />
        </div>
      )}
      <div className="flex-1 p-12 flex flex-col justify-center items-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-6">Log In</h2>
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
            {errors.password && (
              <p className="text-red-600 mb-2 text-sm text-left">{errors.password}</p>
            )}

            <a href="#" className="text-blue-500 no-underline mb-2">
              Forgot password?
            </a>
            <button
              type="submit"
              className="bg-blue-500 text-white p-2 rounded mt-5 hover:bg-blue-600 w-full"
            >
              Sign In
            </button>
          </form>

          <p className="mt-4">
            Don't have an account?{" "}
            <a href="/signup" className="text-blue-500">
              Create one
            </a>
          </p>

          <div className="my-4 flex items-center">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="mx-4 text-gray-500">or</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => toast.error("Google Sign In Failed")}
            useOneTap
          />
        </div>
      </div>

      <div className="flex-1 bg-[url('/login_texture.png')] bg-cover" />
    </div>
  );
}
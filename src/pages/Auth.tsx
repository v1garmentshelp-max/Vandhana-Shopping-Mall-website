import { useEffect, useMemo, useState } from "react";
import { FiArrowRight, FiCheckCircle } from "react-icons/fi";
import { useNavigate } from "react-router";

const API_BASE = "https://vandhana-shopping-mall-backend.vercel.app";

type AuthMode = "login" | "signup";
type AuthStep = "form" | "success";

type AuthResponseUser = {
  id?: number;
  name?: string;
  email?: string;
  mobile?: string;
  type?: string;
};

type AuthResponse = {
  token?: string;
  user?: AuthResponseUser;
  message?: string;
};

const saveAuthData = (
  token: string,
  user: {
    id?: number;
    name?: string;
    email?: string;
    mobile?: string;
    type?: string;
  },
) => {
  localStorage.setItem("token", token);
  sessionStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
  sessionStorage.setItem("user", JSON.stringify(user));
};

const clearAuthData = () => {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
  localStorage.removeItem("user");
  sessionStorage.removeItem("user");
};

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");
  const [step, setStep] = useState<AuthStep>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [signupForm, setSignupForm] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");
    const user =
      localStorage.getItem("user") || sessionStorage.getItem("user");
    if (token && user) {
      navigate("/profile");
    }
  }, [navigate]);

  const canLogin = useMemo(() => {
    return (
      loginForm.email.trim().length > 0 && loginForm.password.trim().length > 0
    );
  }, [loginForm]);

  const canSignup = useMemo(() => {
    return (
      signupForm.name.trim().length > 0 &&
      signupForm.email.trim().length > 0 &&
      signupForm.mobile.trim().length === 10 &&
      signupForm.password.trim().length >= 6 &&
      signupForm.confirmPassword.trim().length >= 6
    );
  }, [signupForm]);

  const requestJson = async (url: string, body: Record<string, any>) => {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    return { res, data };
  };

  const trySignup = async () => {
    const payload = {
      name: signupForm.name.trim(),
      email: signupForm.email.trim(),
      mobile: signupForm.mobile.trim(),
      password: signupForm.password.trim(),
      type: "B2C",
    };

    const endpoints = [
      `${API_BASE}/api/auth/signup`,
      `${API_BASE}/api/auth/register`,
      `${API_BASE}/api/users/signup`,
      `${API_BASE}/api/users/register`,
    ];

    let lastMessage = "Signup failed";

    for (const endpoint of endpoints) {
      try {
        const { res, data } = await requestJson(endpoint, payload);
        if (res.ok) {
          return data as AuthResponse;
        }
        lastMessage = (data as AuthResponse)?.message || lastMessage;
      } catch {}
    }

    throw new Error(lastMessage);
  };

  const tryLogin = async (email: string, password: string) => {
    const { res, data } = await requestJson(`${API_BASE}/api/auth/login`, {
      email,
      password,
    });

    if (!res.ok) {
      throw new Error((data as AuthResponse)?.message || "Login failed");
    }

    return data as AuthResponse;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canLogin) return;

    setLoading(true);
    setError("");

    try {
      clearAuthData();
      const data = await tryLogin(
        loginForm.email.trim(),
        loginForm.password.trim(),
      );

      if (!data.token) {
        throw new Error("Login token not received");
      }

      const user = {
        id: data.user?.id,
        name: data.user?.name || "",
        email: data.user?.email || loginForm.email.trim(),
        mobile: data.user?.mobile || "",
        type: data.user?.type || "B2C",
      };

      saveAuthData(data.token, user);
      setStep("success");
      setTimeout(() => navigate("/profile"), 1000);
    } catch (err: any) {
      setError(err?.message || "Unable to login");
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSignup) return;

    setLoading(true);
    setError("");

    try {
      if (signupForm.password.trim() !== signupForm.confirmPassword.trim()) {
        throw new Error("Passwords do not match");
      }

      await trySignup();

      const loginData = await tryLogin(
        signupForm.email.trim(),
        signupForm.password.trim(),
      );

      if (!loginData.token) {
        throw new Error("Account created, but login token not received");
      }

      const user = {
        id: loginData.user?.id,
        name: loginData.user?.name || signupForm.name.trim(),
        email: loginData.user?.email || signupForm.email.trim(),
        mobile: loginData.user?.mobile || signupForm.mobile.trim(),
        type: loginData.user?.type || "B2C",
      };

      saveAuthData(loginData.token, user);
      setStep("success");
      setTimeout(() => navigate("/profile"), 1000);
    } catch (err: any) {
      setError(err?.message || "Unable to sign up");
    } finally {
      setLoading(false);
    }
  };

  if (step === "success") {
    return (
      <div className="min-h-[85vh] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-montserrat">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-[0_4px_25px_rgba(0,0,0,0.06)] overflow-hidden transition-all duration-500">
          <div className="p-12 animate-in zoom-in slide-in-from-bottom-4 duration-500 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-[#f0fbf4] rounded-full flex items-center justify-center mb-6">
              <FiCheckCircle size={40} className="text-[#00b259]" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-2">
              Welcome
            </h2>
            <p className="text-[14px] font-medium text-gray-500">
              Redirecting to your profile...
            </p>
          </div>
          <div className="h-1.5 w-full bg-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-montserrat">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-[0_4px_25px_rgba(0,0,0,0.06)] overflow-hidden transition-all duration-500">
        <div className="p-8 md:p-10 animate-in fade-in zoom-in-95 duration-300">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              {mode === "login" ? "Login" : "Create Account"}
            </h2>
            <p className="mt-3 text-[13px] font-medium text-gray-500">
              {mode === "login"
                ? "Login with your email and password"
                : "Enter your details to create your account"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-lg mb-6">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={`py-3 rounded-md text-[13px] font-extrabold uppercase tracking-widest transition-all ${
                mode === "login"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError("");
              }}
              className={`py-3 rounded-md text-[13px] font-extrabold uppercase tracking-widest transition-all ${
                mode === "signup"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500"
              }`}
            >
              Sign Up
            </button>
          </div>

          {error ? (
            <div className="mb-5 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : null}

          {mode === "login" ? (
            <form className="space-y-6" onSubmit={handleLoginSubmit}>
              <div>
                <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-widest mb-2.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={loginForm.email}
                  onChange={(e) =>
                    setLoginForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3.5 rounded-md border border-gray-200 text-[14px] text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-widest mb-2.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3.5 rounded-md border border-gray-200 text-[14px] text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={!canLogin || loading}
                  className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-md shadow-sm text-[13px] font-extrabold uppercase tracking-widest text-[#2c2c2c] bg-primary hover:bg-[#f2c713] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? "Please wait..." : "Login"}
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleSignupSubmit}>
              <div>
                <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-widest mb-2.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your full name"
                  value={signupForm.name}
                  onChange={(e) =>
                    setSignupForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3.5 rounded-md border border-gray-200 text-[14px] text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-widest mb-2.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={signupForm.email}
                  onChange={(e) =>
                    setSignupForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3.5 rounded-md border border-gray-200 text-[14px] text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-widest mb-2.5">
                  Mobile Number
                </label>
                <div className="flex">
                  <span className="inline-flex items-center justify-center px-4 rounded-l-md border border-r-0 border-gray-200 bg-gray-50 text-gray-500 text-sm font-bold">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="Enter 10 digit number"
                    value={signupForm.mobile}
                    onChange={(e) =>
                      setSignupForm((prev) => ({
                        ...prev,
                        mobile: e.target.value.replace(/\D/g, ""),
                      }))
                    }
                    className="w-full px-4 py-3.5 rounded-r-md border border-gray-200 text-[15px] text-gray-900 font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-widest mb-2.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={signupForm.password}
                  onChange={(e) =>
                    setSignupForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3.5 rounded-md border border-gray-200 text-[14px] text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-widest mb-2.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter your password"
                  value={signupForm.confirmPassword}
                  onChange={(e) =>
                    setSignupForm((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3.5 rounded-md border border-gray-200 text-[14px] text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={!canSignup || loading}
                  className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-md shadow-sm text-[13px] font-extrabold uppercase tracking-widest text-[#2c2c2c] bg-primary hover:bg-[#f2c713] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? "Please wait..." : "Create Account"}
                  {!loading ? <FiArrowRight size={16} /> : null}
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 text-center text-xs font-medium text-gray-500 leading-relaxed px-4">
            By continuing, you agree to our{" "}
            <a href="#" className="font-bold text-gray-900 hover:underline">
              Terms of Use
            </a>{" "}
            and{" "}
            <a href="#" className="font-bold text-gray-900 hover:underline">
              Privacy Policy
            </a>
            .
          </div>
        </div>

        <div className="h-1.5 w-full bg-primary"></div>
      </div>
    </div>
  );
}
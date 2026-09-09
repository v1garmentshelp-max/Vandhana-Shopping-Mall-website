import { useEffect, useMemo, useState } from "react";
import { FiArrowRight, FiCheckCircle } from "react-icons/fi";
import { useNavigate } from "react-router";

const API_BASE = "https://vandhana-shopping-mall-backend.vercel.app";

type AuthMode = "login" | "signup" | "forgot";
type AuthStep = "form" | "success";
type ForgotStep = "email" | "otp" | "reset";

type AuthResponseUser = {
  id?: number;
  name?: string;
  email?: string;
  mobile?: string;
  type?: string;
  userType?: string;
  user_type?: string;
  customer_type?: string;
  role?: string;
  role_enum?: string;
  gstNumber?: string;
  gst_number?: string;
};

type AuthResponse = {
  token?: string;
  access_token?: string;
  accessToken?: string;
  user?: AuthResponseUser;
  message?: string;
};

type StoredUser = AuthResponseUser & {
  type: string;
  userType: string;
  user_type: string;
  customer_type: string;
};

const normalizeAccountType = (user?: AuthResponseUser | null) => {
  const value = String(
    user?.userType ||
      user?.user_type ||
      user?.customer_type ||
      user?.type ||
      user?.role ||
      "B2C",
  )
    .trim()
    .toUpperCase();

  if (["B2B", "BUSINESS", "WHOLESALE"].includes(value)) return "B2B";
  return "B2C";
};

const getResponseToken = (data: AuthResponse) =>
  String(data.token || data.access_token || data.accessToken || "").trim();

const buildStoredUser = (
  source: AuthResponseUser | undefined,
  fallback: Partial<AuthResponseUser>,
): StoredUser => {
  const merged = { ...fallback, ...(source || {}) };
  const accountType = normalizeAccountType(merged);

  return {
    ...merged,
    id: merged.id,
    name: merged.name || fallback.name || "",
    email: merged.email || fallback.email || "",
    mobile: merged.mobile || fallback.mobile || "",
    type: accountType,
    userType: accountType,
    user_type: accountType,
    customer_type: accountType,
    role: merged.role || accountType,
    role_enum: merged.role_enum || merged.role || accountType,
    gstNumber: merged.gstNumber || merged.gst_number || "",
    gst_number: merged.gst_number || merged.gstNumber || "",
  };
};

const saveAuthData = (token: string, user: StoredUser) => {
  localStorage.setItem("token", token);
  sessionStorage.setItem("token", token);
  localStorage.setItem("auth_token", token);
  sessionStorage.setItem("auth_token", token);
  localStorage.setItem("user", JSON.stringify(user));
  sessionStorage.setItem("user", JSON.stringify(user));
  window.dispatchEvent(new Event("userUpdated"));
};

const clearAuthData = () => {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
  localStorage.removeItem("auth_token");
  sessionStorage.removeItem("auth_token");
  localStorage.removeItem("user");
  sessionStorage.removeItem("user");
  window.dispatchEvent(new Event("userUpdated"));
};

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");
  const [step, setStep] = useState<AuthStep>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [forgotStep, setForgotStep] = useState<ForgotStep>("email");
  const [resetToken, setResetToken] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);

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

  const [forgotForm, setForgotForm] = useState({
    email: "",
    otp: "",
    newPassword: "",
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

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResendSeconds((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

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
      userType: "b2c",
      user_type: "B2C",
      customer_type: "B2C",
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
      type: "B2C",
      userType: "b2c",
      user_type: "B2C",
      customer_type: "B2C",
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

      const token = getResponseToken(data);

      if (!token) {
        throw new Error("Login token not received");
      }

      const user = buildStoredUser(data.user, {
        email: loginForm.email.trim(),
        type: "B2C",
      });

      saveAuthData(token, user);
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

      const token = getResponseToken(loginData);

      if (!token) {
        throw new Error("Account created, but login token not received");
      }

      const user = buildStoredUser(loginData.user, {
        name: signupForm.name.trim(),
        email: signupForm.email.trim(),
        mobile: signupForm.mobile.trim(),
        type: "B2C",
      });

      saveAuthData(token, user);
      setStep("success");
      setTimeout(() => navigate("/profile"), 1000);
    } catch (err: any) {
      setError(err?.message || "Unable to sign up");
    } finally {
      setLoading(false);
    }
  };

  const openForgotPassword = () => {
    setMode("forgot");
    setForgotStep("email");
    setForgotForm({
      email: loginForm.email.trim(),
      otp: "",
      newPassword: "",
      confirmPassword: "",
    });
    setResetToken("");
    setResendSeconds(0);
    setError("");
    setNotice("");
  };

  const backToLogin = () => {
    setMode("login");
    setForgotStep("email");
    setResetToken("");
    setError("");
    setNotice("");
  };

  const handleForgotStart = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const email = forgotForm.email.trim().toLowerCase();
    if (!email || loading) return;

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const { res, data } = await requestJson(
        `${API_BASE}/api/auth/forgot/start`,
        { email },
      );
      if (!res.ok) {
        if (res.status === 429 && Number(data?.retry_after) > 0) {
          setResendSeconds(Number(data.retry_after));
        }
        throw new Error(data?.message || "Unable to send verification code");
      }
      setForgotStep("otp");
      setResendSeconds(Number(data?.resend_after) || 60);
      setNotice(data?.message || "If the account exists, a verification code was sent.");
    } catch (err: any) {
      setError(err?.message || "Unable to send verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotForm.otp.length !== 6 || loading) return;

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const { res, data } = await requestJson(
        `${API_BASE}/api/auth/forgot/verify`,
        {
          email: forgotForm.email.trim().toLowerCase(),
          otp: forgotForm.otp,
        },
      );
      if (!res.ok || !data?.reset_token) {
        throw new Error(data?.message || "Verification failed");
      }
      setResetToken(data.reset_token);
      setForgotStep("reset");
      setNotice("Email verified. Create your new password.");
    } catch (err: any) {
      setError(err?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (forgotForm.newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (forgotForm.newPassword !== forgotForm.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const { res, data } = await requestJson(
        `${API_BASE}/api/auth/forgot/reset`,
        {
          reset_token: resetToken,
          newPassword: forgotForm.newPassword,
        },
      );
      if (!res.ok) {
        throw new Error(data?.message || "Unable to reset password");
      }
      setLoginForm({
        email: forgotForm.email.trim().toLowerCase(),
        password: "",
      });
      setMode("login");
      setForgotStep("email");
      setResetToken("");
      setNotice("Password updated successfully. Login with your new password.");
    } catch (err: any) {
      setError(err?.message || "Unable to reset password");
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
              {mode === "login"
                ? "Login"
                : mode === "signup"
                  ? "Create Account"
                  : forgotStep === "email"
                    ? "Forgot Password"
                    : forgotStep === "otp"
                      ? "Verify Email"
                      : "Create New Password"}
            </h2>
            <p className="mt-3 text-[13px] font-medium text-gray-500">
              {mode === "login"
                ? "Login with your email and password"
                : mode === "signup"
                  ? "Enter your details to create your account"
                  : forgotStep === "email"
                    ? "Enter your registered email address"
                    : forgotStep === "otp"
                      ? `Enter the code sent to ${forgotForm.email}`
                      : "Choose a secure password for your account"}
            </p>
          </div>

          {mode !== "forgot" ? (
          <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-lg mb-6">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
                setNotice("");
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
                setNotice("");
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
          ) : null}

          {error ? (
            <div className="mb-5 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : null}

          {notice ? (
            <div className="mb-5 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm font-medium text-green-700">
              {notice}
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
                <button
                  type="button"
                  onClick={openForgotPassword}
                  className="mt-3 ml-auto block text-[12px] font-bold text-gray-700 hover:text-gray-900 hover:underline"
                >
                  Forgot Password?
                </button>
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
          ) : mode === "signup" ? (
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
          ) : (
            <div>
              {forgotStep === "email" ? (
                <form className="space-y-6" onSubmit={handleForgotStart}>
                  <div>
                    <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-widest mb-2.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      autoFocus
                      placeholder="you@example.com"
                      value={forgotForm.email}
                      onChange={(e) =>
                        setForgotForm((prev) => ({ ...prev, email: e.target.value }))
                      }
                      className="w-full px-4 py-3.5 rounded-md border border-gray-200 text-[14px] text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!forgotForm.email.trim() || loading}
                    className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-md shadow-sm text-[13px] font-extrabold uppercase tracking-widest text-[#2c2c2c] bg-primary hover:bg-[#f2c713] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? "Please wait..." : "Send Verification Code"}
                  </button>
                </form>
              ) : null}

              {forgotStep === "otp" ? (
                <form className="space-y-6" onSubmit={handleForgotVerify}>
                  <div>
                    <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-widest mb-2.5">
                      6-Digit Verification Code
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      autoFocus
                      maxLength={6}
                      placeholder="000000"
                      value={forgotForm.otp}
                      onChange={(e) =>
                        setForgotForm((prev) => ({
                          ...prev,
                          otp: e.target.value.replace(/\D/g, ""),
                        }))
                      }
                      className="w-full px-4 py-3.5 rounded-md border border-gray-200 text-center text-xl tracking-[0.5em] text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={forgotForm.otp.length !== 6 || loading}
                    className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-md shadow-sm text-[13px] font-extrabold uppercase tracking-widest text-[#2c2c2c] bg-primary hover:bg-[#f2c713] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? "Please wait..." : "Verify Code"}
                  </button>
                  <button
                    type="button"
                    disabled={resendSeconds > 0 || loading}
                    onClick={() => handleForgotStart()}
                    className="w-full text-[12px] font-bold text-gray-700 hover:underline disabled:text-gray-400 disabled:no-underline"
                  >
                    {resendSeconds > 0
                      ? `Resend code in ${resendSeconds}s`
                      : "Resend verification code"}
                  </button>
                </form>
              ) : null}

              {forgotStep === "reset" ? (
                <form className="space-y-6" onSubmit={handleForgotReset}>
                  <div>
                    <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-widest mb-2.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      autoFocus
                      minLength={6}
                      placeholder="Minimum 6 characters"
                      value={forgotForm.newPassword}
                      onChange={(e) =>
                        setForgotForm((prev) => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3.5 rounded-md border border-gray-200 text-[14px] text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-widest mb-2.5">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="Re-enter your new password"
                      value={forgotForm.confirmPassword}
                      onChange={(e) =>
                        setForgotForm((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3.5 rounded-md border border-gray-200 text-[14px] text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-md shadow-sm text-[13px] font-extrabold uppercase tracking-widest text-[#2c2c2c] bg-primary hover:bg-[#f2c713] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? "Please wait..." : "Update Password"}
                  </button>
                </form>
              ) : null}

              <button
                type="button"
                onClick={backToLogin}
                className="mt-6 w-full text-[12px] font-bold text-gray-700 hover:text-gray-900 hover:underline"
              >
                Back to Login
              </button>
            </div>
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

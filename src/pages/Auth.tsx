import { useState } from "react";
import { FiArrowRight, FiCheckCircle } from "react-icons/fi";
import { useNavigate } from "react-router";

type AuthStep = "phone" | "otp" | "profile" | "success";

export default function Auth() {
  const [step, setStep] = useState<AuthStep>("phone");
  const [phone, setPhone] = useState("");
  const navigate = useNavigate();

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length === 10) {
      setStep("otp");
    }
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock transitioning to profile creation
    setStep("profile");
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("success");
    setTimeout(() => {
      navigate("/");
    }, 2000);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-montserrat">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-[0_4px_25px_rgba(0,0,0,0.06)] overflow-hidden transition-all duration-500">
        {/* Step 1: Phone Number */}
        {step === "phone" && (
          <div className="p-8 md:p-10 animate-in fade-in zoom-in-95 duration-300">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                Log in or Sign up
              </h2>
              <p className="mt-3 text-[13px] font-medium text-gray-500">
                Please enter your mobile number to proceed
              </p>
            </div>

            <form className="space-y-6" onSubmit={handlePhoneSubmit}>
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
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/\D/g, ""))
                    }
                    className="w-full px-4 py-3.5 rounded-r-md border border-gray-200 text-[15px] text-gray-900 font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={phone.length !== 10}
                  className="w-full flex justify-center py-4 px-4 border border-transparent rounded-md shadow-sm text-[13px] font-extrabold uppercase tracking-widest text-[#2c2c2c] bg-primary hover:bg-[#f2c713] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Continue
                </button>
              </div>
            </form>

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
        )}

        {/* Step 2: OTP */}
        {step === "otp" && (
          <div className="p-8 md:p-10 animate-in slide-in-from-right-8 fade-in duration-300">
            <div className="mb-8">
              <button
                onClick={() => setStep("phone")}
                className="text-[11px] font-extrabold text-gray-400 hover:text-gray-900 uppercase tracking-widest mb-6 transition-colors"
              >
                ← Back
              </button>
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                Verify OTP
              </h2>
              <p className="mt-3 text-[13px] font-medium text-gray-500">
                We've sent a 4-digit code to{" "}
                <span className="font-bold text-gray-900">+91 {phone}</span>
              </p>
            </div>

            <form className="space-y-8" onSubmit={handleOtpSubmit}>
              <div className="flex justify-between gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <input
                    key={i}
                    type="text"
                    maxLength={1}
                    className="w-14 h-14 text-center text-2xl font-bold rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                  />
                ))}
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-4 px-4 border border-transparent rounded-md shadow-sm text-[13px] font-extrabold uppercase tracking-widest text-[#2c2c2c] bg-primary hover:bg-[#f2c713] transition-all"
                >
                  Verify
                </button>
              </div>
            </form>

            <div className="mt-8 text-center text-[13px] font-medium text-gray-500">
              Didn't receive the code?{" "}
              <button className="font-bold text-primary hover:underline">
                Resend OTP
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Complete Profile */}
        {step === "profile" && (
          <div className="p-8 md:p-10 animate-in slide-in-from-right-8 fade-in duration-300">
            <div className="mb-8">
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                Complete Profile
              </h2>
              <p className="mt-3 text-[13px] font-medium text-gray-500">
                Just a few more details to get started
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleProfileSubmit}>
              <div>
                <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-widest mb-2.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
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
                  className="w-full px-4 py-3.5 rounded-md border border-gray-200 text-[14px] text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-widest mb-2.5">
                  Gender
                </label>
                <div className="flex gap-4">
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="men"
                      className="peer sr-only"
                      required
                    />
                    <div className="text-center py-3 border border-gray-200 rounded-md text-[13px] font-bold text-gray-500 peer-checked:border-primary peer-checked:bg-[#fff9ea] peer-checked:text-black transition-all">
                      Men
                    </div>
                  </label>
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="women"
                      className="peer sr-only"
                    />
                    <div className="text-center py-3 border border-gray-200 rounded-md text-[13px] font-bold text-gray-500 peer-checked:border-primary peer-checked:bg-[#fff9ea] peer-checked:text-black transition-all">
                      Women
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-md shadow-sm text-[13px] font-extrabold uppercase tracking-widest text-[#2c2c2c] bg-primary hover:bg-[#f2c713] transition-all"
                >
                  Create Account <FiArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 4: Success */}
        {step === "success" && (
          <div className="p-12 animate-in zoom-in slide-in-from-bottom-4 duration-500 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-[#f0fbf4] rounded-full flex items-center justify-center mb-6">
              <FiCheckCircle size={40} className="text-[#00b259]" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-2">
              Welcome Aboard!
            </h2>
            <p className="text-[14px] font-medium text-gray-500">
              Your account has been created securely. Redirecting you...
            </p>
          </div>
        )}

        {/* Decorative footer line */}
        <div className="h-1.5 w-full bg-primary"></div>
      </div>
    </div>
  );
}

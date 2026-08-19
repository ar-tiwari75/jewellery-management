import {
  useState,
  type FormEvent,
} from "react";

import {
  login,
  requestPasswordReset,
  signUp,
} from "./auth.service";

type AuthMode = "LOGIN" | "SIGNUP";

export default function Login() {
  const [mode, setMode] =
    useState<AuthMode>("LOGIN");

  const [fullName, setFullName] =
    useState("");

  const [shopName, setShopName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  function switchMode(
    nextMode: AuthMode,
  ) {
    setMode(nextMode);
    setError("");
    setMessage("");
  }

  async function handlePasswordReset() {
    setError("");
    setMessage("");

    try {
      setLoading(true);

      await requestPasswordReset(email);

      setMessage(
        "If an account exists for this email, we sent a password-reset link.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to send password-reset email.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (mode === "LOGIN") {
        await login(
          email,
          password,
        );

        return;
      }

      await signUp({
        fullName,
        shopName,
        email,
        password,
      });

      /*
       * Depending on Supabase email
       * confirmation settings, the user
       * may need to verify their email
       * before logging in.
       */
      setMessage(
        "Account created successfully. Please check your email if verification is required.",
      );

      setMode("LOGIN");

      setFullName("");
      setShopName("");
      setPassword("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : mode === "LOGIN"
            ? "Unable to sign in."
            : "Unable to create your account.",
      );
    } finally {
      setLoading(false);
    }
  }

  const isLogin =
    mode === "LOGIN";

  return (
    <div className="min-h-screen bg-[#111112] text-white">
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* =====================================================
            LEFT BRANDING PANEL
        ====================================================== */}

        <section className="relative hidden overflow-hidden bg-[#171719] lg:flex">
          {/* Subtle gold glow */}
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#B89455]/10 blur-3xl" />

          <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#B89455]/5 blur-3xl" />

          <div className="relative flex w-full flex-col justify-between p-10 xl:p-12">

            {/* Logo */}

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#B89455] shadow-lg shadow-black/20">
                <span className="text-xl">
                  ◇
                </span>
              </div>

              <div>
                <div className="text-sm font-semibold tracking-[0.25em] text-white">
                  JEWELLERY
                </div>

                <div className="text-xs tracking-wide text-[#8E8E94]">
                  MANAGEMENT
                </div>
              </div>

            </div>

            {/* Main message */}

            <div className="max-w-xl">

              <p className="mb-5 text-xs font-semibold tracking-[0.35em] text-[#B89455]">
                BUSINESS MANAGEMENT
              </p>

              <h1 className="text-5xl font-semibold leading-[1.12] tracking-tight text-white xl:text-6xl">
                Manage your jewellery
                <br />
                business
                <br />
                <span className="text-[#B89455]">
                  with confidence.
                </span>
              </h1>

              <p className="mt-7 max-w-lg text-base leading-7 text-[#929298]">
                Manage customers, inventory,
                billing, reports and your shop
                operations from one secure
                workspace.
              </p>

            </div>

            {/* Footer */}

            <div className="text-xs text-[#5F5F65]">
              Secure workspace
              <span className="mx-2">
                •
              </span>
              Jewellery Management
            </div>

          </div>
        </section>

        {/* =====================================================
            RIGHT AUTH PANEL
        ====================================================== */}

        <section className="flex min-h-screen items-center justify-center bg-[#101011] px-5 py-10 sm:px-8">

          <div className="w-full max-w-md">

            {/* Mobile logo */}

            <div className="mb-10 flex items-center gap-3 lg:hidden">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#B89455]">
                <span className="text-lg">
                  ◇
                </span>
              </div>

              <div>
                <div className="text-sm font-semibold tracking-[0.2em]">
                  JEWELLERY
                </div>

                <div className="text-xs text-[#77777D]">
                  MANAGEMENT
                </div>
              </div>

            </div>

            {/* Heading */}

            <div className="mb-7">

              <p className="mb-2 text-sm font-medium text-[#B89455]">
                {isLogin
                  ? "Welcome back"
                  : "Get started"}
              </p>

              <h2 className="text-3xl font-semibold tracking-tight text-white">
                {isLogin
                  ? "Sign in to your workspace"
                  : "Create your workspace"}
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#77777D]">
                {isLogin
                  ? "Enter your account details to continue."
                  : "Set up your jewellery business workspace."}
              </p>

            </div>

            {/* Authentication card */}

            <div className="rounded-2xl border border-[#2A2A2D] bg-[#18181A] p-7 shadow-2xl shadow-black/20 sm:p-8">

              {/* Mode switch */}

              <div className="mb-7 grid grid-cols-2 rounded-lg bg-[#111112] p-1">

                <button
                  type="button"
                  onClick={() =>
                    switchMode("LOGIN")
                  }
                  className={`rounded-md px-4 py-2.5 text-sm font-medium transition ${
                    isLogin
                      ? "bg-[#B89455] text-[#111112] shadow"
                      : "text-[#77777D] hover:text-white"
                  }`}
                >
                  Sign in
                </button>

                <button
                  type="button"
                  onClick={() =>
                    switchMode("SIGNUP")
                  }
                  className={`rounded-md px-4 py-2.5 text-sm font-medium transition ${
                    !isLogin
                      ? "bg-[#B89455] text-[#111112] shadow"
                      : "text-[#77777D] hover:text-white"
                  }`}
                >
                  Create account
                </button>

              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >

                {/* Full name */}

                {!isLogin && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#D4D4D8]">
                      Full name
                    </label>

                    <input
                      type="text"
                      value={fullName}
                      onChange={(event) =>
                        setFullName(
                          event.target.value,
                        )
                      }
                      placeholder="Your full name"
                      autoComplete="name"
                      required
                      className="w-full rounded-lg border border-[#37373B] bg-[#111112] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#55555B] focus:border-[#B89455] focus:ring-1 focus:ring-[#B89455]"
                    />
                  </div>
                )}

                {/* Shop name */}

                {!isLogin && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#D4D4D8]">
                      Shop name
                    </label>

                    <input
                      type="text"
                      value={shopName}
                      onChange={(event) =>
                        setShopName(
                          event.target.value,
                        )
                      }
                      placeholder="Your jewellery shop"
                      autoComplete="organization"
                      required
                      className="w-full rounded-lg border border-[#37373B] bg-[#111112] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#55555B] focus:border-[#B89455] focus:ring-1 focus:ring-[#B89455]"
                    />

                    <p className="mt-2 text-xs text-[#626268]">
                      This will be your business
                      workspace.
                    </p>
                  </div>
                )}

                {/* Email */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#D4D4D8]">
                    Email address
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value,
                      )
                    }
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className="w-full rounded-lg border border-[#37373B] bg-[#111112] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#55555B] focus:border-[#B89455] focus:ring-1 focus:ring-[#B89455]"
                  />
                </div>

                {/* Password */}

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-sm font-medium text-[#D4D4D8]">
                      Password
                    </label>

                    {isLogin && (
                      <button
                        type="button"
                        onClick={handlePasswordReset}
                        disabled={loading}
                        className="text-xs text-[#B89455] transition hover:text-[#D0AD70]"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>

                  <input
                    type="password"
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value,
                      )
                    }
                    placeholder="Enter your password"
                    autoComplete={
                      isLogin
                        ? "current-password"
                        : "new-password"
                    }
                    required
                    className="w-full rounded-lg border border-[#37373B] bg-[#111112] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#55555B] focus:border-[#B89455] focus:ring-1 focus:ring-[#B89455]"
                  />
                </div>

                {/* Error */}

                {error && (
                  <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                )}

                {/* Success */}

                {message && (
                  <div className="rounded-lg border border-[#806B45]/40 bg-[#B89455]/10 px-4 py-3 text-sm text-[#D0AD70]">
                    {message}
                  </div>
                )}

                {/* Submit */}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-[#B89455] px-4 py-3.5 text-sm font-semibold text-[#111112] shadow-lg shadow-black/20 transition hover:bg-[#C5A466] focus:outline-none focus:ring-2 focus:ring-[#B89455] focus:ring-offset-2 focus:ring-offset-[#18181A] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? isLogin
                      ? "Signing in..."
                      : "Creating account..."
                    : isLogin
                      ? "Sign in"
                      : "Create account"}
                </button>

              </form>

              {/* Bottom text */}

              <div className="mt-7 border-t border-[#29292C] pt-5 text-center">
                <p className="text-xs text-[#55555B]">
                  {isLogin
                    ? "Don't have an account?"
                    : "Already have an account?"}

                  <button
                    type="button"
                    onClick={() =>
                      switchMode(
                        isLogin
                          ? "SIGNUP"
                          : "LOGIN",
                      )
                    }
                    className="ml-1 font-medium text-[#B89455] hover:text-[#D0AD70]"
                  >
                    {isLogin
                      ? "Create one"
                      : "Sign in"}
                  </button>
                </p>
              </div>

            </div>

            {/* Footer */}

            <p className="mt-7 text-center text-xs text-[#4F4F55]">
              Jewellery Management System
            </p>

          </div>

        </section>

      </div>
    </div>
  );
}

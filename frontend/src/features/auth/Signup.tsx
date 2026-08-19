import { useState } from "react";
import { signUp } from "./auth.service";

interface SignupProps {
  onLogin: () => void;
}

export default function Signup({
  onLogin,
}: SignupProps) {
  const [fullName, setFullName] =
    useState("");

  const [shopName, setShopName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError(
        "Passwords do not match.",
      );
      return;
    }

    setLoading(true);

    try {
      const data = await signUp({
        fullName,
        shopName,
        email,
        password,
      });

      /*
       * If email confirmation is enabled
       * in Supabase, session will be null
       * until the user confirms the email.
       */
      if (!data.session) {
        setSuccess(
          "Account created successfully. Please check your email to confirm your account.",
        );
      } else {
        setSuccess(
          "Account created successfully.",
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create account.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #f8f5ef 0%, #eee8dc 100%)",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "#ffffff",
          borderRadius: "16px",
          padding: "40px",
          boxShadow:
            "0 20px 60px rgba(0, 0, 0, 0.10)",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "28px",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "28px",
              fontWeight: 700,
              color: "#2f241c",
            }}
          >
            Create your shop
          </h1>

          <p
            style={{
              marginTop: "8px",
              marginBottom: 0,
              color: "#756b63",
              fontSize: "14px",
            }}
          >
            Set up your jewellery shop account
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "15px",
          }}
        >
          <div>
            <label
              htmlFor="fullName"
              style={labelStyle}
            >
              Your full name
            </label>

            <input
              id="fullName"
              type="text"
              placeholder="John Sharma"
              value={fullName}
              onChange={(event) =>
                setFullName(event.target.value)
              }
              required
              autoComplete="name"
              style={inputStyle}
            />
          </div>

          <div>
            <label
              htmlFor="shopName"
              style={labelStyle}
            >
              Shop name
            </label>

            <input
              id="shopName"
              type="text"
              placeholder="Shree Jewellers"
              value={shopName}
              onChange={(event) =>
                setShopName(event.target.value)
              }
              required
              style={inputStyle}
            />

            <p
              style={{
                marginTop: "6px",
                marginBottom: 0,
                color: "#8a8179",
                fontSize: "12px",
              }}
            >
              This identifies your jewellery
              shop. Shop names do not need to
              be unique.
            </p>
          </div>

          <div>
            <label
              htmlFor="email"
              style={labelStyle}
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
              autoComplete="email"
              style={inputStyle}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              style={labelStyle}
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
              minLength={6}
              autoComplete="new-password"
              style={inputStyle}
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              style={labelStyle}
            >
              Confirm password
            </label>

            <input
              id="confirmPassword"
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value,
                )
              }
              required
              minLength={6}
              autoComplete="new-password"
              style={inputStyle}
            />
          </div>

          {error && (
            <div
              style={{
                padding: "12px",
                borderRadius: "8px",
                background: "#fdf0f0",
                color: "#b42318",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                padding: "12px",
                borderRadius: "8px",
                background: "#eef8f1",
                color: "#217346",
                fontSize: "14px",
              }}
            >
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "8px",
              padding: "13px",
              border: "none",
              borderRadius: "8px",
              background: "#8b6f47",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: 600,
              cursor: loading
                ? "not-allowed"
                : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? "Creating account..."
              : "Create shop account"}
          </button>
        </form>

        <div
          style={{
            marginTop: "26px",
            paddingTop: "22px",
            borderTop:
              "1px solid #eee8e1",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#756b63",
              fontSize: "14px",
            }}
          >
            Already have an account?
          </p>

          <button
            type="button"
            onClick={onLogin}
            style={{
              marginTop: "8px",
              border: "none",
              background: "transparent",
              color: "#8b6f47",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "6px",
  fontSize: "14px",
  fontWeight: 600,
  color: "#3d342e",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  border: "1px solid #d8d0c7",
  borderRadius: "8px",
  fontSize: "15px",
  outline: "none",
};
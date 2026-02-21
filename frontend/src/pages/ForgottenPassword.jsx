import React, { useMemo, useState } from "react";
import "./ForgottenPassword.css";
import { Link } from "react-router-dom";

/**
 * Очакван backend (пример):
 * POST /api/admin/forgot-password-request
 * body: { name, email }
 *
 * Backend логика: праща имейл/нотификация до админа, който ръчно сменя парола.
 */
async function sendForgottenPasswordRequest(name, email) {
  const res = await fetch("/api/admin/forgot-password-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email }),
  });

  // ако backend връща JSON: { success: boolean, message?: string }
  let data = null;
  try {
    data = await res.json();
  } catch {
    // ако не връща JSON
  }

  if (!res.ok) {
    const msg = data?.message || "Грешка при изпращане на заявката. Опитайте по-късно.";
    throw new Error(msg);
  }

  // ако има success флаг
  if (data && data.success === false) {
    throw new Error(data.message || "Заявката не можа да бъде обработена.");
  }

  return data || { success: true };
}

export default function ForgottenPassword() {
  const [formData, setFormData] = useState({ name: "", email: "" });
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const isValid = useMemo(() => {
    const nameOk = formData.name.trim().length >= 2;
    const emailOk = formData.email.trim().length > 0;
    return nameOk && emailOk;
  }, [formData]);

  const handleChange = (e) => {
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const reset = () => {
    setFormData({ name: "", email: "" });
    setError("");
    setSent(false);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isValid) {
      setError("Моля, въведете име и имейл.");
      return;
    }

    setLoading(true);
    try {
      await sendForgottenPasswordRequest(formData.name.trim(), formData.email.trim());
      setSent(true);
    } catch (err) {
      setError(err?.message || "Възникна грешка. Опитайте по-късно.");
      console.error("ForgottenPassword error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="forgot-container">
      <div className="forgot-box">
        <div className="forgot-logo-wrapper">
          <img
            src="/images/logo_image.png"
            alt="DomUnity Logo"
            className="forgot-logo"
          />
        </div>

        <h2 className="forgot-title">Забравена парола</h2>
        <p className="forgot-subtitle">
          Въведете име и имейл. Заявката отива до администратора, който ще ви съдейства.
        </p>

        {error && (
          <div className="forgot-alert forgot-alert--error">
            {error}
          </div>
        )}

        {!sent ? (
          <form className="forgot-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="name">Име и фамилия*</label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={loading}
                autoComplete="name"
              />
            </div>

            <div className="input-group">
              <label htmlFor="email">Имейл адрес*</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              className="btn-forgot"
              disabled={loading || !isValid}
            >
              {loading ? "Изпращане..." : "Изпрати заявка до админа"}
            </button>

            <div className="forgot-links">
              <Link to="/login">Обратно към вход</Link>
            </div>
          </form>
        ) : (
          <div className="forgot-success">
            <div className="forgot-success-badge">✅ Заявката е изпратена</div>
            <p className="forgot-success-text">
              Администраторът ще прегледа заявката и ще се свърже с вас по имейл.
            </p>

            <button className="btn-forgot" onClick={reset}>
              Нова заявка
            </button>

            <div className="forgot-links" style={{ marginTop: 14 }}>
              <Link to="/login">Обратно към вход</Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
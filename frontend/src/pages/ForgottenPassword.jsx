import React, { useMemo, useState } from "react";
import "./ForgottenPassword.css";
import { Link } from "react-router-dom";
import i18n from "../i18n";
import { useTranslation } from "react-i18next";
import { requestPasswordReset } from "../services/apiService";

/**
 * Backend: POST /api/auth/forgot  body: { name, email }
 * Records a password reset request so an admin can follow up.
 */
async function sendForgottenPasswordRequest(name, email) {
  const data = await requestPasswordReset(name, email);

  if (data && data.success === false) {
    throw new Error(data.message || i18n.t('auth.reqFailed'));
  }

  return data || { success: true };
}

export default function ForgottenPassword() {
  const { t } = useTranslation();
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
      setError(t('auth.validationError'));
      return;
    }

    setLoading(true);
    try {
      await sendForgottenPasswordRequest(formData.name.trim(), formData.email.trim());
      setSent(true);
    } catch (err) {
      setError(err?.message || t('auth.genericError'));
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

        <h2 className="forgot-title">{t('auth.forgotMainTitle')}</h2>
        <p className="forgot-subtitle">
          {t('auth.forgotSubtitle')}
        </p>

        {error && (
          <div className="forgot-alert forgot-alert--error">
            {error}
          </div>
        )}

        {!sent ? (
          <form className="forgot-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="name">{t('auth.nameLabel')}*</label>
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
              <label htmlFor="email">{t('auth.emailLabel')}</label>
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
              {loading ? t('auth.btnForgotLoading') : t('auth.btnForgot')}
            </button>

            <div className="forgot-links">
              <Link to="/login">{t('auth.backToLogin')}</Link>
            </div>
          </form>
        ) : (
          <div className="forgot-success">
            <div className="forgot-success-badge">{t('auth.successBadge')}</div>
            <p className="forgot-success-text">
              {t('auth.successText')}
            </p>

            <button className="btn-forgot" onClick={reset}>
              {t('auth.btnNewRequest')}
            </button>

            <div className="forgot-links" style={{ marginTop: 14 }}>
              <Link to="/login">{t('auth.backToLogin')}</Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./Issues.css";
import {
  getMyIssues,
  createIssue,
  replyIssue,
  isAuthenticated,
} from "../services/apiService";

const STATUS_LABELS = {
  new: { bg: "Нов", en: "New" },
  under_review: { bg: "В преглед", en: "Under review" },
  in_progress: { bg: "В процес", en: "In progress" },
  completed: { bg: "Завършен", en: "Completed" },
};

const CATEGORIES = [
  { value: "plumbing", bg: "ВиК / течове", en: "Plumbing" },
  { value: "electrical", bg: "Електричество", en: "Electrical" },
  { value: "elevator", bg: "Асансьор", en: "Elevator" },
  { value: "common_area", bg: "Общи части", en: "Common area" },
  { value: "heating", bg: "Отопление", en: "Heating" },
  { value: "other", bg: "Друго", en: "Other" },
];

const Issues = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.resolvedLanguage === "bg" ? "bg" : "en";

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ title: "", description: "", category: "other" });
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  const [expanded, setExpanded] = useState(null);
  const [replyText, setReplyText] = useState("");

  const statusLabel = (s) => (STATUS_LABELS[s] ? STATUS_LABELS[s][lang] : s);
  const categoryLabel = (c) => {
    const found = CATEGORIES.find((x) => x.value === c);
    return found ? found[lang] : c;
  };
  const fmt = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(lang === "bg" ? "bg-BG" : "en-US");
  };

  const load = useCallback(async () => {
    try {
      const data = await getMyIssues();
      if (data && data.error) {
        setError(data.error);
        return;
      }
      if (data && Array.isArray(data.issues)) setIssues(data.issues);
    } catch (err) {
      console.error("Failed to load issues:", err);
      setError(t("issues.loadError", { defaultValue: "Грешка при зареждане на сигналите." }));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }
    load();
  }, [navigate, load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNotice("");
    if (!form.title.trim()) {
      setNotice(t("issues.titleRequired", { defaultValue: "Моля, въведете заглавие." }));
      return;
    }
    setSubmitting(true);
    try {
      const res = await createIssue({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
      });
      if (res && res.success) {
        setForm({ title: "", description: "", category: "other" });
        setNotice(t("issues.created", { defaultValue: "Сигналът е изпратен успешно." }));
        await load();
      } else {
        setNotice(res?.message || t("issues.createError", { defaultValue: "Грешка при изпращане." }));
      }
    } catch (err) {
      console.error("Create issue error:", err);
      setNotice(t("issues.createError", { defaultValue: "Грешка при изпращане." }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (issueId) => {
    if (!replyText.trim()) return;
    try {
      const res = await replyIssue(issueId, replyText.trim());
      if (res && res.success) {
        setReplyText("");
        await load();
      } else {
        alert(res?.message || t("issues.replyError", { defaultValue: "Грешка при изпращане на отговор." }));
      }
    } catch (err) {
      console.error("Reply error:", err);
      alert(t("issues.replyError", { defaultValue: "Грешка при изпращане на отговор." }));
    }
  };

  if (loading) {
    return (
      <main className="issues-page">
        <p className="issues-state">{t("issues.loading", { defaultValue: "Зареждане..." })}</p>
      </main>
    );
  }

  return (
    <main className="issues-page">
      <header className="issues-header">
        <h1>{t("issues.title", { defaultValue: "Сигнали и поддръжка" })}</h1>
        <p>{t("issues.subtitle", { defaultValue: "Подайте сигнал за проблем и следете статуса му." })}</p>
      </header>

      {error && <div className="issues-alert issues-alert--error">{error}</div>}

      <section className="issues-card">
        <h2>{t("issues.newReport", { defaultValue: "Нов сигнал" })}</h2>
        {notice && <div className="issues-alert">{notice}</div>}
        <form className="issues-form" onSubmit={handleSubmit}>
          <div className="issues-form-row">
            <label>
              {t("issues.fieldTitle", { defaultValue: "Заглавие" })}
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                disabled={submitting}
                required
              />
            </label>
            <label className="issues-form-category">
              {t("issues.fieldCategory", { defaultValue: "Категория" })}
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                disabled={submitting}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c[lang]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            {t("issues.fieldDescription", { defaultValue: "Описание" })}
            <textarea
              rows="4"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              disabled={submitting}
            />
          </label>
          <button type="submit" className="issues-btn" disabled={submitting}>
            {submitting
              ? t("issues.submitting", { defaultValue: "Изпращане..." })
              : t("issues.submit", { defaultValue: "Изпрати сигнал" })}
          </button>
        </form>
      </section>

      <section className="issues-card">
        <h2>{t("issues.myReports", { defaultValue: "Моите сигнали" })}</h2>
        {issues.length === 0 ? (
          <p className="issues-empty">{t("issues.none", { defaultValue: "Все още нямате подадени сигнали." })}</p>
        ) : (
          <ul className="issues-list">
            {issues.map((issue) => (
              <li key={issue.id} className="issue-item">
                <div
                  className="issue-row"
                  onClick={() => setExpanded(expanded === issue.id ? null : issue.id)}
                >
                  <div className="issue-main">
                    <span className="issue-title">{issue.title}</span>
                    <span className="issue-meta">
                      {categoryLabel(issue.category)} · {fmt(issue.created_at)}
                    </span>
                  </div>
                  <span className={`issue-status issue-status--${issue.status}`}>
                    {statusLabel(issue.status)}
                  </span>
                </div>

                {expanded === issue.id && (
                  <div className="issue-detail">
                    {issue.description && <p className="issue-desc">{issue.description}</p>}

                    <div className="issue-replies">
                      {issue.replies && issue.replies.length > 0 ? (
                        issue.replies.map((r, idx) => (
                          <div
                            key={idx}
                            className={`issue-reply ${
                              r.author_role === "admin" || r.author_role === "manager"
                                ? "issue-reply--staff"
                                : ""
                            }`}
                          >
                            <span className="issue-reply-author">
                              {r.author_name}
                              {(r.author_role === "admin" || r.author_role === "manager") &&
                                ` · ${t("issues.staff", { defaultValue: "Екип" })}`}
                            </span>
                            <p>{r.message}</p>
                            <span className="issue-reply-date">{fmt(r.created_at)}</span>
                          </div>
                        ))
                      ) : (
                        <p className="issues-empty">
                          {t("issues.noReplies", { defaultValue: "Все още няма отговори." })}
                        </p>
                      )}
                    </div>

                    <div className="issue-reply-box">
                      <textarea
                        rows="2"
                        placeholder={t("issues.replyPlaceholder", { defaultValue: "Добави коментар..." })}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                      />
                      <button
                        type="button"
                        className="issues-btn issues-btn--small"
                        onClick={() => handleReply(issue.id)}
                      >
                        {t("issues.reply", { defaultValue: "Изпрати" })}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
};

export default Issues;

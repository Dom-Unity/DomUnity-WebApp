import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./Issues.css";
import {
  getAdminIssues,
  updateIssueStatus,
  replyIssue,
  isAuthenticated,
} from "../services/apiService";

const STATUSES = ["new", "under_review", "in_progress", "completed"];
const STATUS_LABELS = {
  new: { bg: "Нов", en: "New" },
  under_review: { bg: "В преглед", en: "Under review" },
  in_progress: { bg: "В процес", en: "In progress" },
  completed: { bg: "Завършен", en: "Completed" },
};

const AdminIssues = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.resolvedLanguage === "bg" ? "bg" : "en";

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [replyText, setReplyText] = useState("");

  const statusLabel = (s) => (STATUS_LABELS[s] ? STATUS_LABELS[s][lang] : s);
  const fmt = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(lang === "bg" ? "bg-BG" : "en-US");
  };

  const load = useCallback(
    async (status) => {
      try {
        const data = await getAdminIssues(status);
        if (data && data.error) {
          setError(data.error);
          return;
        }
        if (data && Array.isArray(data.issues)) setIssues(data.issues);
      } catch (err) {
        console.error("Failed to load admin issues:", err);
        setError(t("adminIssues.loadError", { defaultValue: "Грешка при зареждане на сигналите." }));
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }
    load(filter);
  }, [navigate, load, filter]);

  const handleStatusChange = async (issueId, status) => {
    try {
      const res = await updateIssueStatus(issueId, status);
      if (res && res.success) {
        await load(filter);
      } else {
        alert(res?.message || t("adminIssues.statusError", { defaultValue: "Грешка при смяна на статуса." }));
      }
    } catch (err) {
      console.error("Status change error:", err);
      alert(t("adminIssues.statusError", { defaultValue: "Грешка при смяна на статуса." }));
    }
  };

  const handleReply = async (issueId) => {
    if (!replyText.trim()) return;
    try {
      const res = await replyIssue(issueId, replyText.trim());
      if (res && res.success) {
        setReplyText("");
        await load(filter);
      } else {
        alert(res?.message || t("adminIssues.replyError", { defaultValue: "Грешка при изпращане на отговор." }));
      }
    } catch (err) {
      console.error("Reply error:", err);
      alert(t("adminIssues.replyError", { defaultValue: "Грешка при изпращане на отговор." }));
    }
  };

  if (loading) {
    return (
      <main className="issues-page">
        <p className="issues-state">{t("adminIssues.loading", { defaultValue: "Зареждане..." })}</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="issues-page">
        <div className="issues-alert issues-alert--error">{error}</div>
      </main>
    );
  }

  return (
    <main className="issues-page">
      <header className="issues-header">
        <h1>{t("adminIssues.title", { defaultValue: "Управление на сигнали" })}</h1>
        <p>{t("adminIssues.subtitle", { defaultValue: "Преглед, статус и отговори по сигналите на живущите." })}</p>
      </header>

      <section className="issues-card">
        <div className="issues-filter">
          <label>{t("adminIssues.filterStatus", { defaultValue: "Статус" })}</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">{t("adminIssues.all", { defaultValue: "Всички" })}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </div>

        {issues.length === 0 ? (
          <p className="issues-empty">{t("adminIssues.none", { defaultValue: "Няма сигнали по този филтър." })}</p>
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
                      {issue.resident_name || "—"}
                      {issue.building ? ` · ${issue.building}` : ""}
                      {issue.entrance ? ` · вх. ${issue.entrance}` : ""}
                      {issue.apartment ? ` · ап. ${issue.apartment}` : ""}
                      {` · ${fmt(issue.created_at)}`}
                    </span>
                  </div>
                  <span className={`issue-status issue-status--${issue.status}`}>
                    {statusLabel(issue.status)}
                  </span>
                </div>

                {expanded === issue.id && (
                  <div className="issue-detail">
                    {issue.description && <p className="issue-desc">{issue.description}</p>}

                    <div className="issue-status-control">
                      <label>{t("adminIssues.changeStatus", { defaultValue: "Смени статус:" })}</label>
                      <select
                        value={issue.status}
                        onChange={(e) => handleStatusChange(issue.id, e.target.value)}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {statusLabel(s)}
                          </option>
                        ))}
                      </select>
                    </div>

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
                            <span className="issue-reply-author">{r.author_name}</span>
                            <p>{r.message}</p>
                            <span className="issue-reply-date">{fmt(r.created_at)}</span>
                          </div>
                        ))
                      ) : (
                        <p className="issues-empty">
                          {t("adminIssues.noReplies", { defaultValue: "Все още няма отговори." })}
                        </p>
                      )}
                    </div>

                    <div className="issue-reply-box">
                      <textarea
                        rows="2"
                        placeholder={t("adminIssues.replyPlaceholder", { defaultValue: "Отговор до живущия..." })}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                      />
                      <button
                        type="button"
                        className="issues-btn issues-btn--small"
                        onClick={() => handleReply(issue.id)}
                      >
                        {t("adminIssues.reply", { defaultValue: "Изпрати" })}
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

export default AdminIssues;

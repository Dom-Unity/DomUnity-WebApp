import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./Reports.css";
import { getApartmentDetails, getProfile, isAuthenticated } from "../services/apiService";

const Reports = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.resolvedLanguage === "bg" ? "bg" : "en";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState(null);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }
    const load = async () => {
      try {
        const [apt, profile] = await Promise.all([getApartmentDetails(), getProfile()]);
        if (apt && apt.error && (!profile || profile.error)) {
          setError(apt.error);
          return;
        }
        if (apt && apt.apartmentInfo) setInfo(apt.apartmentInfo);
        if (apt && Array.isArray(apt.payments)) setPayments(apt.payments);
        if (profile && profile.financial_summary) setSummary(profile.financial_summary);
      } catch (err) {
        console.error("Failed to load financial report:", err);
        setError(t("reports.loadError", { defaultValue: "Грешка при зареждане на отчета." }));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate, t]);

  const money = (v) =>
    `${Number(v || 0).toLocaleString(lang === "bg" ? "bg-BG" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} лв.`;

  const rowTotal = (p) => (p.fee || 0) + (p.repair || 0) + (p.fund || 0) + (p.extra || 0);

  const totals = payments.reduce(
    (acc, p) => {
      acc.fee += p.fee || 0;
      acc.repair += p.repair || 0;
      acc.fund += p.fund || 0;
      acc.extra += p.extra || 0;
      acc.total += rowTotal(p);
      if (p.status !== "paid") acc.outstanding += rowTotal(p);
      return acc;
    },
    { fee: 0, repair: 0, fund: 0, extra: 0, total: 0, outstanding: 0 }
  );

  const statusLabel = (s) => {
    const map = {
      paid: { bg: "Платено", en: "Paid" },
      pending: { bg: "Очаква", en: "Pending" },
      overdue: { bg: "Просрочено", en: "Overdue" },
    };
    return map[s] ? map[s][lang] : s;
  };

  if (loading) {
    return (
      <main className="reports-page">
        <p className="reports-state">{t("reports.loading", { defaultValue: "Зареждане..." })}</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="reports-page">
        <div className="reports-alert">{error}</div>
      </main>
    );
  }

  return (
    <main className="reports-page">
      <header className="reports-header">
        <div>
          <h1>{t("reports.title", { defaultValue: "Финансов отчет" })}</h1>
          {info && (
            <p className="reports-sub">
              {info.building}
              {info.entrance ? ` · вх. ${info.entrance}` : ""}
              {info.number ? ` · ап. ${info.number}` : ""}
              {info.clientNumber ? ` · кл. № ${info.clientNumber}` : ""}
            </p>
          )}
        </div>
        <button type="button" className="reports-pdf-btn" onClick={() => window.print()}>
          {t("reports.downloadPdf", { defaultValue: "Изтегли PDF" })}
        </button>
      </header>

      <section className="reports-cards">
        <div className="reports-card">
          <span className="reports-card-label">{t("reports.balance", { defaultValue: "Текущ баланс" })}</span>
          <span className="reports-card-value">{money(info ? info.balance : 0)}</span>
        </div>
        <div className="reports-card">
          <span className="reports-card-label">{t("reports.currentDebt", { defaultValue: "Текущо задължение" })}</span>
          <span className="reports-card-value">{summary ? summary.current_month_debt : money(0)}</span>
        </div>
        <div className="reports-card">
          <span className="reports-card-label">{t("reports.overdue", { defaultValue: "Просрочено" })}</span>
          <span className="reports-card-value reports-card-value--warn">
            {summary ? summary.overdue_amount : money(totals.outstanding)}
          </span>
        </div>
        <div className="reports-card">
          <span className="reports-card-label">{t("reports.repairFund", { defaultValue: "Фонд „Ремонт“" })}</span>
          <span className="reports-card-value">{money(totals.fund)}</span>
        </div>
        <div className="reports-card">
          <span className="reports-card-label">{t("reports.yearlyTotal", { defaultValue: "Годишно общо" })}</span>
          <span className="reports-card-value">{summary ? summary.yearly_total : money(totals.total)}</span>
        </div>
      </section>

      <section className="reports-table-section">
        <h2>{t("reports.history", { defaultValue: "История на плащанията" })}</h2>
        {payments.length === 0 ? (
          <p className="reports-state">{t("reports.noPayments", { defaultValue: "Няма записани плащания." })}</p>
        ) : (
          <div className="reports-table-wrapper">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>{t("reports.thPeriod", { defaultValue: "Период" })}</th>
                  <th>{t("reports.thFee", { defaultValue: "Такса" })}</th>
                  <th>{t("reports.thRepair", { defaultValue: "Ремонт" })}</th>
                  <th>{t("reports.thFund", { defaultValue: "Фонд" })}</th>
                  <th>{t("reports.thExtra", { defaultValue: "Доп." })}</th>
                  <th>{t("reports.thTotal", { defaultValue: "Общо" })}</th>
                  <th>{t("reports.thStatus", { defaultValue: "Статус" })}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, idx) => (
                  <tr key={idx}>
                    <td>{p.month} {p.year}</td>
                    <td>{money(p.fee)}</td>
                    <td>{money(p.repair)}</td>
                    <td>{money(p.fund)}</td>
                    <td>{money(p.extra)}</td>
                    <td><strong>{money(rowTotal(p))}</strong></td>
                    <td>
                      <span className={`reports-status reports-status--${p.status}`}>
                        {statusLabel(p.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>{t("reports.totalRow", { defaultValue: "Общо" })}</td>
                  <td>{money(totals.fee)}</td>
                  <td>{money(totals.repair)}</td>
                  <td>{money(totals.fund)}</td>
                  <td>{money(totals.extra)}</td>
                  <td><strong>{money(totals.total)}</strong></td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </main>
  );
};

export default Reports;

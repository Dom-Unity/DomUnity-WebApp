import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./Services.css";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function Services() {
  const query = useQuery();
  const { t } = useTranslation();

  const TABS = useMemo(() => [
    { key: "admin", label: t('services.tabAdmin') },
    { key: "finance", label: t('services.tabFinance') },
    { key: "maintenance", label: t('services.tabMaintenance') },
    { key: "cleaning", label: t('services.tabCleaning') },
  ], [t]);

  const initialTab = query.get("tab") || "admin";
  const [activeTab, setActiveTab] = useState(
    TABS.some((tab) => tab.key === initialTab) ? initialTab : "admin"
  );

  // Ако кликнеш от Home и URL-а е с tab=..., да се отрази
  useEffect(() => {
    const tab = query.get("tab");
    if (tab && TABS.some((t) => t.key === tab)) {
      setActiveTab(tab);
      // по желание: скрол до горе
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [query, TABS]);

  const content = {
    admin: {
      title: t('services.contentAdminTitle'),
      image: "/images/service_admin.png",
      intro: t('services.contentAdminIntro'),
      bullets: [
        t('services.contentAdminBullet1'),
        t('services.contentAdminBullet2'),
        t('services.contentAdminBullet3'),
        t('services.contentAdminBullet4'),
      ],
    },
    finance: {
      title: t('services.contentFinanceTitle'),
      image: "/images/service_finance.png",
      intro: t('services.contentFinanceIntro'),
      bullets: [
        t('services.contentFinanceBullet1'),
        t('services.contentFinanceBullet2'),
        t('services.contentFinanceBullet3'),
        t('services.contentFinanceBullet4'),
      ],
    },
    maintenance: {
      title: t('services.contentMaintenanceTitle'),
      image: "/images/service_maintenance.png",
      intro: t('services.contentMaintenanceIntro'),
      bullets: [
        t('services.contentMaintenanceBullet1'),
        t('services.contentMaintenanceBullet2'),
        t('services.contentMaintenanceBullet3'),
        t('services.contentMaintenanceBullet4'),
      ],
    },
    cleaning: {
      title: t('services.contentCleaningTitle'),
      image: "/images/service_cleaning.png",
      intro: t('services.contentCleaningIntro'),
      bullets: [
        t('services.contentCleaningBullet1'),
        t('services.contentCleaningBullet2'),
        t('services.contentCleaningBullet3'),
        t('services.contentCleaningBullet4'),
      ],
    },
  };

  const data = content[activeTab];

  return (
    <main className="services-page">
      <div className="services-card">
        <header className="services-header">
          <h1>{t('services.pageTitle')}</h1>
          <p>
            {t('services.pageSubtitle')}
          </p>

          <div className="services-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`services-tab ${activeTab === t.key ? "is-active" : ""}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </header>

        <section className="services-detail">
          <div className="services-detail__media">
            <img src={data.image} alt={data.title} />
          </div>

          <div className="services-detail__text">
            <h2>{data.title}</h2>
            <p className="services-intro">{data.intro}</p>

            <ul className="services-list">
              {data.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>

            <div className="services-actions">
              <Link to="/offer" className="services-btn services-btn--primary">
                {t('services.btnOffer')}
              </Link>
              <Link to="/contacts" className="services-btn services-btn--secondary">
                {t('services.btnContacts')}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
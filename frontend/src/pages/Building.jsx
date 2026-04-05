import React from "react";
import { useTranslation } from "react-i18next";
import "./Building.css";

const Building = () => {
  const { t } = useTranslation();

  const buildingData = {
    address: "ж.к. Младост 3, бл. 325",
    entrance: "Б",
    type: "Жилищна сграда",
    floors: 8,
    totalEntrances: 4,
    managedEntrance: "Б",
    apartmentsInManagedEntrance: 16,
    yearBuilt: "2008",
    commonAreas: "Входно фоайе, стълбище, асансьор, мазета",
    mapQuery: encodeURIComponent("ж.к. Младост 3, бл. 325 София"),
  };

  return (
    <main className="building-page">
      <section className="building-hero">
        <div className="building-hero-content">
          <span className="building-badge">DomUnity</span>
          <h1>{t("building.title", { defaultValue: "Сграда" })}</h1>
          <p className="building-subtitle">
            {t("building.subtitle", {
              defaultValue:
                "Обща информация за сградата и входа, който се обслужва от DomUnity.",
            })}
          </p>

          <div className="building-tags">
            <span className="building-tag">
              {t("building.addressLabel", { defaultValue: "Адрес:" })}{" "}
              {buildingData.address}
            </span>
            <span className="building-tag">
              {t("building.managedEntranceLabel", { defaultValue: "Обслужван вход:" })}{" "}
              {buildingData.managedEntrance}
            </span>
            <span className="building-tag">
              {t("building.typeLabel", { defaultValue: "Тип:" })}{" "}
              {buildingData.type}
            </span>
          </div>
        </div>
      </section>

      <section className="building-summary">
        <div className="building-summary-card">
          <span className="summary-label">
            {t("building.typeLabel", { defaultValue: "Тип сграда" })}
          </span>
          <span className="summary-value">{buildingData.type}</span>
        </div>

        <div className="building-summary-card">
          <span className="summary-label">
            {t("building.floorsLabel", { defaultValue: "Етажи" })}
          </span>
          <span className="summary-value">{buildingData.floors}</span>
        </div>

        <div className="building-summary-card">
          <span className="summary-label">
            {t("building.totalEntrancesLabel", { defaultValue: "Общо входове" })}
          </span>
          <span className="summary-value">{buildingData.totalEntrances}</span>
        </div>

        <div className="building-summary-card">
          <span className="summary-label">
            {t("building.managedEntranceLabel", { defaultValue: "Обслужван вход" })}
          </span>
          <span className="summary-value">{buildingData.managedEntrance}</span>
        </div>

        <div className="building-summary-card">
          <span className="summary-label">
            {t("building.apartmentsLabel", { defaultValue: "Апартаменти във входа" })}
          </span>
          <span className="summary-value">{buildingData.apartmentsInManagedEntrance}</span>
        </div>
      </section>

      <section className="building-main-grid">
        <div className="building-main-left">
          <div className="building-card">
            <h2>{t("building.aboutTitle", { defaultValue: "Информация за сградата" })}</h2>

            <div className="building-info-list">
              <div className="building-info-row">
                <span className="info-label">
                  {t("building.addressLabel", { defaultValue: "Адрес" })}
                </span>
                <span className="info-value">{buildingData.address}</span>
              </div>

              <div className="building-info-row">
                <span className="info-label">
                  {t("building.typeLabel", { defaultValue: "Тип сграда" })}
                </span>
                <span className="info-value">{buildingData.type}</span>
              </div>

              <div className="building-info-row">
                <span className="info-label">
                  {t("building.yearBuiltLabel", { defaultValue: "Година на строеж" })}
                </span>
                <span className="info-value">{buildingData.yearBuilt}</span>
              </div>

              <div className="building-info-row">
                <span className="info-label">
                  {t("building.commonAreasLabel", { defaultValue: "Общи части" })}
                </span>
                <span className="info-value">{buildingData.commonAreas}</span>
              </div>
            </div>
          </div>

          <div className="building-card building-card--notice">
            <h2>{t("building.scopeTitle", { defaultValue: "Обхват на услугата" })}</h2>
            <p>
              {t("building.scopeText1", {
                defaultValue:
                  "DomUnity обслужва конкретен вход в рамките на сградата, а не задължително всички входове в нея.",
              })}
            </p>
            <p>
              {t("building.scopeText2", {
                defaultValue:
                  "В този случай наш клиент е вход ",
              })}
              <strong>{buildingData.managedEntrance}</strong>
              {t("building.scopeText3", {
                defaultValue:
                  ", а останалите входове в сградата не са част от системата и нямат достъп до информацията в портала.",
              })}
            </p>
          </div>
        </div>

        <div className="building-main-right">
          <div className="building-card">
            <div className="building-map-header">
              <h2>{t("building.mapTitle", { defaultValue: "Локация" })}</h2>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${buildingData.mapQuery}`}
                target="_blank"
                rel="noreferrer"
                className="map-link"
              >
                {t("building.openMap", { defaultValue: "Отвори в Google Maps" })}
              </a>
            </div>

            <div className="building-map-frame">
              <iframe
                title="building-map"
                src={`https://www.google.com/maps?q=${buildingData.mapQuery}&z=16&output=embed`}
                loading="lazy"
                allowFullScreen
              ></iframe>
            </div>
          </div>

          <div className="building-card">
            <h2>{t("building.managedEntranceTitle", { defaultValue: "Обслужван вход" })}</h2>

            <div className="managed-entrance-box">
              <div className="managed-entrance-letter">{buildingData.managedEntrance}</div>

              <div className="managed-entrance-text">
                <h3>
                  {t("building.entranceTitle", { defaultValue: "Вход" })}{" "}
                  {buildingData.managedEntrance}
                </h3>
                <p>
                  {t("building.entranceText", {
                    defaultValue:
                      "Това е входът, за който се поддържат профили, плащания, събития и данни в системата.",
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Building;
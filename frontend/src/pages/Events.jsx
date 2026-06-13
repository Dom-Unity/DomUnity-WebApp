import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { isAuthenticated } from "../services/apiService";

const Events = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated()) navigate("/login");
  }, [navigate]);

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1rem 4rem" }}>
      <h1 style={{ color: "#2f5233" }}>{t("events.title", { defaultValue: "Събития" })}</h1>
      <p style={{ color: "#666" }}>
        {t("events.subtitle", {
          defaultValue: "Общи събрания, срещи и дейности по поддръжката на сградата.",
        })}
      </p>
      <div
        style={{
          marginTop: "1.5rem",
          padding: "2rem",
          textAlign: "center",
          background: "#f7f9f7",
          border: "1px dashed #cdd9cd",
          borderRadius: 12,
          color: "#789178",
        }}
      >
        {t("events.comingSoon", { defaultValue: "Този раздел е в процес на разработка." })}
      </div>
    </main>
  );
};

export default Events;

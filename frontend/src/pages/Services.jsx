import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./Services.css";

const TABS = [
  { key: "admin", label: "Административно" },
  { key: "finance", label: "Финансово" },
  { key: "maintenance", label: "Техническо" },
  { key: "cleaning", label: "Почистване" },
];

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function Services() {
  const query = useQuery();
  const initialTab = query.get("tab") || "admin";
  const [activeTab, setActiveTab] = useState(
    TABS.some((t) => t.key === initialTab) ? initialTab : "admin"
  );

  // Ако кликнеш от Home и URL-а е с tab=..., да се отрази
  useEffect(() => {
    const tab = query.get("tab");
    if (tab && TABS.some((t) => t.key === tab)) {
      setActiveTab(tab);
      // по желание: скрол до горе
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [query]);

  const content = {
    admin: {
      title: "Административно управление",
      image: "/images/service_admin.png",
      intro:
        "Поемаме документацията и организацията на етажната собственост, така че всичко да е законно, подредено и проследимо.",
      bullets: [
        "Организация на общи събрания и протоколи",
        "Водене на регистри и документация",
        "Комуникация с институции и доставчици",
        "Изготвяне и съхранение на договори и решения",
      ],
    },
    finance: {
      title: "Финансово обслужване",
      image: "/images/service_finance.png",
      intro:
        "Прозрачни начисления, проследими плащания и ясни отчети за всеки апартамент – без спорове и недоразумения.",
      bullets: [
        "Начисления и разпределение на разходи",
        "История на плащанията по апартамент",
        "Месечни/годишни отчети по вход и сграда",
        "Известия при просрочия и натрупани задължения",
      ],
    },
    maintenance: {
      title: "Техническа поддръжка",
      image: "/images/service_maintenance.png",
      intro:
        "Ремонти и профилактика без хаос – организираме, контролираме и документираме всичко по общите части и инсталациите.",
      bullets: [
        "Организация на ремонти и оферти",
        "Профилактика на асансьори и съоръжения",
        "Поддръжка на осветление и общи части",
        "Координация на аварии и сервизни посещения",
      ],
    },
    cleaning: {
      title: "Почистване и хигиена",
      image: "/images/service_cleaning.png",
      intro:
        "Чист вход и общи части по ясен график — с контрол на качеството и обратна връзка от живущите.",
      bullets: [
        "Почистване на стълбища и площадки",
        "Почистване на входове и витрини",
        "Хигиенизиране на общи зони",
        "Гъвкави графици според нуждите на сградата",
      ],
    },
  };

  const data = content[activeTab];

  return (
    <main className="services-page">
      <div className="services-card">
        <header className="services-header">
          <h1>Услуги</h1>
          <p>
            Изберете услуга, за да видите подробна информация. Всичко е организирано
            и прозрачно — както за домоуправителя, така и за живущите.
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
                Поискай оферта
              </Link>
              <Link to="/contacts" className="services-btn services-btn--secondary">
                Свържи се с нас
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
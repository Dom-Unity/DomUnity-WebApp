export default function Home() {
    return (
        <main>
            <section style={{
                height: '90vh',
                background: 'url(/images/hero_building_wide.png) center right/cover',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: '100px'
            }}>
                <div style={{ maxWidth: '650px', color: 'var(--color-primary)' }}>
                    <img src="/images/logo_image.png" alt="DomUnity" style={{ width: '260px', marginBottom: '30px' }} />
                    <h1 style={{ fontSize: '2.8rem', marginBottom: '20px' }}>
                        Спокойствие за вашия дом,<br /> грижа от DomUnity
                    </h1>
                    <p style={{ fontSize: '1.2rem', marginBottom: '35px', lineHeight: 1.6 }}>
                        Професионално управление на сгради и етажна собственост — прозрачност, ред и комфорт за всички живущи.
                    </p>
                </div>
            </section>

            <section style={{ padding: '100px 10%', background: 'linear-gradient(135deg, #f4fff4 0%, #eaffea 100%)' }}>
                <h2 style={{ fontSize: '2.4rem', color: 'var(--color-primary-dark)', marginBottom: '25px' }}>
                    За нас
                </h2>
                <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: 'var(--color-text-light)' }}>
                    <strong>DomUnity</strong> е екип от професионални домоуправители,
                    които вярват, че поддържането на вашия дом трябва да бъде спокойно и прозрачно.
                    Ние се грижим за административните, финансовите и техническите аспекти на всяка сграда,
                    така че вие да се наслаждавате на уюта си без грижи.
                </p>
            </section>
        </main>
    );
}

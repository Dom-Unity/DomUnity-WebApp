import React from 'react';
import './Profile.css';

const Profile = () => {
    // Mock data - in production, fetch from backend
    const user = {
        name: 'Иван Иванов',
        building: 'Младост 3, бл. 325',
        entrance: 'Б',
        apartment: '№ 25',
        totalApartments: 24,
        totalResidents: 38,
        accountManager: 'Петър Петров',
        balance: 0,
        clientNumber: '12356787',
        contractEnd: '03.12.2023 г.'
    };

    const events = [
        { date: '05.11.2025', description: 'Планирана профилактика на асансьора от 10:00 до 13:00 ч.' },
        { date: '02.11.2025', description: 'Общо събрание на вход Б – от 19:00 ч. във входното фоайе.' },
        { date: '28.10.2025', description: 'Изпратено напомняне за месечна такса за поддръжка.' }
    ];

    return (
        <main className="profile-container">
            <section className="profile-header">
                <div className="user-info">
                    <img src="images/profile.png" alt="Потребител" className="user-avatar" />
                    <div>
                        <h2>Здравей, {user.name}</h2>
                        <p>Твоят профил в DomUnity</p>
                    </div>
                </div>
            </section>
            <section className="dashboard">
                <h3>Обща информация</h3>
                <div className="info-grid">
                    <div className="info-card">
                        <i className="icon home"></i>
                        <div>
                            <h4>{user.building}</h4>
                            <p>Сграда</p>
                        </div>
                    </div>
                    <div className="info-card">
                        <i className="icon door"></i>
                        <div>
                            <h4>{user.entrance}</h4>
                            <p>Вход</p>
                        </div>
                    </div>
                    <div className="info-card">
                        <i className="icon apartment"></i>
                        <div>
                            <h4>{user.apartment}</h4>
                            <p>Апартамент</p>
                        </div>
                    </div>
                    <div className="info-card">
                        <i className="icon building"></i>
                        <div>
                            <h4>{user.totalApartments}</h4>
                            <p>Апартаменти</p>
                        </div>
                    </div>
                    <div className="info-card">
                        <i className="icon people"></i>
                        <div>
                            <h4>{user.totalResidents}</h4>
                            <p>Живущи</p>
                        </div>
                    </div>
                    <div className="info-card">
                        <i className="icon manager"></i>
                        <div>
                            <h4>{user.accountManager}</h4>
                            <p>Акаунт мениджър</p>
                        </div>
                    </div>
                    <div className="info-card">
                        <i className="icon wallet"></i>
                        <div>
                            <h4>{user.balance} лв.</h4>
                            <p>Моят баланс</p>
                        </div>
                    </div>
                    <div className="info-card">
                        <i className="icon key"></i>
                        <div>
                            <h4>{user.clientNumber}</h4>
                            <p>Клиентски номер</p>
                        </div>
                    </div>
                    <div className="info-card">
                        <i className="icon document"></i>
                        <div>
                            <h4>{user.contractEnd}</h4>
                            <p>Договор до</p>
                        </div>
                    </div>
                </div>
            </section>
            <section className="events">
                <h3>Събития</h3>
                <ul>
                    {events.map((event, index) => (
                        <li key={index}>
                            <strong>{event.date}:</strong> {event.description}
                        </li>
                    ))}
                </ul>
            </section>
        </main>
    );
};

export default Profile;

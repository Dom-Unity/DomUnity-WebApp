import React from 'react';
import './Profile.css';
import api from '../services/grpcService';

const Profile = () => {
    const [user, setUser] = React.useState(null);
    const [events, setEvents] = React.useState([]);

    // Mock fallback data
    const mockUser = {
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

    const mockEvents = [
        { date: '05.11.2025', description: 'Планирана профилактика на асансьора от 10:00 до 13:00 ч.' },
        { date: '02.11.2025', description: 'Общо събрание на вход Б – от 19:00 ч. във входното фоайе.' },
        { date: '28.10.2025', description: 'Изпратено напомняне за месечна такса за поддръжка.' }
    ];

    React.useEffect(() => {
        let mounted = true;
        // Try to fetch profile (example uses empty id to return current user if backend supports it)
        api.getProfile('').then(res => {
            if (!mounted) return;
            if (res.ok && res.data) {
                // map backend shape to UI-friendly object if needed
                const data = res.data;
                const profile = data.user || data;
                setUser({
                    name: profile.full_name || profile.name || mockUser.name,
                    building: (data.building && data.building.address) || mockUser.building,
                    entrance: (data.apartment && data.apartment.entrance) || mockUser.entrance,
                    apartment: (data.apartment && `№ ${data.apartment.number}`) || mockUser.apartment,
                    totalApartments: (data.building && data.building.total_apartments) || mockUser.totalApartments,
                    totalResidents: (data.building && data.building.total_residents) || mockUser.totalResidents,
                    accountManager: data.account_manager || mockUser.accountManager,
                    balance: data.balance || mockUser.balance,
                    clientNumber: data.client_number || mockUser.clientNumber,
                    contractEnd: data.contract_end_date || mockUser.contractEnd,
                });
                if (data.events) setEvents(data.events);
                else setEvents(mockEvents);
                return;
            }
            setUser(mockUser);
            setEvents(mockEvents);
        }).catch(err => {
            console.warn('Profile fetch failed, using mock', err);
            if (mounted) {
                setUser(mockUser);
                setEvents(mockEvents);
            }
        });

        return () => { mounted = false; };
    }, []);

    if (!user) return <main className="profile-container">Зареждане...</main>;

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

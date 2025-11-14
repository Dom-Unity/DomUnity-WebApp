import React from 'react';
import './Profile.css';
import * as service from '../services/grpcService';

console.log(service);
console.log(process.env.NODE_ENV);

const Profile = () => {
    const [user, setUser] = React.useState(null);
    const [events, setEvents] = React.useState([]);

    React.useEffect(() => {
        // Try to fetch profile (example uses empty id to return current user if backend supports it)
        service.default.clients.UserService.getProfile({ id: '' }).then(res => {
            if (res) {
                // map backend shape to UI-friendly object if needed
                const profile = res.user || res;
                setUser({
                    name: profile.full_name || profile.name,
                    building: (profile.building && profile.building.address),
                    entrance: (profile.apartment && profile.apartment.entrance),
                    apartment: (profile.apartment && `№ ${profile.apartment.number}`),
                    totalApartments: (profile.building && profile.building.total_apartments),
                    totalResidents: (profile.building && profile.building.total_residents),
                    accountManager: profile.account_manager,
                    balance: profile.balance,
                    clientNumber: profile.client_number,
                    contractEnd: profile.contract_end_date,
                });
                if (profile.events) setEvents(profile.events);
                return;
            }
        }).catch(err => {
            console.warn('Profile fetch failed, using mock', err);
        });

        return () => { };
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

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./EditProfile.css";
import { getProfile, isAuthenticated } from '../services/apiService';

const EditProfile = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    const [preview, setPreview] = useState("/images/profile.png");
    const [selectedFile, setSelectedFile] = useState(null);

    const [user, setUser] = useState({
        name: "",
        email: "",
        building: "",
        entrance: "",
        apartment: "",
        clientNumber: "",
    });

    // Fetch user profile on mount
    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }

        const fetchProfile = async () => {
            try {
                const data = await getProfile();
                if (data.error) {
                    navigate('/login');
                    return;
                }
                setUser({
                    name: data.user?.full_name || '',
                    email: data.user?.email || '',
                    building: data.building?.address || '',
                    entrance: data.building?.entrance || '',
                    apartment: data.apartment?.number?.toString() || '',
                    clientNumber: data.client_number || '',
                });
            } catch (err) {
                console.error('Failed to fetch profile:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [navigate]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setSelectedFile(file);

        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!selectedFile) {
            alert("Моля, изберете нова снимка, преди да запазите.");
            return;
        }

        console.log("Uploading new avatar:", selectedFile);
        alert("Профилната снимка е обновена успешно! (демо)");

        navigate("/profile");
    };

    if (loading) {
        return <main className="edit-profile-page"><p style={{ textAlign: 'center', padding: '2rem' }}>Зареждане...</p></main>;
    }

    return (
        <main className="edit-profile-page">
            <div className="edit-profile-card">
                <header className="edit-profile-header">
                    <h1>Редакция на профил</h1>
                    <p>Тук можете да смените само своята профилна снимка. Останалите данни се управляват от администратор.</p>
                </header>

                <section className="edit-profile-content">
                    <div className="edit-profile-left">
                        <div className="avatar-wrapper">
                            <img
                                src={preview}
                                alt="Профилна снимка"
                                className="avatar-preview"
                            />
                        </div>

                        <form onSubmit={handleSubmit} className="avatar-form">
                            <label className="file-label">
                                <span>Изберете нова снимка</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                            </label>

                            <p className="file-hint">
                                Поддържани формати: JPG, PNG. Препоръчителен размер: 400×400 px.
                            </p>

                            <div className="edit-profile-actions">
                                <button type="submit" className="btn-save">
                                    Запази снимката
                                </button>
                                <Link to="/profile" className="btn-cancel">
                                    Отказ
                                </Link>
                            </div>
                        </form>
                    </div>

                    <div className="edit-profile-right">
                        <div className="info-block">
                            <h2>Потребителски данни</h2>
                            <div className="info-row">
                                <span className="info-label">Име:</span>
                                <span className="info-value">{user.name}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">E-mail:</span>
                                <span className="info-value">{user.email}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Сграда:</span>
                                <span className="info-value">{user.building}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Вход:</span>
                                <span className="info-value">{user.entrance}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Апартамент:</span>
                                <span className="info-value">{user.apartment}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Клиентски номер:</span>
                                <span className="info-value">{user.clientNumber}</span>
                            </div>
                        </div>

                        <div className="info-note">
                            Ако желаете промяна на имейл, име или други данни за профила,
                            моля свържете се с домоуправителя или администратора на системата.
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
};

export default EditProfile;
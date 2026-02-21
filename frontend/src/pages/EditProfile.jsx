import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./EditProfile.css";
import { getProfile, isAuthenticated } from "../services/apiService";

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

  // NEW: change password state
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Fetch user profile on mount
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        const data = await getProfile();
        if (data.error) {
          navigate("/login");
          return;
        }
        setUser({
          name: data.user?.full_name || "",
          email: data.user?.email || "",
          building: data.building?.address || "",
          entrance: data.building?.entrance || "",
          apartment: data.apartment?.number?.toString() || "",
          clientNumber: data.client_number || "",
        });
      } catch (err) {
        console.error("Failed to fetch profile:", err);
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

  // NEW: change password handlers
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    setPasswordError("");
    setPasswordSuccess("");
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    const oldP = passwordForm.oldPassword.trim();
    const newP = passwordForm.newPassword.trim();
    const confirmP = passwordForm.confirmNewPassword.trim();

    if (!oldP || !newP || !confirmP) {
      setPasswordError("Моля, попълнете всички полета.");
      return;
    }

    if (newP.length < 6) {
      setPasswordError("Новата парола трябва да бъде поне 6 символа.");
      return;
    }

    if (newP !== confirmP) {
      setPasswordError("Новата парола и повторението не съвпадат.");
      return;
    }

    setPasswordLoading(true);
    try {
      // ТУК: при реална система -> извикай backend:
      // await changePassword(oldP, newP);
      console.log("Change password:", { oldPassword: oldP, newPassword: newP });

      setPasswordSuccess("Паролата е сменена успешно! (демо)");
      setPasswordForm({ oldPassword: "", newPassword: "", confirmNewPassword: "" });
    } catch (err) {
      console.error("Change password error:", err);
      setPasswordError("Грешка при смяна на парола. Опитайте по-късно.");
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="edit-profile-page">
        <p style={{ textAlign: "center", padding: "2rem" }}>Зареждане...</p>
      </main>
    );
  }

  return (
    <main className="edit-profile-page">
      <div className="edit-profile-card">
        <header className="edit-profile-header">
          <h1>Редакция на профил</h1>
          <p>
            Тук можете да смените само своята профилна снимка. Останалите данни
            се управляват от администратор.
          </p>
        </header>

        <section className="edit-profile-content">
          <div className="edit-profile-left">
            <div className="avatar-wrapper">
              <img src={preview} alt="Профилна снимка" className="avatar-preview" />
            </div>

            <form onSubmit={handleSubmit} className="avatar-form">
              <label className="file-label">
                <span>Изберете нова снимка</span>
                <input type="file" accept="image/*" onChange={handleFileChange} />
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
              Ако желаете промяна на имейл, име или други данни за профила, моля
              свържете се с домоуправителя или администратора на системата.
            </div>
          </div>
        </section>

        {/* NEW: Change Password box under left/right */}
        <section className="password-card">
          <h2 className="password-title">Смяна на парола</h2>
          <p className="password-subtitle">
            За по-голяма сигурност въведете старата си парола и задайте нова.
          </p>

          {passwordError && <div className="password-alert password-alert--error">{passwordError}</div>}
          {passwordSuccess && <div className="password-alert password-alert--success">{passwordSuccess}</div>}

          <form className="password-form" onSubmit={handlePasswordSubmit}>
            <div className="password-grid">
              <div className="password-field">
                <label htmlFor="oldPassword">Стара парола</label>
                <input
                  id="oldPassword"
                  name="oldPassword"
                  type="password"
                  value={passwordForm.oldPassword}
                  onChange={handlePasswordChange}
                  disabled={passwordLoading}
                  autoComplete="current-password"
                />
              </div>

              <div className="password-field">
                <label htmlFor="newPassword">Нова парола</label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  disabled={passwordLoading}
                  autoComplete="new-password"
                />
              </div>

              <div className="password-field">
                <label htmlFor="confirmNewPassword">Повтори новата парола</label>
                <input
                  id="confirmNewPassword"
                  name="confirmNewPassword"
                  type="password"
                  value={passwordForm.confirmNewPassword}
                  onChange={handlePasswordChange}
                  disabled={passwordLoading}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="password-actions">
              <button type="submit" className="btn-save" disabled={passwordLoading}>
                {passwordLoading ? "Запазване..." : "Запази"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
};

export default EditProfile;
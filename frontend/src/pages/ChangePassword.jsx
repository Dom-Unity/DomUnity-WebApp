import React, { useMemo, useState } from "react";
import "./ChangePassword.css";

const ChangePassword = () => {
    const [form, setForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
    });

    const [sent, setSent] = useState(false);
    const [show, setShow] = useState({
        current: false,
        next: false,
        confirm: false,
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const rules = useMemo(() => {
        const minLen = 8;
        const hasMinLen = form.newPassword.length >= minLen;
        const matches = form.newPassword.length > 0 && form.newPassword === form.confirmNewPassword;
        const currentFilled = form.currentPassword.trim().length > 0;

        return {
            minLen,
            hasMinLen,
            matches,
            currentFilled,
            ok: currentFilled && hasMinLen && matches,
        };
    }, [form]);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!rules.ok) {
            alert("Моля, проверете полетата. Новата парола трябва да е поне 8 символа и да съвпада.");
            return;
        }

        // ТУК: реално POST към backend:
        // POST /api/auth/change-password { currentPassword, newPassword }
        console.log("Change password request:", {
            currentPassword: form.currentPassword,
            newPassword: form.newPassword,
        });

        setSent(true);
    };

    const resetForm = () => {
        setForm({
            currentPassword: "",
            newPassword: "",
            confirmNewPassword: "",
        });
        setSent(false);
        setShow({ current: false, next: false, confirm: false });
    };

    return (
        <main className="change-pass-page">
            <div className="change-pass-card">
                <header className="change-pass-header">
                    <h1>Смяна на парола</h1>
                    <p>
                        За да смените паролата си, въведете текущата парола и изберете нова.
                    </p>
                </header>

                {!sent ? (
                    <form className="change-pass-form" onSubmit={handleSubmit}>
                        <section className="change-pass-section">
                            <h2>Данни за парола</h2>

                            <div className="field">
                                <label>Стара парола</label>
                                <div className="input-row">
                                    <input
                                        type={show.current ? "text" : "password"}
                                        name="currentPassword"
                                        value={form.currentPassword}
                                        onChange={handleChange}
                                        placeholder="Въведете старата парола"
                                        autoComplete="current-password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="show-btn"
                                        onClick={() =>
                                            setShow((p) => ({ ...p, current: !p.current }))
                                        }
                                    >
                                        {show.current ? "Скрий" : "Покажи"}
                                    </button>
                                </div>
                            </div>

                            <div className="field">
                                <label>Нова парола</label>
                                <div className="input-row">
                                    <input
                                        type={show.next ? "text" : "password"}
                                        name="newPassword"
                                        value={form.newPassword}
                                        onChange={handleChange}
                                        placeholder="Минимум 8 символа"
                                        autoComplete="new-password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="show-btn"
                                        onClick={() => setShow((p) => ({ ...p, next: !p.next }))}
                                    >
                                        {show.next ? "Скрий" : "Покажи"}
                                    </button>
                                </div>
                                <div className={"rule " + (rules.hasMinLen ? "ok" : "bad")}>
                                    • Поне {rules.minLen} символа
                                </div>
                            </div>

                            <div className="field">
                                <label>Повтори новата парола</label>
                                <div className="input-row">
                                    <input
                                        type={show.confirm ? "text" : "password"}
                                        name="confirmNewPassword"
                                        value={form.confirmNewPassword}
                                        onChange={handleChange}
                                        placeholder="Повторете новата парола"
                                        autoComplete="new-password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="show-btn"
                                        onClick={() =>
                                            setShow((p) => ({ ...p, confirm: !p.confirm }))
                                        }
                                    >
                                        {show.confirm ? "Скрий" : "Покажи"}
                                    </button>
                                </div>
                                <div className={"rule " + (rules.matches ? "ok" : "bad")}>
                                    • Двете нови пароли съвпадат
                                </div>
                            </div>

                            <div className="note">
                                Ако имате съмнение, че акаунтът ви е компрометиран, сменете паролата си
                                незабавно и уведомете домоуправителя.
                            </div>
                        </section>

                        <div className="actions">
                            <button type="submit" className="btn-primary" disabled={!rules.ok}>
                                Запази новата парола
                            </button>
                            <button type="button" className="btn-secondary" onClick={resetForm}>
                                Изчисти
                            </button>
                        </div>

                        <p className="small-print">
                            * При реална система сменянето става през бекенд и текущата парола се проверява
                            на сървъра (не само на клиента).
                        </p>
                    </form>
                ) : (
                    <div className="success">
                        <div className="success-badge">✅ Паролата е сменена</div>
                        <p>Паролата ви беше обновена успешно. Можете да продължите да използвате системата.</p>

                        <div className="success-actions">
                            <button className="btn-primary" onClick={resetForm}>
                                Смени отново
                            </button>
                        </div>

                        <div className="success-note">
                            Ако не сте правили тази промяна, свържете се с администратора незабавно.
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
};

export default ChangePassword;

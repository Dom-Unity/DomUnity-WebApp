import React from "react";
import "./Login.css";
import { useNavigate } from "react-router-dom";

function Login() {
    const navigate = useNavigate();

    const goToProfile = () => {
        navigate("/profile");
    };

    return (
        <main className="login-container">
            <div className="login-box">

                <div className="login-logo-wrapper">
                    <img
                        src="/images/logo_image.png"
                        alt="DomUnity Logo"
                        className="login-logo"
                    />
                </div>

                <h2 className="login-title">Вход в DomUnity</h2>
                <p className="login-subtitle">Добре дошли отново</p>

                <form className="login-form">

                    <div className="input-group">
                        <label htmlFor="email">Имейл адрес*</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">Парола*</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                        />
                    </div>

                    <div className="login-links">
                        <a href="#forgot">Забравена парола?</a>
                    </div>

                    <button type="button" className="btn-login" onClick={goToProfile}>
                        Влез
                    </button>

                </form>

            </div>
        </main>
    );
}

export default Login;

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

import Header from './components/Header';
import Footer from './components/Footer';

import Home from './pages/Home';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Contacts from './pages/Contacts';
import Offer from './pages/Offer';
import Entrance from './pages/Entrance';   
import Apartment from './pages/Apartment';   
import EditProfile from './pages/EditProfile';
import AdminResidents from "./pages/AdminResidents";


import api from './services/grpcService';

function App() {
    React.useEffect(() => {
        api.healthCheck()
            .then(r => console.log('API health:', r))
            .catch(err => console.warn('Health check failed', err));
    }, []);

    return (
        <Router>
            <div className="App">
                <Header />

                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/contacts" element={<Contacts />} />
                    <Route path="/offer" element={<Offer />} />
                    <Route path="/entrance" element={<Entrance />} />  
                    <Route path="/apartment" element={<Apartment />} />
                    <Route path="/editprofile" element={<EditProfile />} />
                    <Route path="/residents" element={<AdminResidents />} />
                </Routes>

                <Footer />
            </div>
        </Router>
    );
}

export default App;
// src/App.jsx

import React from 'react';
import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import InteractiveMap from './pages/InteractiveMap';
import Home from './pages/Home';
import AIAgent from './pages/AIAgent';
import Login from './pages/Login';
import EditProfile from './pages/EditProfile';
import EditClassSchedule from './pages/EditClassSchedule';
import SignUp from './pages/SignUp';
import RegisteredEvents from './pages/RegisteredEvents';
import EventsPage from './pages/Events';
// We need to import Layout a specific way for this structure
import { Layout } from 'antd';

const { Header, Content } = Layout;

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:8000/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
      // ignore network errors but proceed to clear client state
      console.error('Logout request failed', e);
    }
    setIsLoggedIn(false);
  };

  return (
    <Router>
      {/* This structure is more explicit and prevents the sidebar bug */}      <Layout style={{ minHeight: '100vh', minWidth:'100vw' }}>
  <Header style={{ background: 'transparent', padding: 0, boxShadow: 'none' }}>
          {/* We remove the custom padding from Header and let NavBar handle its own width */}
          <NavBar isLoggedIn={isLoggedIn} handleLogout={handleLogout} />
        </Header>
        {/* We wrap the content in a new Layout component */}
        <Layout>
          <Content style={{ padding: '24px 50px' }}>
            <Routes>
              <Route path="/interactive-map" element={<InteractiveMap />} />
              <Route path="/ai-agent" element={<AIAgent />} />
              <Route path="/login" element={<Login handleLogin={handleLogin} />} />
              <Route path="/edit-profile" element={<EditProfile />} />
              <Route path="/edit-class-schedule" element={<EditClassSchedule />} />
              <Route path="/registered-events" element={<RegisteredEvents />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/" element={<Home />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Router>
  );
};

export default App;
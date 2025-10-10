// src/App.jsx

import React from 'react';
import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import InteractiveMap from './pages/InteractiveMap';
import AIAgent from './pages/AIAgent';
import Login from './pages/Login';
import EditProfile from './pages/EditProfile';
import EditClassSchedule from './pages/EditClassSchedule';
// We need to import Layout a specific way for this structure
import { Layout } from 'antd';

const { Header, Content } = Layout;

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  return (
    <Router>
      {/* This structure is more explicit and prevents the sidebar bug */}      <Layout style={{ minHeight: '100vh', minWidth:'100vw' }}>
        <Header style={{ background: '#0067c5', padding: 0 }}>
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
              <Route path="/" element={<InteractiveMap />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Router>
  );
};

export default App;
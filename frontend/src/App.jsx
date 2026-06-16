import React, { Suspense, lazy, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout, Spin } from 'antd';
import NavBar from './components/NavBar';

const Home = lazy(() => import('./pages/Home'));
const InteractiveMap = lazy(() => import('./pages/InteractiveMap'));
const AIAgent = lazy(() => import('./pages/AIAgent'));
const Login = lazy(() => import('./pages/Login'));
const EditProfile = lazy(() => import('./pages/EditProfile'));
const EditClassSchedule = lazy(() => import('./pages/EditClassSchedule'));
const SignUp = lazy(() => import('./pages/SignUp'));
const RegisteredEvents = lazy(() => import('./pages/RegisteredEvents'));
const EventsPage = lazy(() => import('./pages/Events'));

const { Header, Content } = Layout;

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    try {
      await fetch('/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
      // Ignore network errors and still clear local auth state.
      console.error('Logout request failed', e);
    }
    setIsLoggedIn(false);
  };

  const routeFallback = (
    <div style={{ minHeight: '50vh', display: 'grid', placeItems: 'center' }}>
      <Spin size="large" tip="Loading page..." />
    </div>
  );

  return (
    <Router>
      <Layout style={{ minHeight: '100vh', minWidth: '100vw' }}>
        <Header style={{ background: 'transparent', padding: 0, boxShadow: 'none' }}>
          <NavBar isLoggedIn={isLoggedIn} handleLogout={handleLogout} />
        </Header>
        <Layout>
          <Content style={{ padding: '24px 50px' }}>
            <Suspense fallback={routeFallback}>
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
            </Suspense>
          </Content>
        </Layout>
      </Layout>
    </Router>
  );
};

export default App;

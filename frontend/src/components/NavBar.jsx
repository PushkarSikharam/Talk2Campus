// src/components/NavBar.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Menu, Dropdown, Button, Drawer, Grid, Badge } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import {
  UserOutlined,
  GlobalOutlined,
  RobotOutlined,
  MenuOutlined,
  HomeOutlined,
  BellOutlined,
  CalendarOutlined,
} from '@ant-design/icons';

const { useBreakpoint } = Grid;

const NavBar = ({ isLoggedIn, handleLogout }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const screens = useBreakpoint();
  const navigate = useNavigate();
  const [regCount, setRegCount] = useState(0);

  const showDrawer = () => setDrawerVisible(true);
  const closeDrawer = () => setDrawerVisible(false);

  // Fetch registered events count for badge when user is logged in
  useEffect(() => {
    let mounted = true;
    const loadCount = async () => {
      if (!isLoggedIn) {
        if (mounted) setRegCount(0);
        return;
      }
      try {
        const res = await axios.get('/registrations', { withCredentials: true });
        if (!mounted) return;
        const list = Array.isArray(res.data) ? res.data : [];
        setRegCount(list.length);
      } catch {
        // on auth error or other error, show 0
        if (mounted) setRegCount(0);
      }
    };
    loadCount();
    // Listen for registration changes to refresh count and perform short polling
    let intervalId = null;
    let timeoutId = null;
    const onRegsChanged = () => {
      loadCount();
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
      intervalId = setInterval(loadCount, 10000); // poll every 10s
      timeoutId = setTimeout(() => { clearInterval(intervalId); intervalId = null; timeoutId = null; }, 30000); // stop after 30s
    };
    window.addEventListener('registrations-changed', onRegsChanged);
    return () => { mounted = false; window.removeEventListener('registrations-changed', onRegsChanged); if (intervalId) clearInterval(intervalId); if (timeoutId) clearTimeout(timeoutId); };
  }, [isLoggedIn]);

  const userMenuItems = [
    { key: 'profile', label: <Link to="/edit-profile" onClick={closeDrawer}>Edit Profile</Link> },
    { key: 'schedule', label: <Link to="/edit-class-schedule" onClick={closeDrawer}>Edit Class Schedule</Link> },
    { key: 'logout', label: 'Logout', onClick: () => { handleLogout(); closeDrawer(); navigate('/interactive-map'); } },
  ];

  const menuItemsArray = [
    { key: 'home', icon: <HomeOutlined />, label: <Link to="/" onClick={closeDrawer} style={{ color: 'white' }}>Home</Link> },
    { key: 'map', icon: <GlobalOutlined />, label: <Link to="/interactive-map" onClick={closeDrawer} style={{ color: 'white' }}>Interactive Map</Link> },
    { key: 'events', icon: <CalendarOutlined />, label: <Link to="/events" onClick={closeDrawer} style={{ color: 'white' }}>Events</Link> },
    { key: 'ai', icon: <RobotOutlined />, label: <Link to="/ai-agent" onClick={closeDrawer} style={{ color: 'white' }}>AI Agent</Link> },
  ];

  if (isLoggedIn) {
    menuItemsArray.push({ 
      key: 'notifications', 
      label: (
        <Link to="/registered-events" onClick={closeDrawer}>
          <Badge count={regCount} size="small">
            <BellOutlined style={{ fontSize: 20, color: 'white' }} />
          </Badge>
        </Link>
      ),
      style: { marginLeft: 'auto' } 
    });
    menuItemsArray.push({ key: 'user-dropdown-desktop', label: (
      <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
        <Button 
          type="primary" 
          shape="circle" 
          icon={<UserOutlined />} 
          style={{ 
            outline: 'none', 
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            background: 'white',
            color: '#667eea',
            border: 'none',
          }} 
          className="no-focus-outline" 
        />
      </Dropdown>
    ), style: { marginLeft: isLoggedIn ? '8px' : 'auto' } });
  } else {
    menuItemsArray.push({ 
      key: 'login-desktop', 
      label: (
        <Link to="/login" onClick={closeDrawer}>
          <Button 
            style={{ 
              outline: 'none', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              background: 'white',
              color: '#667eea',
              border: 'none',
              fontWeight: 600,
            }} 
            className="no-focus-outline"
          >
            Login
          </Button>
        </Link>
      ),
      style: { marginLeft: 'auto' }
    });
    menuItemsArray.push({ 
      key: 'signup-desktop', 
      label: (
        <Link to="/signup" onClick={closeDrawer}>
          <Button 
            type="primary" 
            style={{ 
              outline: 'none', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              border: 'none',
              fontWeight: 600,
            }} 
            className="no-focus-outline"
          >
            Sign Up
          </Button>
        </Link>
      ) 
    });
  }

  return (
    <div style={{
      width: '100%',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
      padding: '0 32px',
      height: '64px',
      minHeight: '64px',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'relative',
      zIndex: 100,
    }}>
      {/* Decorative gradient overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.1) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div className="logo" style={{ display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <span style={{ 
            color: 'white', 
            fontSize: '24px',
            fontWeight: 700,
            textShadow: '0 2px 10px rgba(0,0,0,0.1)',
            letterSpacing: '-0.5px',
          }}>
            🎓 Talk2Campus
          </span>
        </Link>
      </div>

      {screens.md ? (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', minWidth: 0, position: 'relative', zIndex: 1 }}>
          <Menu
            mode="horizontal"
            selectable={false}
            items={menuItemsArray}
            style={{
              borderBottom: 'none',
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              borderRadius: 16,
              marginTop: 8,
              marginBottom: 8,
              padding: '0 12px',
              lineHeight: '48px',
              color: 'white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          />
        </div>
      ) : (
        <>
          <Button 
            type="primary" 
            onClick={showDrawer}
            icon={<MenuOutlined />}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              position: 'relative',
              zIndex: 1,
            }}
          />
          <Drawer
            title={<span style={{ fontSize: 20, fontWeight: 600 }}>Menu</span>}
            placement="right"
            onClose={closeDrawer}
            open={drawerVisible}
            styles={{
              body: { 
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.95) 0%, rgba(118, 75, 162, 0.95) 100%)',
                padding: '0' 
              },
              header: { 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderBottom: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
              }
            }}
          >
            <Menu
              mode="vertical"
              selectable={false}
              items={menuItemsArray}
              style={{ 
                background: 'transparent',
                border: 'none',
                color: 'white',
              }}
            />
          </Drawer>
        </>
      )}
    </div>
  );
};

// Enhanced styles for better interactivity
const style = document.createElement('style');
style.innerHTML = `
  .no-focus-outline:focus, .no-focus-outline:active {
    outline: none !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
  }
  
  .no-focus-outline:hover {
    transform: translateY(-2px);
    transition: all 0.3s ease;
  }
  
  .quick-question-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.2);
    border-color: #667eea !important;
  }
`;
document.head.appendChild(style);

export default NavBar;

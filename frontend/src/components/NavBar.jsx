// src/components/NavBar.jsx

import React, { useState } from 'react';
import { Menu, Dropdown, Button, Drawer, Grid } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import {
  UserOutlined,
  GlobalOutlined,
  RobotOutlined,
  MenuOutlined,
  HomeOutlined,
} from '@ant-design/icons';

const { useBreakpoint } = Grid;

const NavBar = ({ isLoggedIn, handleLogout }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const screens = useBreakpoint();
  const navigate = useNavigate();

  const showDrawer = () => setDrawerVisible(true);
  const closeDrawer = () => setDrawerVisible(false);

  const userMenuItems = [
    { key: 'profile', label: <Link to="/edit-profile" onClick={closeDrawer}>Edit Profile</Link> },
    { key: 'schedule', label: <Link to="/edit-class-schedule" onClick={closeDrawer}>Edit Class Schedule</Link> },
    { key: 'logout', label: 'Logout', onClick: () => { handleLogout(); closeDrawer(); navigate('/interactive-map'); } },
  ];

  const menuItemsArray = [
    { key: 'home', icon: <HomeOutlined />, label: <Link to="/" onClick={closeDrawer} style={{ color: 'white' }}>Home</Link> },
    { key: 'map', icon: <GlobalOutlined />, label: <Link to="/interactive-map" onClick={closeDrawer} style={{ color: 'white' }}>Interactive Map</Link> },
    { key: 'ai', icon: <RobotOutlined />, label: <Link to="/ai-agent" onClick={closeDrawer} style={{ color: 'white' }}>AI Agent</Link> },
  ];

  if (isLoggedIn) {
    menuItemsArray.push({ key: 'user-dropdown-desktop', label: (
      <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
        <Button type="primary" shape="circle" icon={<UserOutlined />} style={{ outline: 'none', boxShadow: 'none' }} className="no-focus-outline" />
      </Dropdown>
    ), style: { marginLeft: 'auto' } });
  } else {
    menuItemsArray.push({ key: 'login-desktop', label: <Link to="/login" onClick={closeDrawer}><Button type="primary" style={{ outline: 'none', boxShadow: 'none' }} className="no-focus-outline">Login</Button></Link> });
    menuItemsArray.push({ key: 'signup-desktop', label: <Link to="/signup" onClick={closeDrawer}><Button type="primary" style={{ outline: 'none', boxShadow: 'none' }} className="no-focus-outline">Sign Up</Button></Link> });
  }

  return (
    <div style={{
      width: '100%',
      background: 'linear-gradient(90deg, #43cea2 0%, #185a9d 100%)',
      boxShadow: '0 2px 16px 0 rgba(99,179,237,0.10)',
      padding: '0 32px',
      height: '56px',
      minHeight: '56px',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div className="logo" style={{ display: 'flex', alignItems: 'center' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <span style={{ color: 'white', fontSize: '20px' }}>Talk2Campus</span>
        </Link>
      </div>

      {screens.md ? (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', minWidth: 0 }}>
          <Menu
            mode="horizontal"
            selectable={false}
            items={menuItemsArray}
            style={{
              borderBottom: 'none',
              background: 'rgba(255,255,255,0.10)',
              borderRadius: 12,
              marginTop: 8,
              marginBottom: 8,
              padding: '0 8px',
              lineHeight: '40px',
              color: 'white',
              boxShadow: '0 2px 8px 0 rgba(99,179,237,0.07)',
            }}
          />
        </div>
      ) : (
        <>
          <Button type="primary" onClick={showDrawer}>
            <MenuOutlined />
          </Button>
          <Drawer
            title="Menu"
            placement="right"
            onClose={closeDrawer}
            open={drawerVisible}
            styles={{
              body: { backgroundColor: 'rgba(0, 127, 62, 0.4)', padding: '0' },
              header: { backgroundColor: 'rgba(0, 127, 62, 0.4)', borderBottom: '1px solid rgba(0, 127, 62, 0.6)' }
            }}
          >
            <Menu
              mode="vertical"
              selectable={false}
              items={menuItemsArray}
              style={{ backgroundColor: 'rgba(0, 127, 62, 0.4)', border: 'none' }}
            />
          </Drawer>
        </>
      )}
    </div>
  );
};

// Remove focus ring for Sign Up button
const style = document.createElement('style');
style.innerHTML = `
  .no-focus-outline:focus, .no-focus-outline:active {
    outline: none !important;
    box-shadow: none !important;
  }
`;
document.head.appendChild(style);

export default NavBar;

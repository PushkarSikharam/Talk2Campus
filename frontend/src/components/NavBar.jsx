import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Badge, Button, Drawer, Dropdown, Grid, Menu } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BellOutlined,
  CalendarOutlined,
  GlobalOutlined,
  HomeOutlined,
  MenuOutlined,
  MessageOutlined,
  UserOutlined,
} from '@ant-design/icons';

const { useBreakpoint } = Grid;

const NavBar = ({ isLoggedIn, handleLogout }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [regCount, setRegCount] = useState(0);
  const screens = useBreakpoint();
  const navigate = useNavigate();
  const location = useLocation();

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
        if (mounted) setRegCount(0);
      }
    };

    let intervalId = null;
    let timeoutId = null;
    const onRegsChanged = () => {
      loadCount();
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
      intervalId = setInterval(loadCount, 10000);
      timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        intervalId = null;
        timeoutId = null;
      }, 30000);
    };

    loadCount();
    window.addEventListener('registrations-changed', onRegsChanged);
    return () => {
      mounted = false;
      window.removeEventListener('registrations-changed', onRegsChanged);
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isLoggedIn]);

  const closeDrawer = () => setDrawerVisible(false);

  const userMenuItems = [
    { key: 'profile', label: <Link to="/edit-profile" onClick={closeDrawer}>Edit Profile</Link> },
    { key: 'schedule', label: <Link to="/edit-class-schedule" onClick={closeDrawer}>Edit Class Schedule</Link> },
    {
      key: 'logout',
      label: 'Logout',
      onClick: () => {
        handleLogout();
        closeDrawer();
        navigate('/interactive-map');
      },
    },
  ];

  const navItems = [
    { key: 'home', icon: <HomeOutlined />, label: <Link to="/" onClick={closeDrawer}>Home</Link> },
    { key: 'map', icon: <GlobalOutlined />, label: <Link to="/interactive-map" onClick={closeDrawer}>Interactive Map</Link> },
    { key: 'events', icon: <CalendarOutlined />, label: <Link to="/events" onClick={closeDrawer}>Events</Link> },
    { key: 'ai', icon: <MessageOutlined />, label: <Link to="/ai-agent" onClick={closeDrawer}>Ask Talk2Campus</Link> },
  ];

  const activeNavKey = location.pathname === '/'
    ? 'home'
    : location.pathname.startsWith('/interactive-map')
      ? 'map'
      : location.pathname.startsWith('/events') || location.pathname.startsWith('/registered-events')
        ? 'events'
        : location.pathname.startsWith('/ai-agent')
          ? 'ai'
          : '';

  const rightControls = isLoggedIn ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Link to="/registered-events" onClick={closeDrawer} aria-label="Registered events">
        <Badge count={regCount} size="small">
          <Button shape="circle" icon={<BellOutlined />} />
        </Badge>
      </Link>
      <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
        <Button shape="circle" type="primary" icon={<UserOutlined />} className="brand-button" />
      </Dropdown>
    </div>
  ) : (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <Link to="/login" onClick={closeDrawer}>
        <Button>Login</Button>
      </Link>
      <Link to="/signup" onClick={closeDrawer}>
        <Button type="primary" className="brand-button">Create Account</Button>
      </Link>
    </div>
  );

  return (
    <div className="nav-shell">
      <div className="nav-inner">
        <Link to="/" className="brand-mark" onClick={closeDrawer}>
          <span className="brand-badge" aria-hidden="true"><span>T2C</span><i /></span>
          <span className="brand-label">
            <strong>Talk2Campus</strong>
          </span>
        </Link>

        {screens.md ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, justifyContent: 'space-between', minWidth: 0 }}>
            <Menu mode="horizontal" selectedKeys={[activeNavKey]} items={navItems} className="nav-menu" style={{ flex: 1, minWidth: 0 }} />
            {rightControls}
          </div>
        ) : (
          <>
            <Button icon={<MenuOutlined />} onClick={() => setDrawerVisible(true)} />
            <Drawer
              className="nav-drawer"
              title="Talk2Campus"
              placement="right"
              onClose={closeDrawer}
              open={drawerVisible}
            >
              <Menu mode="vertical" selectedKeys={[activeNavKey]} items={navItems} style={{ border: 'none', marginBottom: 16 }} />
              <div style={{ display: 'grid', gap: 12 }}>
                {rightControls}
              </div>
            </Drawer>
          </>
        )}
      </div>
    </div>
  );
};

export default NavBar;

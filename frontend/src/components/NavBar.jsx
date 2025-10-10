// src/components/NavBar.jsx

import React, { useState } from 'react';
import { Menu, Dropdown, Button, Flex, Drawer, Grid } from 'antd';
import { Link } from 'react-router-dom';
import {
  UserOutlined,
  GlobalOutlined,
  RobotOutlined,
  MenuOutlined,
} from '@ant-design/icons';

const { useBreakpoint } = Grid;

const NavBar = ({ isLoggedIn, handleLogout }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const screens = useBreakpoint();

  const showDrawer = () => setDrawerVisible(true);
  const closeDrawer = () => setDrawerVisible(false);

  const userMenu = (
    <Menu>
      <Menu.Item key="profile">
        <Link to="/edit-profile" onClick={closeDrawer}>Edit Profile</Link>
      </Menu.Item>
      <Menu.Item key="schedule">
        <Link to="/edit-class-schedule" onClick={closeDrawer}>Edit Class Schedule</Link>
      </Menu.Item>
      <Menu.Item key="logout" onClick={() => { handleLogout(); closeDrawer(); }}>
        Logout
      </Menu.Item>
    </Menu>
  );

  const menuItems = (
    <>
      <Menu.Item key="map" icon={<GlobalOutlined />}>
        <Link to="/interactive-map" onClick={closeDrawer}>Interactive Map</Link>
      </Menu.Item>
      <Menu.Item key="ai" icon={<RobotOutlined />}>
        <Link to="/ai-agent" onClick={closeDrawer}>AI Agent</Link>
      </Menu.Item>

      {isLoggedIn ? (
        <Menu.Item key="user-dropdown-desktop" style={{ marginLeft: 'auto' }}>
          <Dropdown overlay={userMenu} placement="bottomRight">
            <Button type="primary" shape="circle" icon={<UserOutlined />} />
          </Dropdown>
        </Menu.Item>
      ) : (
        <Menu.Item key="login-desktop">
          <Link to="/login" onClick={closeDrawer}>
            <Button type="primary">Login</Button>
          </Link>
        </Menu.Item>
      )}
    </>
  );

  return (
    <Flex justify="space-between" align="center" style={{ width: '100%' }}>
      <div className="logo" style={{ color: 'white', fontSize: '20px' }}>
        <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>
          Talk2Campus
        </Link>
      </div>

      {screens.md ? (
        // DESKTOP
        // Wrap Menu in a flex container that can grow, and disable overflow
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', minWidth: 0 }}>
          <Menu
            theme="dark"
            mode="horizontal"
            selectable={false}
            // Turn off the '...' collapse
            disabledOverflow
            style={{
              borderBottom: 'none',
              background: 'transparent',
              // optional: keep it from stretching vertically
              lineHeight: '48px',
            }}
          >
            {menuItems}
          </Menu>
        </div>
      ) : (
        // MOBILE
        <>
          <Button type="primary" onClick={showDrawer}>
            <MenuOutlined />
          </Button>
          <Drawer
            title="Menu"
            placement="right"
            onClose={closeDrawer}
            open={drawerVisible}
          >
            <Menu mode="vertical" selectable={false}>
              {menuItems}
            </Menu>
          </Drawer>
        </>
      )}
    </Flex>
  );
};

export default NavBar;

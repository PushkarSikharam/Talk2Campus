// src/components/NavBar.jsx

import React, { useState } from 'react';
import { Menu, Dropdown, Button, Flex, Drawer, Grid } from 'antd';
import { Link } from 'react-router-dom';
import {
  UserOutlined,
  GlobalOutlined,
  RobotOutlined,
  MenuOutlined, // The hamburger icon
} from '@ant-design/icons';

// useBreakpoint is the hook that detects screen size
const { useBreakpoint } = Grid;

const NavBar = ({ isLoggedIn, handleLogout }) => {
  // State for controlling the mobile drawer's visibility
  const [drawerVisible, setDrawerVisible] = useState(false);
  const screens = useBreakpoint();

  const showDrawer = () => {
    setDrawerVisible(true);
  };

  const closeDrawer = () => {
    setDrawerVisible(false);
  };

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

  // We define the menu items once to avoid repeating code
  const menuItems = (
    <>
      <Menu.Item key="map" icon={<GlobalOutlined />}>
        <Link to="/interactive-map" onClick={closeDrawer}>Interactive Map</Link>
      </Menu.Item>
      <Menu.Item key="ai" icon={<RobotOutlined />}>
        <Link to="/ai-agent" onClick={closeDrawer}>AI Agent</Link>
      </Menu.Item>

      {isLoggedIn ? (
        <Menu.Item key="user-dropdown-mobile" style={{ marginLeft: 'auto' }}>
          <Dropdown overlay={userMenu} placement="bottomRight">
            <Button type="primary" shape="circle" icon={<UserOutlined />} />
          </Dropdown>
        </Menu.Item>
      ) : (
        <Menu.Item key="login-mobile">
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

      {/* This is the key: Check if the screen is medium size or larger */}
      {screens.md ? (
        // --- DESKTOP MENU --- (visible on screens >= 768px)
        <Menu
          theme="dark"
          mode="horizontal"
          selectable={false}
          style={{ borderBottom: 'none', background: 'transparent', minWidth: 0 }}
        >
          {menuItems}
        </Menu>
      ) : (
        // --- MOBILE MENU --- (visible on screens < 768px)
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
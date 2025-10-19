// src/pages/Login.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';

const Login = ({ handleLogin }) => {
  const navigate = useNavigate();
  

  const onFinish = async (values) => {
    try {
      const resp = await fetch('http://localhost:8000/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.username, password: values.password }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        console.error('Login failed', data);
        message.error(data.detail || 'Login failed');
        return;
      }
      message.success('Login successful');
      // allow the toast to show briefly before navigating
      setTimeout(() => {
        handleLogin();
        navigate('/interactive-map');
      }, 700);
    } catch (e) {
      console.error('Login error', e);
      message.error('Network error during login');
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '50px' }}>
      <Card title="Talk2Campus Login" style={{ width: 350 }}>
        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Please input your Username!' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Username (e.g., user)" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your Password!' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password (e.g., pass)" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" style={{ width: '100%' }}>
              Log in
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
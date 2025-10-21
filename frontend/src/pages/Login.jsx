// src/pages/Login.jsx

import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Card, message, Typography, Space } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

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
      message.success('Login successful! Welcome back 🎉');
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
    <div className="page-container" style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: 'calc(100vh - 150px)',
      padding: '40px 20px',
    }}>
      <Card 
        className="fade-in"
        style={{ 
          width: '100%',
          maxWidth: 450,
          borderRadius: 24,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          border: 'none',
          overflow: 'hidden',
        }}
      >
        {/* Card Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: 32,
          padding: '32px 24px 24px',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
          margin: '-24px -24px 32px',
        }}>
          <div style={{
            display: 'inline-flex',
            padding: 16,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            marginBottom: 16,
            boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
          }}>
            <LoginOutlined style={{ fontSize: 32, color: 'white' }} />
          </div>
          <Title level={2} style={{ 
            marginBottom: 8,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Welcome Back!
          </Title>
          <Text style={{ color: '#666', fontSize: 15 }}>
            Login to access your campus portal
          </Text>
        </div>

        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            label="Email"
            name="username"
            rules={[{ required: true, message: 'Please input your email!' }]}
          >
            <Input 
              prefix={<UserOutlined style={{ color: '#667eea' }} />} 
              placeholder="Enter your email" 
              style={{ borderRadius: 12 }}
            />
          </Form.Item>
          
          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password 
              prefix={<LockOutlined style={{ color: '#667eea' }} />} 
              placeholder="Enter your password" 
              style={{ borderRadius: 12 }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              style={{ 
                width: '100%',
                height: 48,
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
              }}
            >
              Login
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Space direction="vertical" size={8}>
              <Text style={{ color: '#666' }}>
                Don't have an account?{' '}
                <Link to="/signup" style={{ 
                  color: '#667eea', 
                  fontWeight: 600,
                  textDecoration: 'none',
                }}>
                  Sign up now
                </Link>
              </Text>
              <Link to="/" style={{ color: '#999', fontSize: 14 }}>
                ← Back to Home
              </Link>
            </Space>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
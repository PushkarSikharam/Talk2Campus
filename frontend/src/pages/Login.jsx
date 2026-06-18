import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Card, Form, Input, Space, Typography, message } from 'antd';
import { LockOutlined, LoginOutlined, UserOutlined } from '@ant-design/icons';
import { loginUser } from '../services/campusApi';

const { Paragraph, Text, Title } = Typography;

const Login = ({ handleLogin }) => {
  const navigate = useNavigate();

  const onFinish = async (values) => {
    try {
      await loginUser(values.username, values.password);
      message.success('Login successful. Welcome back.');
      setTimeout(() => {
        handleLogin();
        navigate('/interactive-map');
      }, 500);
    } catch (error) {
      message.error(error.message || 'Network error during login');
    }
  };

  return (
    <div className="page-container" style={{ padding: '30px 20px' }}>
      <div className="auth-shell">
        <section className="auth-aside fade-in">
          <Text className="section-kicker" style={{ color: '#f1dca7' }}>Student Access</Text>
          <Title level={1} style={{ fontSize: 'clamp(2.4rem, 4vw, 3.5rem)', margin: '14px 0 10px' }}>
            Step back into your campus dashboard.
          </Title>
          <Paragraph style={{ color: 'rgba(247, 242, 232, 0.84)', fontSize: 17 }}>
            Sign in to manage your schedule, track event registrations, and get better answers from the campus assistant.
          </Paragraph>
          <div className="auth-bullets">
            <div className="auth-bullet">Check upcoming events against your class schedule.</div>
            <div className="auth-bullet">Save your registrations and revisit them later.</div>
            <div className="auth-bullet">Use a grounded assistant tied to live campus data.</div>
          </div>
        </section>

        <Card className="auth-card site-panel fade-in">
          <div className="auth-card-header">
            <Text className="section-kicker">Login</Text>
            <Title level={2} style={{ margin: '8px 0 6px' }}>Welcome back</Title>
            <Text type="secondary">Use your university account details to continue.</Text>
          </div>

          <Form name="login" onFinish={onFinish} layout="vertical" size="large" className="auth-form">
            <Form.Item label="Email" name="username" rules={[{ required: true, message: 'Please input your email.' }]}>
              <Input prefix={<UserOutlined style={{ color: '#1f4e5f' }} />} placeholder="Enter your email" />
            </Form.Item>

            <Form.Item label="Password" name="password" rules={[{ required: true, message: 'Please input your password.' }]}>
              <Input.Password prefix={<LockOutlined style={{ color: '#1f4e5f' }} />} placeholder="Enter your password" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 18 }}>
              <Button type="primary" htmlType="submit" icon={<LoginOutlined />} className="brand-button" style={{ width: '100%', height: 48 }}>
                Log In
              </Button>
            </Form.Item>

            <Space direction="vertical" size={8} style={{ width: '100%', textAlign: 'center' }}>
              <Text type="secondary">
                Need an account? <Link to="/signup">Create one here</Link>
              </Text>
              <Link to="/">Back to Home</Link>
            </Space>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default Login;

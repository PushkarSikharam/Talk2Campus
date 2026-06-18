import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, Form, Input, Space, Typography, message } from 'antd';
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';

const { Paragraph, Text, Title } = Typography;

const SignUp = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    try {
      const resp = await fetch('/signup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: values.name, email: values.email, password: values.password }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        message.error(data.detail || 'Signup failed');
        return;
      }
      message.success('Account created successfully. Please log in.');
      setTimeout(() => {
        navigate('/login');
      }, 500);
    } catch {
      message.error('Network error during signup');
    }
  };

  return (
    <div className="page-container" style={{ padding: '30px 20px' }}>
      <div className="auth-shell">
        <section className="auth-aside fade-in">
          <Text className="section-kicker" style={{ color: '#f1dca7' }}>New Student Setup</Text>
          <Title level={1} style={{ fontSize: 'clamp(2.4rem, 4vw, 3.5rem)', margin: '14px 0 10px' }}>
            Create your campus workspace.
          </Title>
          <Paragraph style={{ color: 'rgba(247, 242, 232, 0.84)', fontSize: 17 }}>
            Build a profile once, then use it to check event conflicts, save registrations, and personalize the campus experience.
          </Paragraph>
          <div className="auth-bullets">
            <div className="auth-bullet">Track classes and compare them with event timing.</div>
            <div className="auth-bullet">Save registrations in one place.</div>
            <div className="auth-bullet">Unlock a more personal campus assistant.</div>
          </div>
        </section>

        <Card className="auth-card site-panel fade-in">
          <div className="auth-card-header">
            <Text className="section-kicker">Create Account</Text>
            <Title level={2} style={{ margin: '8px 0 6px' }}>Join Talk2Campus</Title>
            <Text type="secondary">Set up your account and start with a cleaner campus workflow.</Text>
          </div>

          <Form form={form} layout="vertical" onFinish={onFinish} size="large" className="auth-form">
            <Form.Item label="Full Name" name="name" rules={[{ required: true, message: 'Please enter your name.' }]}>
              <Input prefix={<UserOutlined style={{ color: '#1f4e5f' }} />} placeholder="Enter your full name" />
            </Form.Item>

            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Please enter your email.' },
                { type: 'email', message: 'Please enter a valid email.' },
              ]}
            >
              <Input prefix={<MailOutlined style={{ color: '#1f4e5f' }} />} placeholder="Enter your email address" />
            </Form.Item>

            <Form.Item
              label="Password"
              name="password"
              rules={[
                { required: true, message: 'Please enter a password.' },
                { min: 6, message: 'Password must be at least 6 characters.' },
              ]}
            >
              <Input.Password prefix={<LockOutlined style={{ color: '#1f4e5f' }} />} placeholder="Create a strong password" />
            </Form.Item>

            <Form.Item
              label="Confirm Password"
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Please confirm your password.' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Passwords do not match.'));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined style={{ color: '#1f4e5f' }} />} placeholder="Confirm your password" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 18 }}>
              <Button type="primary" htmlType="submit" className="brand-button" style={{ width: '100%', height: 48 }}>
                Create Account
              </Button>
            </Form.Item>

            <Space direction="vertical" size={8} style={{ width: '100%', textAlign: 'center' }}>
              <Text type="secondary">
                Already have an account? <Link to="/login">Log in here</Link>
              </Text>
              <Link to="/">Back to Home</Link>
            </Space>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default SignUp;

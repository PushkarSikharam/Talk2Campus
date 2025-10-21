import React from 'react';
import { Link } from 'react-router-dom';
import { Form, Input, Button, Card, message, Typography, Space } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, StarFilled } from '@ant-design/icons';

const { Title, Text } = Typography;

const SignUp = () => {
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    try {
      const resp = await fetch('http://localhost:8000/signup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: values.name, email: values.email, password: values.password }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        console.error('Signup failed', data);
        message.error(data.detail || 'Signup failed');
        return;
      }
      message.success('Account created successfully! 🎉 Please log in');
      // navigate after a short delay so the toast is visible
      setTimeout(() => { window.location.href = '/login'; }, 700);
    } catch (e) {
      console.error('Signup error', e);
      message.error('Network error during signup');
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
          maxWidth: 500,
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
          background: 'linear-gradient(135deg, rgba(240, 147, 251, 0.1) 0%, rgba(245, 87, 108, 0.1) 100%)',
          margin: '-24px -24px 32px',
        }}>
          <div style={{
            display: 'inline-flex',
            padding: 16,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            marginBottom: 16,
            boxShadow: '0 8px 24px rgba(240, 147, 251, 0.4)',
          }}>
            <StarFilled style={{ fontSize: 32, color: 'white' }} />
          </div>
          <Title level={2} style={{ 
            marginBottom: 8,
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Create Account
          </Title>
          <Text style={{ color: '#666', fontSize: 15 }}>
            Join Talk2Campus today and explore your campus!
          </Text>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          size="large"
        >
          <Form.Item 
            label="Full Name" 
            name="name" 
            rules={[{ required: true, message: 'Please enter your name' }]}
          > 
            <Input 
              prefix={<UserOutlined style={{ color: '#f093fb' }} />}
              placeholder="Enter your full name" 
              style={{ borderRadius: 12 }}
            />
          </Form.Item>

          <Form.Item 
            label="Email" 
            name="email" 
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          > 
            <Input 
              prefix={<MailOutlined style={{ color: '#f093fb' }} />}
              placeholder="Enter your email address" 
              style={{ borderRadius: 12 }}
            />
          </Form.Item>

          <Form.Item 
            label="Password" 
            name="password" 
            rules={[
              { required: true, message: 'Please enter a password' },
              { min: 6, message: 'Password must be at least 6 characters' }
            ]}
          > 
            <Input.Password 
              prefix={<LockOutlined style={{ color: '#f093fb' }} />}
              placeholder="Create a strong password" 
              style={{ borderRadius: 12 }}
            />
          </Form.Item>

          <Form.Item 
            label="Confirm Password" 
            name="confirmPassword" 
            dependencies={["password"]} 
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match!'));
                },
              }),
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined style={{ color: '#f093fb' }} />}
              placeholder="Confirm your password" 
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
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                border: 'none',
                boxShadow: '0 4px 15px rgba(240, 147, 251, 0.4)',
              }}
            >
              Create Account
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Space direction="vertical" size={8}>
              <Text style={{ color: '#666' }}>
                Already have an account?{' '}
                <Link to="/login" style={{ 
                  color: '#f093fb', 
                  fontWeight: 600,
                  textDecoration: 'none',
                }}>
                  Login here
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

export default SignUp;
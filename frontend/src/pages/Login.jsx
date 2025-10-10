// src/pages/Login.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Flex } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';

const Login = ({ handleLogin }) => {
  const navigate = useNavigate();

  const onFinish = (values) => {
    console.log('Dummy login successful with:', values);
    handleLogin();
    navigate('/');
  };

  return (
    <Flex align="center" justify="center" style={{ paddingTop: '50px' }}>
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
    </Flex>
  );
};

export default Login;
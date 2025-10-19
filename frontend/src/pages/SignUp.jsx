import React from 'react';
import { Form, Input, Button, Card, message } from 'antd';

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
      message.success('Signup successful — please log in');
      // navigate after a short delay so the toast is visible
      setTimeout(() => { window.location.href = '/login'; }, 700);
    } catch (e) {
      console.error('Signup error', e);
      message.error('Network error during signup');
    }
  };

  return (
    <Card title="Sign Up" style={{ maxWidth: 400, margin: '40px auto' }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
      >
        <Form.Item label="Name" name="name" rules={[{ required: true, message: 'Please enter your name' }]}> 
          <Input placeholder="Enter your name" />
        </Form.Item>
        <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email', message: 'Please enter a valid email' }]}> 
          <Input placeholder="Enter your email" />
        </Form.Item>
        <Form.Item label="Password" name="password" rules={[{ required: true, message: 'Please enter a password' }]}> 
          <Input.Password placeholder="Enter your password" />
        </Form.Item>
        <Form.Item label="Confirm Password" name="confirmPassword" dependencies={["password"]} rules={[
          { required: true, message: 'Please confirm your password' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error('The two passwords do not match!'));
            },
          }),
        ]}>
          <Input.Password placeholder="Confirm your password" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" block>Sign Up</Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default SignUp;
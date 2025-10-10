import React from 'react';
import { Form, Input, Button, Card } from 'antd';

const SignUp = () => {
  const [form] = Form.useForm();

  const onFinish = (values) => {
    // Handle signup logic (e.g., send to API)
    console.log('Sign up:', values);
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

import React, { useState } from 'react';
import { Form, Input, Button, Card } from 'antd';


const EditProfile = () => {
  const [form] = Form.useForm();
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  const onFinish = (values) => {
    // Handle form submission (e.g., send to API)
    console.log('Profile updated:', values);
  };

  return (
    <Card title="Edit Profile" style={{ maxWidth: 400, margin: '40px auto' }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          name: 'John Doe',
          email: 'john.doe@tamucc.edu',
          phone: '361-825-0000',
        }}
      >
        <Form.Item label="Name" name="name" rules={[{ required: true, message: 'Please enter your name' }]}> 
          <Input placeholder="Enter your name" />
        </Form.Item>
        <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email', message: 'Please enter a valid email' }]}> 
          <Input placeholder="Enter your email" />
        </Form.Item>
        <Form.Item label="Phone" name="phone" rules={[{ required: true, message: 'Please enter your phone number' }]}> 
          <Input placeholder="Enter your phone number" />
        </Form.Item>

        {!showPasswordFields && (
          <Form.Item>
            <Button type="default" block onClick={() => setShowPasswordFields(true)}>
              Change Password
            </Button>
          </Form.Item>
        )}

        {showPasswordFields && (
          <>
            <Form.Item label="Current Password" name="currentPassword" rules={[{ required: true, message: 'Please enter your current password' }]}> 
              <Input.Password placeholder="Enter current password" />
            </Form.Item>
            <Form.Item label="New Password" name="newPassword" rules={[{ required: true, message: 'Please enter a new password' }]}> 
              <Input.Password placeholder="Enter new password" />
            </Form.Item>
            <Form.Item label="Confirm New Password" name="confirmPassword" dependencies={["newPassword"]} rules={[
              { required: true, message: 'Please confirm your new password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('The two passwords do not match!'));
                },
              }),
            ]}>
              <Input.Password placeholder="Confirm new password" />
            </Form.Item>
          </>
        )}

        <Form.Item>
          <Button type="primary" htmlType="submit" block>Save Changes</Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default EditProfile;
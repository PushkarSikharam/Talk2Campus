
import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Spin, message } from 'antd';
import axios from 'axios';


const EditProfile = () => {
  const [form] = Form.useForm();
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [loading, setLoading] = useState(true);

  const onFinish = (values) => {
    // Submit updated profile to backend
    const submit = async () => {
      setLoading(true);
      try {
        const payload = {
          name: values.name,
          email: values.email,
        };
        if (values.phone) payload.phone = values.phone;
        if (showPasswordFields) {
          // include password change fields
          payload.currentPassword = values.currentPassword;
          payload.newPassword = values.newPassword;
        }
        const res = await axios.patch('http://localhost:8000/me', payload, { withCredentials: true });
        message.success('Profile updated');
        // update form with returned values (phone may be empty)
        const data = res.data || {};
        form.setFieldsValue({ name: data.name || values.name, email: data.email || values.email, phone: data.phone || values.phone });
        // hide password fields and clear password inputs
        setShowPasswordFields(false);
        form.resetFields(['currentPassword', 'newPassword', 'confirmPassword']);
      } catch (err) {
        console.error('Failed to update profile', err);
        if (err.response && err.response.data && err.response.data.detail) {
          message.error(String(err.response.data.detail));
        } else {
          message.error('Failed to update profile');
        }
      } finally {
        setLoading(false);
      }
    };
    submit();
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get('http://localhost:8000/me', { withCredentials: true });
        const data = res.data || {};
        // Populate form fields
        form.setFieldsValue({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
        });
      } catch (err) {
        console.error('Failed to fetch profile', err);
        message.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card title="Edit Profile" style={{ maxWidth: 400, margin: '40px auto' }}>
      <Spin spinning={loading}>
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
        <Form.Item label="Phone" name="phone"> 
          <Input placeholder="Enter your phone number (optional)" />
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
          <Button type="primary" htmlType="submit" block disabled={loading}>Save Changes</Button>
        </Form.Item>
      </Form>
      </Spin>
    </Card>
  );
};

export default EditProfile;
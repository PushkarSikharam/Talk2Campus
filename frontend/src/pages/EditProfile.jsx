
import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';


const EditProfile = () => {
  const [form] = Form.useForm();
  // always show current password field (optional); only show new password fields when changing password
  const [showNewPasswordFields, setShowNewPasswordFields] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // fetch current user to prefill form
    const load = async () => {
      try {
        const res = await fetch('http://localhost:8000/me', { credentials: 'include' });
        if (!res.ok) {
          // don't log details to console; surface as message
          message.error('Failed to load profile')
          return;
        }
        const data = await res.json();
        form.setFieldsValue({ name: data.name, email: data.email, phone: data.phone || '' });
      } catch (err) {
        message.error('Network error while loading profile');
      }
    }
    load();
  }, [form]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // build payload and avoid sending password fields unless changing password
      const payload = {};
      if (typeof values.name !== 'undefined') payload.name = values.name;
      if (typeof values.email !== 'undefined') payload.email = values.email;
      if (typeof values.phone !== 'undefined') payload.phone = values.phone;

      if (showNewPasswordFields) {
        // require current and new password to attempt change
        if (!values.currentPassword || !values.newPassword) {
          message.error('Please provide current and new password to change password');
          setLoading(false);
          return;
        }
        payload.current_password = values.currentPassword;
        payload.new_password = values.newPassword;
      }

      // If user didn't open the change-password flow but entered currentPassword,
      // set new_password = currentPassword so backend verification can run and password remains unchanged.
      if (!showNewPasswordFields && values.currentPassword) {
        payload.current_password = values.currentPassword;
        payload.new_password = values.currentPassword;
      }

      // remove empty-string / null / undefined values to avoid server-side validation errors
      const cleanPayload = Object.fromEntries(
        Object.entries(payload).filter(([, v]) => v !== '' && v !== null && typeof v !== 'undefined')
      );

      const res = await fetch('http://localhost:8000/me', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanPayload),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = body.detail || 'Failed to update profile';
        message.error(detail);
        setLoading(false);
        return;
      }

      message.success('Profile updated successfully');
  // clear password fields and hide new-password section
  form.setFieldsValue({ currentPassword: '', newPassword: '', confirmPassword: '' });
  setShowNewPasswordFields(false);
    } catch (err) {
      message.error('Network error while updating profile');
    } finally {
      setLoading(false);
    }
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

        {/* Current password is visible by default but only required when changing password */}
        <Form.Item label="Current Password" name="currentPassword" rules={[
          ({ getFieldValue }) => ({
            validator(_, value) {
              // if user is attempting to set a new password, currentPassword is required
              if (showNewPasswordFields && !value) {
                return Promise.reject(new Error('Please enter your current password'));
              }
              return Promise.resolve();
            }
          })
        ]}>
          <Input.Password placeholder="Enter current password (required only when changing password)" />
        </Form.Item>

        {!showNewPasswordFields && (
          <Form.Item>
            <Button type="default" block onClick={() => setShowNewPasswordFields(true)}>
              Change Password
            </Button>
          </Form.Item>
        )}

        {showNewPasswordFields && (
          <>
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
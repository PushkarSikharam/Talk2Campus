import React, { useState } from 'react';
import axios from 'axios';
import { Table, Button, Modal, Form, Input, TimePicker, DatePicker, Select, Space, Card, message } from 'antd';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

// Remove defaultSchedule, fetch from backend instead

const daysOptions = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const ClassSchedule = () => {
  const [schedule, setSchedule] = useState([]);
  // Fetch schedules from backend
  React.useEffect(() => {
    const fetchSchedules = async () => {
      try {
  const res = await axios.get('http://localhost:8000/class_schedule', { withCredentials: true });
        // Convert dates to dayjs objects for display
        const data = res.data.map((item, idx) => ({
          ...item,
          key: item.id || idx.toString(),
          dates: item.dates.map(d => dayjs(d)),
        }));
        setSchedule(data);
      } catch (err) {
        console.error('Failed to fetch schedules', err);
      }
    };
    fetchSchedules();
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const [isAdd, setIsAdd] = useState(false);

  const showEditModal = (record) => {
    setEditing(record);
    setIsAdd(false);
    setModalOpen(true);
    form.setFieldsValue({
      ...record,
      time: [dayjs(record.time[0], 'HH:mm'), dayjs(record.time[1], 'HH:mm')],
      dates: record.dates,
    });
  };

  const handleDelete = async () => {
    if (!editing || !editing.id) {
      message.error('No class selected to delete');
      return;
    }
    // Simple confirmation; you can replace with Antd Popconfirm if desired
    if (!window.confirm('Delete this class? This action cannot be undone.')) return;
    try {
      await axios.delete(`http://localhost:8000/class_schedule/${editing.id}`, { withCredentials: true });
      // Refetch schedules from backend
      const res = await axios.get('http://localhost:8000/class_schedule', { withCredentials: true });
      const data = res.data.map((item, idx) => ({
        ...item,
        key: item.id || idx.toString(),
        dates: item.dates.map(d => dayjs(d)),
      }));
      setSchedule(data);
      setModalOpen(false);
      setEditing(null);
      setIsAdd(false);
      message.success('Class deleted');
    } catch (err) {
      console.error('Failed to delete class', err);
      message.error('Failed to delete class. See console for details.');
    }
  };

  const showAddModal = () => {
    setEditing(null);
    setIsAdd(true);
    setModalOpen(true);
    form.resetFields();
  };

  const handleUpdate = async () => {
    try {
      const values = await form.validateFields();
      if (isAdd) {
        const newClass = {
          ...values,
          key: (schedule.length + 1).toString(),
          time: values.time.map(t => t.format('HH:mm')),
          dates: values.dates.map(d => d.format('YYYY-MM-DD')),
        };
        // Send to backend
        await axios.post('http://localhost:8000/class_schedule', {
          course: newClass.course,
          name: newClass.name,
          days: newClass.days,
          time: newClass.time,
          dates: newClass.dates,
        }, { withCredentials: true });
        // Refetch from backend
  const res = await axios.get('http://localhost:8000/class_schedule', { withCredentials: true });
        const data = res.data.map((item, idx) => ({
          ...item,
          key: item.id || idx.toString(),
          dates: item.dates.map(d => dayjs(d)),
        }));
        setSchedule(data);
      } else {
        const updated = schedule.map(item =>
          item.key === editing.key
            ? {
                ...item,
                ...values,
                time: values.time.map(t => t.format('HH:mm')),
                dates: values.dates,
              }
            : item
        );
        setSchedule(updated);
      }
      setModalOpen(false);
      setEditing(null);
      setIsAdd(true);
    } catch (err) {
      // Handle error (validation or API)
      console.error('handleUpdate error:', err);
      // If validation error, show which fields
      if (err && err.errorFields) {
        const fields = err.errorFields.map(f => `${f.name.join('.')}: ${f.errors.join(', ')}`).join('; ');
        message.error(`Validation failed: ${fields}`);
      } else {
        message.error('Failed to add/update class. See console for details.');
      }
    }
  };

  const columns = [
    { title: 'Course', dataIndex: 'course', key: 'course' },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Days', dataIndex: 'days', key: 'days', render: days => days.join(', ') },
    { title: 'Time', dataIndex: 'time', key: 'time', render: t => `${t[0]} - ${t[1]}` },
    { title: 'Dates', dataIndex: 'dates', key: 'dates', render: d => `${d[0].format('YYYY-MM-DD')} to ${d[1].format('YYYY-MM-DD')}` },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button onClick={() => showEditModal(record)} type="link">Edit</Button>
      ),
    },
  ];

  return (
    <Card title="Class Schedule" style={{ maxWidth: 900, margin: '40px auto' }}>
      <Table dataSource={schedule} columns={columns} pagination={false} />
      <Button type="primary" style={{ marginTop: 16, marginBottom: 8 }} onClick={showAddModal}>
        Add Class
      </Button>
      <Modal
        title={isAdd ? "Add Class" : "Edit Class"}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setIsAdd(false); }}
        destroyOnClose
        footer={[
          <Button key="cancel" onClick={() => { setModalOpen(false); setIsAdd(false); }}>Cancel</Button>,
          !isAdd ? <Button key="delete" danger onClick={handleDelete}>Delete</Button> : null,
          <Button key="save" type="primary" onClick={handleUpdate}>{isAdd ? "Add" : "Save"}</Button>
        ]}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Course Code" name="course" rules={[{ required: true }]}> 
            <Input onChange={(e) => { form.setFieldsValue({ course: e.target.value }); }} /> 
          </Form.Item>
          <Form.Item label="Course Name" name="name" rules={[{ required: true }]}> 
            <Input onChange={(e) => { form.setFieldsValue({ name: e.target.value }); }} /> 
          </Form.Item>
          <Form.Item label="Days" name="days" rules={[{ required: true }]}> 
            <Select mode="multiple" options={daysOptions.map(d => ({ value: d }))} />
          </Form.Item>
          <Form.Item label="Class Time" name="time" rules={[{ required: true }]}> 
            <TimePicker.RangePicker format="HH:mm" />
          </Form.Item>
          <Form.Item label="From - To Dates" name="dates" rules={[{ required: true }]}> 
            <RangePicker />
          </Form.Item>
        </Form>
        {/* debug panel removed */}
      </Modal>
    </Card>
  );
};

function EditClassSchedule() {
  return <ClassSchedule />;
}

export default EditClassSchedule;
import React, { useState } from 'react';
import axios from 'axios';
import { Table, Button, Modal, Form, Input, TimePicker, DatePicker, Select, Card, Typography, message } from 'antd';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Paragraph, Text, Title } = Typography;

// Remove defaultSchedule, fetch from backend instead

const daysOptions = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const ClassSchedule = () => {
  const [schedule, setSchedule] = useState([]);
  const loadSchedules = async () => {
    const res = await axios.get('/class_schedule', { withCredentials: true });
    return res.data.map((item, idx) => ({
      ...item,
      key: item.id || idx.toString(),
      dates: item.dates.map((d) => dayjs(d)),
    }));
  };
  // Fetch schedules from backend
  React.useEffect(() => {
    const fetchSchedules = async () => {
      try {
        setSchedule(await loadSchedules());
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
    Modal.confirm({
      title: 'Delete class',
      content: 'Are you sure you want to delete this class? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await axios.delete(`/class_schedule/${editing.id}`, { withCredentials: true });
          setSchedule(await loadSchedules());
          setModalOpen(false);
          setEditing(null);
          setIsAdd(false);
          message.success('Class deleted');
        } catch (err) {
          console.error('Failed to delete class', err);
          message.error('Failed to delete class. See console for details.');
        }
      }
    });
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
        await axios.post('/class_schedule', {
          course: newClass.course,
          name: newClass.name,
          days: newClass.days,
          time: newClass.time,
          dates: newClass.dates,
        }, { withCredentials: true });
        setSchedule(await loadSchedules());
        message.success('Successfully added class schedule');
      } else {
        // Persist update to backend: backend exposes POST (create) and DELETE endpoints
        // (no PUT), so implement update as delete+create for the selected item.
        try {
          if (!editing || !editing.id) {
            message.error('No class selected to update');
          } else {
            // delete existing
            await axios.delete(`/class_schedule/${editing.id}`, { withCredentials: true });
            // create new with updated values
            const newClass = {
              course: values.course,
              name: values.name,
              days: values.days,
              time: values.time.map(t => t.format('HH:mm')),
              dates: values.dates.map(d => d.format ? d.format('YYYY-MM-DD') : d),
            };
            await axios.post('/class_schedule', newClass, { withCredentials: true });
            setSchedule(await loadSchedules());
            message.success('Class updated');
          }
        } catch (err) {
          console.error('Failed to update class', err);
          message.error('Failed to update class. See console for details.');
        }
      }
      setModalOpen(false);
      setEditing(null);
      setIsAdd(false);
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
    <div className="page-container student-tool-page">
      <section className="student-tool-heading">
        <div>
          <Text className="section-kicker">My Week</Text>
          <Title level={1}>Class schedule</Title>
          <Paragraph>Keep your class times here so Talk2Campus can warn you before an event overlaps.</Paragraph>
        </div>
        <Button type="primary" size="large" className="brand-button" onClick={showAddModal}>Add class</Button>
      </section>
      <Card className="site-panel schedule-card">
        <Table dataSource={schedule} columns={columns} pagination={false} scroll={{ x: 720 }} locale={{ emptyText: 'No classes yet. Add your first class to begin checking event conflicts.' }} />
      </Card>
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
    </div>
  );
};

function EditClassSchedule() {
  return <ClassSchedule />;
}

export default EditClassSchedule;

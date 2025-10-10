import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, TimePicker, DatePicker, Select, Space, Card } from 'antd';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

const defaultSchedule = [
  {
    key: '1',
    course: 'CSCI 1234',
    name: 'Intro to Programming',
    days: ['Mon', 'Wed', 'Fri'],
    time: ['09:00', '10:15'],
    dates: [dayjs('2025-08-25'), dayjs('2025-12-10')],
  },
  {
    key: '2',
    course: 'MATH 2345',
    name: 'Calculus II',
    days: ['Tue', 'Thu'],
    time: ['11:00', '12:15'],
    dates: [dayjs('2025-08-25'), dayjs('2025-12-10')],
  },
];

const daysOptions = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const ClassSchedule = () => {
  const [schedule, setSchedule] = useState(defaultSchedule);

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

  const showAddModal = () => {
    setEditing(null);
    setIsAdd(true);
    setModalOpen(true);
    form.resetFields();
  };

  const handleUpdate = () => {
    form.validateFields().then(values => {
      if (isAdd) {
        const newClass = {
          ...values,
          key: (schedule.length + 1).toString(),
          time: values.time.map(t => t.format('HH:mm')),
          dates: values.dates,
        };
        setSchedule([...schedule, newClass]);
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
      setIsAdd(false);
    });
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
        onOk={handleUpdate}
        okText={isAdd ? "Add" : "Save"}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Course Code" name="course" rules={[{ required: true }]}> <Input /> </Form.Item>
          <Form.Item label="Course Name" name="name" rules={[{ required: true }]}> <Input /> </Form.Item>
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
      </Modal>
    </Card>
  );
};

function EditClassSchedule() {
  return <ClassSchedule />;
}

export default EditClassSchedule;
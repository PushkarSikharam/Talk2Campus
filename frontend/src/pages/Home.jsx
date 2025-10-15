import React from 'react';
import { Card, Typography, Row, Col, Button } from 'antd';
import { GlobalOutlined, RobotOutlined, CalendarOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const features = [
  {
    icon: <GlobalOutlined style={{ fontSize: 32, color: '#0067c5' }} />,
    title: 'Interactive Campus Map',
    desc: 'Quickly find buildings, event spaces, and campus facilities.',
  },
  {
    icon: <CalendarOutlined style={{ fontSize: 32, color: '#0067c5' }} />,
    title: 'University Event Updates',
    desc: 'Stay informed with live notifications on campus events and activities.',
  },
  {
    icon: <RobotOutlined style={{ fontSize: 32, color: '#0067c5' }} />,
    title: 'AI Assistant',
    desc: 'Get instant, reliable answers to all your university-related questions, 24/7.',
  },
];

const Home = () => (
  <div style={{ height: '100%', padding: '24px 0 0 0' }}>
    <Card style={{ maxWidth: 700, margin: '24px auto 0 auto', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.07)', background: '#f5f8fa' }}>
      <Title level={2} style={{ color: '#0067c5', textAlign: 'center', marginBottom: 16 }}>
        Welcome to Talk2Campus – Your Ultimate University Companion!
      </Title>
      <Paragraph style={{ fontSize: 18, textAlign: 'center', marginBottom: 32 }}>
        Talk2Campus is the all-in-one app designed to help you navigate your university campus with ease and confidence. Featuring an interactive map, Talk2Campus shows you the location of buildings, dining halls, and more—making it simple to find your way around, whether you're a new student or a campus veteran.
      </Paragraph>
      <Paragraph style={{ fontSize: 16, textAlign: 'center', marginBottom: 32 }}>
        But that's not all! Our intelligent AI agent is here to answer all your university-related questions—from class schedules to event details, administrative queries, and campus news. Need to know when the next club meeting is? Curious about library hours or where to find a specific department? Just ask!
      </Paragraph>
      <Row gutter={[24, 24]} justify="center" style={{ marginBottom: 32 }}>
        {features.map((f, i) => (
          <Col xs={24} sm={12} md={8} key={i}>
            <Card bordered={false} style={{ textAlign: 'center', minHeight: 180 }}>
              {f.icon}
              <Title level={4} style={{ marginTop: 16 }}>{f.title}</Title>
              <Paragraph>{f.desc}</Paragraph>
            </Card>
          </Col>
        ))}
      </Row>
      <div style={{ textAlign: 'center' }}>
        <Button type="primary" size="large" href="/signup" style={{ marginRight: 16 }}>
          Get Started
        </Button>
        <Button size="large" href="/interactive-map">
          Explore Map
        </Button>
      </div>
    </Card>
  </div>
);

export default Home;

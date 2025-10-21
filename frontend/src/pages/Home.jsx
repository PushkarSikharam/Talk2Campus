import React from 'react';
import { Card, Typography, Row, Col, Button, Space } from 'antd';
import { GlobalOutlined, RobotOutlined, CalendarOutlined, ArrowRightOutlined, StarFilled } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const features = [
  {
    icon: <GlobalOutlined style={{ fontSize: 48, color: '#667eea' }} />,
    title: 'Interactive Campus Map',
    desc: 'Quickly find buildings, event spaces, and campus facilities with our intuitive map interface.',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    icon: <CalendarOutlined style={{ fontSize: 48, color: '#43cea2' }} />,
    title: 'University Event Updates',
    desc: 'Stay informed with live notifications on campus events, activities, and important announcements.',
    gradient: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)',
  },
  {
    icon: <RobotOutlined style={{ fontSize: 48, color: '#f093fb' }} />,
    title: 'AI Assistant',
    desc: 'Get instant, reliable answers to all your university-related questions, available 24/7.',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
];

const Home = () => (
  <div className="page-container" style={{ padding: '40px 0', minHeight: 'calc(100vh - 120px)' }}>
    {/* Hero Section */}
    <div className="fade-in" style={{ 
      maxWidth: 1200, 
      margin: '0 auto 60px auto', 
      textAlign: 'center',
      padding: '60px 24px',
      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
      borderRadius: 24,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          <div className="float-animation">
            <Title level={1} style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontSize: '3.5em',
              marginBottom: 0,
              fontWeight: 800,
            }}>
              🎓 Welcome to Talk2Campus
            </Title>
          </div>
          
          <Paragraph style={{ 
            fontSize: 22, 
            color: '#555', 
            maxWidth: 800,
            margin: '0 auto',
            lineHeight: 1.8,
          }}>
            Your Ultimate University Companion for Navigation, Information, and Support
          </Paragraph>

          <Space size="large" style={{ marginTop: 20 }}>
            <Button 
              type="primary" 
              size="large" 
              href="/signup"
              icon={<StarFilled />}
              style={{ 
                height: 56,
                fontSize: 18,
                padding: '0 40px',
                borderRadius: 28,
              }}
            >
              Get Started Now
            </Button>
            <Button 
              size="large" 
              href="/interactive-map"
              icon={<ArrowRightOutlined />}
              style={{ 
                height: 56,
                fontSize: 18,
                padding: '0 40px',
                borderRadius: 28,
                background: 'white',
                borderColor: '#667eea',
                color: '#667eea',
              }}
            >
              Explore Map
            </Button>
          </Space>
        </Space>
      </div>
      
      {/* Decorative circles */}
      <div style={{
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)',
        borderRadius: '50%',
        filter: 'blur(60px)',
      }} />
      <div style={{
        position: 'absolute',
        bottom: -100,
        left: -100,
        width: 300,
        height: 300,
        background: 'linear-gradient(135deg, rgba(67, 206, 162, 0.2) 0%, rgba(24, 90, 157, 0.2) 100%)',
        borderRadius: '50%',
        filter: 'blur(60px)',
      }} />
    </div>

    {/* About Section */}
    <Card 
      className="slide-in-left"
      style={{ 
        maxWidth: 1200, 
        margin: '0 auto 60px auto', 
        borderRadius: 24,
        background: 'white',
        padding: 24,
      }}
    >
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <Title level={2} style={{ 
          textAlign: 'center',
          color: '#2c3e50',
          fontSize: '2.5em',
        }}>
          Navigate Campus with Confidence
        </Title>
        
        <Row gutter={[32, 32]}>
          <Col xs={24} md={12}>
            <Paragraph style={{ fontSize: 18, lineHeight: 1.8, color: '#555' }}>
              Talk2Campus is your all-in-one solution for university life. Our interactive map helps you 
              locate buildings, dining halls, libraries, and study spaces—making navigation effortless 
              whether you're a freshman finding your first class or a senior exploring new areas of campus.
            </Paragraph>
          </Col>
          <Col xs={24} md={12}>
            <Paragraph style={{ fontSize: 18, lineHeight: 1.8, color: '#555' }}>
              But we're more than just a map! Our intelligent AI agent is ready to answer your questions 
              about class schedules, event details, campus news, library hours, and administrative queries. 
              Get instant, accurate information whenever you need it.
            </Paragraph>
          </Col>
        </Row>
      </Space>
    </Card>

    {/* Features Section */}
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Title level={2} style={{ 
        textAlign: 'center',
        marginBottom: 48,
        color: '#2c3e50',
        fontSize: '2.5em',
      }}>
        ✨ Powerful Features
      </Title>
      
      <Row gutter={[32, 32]}>
        {features.map((feature, index) => (
          <Col xs={24} sm={12} lg={8} key={index}>
            <Card
              className="fade-in"
              style={{
                height: '100%',
                textAlign: 'center',
                borderRadius: 20,
                border: 'none',
                background: 'white',
                position: 'relative',
                overflow: 'hidden',
                animationDelay: `${index * 0.1}s`,
              }}
              hoverable
            >
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 5,
                background: feature.gradient,
              }} />
              
              <div style={{
                display: 'inline-flex',
                padding: 20,
                borderRadius: '50%',
                background: `${feature.gradient}15`,
                marginBottom: 20,
              }}>
                {feature.icon}
              </div>
              
              <Title level={3} style={{ 
                marginBottom: 16,
                fontSize: '1.5em',
                color: '#2c3e50',
              }}>
                {feature.title}
              </Title>
              
              <Paragraph style={{ 
                fontSize: 16, 
                color: '#666',
                lineHeight: 1.7,
              }}>
                {feature.desc}
              </Paragraph>
            </Card>
          </Col>
        ))}
      </Row>
    </div>

    {/* CTA Section */}
    <Card
      className="slide-in-right"
      style={{
        maxWidth: 1200,
        margin: '60px auto 0 auto',
        textAlign: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: 24,
        border: 'none',
        padding: 40,
      }}
    >
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <Title level={2} style={{ color: 'white', marginBottom: 0, fontSize: '2.2em' }}>
          Ready to Transform Your Campus Experience?
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.95)', fontSize: 18, marginBottom: 0 }}>
          Join thousands of students already using Talk2Campus
        </Paragraph>
        <Button 
          size="large"
          href="/signup"
          style={{ 
            height: 56,
            fontSize: 18,
            padding: '0 50px',
            borderRadius: 28,
            background: 'white',
            borderColor: 'white',
            color: '#667eea',
            fontWeight: 600,
          }}
        >
          Get Started Free →
        </Button>
      </Space>
    </Card>
  </div>
);

export default Home;

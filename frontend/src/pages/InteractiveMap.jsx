
import React, { useState } from 'react';
import { Layout, Card, Typography, Input, List, Space, Tag, Button, Empty } from 'antd';
import { SearchOutlined, EnvironmentOutlined, ClockCircleOutlined, InfoCircleOutlined, ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons';
import 'antd/dist/reset.css';
import Map from '../components/Map';

const { Sider, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

// Mock events data
const mockEvents = [
  {
    id: 1,
    title: 'Tech Career Fair',
    location: 'Engineering Building',
    time: '2:00 PM - 5:00 PM',
    date: 'Today',
    type: 'career',
    attendees: 150,
  },
  {
    id: 2,
    title: 'Campus Tour',
    location: 'Student Center',
    time: '10:00 AM - 11:30 AM',
    date: 'Tomorrow',
    type: 'tour',
    attendees: 45,
  },
  {
    id: 3,
    title: 'Biology Seminar',
    location: 'Science Hall',
    time: '3:00 PM - 4:30 PM',
    date: 'Today',
    type: 'academic',
    attendees: 80,
  },
  {
    id: 4,
    title: 'Student Club Meeting',
    location: 'Library Conference Room',
    time: '6:00 PM - 7:00 PM',
    date: 'Tomorrow',
    type: 'social',
    attendees: 30,
  },
];

const eventTypeColors = {
  career: '#667eea',
  tour: '#43cea2',
  academic: '#f093fb',
  social: '#feca57',
};

function InteractiveMap() {
  const [siderWidth, setSiderWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      return Math.max(150, Math.floor(window.innerWidth * 0.75));
    }
    return 600;
  });
  const [searchValue, setSearchValue] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);

  const handleMouseDown = (e) => {
    const startX = e.clientX;
    const startWidth = siderWidth;
    const onMouseMove = (moveEvent) => {
      const container = document.getElementById('splitter-layout');
      const maxWidth = container ? container.offsetWidth * 0.9 : window.innerWidth * 0.9;
      const newWidth = Math.min(maxWidth, Math.max(150, startWidth + moveEvent.clientX - startX));
      setSiderWidth(newWidth);
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const filteredEvents = mockEvents.filter(event =>
    event.title.toLowerCase().includes(searchValue.toLowerCase()) ||
    event.location.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      {/* Page Header */}
      <div className="fade-in" style={{ 
        textAlign: 'center', 
        marginBottom: 32,
        padding: '32px 24px',
        background: 'linear-gradient(135deg, rgba(67, 206, 162, 0.1) 0%, rgba(24, 90, 157, 0.1) 100%)',
        borderRadius: 24,
      }}>
        <Space direction="vertical" size={16}>
          <div style={{
            display: 'inline-flex',
            padding: 20,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)',
            boxShadow: '0 10px 30px rgba(67, 206, 162, 0.3)',
          }}>
            <EnvironmentOutlined style={{ fontSize: 48, color: 'white' }} />
          </div>
          <Title level={1} style={{ 
            marginBottom: 0,
            background: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Interactive Campus Map
          </Title>
          <Paragraph style={{ fontSize: 18, color: '#666', marginBottom: 0 }}>
            Explore buildings, find events, and navigate your campus
          </Paragraph>
        </Space>
      </div>

      <Layout 
        id="splitter-layout" 
        className="slide-in-left"
        style={{ 
          height: '75vh', 
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
          border: 'none',
        }}
      >
        <Sider
          width={siderWidth}
          style={{ 
            background: 'white', 
            position: 'relative', 
            minWidth: 150, 
            maxWidth: '90%',
            borderRight: '1px solid #f0f0f0',
          }}
          theme="light"
          trigger={null}
          collapsible={false}
        >
          <div style={{ height: '100%', width: '100%', position: 'relative' }}>
            {/* Map Controls Overlay */}
            <div style={{
              position: 'absolute',
              top: 16,
              left: 16,
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              <Button 
                icon={<ZoomInOutlined />}
                size="large"
                style={{
                  background: 'white',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  border: 'none',
                  borderRadius: 12,
                }}
              />
              <Button 
                icon={<ZoomOutOutlined />}
                size="large"
                style={{
                  background: 'white',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  border: 'none',
                  borderRadius: 12,
                }}
              />
            </div>
            
            <Map />
          </div>
          
          {/* Enhanced Splitter Handle */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 8,
              height: '100%',
              cursor: 'col-resize',
              background: 'linear-gradient(90deg, transparent 0%, #e0e7ff 50%, transparent 100%)',
              zIndex: 10,
              transition: 'background 0.3s ease',
            }}
            onMouseDown={handleMouseDown}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(90deg, transparent 0%, #667eea 50%, transparent 100%)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(90deg, transparent 0%, #e0e7ff 50%, transparent 100%)';
            }}
          />
        </Sider>

        <Content style={{ background: '#fafafa', padding: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Search Bar */}
          <div style={{ 
            padding: 20,
            background: 'white',
            borderBottom: '1px solid #f0f0f0',
          }}>
            <Search
              placeholder="Search for buildings or events..."
              size="large"
              prefix={<SearchOutlined style={{ color: '#43cea2' }} />}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              style={{ borderRadius: 12 }}
              allowClear
            />
          </div>

          {/* Events List */}
          <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: 20,
          }}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
              }}>
                <Title level={4} style={{ marginBottom: 0 }}>
                  📅 Upcoming Events
                </Title>
                <Tag color="blue">{filteredEvents.length} events</Tag>
              </div>

              {filteredEvents.length > 0 ? (
                <List
                  dataSource={filteredEvents}
                  renderItem={(event) => (
                    <Card
                      hoverable
                      onClick={() => setSelectedEvent(event)}
                      style={{
                        marginBottom: 12,
                        borderRadius: 12,
                        border: selectedEvent?.id === event.id 
                          ? `2px solid ${eventTypeColors[event.type]}` 
                          : '1px solid #f0f0f0',
                        transition: 'all 0.3s ease',
                        background: selectedEvent?.id === event.id 
                          ? `${eventTypeColors[event.type]}05`
                          : 'white',
                      }}
                    >
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text strong style={{ fontSize: 16 }}>{event.title}</Text>
                          <Tag 
                            color={eventTypeColors[event.type]}
                            style={{ borderRadius: 12 }}
                          >
                            {event.type}
                          </Tag>
                        </div>
                        
                        <Space>
                          <EnvironmentOutlined style={{ color: '#43cea2' }} />
                          <Text type="secondary">{event.location}</Text>
                        </Space>
                        
                        <Space>
                          <ClockCircleOutlined style={{ color: '#667eea' }} />
                          <Text type="secondary">{event.date} • {event.time}</Text>
                        </Space>

                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: 8,
                          paddingTop: 8,
                          borderTop: '1px solid #f0f0f0',
                        }}>
                          <Space size={4}>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                              👥 {event.attendees} attending
                            </Text>
                          </Space>
                          <Button 
                            type="link" 
                            size="small"
                            style={{ 
                              color: eventTypeColors[event.type],
                              padding: 0,
                            }}
                          >
                            View Details →
                          </Button>
                        </div>
                      </Space>
                    </Card>
                  )}
                />
              ) : (
                <Card style={{ borderRadius: 12, textAlign: 'center', padding: 40 }}>
                  <Empty
                    description={
                      <Space direction="vertical" size={8}>
                        <Text>No events found</Text>
                        <Text type="secondary">Try adjusting your search</Text>
                      </Space>
                    }
                  />
                </Card>
              )}

              {/* Info Card */}
              <Card
                style={{
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(67, 206, 162, 0.1) 0%, rgba(24, 90, 157, 0.1) 100%)',
                  border: 'none',
                }}
              >
                <Space align="start" size={12}>
                  <InfoCircleOutlined style={{ fontSize: 20, color: '#43cea2', marginTop: 4 }} />
                  <div>
                    <Text strong style={{ display: 'block', marginBottom: 4 }}>
                      How to use the map
                    </Text>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Click on buildings to see details. Use the splitter to resize panels. 
                      Search for specific locations or events above.
                    </Text>
                  </div>
                </Space>
              </Card>
            </Space>
          </div>
        </Content>
      </Layout>
    </div>
  );
}

export default InteractiveMap;
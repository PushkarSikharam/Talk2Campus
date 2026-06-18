import React, { useEffect, useState } from 'react';
import { Button, Card, Col, Empty, Row, Skeleton, Space, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  CalendarOutlined,
  EnvironmentOutlined,
  MessageOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { getEventDateText, getEventImageUrl, getEventLocation, getEventTitle, getEventType } from '../utils/eventHelpers';

const { Paragraph, Title, Text } = Typography;

const features = [
  {
    icon: <EnvironmentOutlined style={{ fontSize: 28 }} />,
    title: 'Campus Navigation',
    desc: 'Find buildings, map routes, and move across campus with clearer direction and less guesswork.',
  },
  {
    icon: <CalendarOutlined style={{ fontSize: 28 }} />,
    title: 'Live Event Discovery',
    desc: 'Browse university events with filters, schedule awareness, and registration tracking.',
  },
  {
    icon: <MessageOutlined style={{ fontSize: 28 }} />,
    title: 'Ask Talk2Campus',
    desc: 'Ask campus questions using current event, building, and schedule information.',
  },
];

const getStartTime = (event) => Date.parse(
  event?.startsOn_dt || event?.startsOn || event?.startDate || event?.start_date || event?.start || ''
);

const TodayOnCampus = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    axios.get('/events?limit=24')
      .then((response) => {
        if (!mounted) return;
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const todayEnd = todayStart + 24 * 60 * 60 * 1000;
        const upcoming = (Array.isArray(response.data) ? response.data : [])
          .filter((event) => Number.isFinite(getStartTime(event)) && getStartTime(event) >= todayStart)
          .sort((a, b) => getStartTime(a) - getStartTime(b));
        const today = upcoming.filter((event) => getStartTime(event) < todayEnd);
        setEvents((today.length ? today : upcoming).slice(0, 3));
      })
      .catch(() => {
        if (mounted) setEvents([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  return (
    <section className="home-events-section">
      <div className="section-heading">
        <div>
          <Text className="section-kicker">Today On Campus</Text>
          <Title level={2} style={{ margin: '8px 0 0' }}>A quick look at what is coming up.</Title>
        </div>
        <Link to="/events"><Button>See all events</Button></Link>
      </div>
      <div className="home-event-grid">
        {loading ? [1, 2, 3].map((item) => <Card key={item} className="home-event-card"><Skeleton active /></Card>) : null}
        {!loading && events.length === 0 ? <Card className="home-event-empty"><Empty description="No upcoming events are available right now." /></Card> : null}
        {!loading && events.map((event) => {
          const imageUrl = getEventImageUrl(event);
          return (
            <Link to="/events" key={event.id || event._id || getEventTitle(event)} className="home-event-link">
              <Card hoverable className="home-event-card">
                <div className={`home-event-art ${imageUrl ? 'has-image' : ''}`} style={imageUrl ? { backgroundImage: `url("${imageUrl}")` } : undefined}>
                  {!imageUrl ? <CalendarOutlined aria-hidden="true" /> : null}
                </div>
                <Tag className="pill-tag">{getEventType(event)}</Tag>
                <Title level={4}>{getEventTitle(event)}</Title>
                <Text>{getEventDateText(event)}</Text>
                <Text type="secondary">{getEventLocation(event) || 'Location coming soon'}</Text>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

const Home = () => (
  <div className="page-container" style={{ padding: '28px 0 56px' }}>
    <div className="section-shell" style={{ display: 'grid', gap: 28 }}>
      <section className="hero-shell fade-in">
        <div className="hero-grid">
          <div>
            <Text className="section-kicker">Campus Companion</Text>
            <Title level={1} style={{ fontSize: 'clamp(2.7rem, 5vw, 4.7rem)', margin: '14px 0 18px' }}>
              Your campus day, all in one place.
            </Title>
            <Paragraph style={{ fontSize: 19, maxWidth: 720, color: 'rgba(247, 242, 232, 0.88)' }}>
              Talk2Campus brings events, navigation, and schedule context into one place so students can make faster decisions and spend less time hunting for information.
            </Paragraph>

            <Space size="middle" wrap style={{ marginTop: 22 }}>
              <Link to="/interactive-map">
                <Button type="primary" size="large" className="brand-button" icon={<ArrowRightOutlined />}>
                  Open Campus Map
                </Button>
              </Link>
              <Link to="/events">
                <Button size="large" className="ghost-button">
                  Browse Events
                </Button>
              </Link>
            </Space>

          </div>

          <aside className="hero-note campus-now-card">
            <Text className="section-kicker" style={{ color: '#f1dca7' }}>Your Day At TAMU-CC</Text>
            <Title level={3} style={{ marginTop: 14, marginBottom: 12, color: '#fff8eb' }}>
              Everything you need between classes.
            </Title>
            <Paragraph style={{ color: 'rgba(247, 242, 232, 0.82)' }}>
              Find your next building, see what is happening around the Island, and keep your plans together.
            </Paragraph>
            <div className="auth-bullets">
              <div className="auth-bullet"><strong>Find it.</strong> Walking directions from your location.</div>
              <div className="auth-bullet"><strong>Join it.</strong> Student events from TAMU-CC Engage.</div>
              <div className="auth-bullet"><strong>Plan it.</strong> Class-aware event registration.</div>
            </div>
          </aside>
        </div>
      </section>

      <section className="story-card site-panel slide-in-left">
        <div style={{ padding: 28 }}>
          <div className="section-heading">
            <div>
              <Text className="section-kicker">Built Around Student Life</Text>
              <Title level={2} style={{ margin: '8px 0 0' }}>Less searching. More time for your campus day.</Title>
            </div>
          </div>
          <Row gutter={[28, 28]}>
            <Col xs={24} md={12}>
              <Paragraph style={{ fontSize: 17, color: '#455468', marginBottom: 0 }}>
                Heading to class? Start with the map. Looking for something to do? Browse events happening today or later this week.
              </Paragraph>
            </Col>
            <Col xs={24} md={12}>
              <Paragraph style={{ fontSize: 17, color: '#455468', marginBottom: 0 }}>
                Sign in to save events and compare them with your class schedule, so a good plan does not become a time conflict.
              </Paragraph>
            </Col>
          </Row>
        </div>
      </section>

      <TodayOnCampus />

      <section>
        <div className="section-heading">
          <div>
            <Text className="section-kicker">Core Experience</Text>
            <Title level={2} style={{ margin: '8px 0 0' }}>One home for the things students ask most.</Title>
          </div>
        </div>
        <Row gutter={[20, 20]}>
          {features.map((feature) => (
            <Col xs={24} md={8} key={feature.title}>
              <Card className="feature-card" hoverable bodyStyle={{ padding: 28, textAlign: 'center' }}>
                <div className="feature-divider" />
                <div className="feature-crest">{feature.icon}</div>
                <Title level={3} style={{ marginTop: 18, marginBottom: 10 }}>{feature.title}</Title>
                <Paragraph style={{ color: '#5a6878', marginBottom: 0 }}>{feature.desc}</Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      <section className="story-card site-panel slide-in-right">
        <div style={{ padding: 28 }}>
          <div className="section-heading">
            <div>
              <Text className="section-kicker">Get Started</Text>
              <Title level={2} style={{ margin: '8px 0 0' }}>Start with the task you already have in mind.</Title>
            </div>
          </div>
          <Space size="middle" wrap>
            <Link to="/signup">
              <Button type="primary" size="large" className="brand-button">
                Create Account
              </Button>
            </Link>
            <Link to="/ai-agent">
              <Button size="large">Ask the Campus Assistant</Button>
            </Link>
          </Space>
        </div>
      </section>
    </div>
  </div>
);

export default Home;

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Empty, Input, List, Select, Space, Spin, Tag, Typography, message } from 'antd';
import axios from 'axios';
import { ClockCircleOutlined, EnvironmentOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import EventDetailModal from '../components/EventDetailModal';
import {
  eventTypeColors,
  getEventBenefits,
  getEventDateText,
  getEventLocation,
  getEventOrganizations,
  getEventTitle,
  getEventType,
  getOrgDisplayName,
} from '../utils/eventHelpers';

const { Text, Title } = Typography;

axios.defaults.withCredentials = true;
axios.defaults.baseURL = '';

const normalizeShortLocation = (ev) => {
  const rawShort =
    ev.shortLocation ||
    ev.short_location ||
    ev.shortLoc ||
    ev.short ||
    ev.location_short ||
    (ev.event_snapshot && (ev.event_snapshot.shortLocation || ev.event_snapshot.short_location || ev.event_snapshot.short)) ||
    null;
  return {
    raw: rawShort || null,
    normalized: rawShort ? String(rawShort).toLowerCase().trim() : null,
  };
};

const EventsPage = () => {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [events, setEvents] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [selectedShort, setSelectedShort] = useState('');
  const [selectedTime, setSelectedTime] = useState('upcoming');
  const [selectedTheme, setSelectedTheme] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventModalVisible, setEventModalVisible] = useState(false);

  const loadEvents = async ({ showToast = false } = {}) => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await axios.get('/events?limit=500');
      const list = Array.isArray(res.data) ? res.data : [];
      const normalized = list.map((ev) => {
        const shortLoc = normalizeShortLocation(ev);
        const organizations = getEventOrganizations(ev).map(getOrgDisplayName).filter(Boolean);
        return {
          ...ev,
          _shortLocRaw: shortLoc.raw,
          _shortLocNormalized: shortLoc.normalized,
          _organizationsNormalized: organizations.map((org) => org.toLowerCase()),
          _organizationsDisplay: organizations,
          _themeNormalized: String(getEventType(ev) || '').toLowerCase(),
        };
      });
      setEvents(normalized);
      if (showToast) message.success(`Loaded ${normalized.length} upcoming events`);
    } catch (err) {
      console.error('Failed to load events for Events page', err);
      setLoadError(err?.response?.data?.detail || 'Could not load campus events right now.');
      message.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleRefresh = async () => {
    setSyncing(true);
    try {
      await axios.post('/events/sync');
      await loadEvents();
      message.success('Events refreshed');
    } catch (err) {
      console.error('Failed to refresh events', err);
      message.error(err?.response?.data?.detail || 'Could not refresh events right now');
    } finally {
      setSyncing(false);
    }
  };

  const shortMap = useMemo(() => {
    const sMap = {};
    events.forEach((ev) => {
      if (ev._shortLocNormalized && !sMap[ev._shortLocNormalized]) {
        sMap[ev._shortLocNormalized] = ev._shortLocRaw || ev.location || ev.venue || ev.title || ev.name || ev._shortLocNormalized;
      }
    });
    return sMap;
  }, [events]);

  const startOfToday = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const startOfWeekEnd = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    d.setDate(d.getDate() + 7);
    return d.getTime();
  }, []);

  const filtered = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return events.filter((ev) => {
      const startRaw = ev.startsOn_dt || ev.startsOn || ev.startDate || ev.start;
      if (!startRaw) return false;
      const t = Date.parse(startRaw);
      if (Number.isNaN(t)) return false;

      if (selectedTime === 'today') {
        const endOfToday = startOfToday + 24 * 60 * 60 * 1000;
        if (t < startOfToday || t >= endOfToday) return false;
      } else if (selectedTime === 'week') {
        if (t < startOfToday || t > startOfWeekEnd) return false;
      } else if (selectedTime === 'upcoming') {
        if (t < startOfToday) return false;
      }

      if (selectedShort && ev._shortLocNormalized !== selectedShort) return false;
      if (selectedTheme && ev._themeNormalized !== selectedTheme) return false;
      if (selectedOrg && !ev._organizationsNormalized.includes(selectedOrg)) return false;

      if (!query) return true;

      const haystack = [
        getEventTitle(ev),
        getEventLocation(ev),
        getEventType(ev),
        ...(ev._organizationsDisplay || []),
        ...(ev.benefitNames || []),
        ev.description,
      ].filter(Boolean).join(' ').toLowerCase();

      return haystack.includes(query);
    });
  }, [events, searchText, selectedShort, selectedTime, selectedTheme, selectedOrg, startOfToday, startOfWeekEnd]);

  const shortOptions = useMemo(
    () => [{ value: '', label: 'All places' }, ...Array.from(new Set(events.map((ev) => ev._shortLocNormalized).filter(Boolean))).map((value) => ({ value, label: shortMap[value] || value }))],
    [events, shortMap]
  );

  const themeOptions = useMemo(
    () => [{ value: '', label: 'All themes' }, ...Array.from(new Set(events.map((ev) => ev._themeNormalized).filter(Boolean))).map((value) => ({ value, label: value.replace(/\b\w/g, (c) => c.toUpperCase()) }))],
    [events]
  );

  const orgOptions = useMemo(
    () => [{ value: '', label: 'All organizations' }, ...Array.from(new Set(events.flatMap((ev) => ev._organizationsDisplay || []).filter(Boolean))).sort((a, b) => a.localeCompare(b)).map((value) => ({ value: value.toLowerCase(), label: value }))],
    [events]
  );

  const activeFilterCount = [searchText.trim(), selectedShort, selectedTheme, selectedOrg, selectedTime !== 'upcoming' ? selectedTime : ''].filter(Boolean).length;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Events</Title>
          <Text type="secondary">Campus events mirrored from TAMUCC Engage with search, filters, and RSVP details.</Text>
        </div>
        <Space wrap>
          <Button type="primary" icon={<ReloadOutlined />} loading={syncing} onClick={handleRefresh} disabled={loading}>
            Refresh
          </Button>
        </Space>
      </div>

      <Card style={{ borderRadius: 16, marginBottom: 16 }}>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Input allowClear size="large" prefix={<SearchOutlined />} placeholder="Search by event name, place, organizer, or keyword" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <Select value={selectedTime} onChange={setSelectedTime} options={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'today', label: 'Today' }, { value: 'week', label: 'This week' }]} />
            <Select value={selectedShort} onChange={setSelectedShort} options={shortOptions} />
            <Select value={selectedTheme} onChange={setSelectedTheme} options={themeOptions} />
            <Select showSearch optionFilterProp="label" value={selectedOrg} onChange={setSelectedOrg} options={orgOptions} />
          </div>
          <Space wrap>
            <Tag color="blue">Showing {filtered.length} events</Tag>
            <Tag>Loaded {events.length}</Tag>
            {activeFilterCount > 0 ? <Tag color="purple">{activeFilterCount} filters active</Tag> : null}
          </Space>
        </Space>
      </Card>

      {loadError ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16, borderRadius: 12 }}
          message="Could not fully load campus events"
          description={loadError}
          action={<Button size="small" onClick={() => loadEvents()}>Try again</Button>}
        />
      ) : null}

      <Card style={{ borderRadius: 16 }}>
        {loading ? (
          <div style={{ padding: 56, textAlign: 'center' }}>
            <Space direction="vertical" size={12}>
              <Spin size="large" />
              <Text>Loading campus events...</Text>
              <Text type="secondary">We are gathering the latest events from your mirrored feed.</Text>
            </Space>
          </div>
        ) : filtered.length > 0 ? (
          <List
            dataSource={filtered}
            renderItem={(ev) => {
              const title = getEventTitle(ev);
              const location = getEventLocation(ev);
              const type = getEventType(ev);
              const color = eventTypeColors[type] || '#43cea2';
              const startText = getEventDateText(ev);
              const organizations = ev._organizationsDisplay || [];
              return (
                <Card
                  key={ev.id || ev._id || title}
                  hoverable
                  style={{ marginBottom: 12, borderRadius: 14, border: '1px solid #f0f0f0', transition: 'all 0.3s ease', background: 'white' }}
                >
                  <Space direction="vertical" size={10} style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <Text strong style={{ fontSize: 16 }}>{title}</Text>
                      <Tag color={color} style={{ borderRadius: 12 }}>{type}</Tag>
                    </div>
                    <Space>
                      <EnvironmentOutlined style={{ color: '#43cea2' }} />
                      <Text type="secondary">{location || 'Location coming soon'}</Text>
                    </Space>
                    <Space>
                      <ClockCircleOutlined style={{ color: '#667eea' }} />
                      <Text type="secondary">{startText}</Text>
                    </Space>
                    <Space wrap>
                      {ev._shortLocNormalized ? <Tag style={{ borderRadius: 8 }}>{ev._shortLocRaw || ev._shortLocNormalized}</Tag> : null}
                      {organizations.slice(0, 2).map((org) => <Tag key={org}>{org}</Tag>)}
                      {getEventBenefits(ev).slice(0, 2).map((benefit) => <Tag key={benefit} color="green">{benefit}</Tag>)}
                    </Space>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                      <Button type="link" onClick={() => { setSelectedEvent(ev); setEventModalVisible(true); }} style={{ padding: 0 }}>
                        {'View Details ->'}
                      </Button>
                    </div>
                  </Space>
                </Card>
              );
            }}
          />
        ) : (
          <div style={{ padding: 48 }}>
            <Empty
              description={
                <Space direction="vertical">
                  <Text>No events matched your filters</Text>
                  <Text type="secondary">Try another search, switch to Upcoming, or refresh events.</Text>
                </Space>
              }
            >
              <Space>
                <Button onClick={() => { setSearchText(''); setSelectedShort(''); setSelectedTime('upcoming'); setSelectedTheme(''); setSelectedOrg(''); }}>Clear Filters</Button>
                <Button type="primary" loading={syncing} onClick={handleRefresh}>Refresh</Button>
              </Space>
            </Empty>
          </div>
        )}
      </Card>

      <EventDetailModal event={selectedEvent} visible={eventModalVisible} onClose={() => { setEventModalVisible(false); setSelectedEvent(null); }} />
    </div>
  );
};

export default EventsPage;

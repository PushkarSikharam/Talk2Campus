import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Empty, Input, Select, Skeleton, Space, Tag, Typography, message } from 'antd';
import axios from 'axios';
import { ClockCircleOutlined, EnvironmentOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import EventDetailModal from '../components/EventDetailModal';
import EventArtwork from '../components/EventArtwork';
import { syncCampusEvents } from '../services/campusApi';
import {
  dedupeEvents,
  eventTypeColors,
  getEventBenefits,
  getEventDateText,
  getEventLocation,
  getEventOrganizations,
  getEventTitle,
  getEventType,
  getOrgDisplayName,
  groupEventsByDay,
} from '../utils/eventHelpers';

const { Paragraph, Text, Title } = Typography;

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

const getEventStart = (ev) =>
  ev.startsOn_dt || ev.startsOn || ev.startDate || ev.start_date ||
  ev.startDateTime || ev.start_time || ev.start ||
  ev.event_snapshot?.startsOn || ev.event_snapshot?.startDate || null;

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
  const [visibleCount, setVisibleCount] = useState(24);

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
      await syncCampusEvents();
      await loadEvents();
      message.success('Events refreshed');
    } catch (err) {
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
      const startRaw = getEventStart(ev);
      if (!startRaw) return selectedTime === 'upcoming';
      const t = Date.parse(startRaw);
      if (Number.isNaN(t)) return selectedTime === 'upcoming';

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
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [events, searchText, selectedShort, selectedTime, selectedTheme, selectedOrg, startOfToday, startOfWeekEnd]);

  const dedupedFiltered = useMemo(() => dedupeEvents(filtered), [filtered]);
  const visibleEvents = useMemo(() => dedupedFiltered.slice(0, visibleCount), [dedupedFiltered, visibleCount]);
  const groupedEvents = useMemo(() => groupEventsByDay(visibleEvents), [visibleEvents]);

  useEffect(() => setVisibleCount(24), [searchText, selectedShort, selectedTime, selectedTheme, selectedOrg]);

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
    <div className="page-container" style={{ padding: '28px 18px 56px' }}>
      <div className="events-page-shell">
        <section className="hero-shell fade-in">
          <div className="hero-grid">
            <div>
              <Text className="section-kicker">Campus Events</Text>
              <Title level={1} style={{ fontSize: 'clamp(2.4rem, 4.8vw, 4rem)', margin: '12px 0 14px' }}>
                Discover what is happening on campus without digging through clutter.
              </Title>
              <Paragraph style={{ maxWidth: 700, color: 'rgba(247, 242, 232, 0.84)', fontSize: 18 }}>
                Browse university events, find what fits your day, and keep the details you need in one place.
              </Paragraph>
            </div>
            <div className="hero-note">
              <Text className="section-kicker" style={{ color: '#f1dca7' }}>Live Feed</Text>
              <Title level={3} style={{ margin: '12px 0', color: '#fff8eb' }}>Refresh when you want new campus activity.</Title>
              <Paragraph style={{ color: 'rgba(247, 242, 232, 0.82)' }}>
                Refresh whenever you want to check for newly posted activities and updated event details.
              </Paragraph>
              <Button type="primary" icon={<ReloadOutlined />} loading={syncing} onClick={handleRefresh} disabled={loading} className="brand-button">
                Refresh Events
              </Button>
            </div>
          </div>
        </section>

        <Card className="filter-card site-panel">
          <Space direction="vertical" size={14} style={{ width: '100%' }}>
            <div className="section-heading" style={{ marginBottom: 0 }}>
              <div>
                <Text className="section-kicker">Filter & Search</Text>
                <Title level={3} style={{ margin: '8px 0 0' }}>Find what matches your day.</Title>
              </div>
            </div>
            <Input
              allowClear
              size="large"
              prefix={<SearchOutlined />}
              placeholder="Search by event name, place, organizer, or keyword"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <div className="filter-grid">
              <Select value={selectedTime} onChange={setSelectedTime} options={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'today', label: 'Today' }, { value: 'week', label: 'This week' }]} />
              <Select value={selectedShort} onChange={setSelectedShort} options={shortOptions} />
              <Select value={selectedTheme} onChange={setSelectedTheme} options={themeOptions} />
              <Select showSearch optionFilterProp="label" value={selectedOrg} onChange={setSelectedOrg} options={orgOptions} />
            </div>
            <Space wrap className="summary-tags">
              <Tag color="blue">Showing {Math.min(visibleCount, dedupedFiltered.length)} of {dedupedFiltered.length} events</Tag>
              <Tag>Loaded {events.length}</Tag>
              {activeFilterCount > 0 ? <Tag color="orange">{activeFilterCount} filters active</Tag> : null}
            </Space>
          </Space>
        </Card>

        {loadError ? (
          <Alert
            type="warning"
            showIcon
            style={{ borderRadius: 14 }}
            message="Could not fully load campus events"
            description={loadError}
            action={<Button size="small" onClick={() => loadEvents()}>Try again</Button>}
          />
        ) : null}

        <Card className="events-shell-card site-panel">
          {loading ? (
            <div className="event-card-gallery" aria-label="Loading campus events">
              {[1, 2, 3, 4].map((item) => (
                <Card key={item} className="event-row-card event-skeleton-card">
                  <Skeleton.Image active />
                  <Skeleton active paragraph={{ rows: 3 }} />
                </Card>
              ))}
            </div>
          ) : dedupedFiltered.length > 0 ? (
            <div className="event-groups">
              {groupedEvents.map((group) => (
              <section className="event-day-group" key={group.key}>
                <Title level={3} className="event-day-heading">{group.label}</Title>
                <div className="event-card-gallery">
              {group.events.map((ev) => {
                const title = getEventTitle(ev);
                const location = getEventLocation(ev);
                const type = getEventType(ev);
                const color = eventTypeColors[type] || '#43cea2';
                const startText = getEventDateText(ev);
                const organizations = ev._organizationsDisplay || [];
                return (
                  <Card key={ev.id || ev._id || `${title}-${startText}`} hoverable className="event-row-card">
                    <EventArtwork event={ev} className="event-card-media">
                      <Tag className="event-media-tag">{type}</Tag>
                    </EventArtwork>
                    <div className="event-card-grid">
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                          <div>
                            <Title level={4} style={{ margin: 0 }}>{title}</Title>
                            <Text type="secondary">{type}</Text>
                          </div>
                          <span className="event-color-dot" style={{ background: color }} aria-hidden="true" />
                        </div>
                        <Space direction="vertical" size={10} style={{ width: '100%' }}>
                          <div className="event-meta-row">
                            <EnvironmentOutlined style={{ color: '#be6a3f' }} />
                            <Text type="secondary">{location || 'Location coming soon'}</Text>
                          </div>
                          <div className="event-meta-row">
                            <ClockCircleOutlined style={{ color: '#1f4e5f' }} />
                            <Text type="secondary">{startText}</Text>
                          </div>
                        </Space>
                      </div>

                      <div className="event-side-panel">
                        <Space wrap style={{ marginBottom: 12 }}>
                          {ev._shortLocNormalized ? <Tag className="pill-tag">{ev._shortLocRaw || ev._shortLocNormalized}</Tag> : null}
                          {organizations.slice(0, 2).map((org) => <Tag key={org} className="pill-tag">{org}</Tag>)}
                          {getEventBenefits(ev).slice(0, 2).map((benefit) => <Tag key={benefit} color="green" className="pill-tag">{benefit}</Tag>)}
                        </Space>
                        <Button type="link" onClick={() => { setSelectedEvent(ev); setEventModalVisible(true); }} style={{ paddingInline: 0 }}>
                          View details
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
                </div>
              </section>
              ))}
              {visibleCount < dedupedFiltered.length ? (
                <div className="load-more-events">
                  <Button size="large" onClick={() => setVisibleCount((count) => count + 24)}>Load more events</Button>
                </div>
              ) : null}
            </div>
          ) : (
            <div style={{ padding: 48 }}>
              <Empty
                description={(
                  <Space direction="vertical">
                    <Text>No events matched your filters</Text>
                    <Text type="secondary">Try another search, switch to Upcoming, or refresh events.</Text>
                  </Space>
                )}
              >
                <Space>
                  <Button onClick={() => { setSearchText(''); setSelectedShort(''); setSelectedTime('upcoming'); setSelectedTheme(''); setSelectedOrg(''); }}>
                    Clear Filters
                  </Button>
                  <Button type="primary" loading={syncing} onClick={handleRefresh} className="brand-button">
                    Refresh
                  </Button>
                </Space>
              </Empty>
            </div>
          )}
        </Card>
      </div>

      <EventDetailModal event={selectedEvent} visible={eventModalVisible} onClose={() => { setEventModalVisible(false); setSelectedEvent(null); }} />
    </div>
  );
};

export default EventsPage;

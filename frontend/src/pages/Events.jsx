import React, { useEffect, useState } from 'react';
import { Card, List, Space, Tag, Select, Typography, Empty, Spin, message, Modal, Button } from 'antd';
import axios from 'axios';
import { EnvironmentOutlined, ClockCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { Option } = Select;

// Configure axios similarly to other pages
axios.defaults.withCredentials = true;
axios.defaults.baseURL = 'http://localhost:8000';

const eventTypeColors = {
  career: '#667eea',
  tour: '#43cea2',
  academic: '#f093fb',
  social: '#feca57',
};

const normalizeShort = (raw) => (raw ? String(raw).toLowerCase().trim() : null);

const toISODate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const computeScheduleConflictLocal = (ev, schedule) => {
  try {
    const evStartRaw = ev.startsOn_dt || ev.startsOn || ev.startDate || ev.start;
    if (!evStartRaw) return false;
    const evStart = new Date(evStartRaw);
    if (isNaN(evStart.getTime())) return false;

    const evEndRaw = ev.endsOn_dt || ev.endsOn || ev.endDate || ev.end;
    const evEnd = evEndRaw ? new Date(evEndRaw) : new Date(evStart.getTime() + 60 * 60 * 1000);

    const evDateStr = toISODate(evStart);
    if (Array.isArray(schedule.dates) && schedule.dates.length >= 2) {
      const sdStr = String(schedule.dates[0]);
      const edStr = String(schedule.dates[1]);
      if (sdStr) {
        if (evDateStr < sdStr) return false;
      }
      if (edStr) {
        if (evDateStr > edStr) return false;
      }
    }

    if (Array.isArray(schedule.days) && schedule.days.length > 0) {
      const dowNum = evStart.getDay();
      const dowMap = ['sun','mon','tue','wed','thu','fri','sat'];
      const evDow = dowMap[dowNum];
      const okDay = schedule.days.some(d => {
        if (!d) return false;
        const nd = String(d).toLowerCase().slice(0,3);
        return nd === evDow;
      });
      if (!okDay) return false;
    }

    if (Array.isArray(schedule.time) && schedule.time.length >= 2) {
      const toMinutes = (s) => {
        if (!s) return null;
        const parts = String(s).split(':');
        const hh = Number(parts[0] || 0);
        const mm = Number(parts[1] || 0);
        if (isNaN(hh) || isNaN(mm)) return null;
        return hh * 60 + mm;
      };
      const schedStart = toMinutes(schedule.time[0]);
      const schedEnd = toMinutes(schedule.time[1]);
      if (schedStart == null || schedEnd == null) return false;

      const evStartMinutes = evStart.getHours() * 60 + evStart.getMinutes();
      const evEndMinutes = evEnd.getHours() * 60 + evEnd.getMinutes();

      const overlap = (evStartMinutes < schedEnd) && (schedStart < evEndMinutes);
      if (!overlap) return false;
    }

    return true;
  } catch (e) {
    console.error('computeScheduleConflictLocal error', e);
    return false;
  }
};

const EventsPage = () => {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [mapEvents, setMapEvents] = useState([]);
  const [shortMap, setShortMap] = useState({}); // shortName -> display name
  const [selectedShort, setSelectedShort] = useState(''); // '' = all
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [sanitizedDescription, setSanitizedDescription] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registrationId, setRegistrationId] = useState(null);
  const [classSchedules, setClassSchedules] = useState([]);
  const [scheduleChecked, setScheduleChecked] = useState(false);
  const [scheduleConflict, setScheduleConflict] = useState(null);

  // Sanitize description when modal opens
  useEffect(() => {
    let mounted = true;
    const sanitizeFallback = (html) => {
      if (!html) return '';
      let s = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
      s = s.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '');
      s = s.replace(/\son\w+\s*=\s*(["']).*?\1/gi, '');
      s = s.replace(/href\s*=\s*(["'])javascript:[^\1]*\1/gi, '');
      return s;
    };

    const doSanitize = async () => {
      if (!selectedEvent) {
        if (mounted) setSanitizedDescription('');
        return;
      }
      const raw = selectedEvent.description || selectedEvent.body || selectedEvent.details || selectedEvent.summary || '';
      try {
        const mod = await import('dompurify');
        const DOMPurify = mod.default || mod;
        const clean = DOMPurify.sanitize(raw, { ALLOWED_TAGS: false });
        if (mounted) setSanitizedDescription(clean || '');
      } catch (err) {
        if (mounted) setSanitizedDescription(sanitizeFallback(raw));
      }
    };

    if (eventModalVisible) doSanitize();
    return () => { mounted = false; };
  }, [selectedEvent, eventModalVisible]);

  // When modal opens, check auth, registration and schedules
  useEffect(() => {
    let mounted = true;
    const checkAll = async () => {
      if (!eventModalVisible || !selectedEvent || !selectedEvent.id) {
        if (mounted) {
          setIsRegistered(false);
          setIsAuthenticated(null);
          setScheduleChecked(false);
          setScheduleConflict(null);
        }
        return;
      }

      setIsAuthenticated(null);
      try {
        const meRes = await axios.get('/me');
        if (meRes && meRes.status === 200) {
          if (!mounted) return;
          setIsAuthenticated(true);
        } else {
          if (!mounted) return;
          setIsAuthenticated(false);
          setIsRegistered(false);
          setRegistrationId(null);
          return;
        }
      } catch (authErr) {
        if (!mounted) return;
        setIsAuthenticated(false);
        setIsRegistered(false);
        setRegistrationId(null);
        return;
      }

      try {
        const res = await axios.get(`/events/${selectedEvent.id}/is_registered`);
        if (!mounted) return;
        const registered = Boolean(res.data && res.data.registered);
        setIsRegistered(registered);
        setRegistrationId(null);
        if (registered) {
          try {
            const regs = await axios.get('/registrations');
            const list = Array.isArray(regs.data) ? regs.data : [];
            const match = list.find(r => {
              const ev = r.event || {};
              if (ev.id && selectedEvent.id && String(ev.id) === String(selectedEvent.id)) return true;
              if (ev._id && selectedEvent.id && String(ev._id) === String(selectedEvent.id)) return true;
              if ((ev.title || ev.name) && (selectedEvent.title || selectedEvent.name) && String(ev.title || ev.name) === String(selectedEvent.title || selectedEvent.name)) return true;
              return false;
            });
            if (match) setRegistrationId(match.registration_id || match.registrationId || match.id || null);
          } catch (err) {
            // ignore
          }
        }
      } catch (err) {
        if (mounted) setIsRegistered(false);
      }

      // fetch schedules and compute conflicts
      try {
        setScheduleChecked(false);
        setScheduleConflict(null);
        const schedRes = await axios.get('/class_schedule');
        const schedules = Array.isArray(schedRes.data) ? schedRes.data : [];
        if (!mounted) return;
        setClassSchedules(schedules || []);
        const matches = (schedules || []).filter(s => computeScheduleConflictLocal(selectedEvent, s));
        if (matches.length > 0) {
          setScheduleConflict({ conflict: true, matches: matches.map(s => ({ course: s.course, name: s.name })) });
        } else {
          setScheduleConflict({ conflict: false, matches: [] });
        }
        setScheduleChecked(true);
      } catch (schErr) {
        if (mounted) {
          setScheduleChecked(true);
          setScheduleConflict(null);
        }
      }
    };

    checkAll();
    return () => { mounted = false; };
  }, [selectedEvent, eventModalVisible]);

  useEffect(() => {
    let mounted = true;

    const loadEvents = async () => {
      try {
        const res = await axios.get('/events?limit=500');
        const list = Array.isArray(res.data) ? res.data : [];
        const normalized = list.map(ev => {
          const rawShort = ev.shortLocation || ev.short_location || ev.shortLoc || ev.short || ev.location_short || (ev.event_snapshot && (ev.event_snapshot.shortLocation || ev.event_snapshot.short_location || ev.event_snapshot.short)) || null;
          return { ...ev, _shortLocNormalized: rawShort ? String(rawShort).toLowerCase().trim() : null, _shortLocRaw: rawShort || null };
        });

        // Build mapping short -> representative display string from the events themselves
        const sMap = {};
        normalized.forEach(ev => {
          if (ev._shortLocNormalized && !sMap[ev._shortLocNormalized]) {
            sMap[ev._shortLocNormalized] = ev._shortLocRaw || ev.location || ev.venue || ev.title || ev.name || ev._shortLocNormalized;
          }
        });

        if (mounted) {
          setMapEvents(normalized);
          setEvents(normalized);
          setShortMap(sMap);
        }
      } catch (err) {
        console.error('Failed to load events for Events page', err);
        message.error('Failed to load events');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadEvents();
    return () => { mounted = false; };
  }, []);

  const startOfToday = () => {
    const d = new Date();
    d.setHours(0,0,0,0);
    return d.getTime();
  };

  const filtered = (mapEvents || []).filter(ev => {
    try {
      const startRaw = ev.startsOn_dt || ev.startsOn || ev.startDate || ev.start;
      if (!startRaw) return false;
      const t = Date.parse(startRaw);
      if (isNaN(t)) return false;
      if (t < startOfToday()) return false;
      if (selectedShort && selectedShort !== '') {
        return ev._shortLocNormalized === selectedShort;
      }
      return true;
    } catch (e) { return false; }
  });

  const shortOptions = [
    { value: '', label: 'All' },
    ...Array.from(new Set((mapEvents || []).map(ev => ev._shortLocNormalized).filter(Boolean))).map(s => ({ value: s, label: shortMap[s] || s }))
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Events</h2>
        <div style={{ minWidth: 220 }}>
          <Select
            value={selectedShort}
            onChange={(val) => setSelectedShort(val)}
            options={shortOptions}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <Card style={{ borderRadius: 12 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>
        ) : filtered.length > 0 ? (
          <List
            dataSource={filtered}
            renderItem={ev => {
              const title = ev.title || ev.name || ev.displayName || 'Event';
              const location = ev.location || ev.locationName || ev.venue || '';
              const type = ev.type || (ev.categories && ev.categories[0]) || 'other';
              const color = eventTypeColors[type] || '#43cea2';
              const startText = (() => { try { return new Date(ev.startsOn_dt || ev.startsOn || ev.startDate || ev.start).toLocaleString(); } catch { return ''; } })();
              return (
                <Card
                  key={ev.id || ev._id || Math.random()}
                  hoverable
                  style={{
                    marginBottom: 12,
                    borderRadius: 12,
                    border: '1px solid #f0f0f0',
                    transition: 'all 0.3s ease',
                    background: 'white',
                  }}
                >
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong style={{ fontSize: 16 }}>{title}</Text>
                      <Tag color={color} style={{ borderRadius: 12 }}>{type}</Tag>
                    </div>

                    <Space>
                      <EnvironmentOutlined style={{ color: '#43cea2' }} />
                      <Text type="secondary">{location}</Text>
                    </Space>

                    <Space>
                      <ClockCircleOutlined style={{ color: '#667eea' }} />
                      <Text type="secondary">{startText}</Text>
                    </Space>

                    {ev._shortLocNormalized ? (
                      <div>
                        <Tag style={{ margin: 0, borderRadius: 8 }}>{ev._shortLocNormalized}</Tag>
                      </div>
                    ) : null}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                      <Button type="link" onClick={async () => {
                        setSelectedEvent(ev);
                        setEventModalVisible(true);
                        // start loading modal data (sanitization, auth, schedule check)
                      }} style={{ padding: 0 }}>
                        View Details →
                      </Button>
                    </div>
                  </Space>
                </Card>
              );
            }}
          />
        ) : (
          <div style={{ padding: 40 }}>
            <Empty description={<Space direction="vertical"><Text>No events found</Text><Text type="secondary">Try another filter</Text></Space>} />
          </div>
        )}
      </Card>

      {/* Event Details Modal */}
      <Modal
        title={selectedEvent ? (selectedEvent.title || selectedEvent.name || 'Event Details') : 'Event Details'}
        open={eventModalVisible}
        onCancel={() => { setEventModalVisible(false); setSelectedEvent(null); }}
        footer={null}
        centered
      >
        {selectedEvent ? (
          <div>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <div>
                <Tag color={eventTypeColors[selectedEvent.type] || 'blue'}>{selectedEvent.type || (selectedEvent.categories && selectedEvent.categories[0]) || 'event'}</Tag>
                <Text type="secondary" style={{ marginLeft: 8 }}>{selectedEvent.location || selectedEvent.locationName || ''}</Text>
              </div>

              <div>
                <div>
                  <Text strong>Starts: </Text>
                  <Text type="secondary">{(() => { try { return new Date(selectedEvent.startsOn_dt || selectedEvent.startsOn || selectedEvent.startDate || selectedEvent.start).toLocaleString(); } catch { return '—'; } })()}</Text>
                </div>
                {selectedEvent.endsOn_dt || selectedEvent.endsOn || selectedEvent.endDate || selectedEvent.end ? (
                  <div style={{ marginTop: 6 }}>
                    <Text strong>Ends: </Text>
                    <Text type="secondary">{(() => { try { return new Date(selectedEvent.endsOn_dt || selectedEvent.endsOn || selectedEvent.endDate || selectedEvent.end).toLocaleString(); } catch { return '—'; } })()}</Text>
                  </div>
                ) : null}
                <div style={{ marginTop: 8 }}>
                  {scheduleChecked ? (
                    scheduleConflict ? (
                      scheduleConflict.conflict ? (
                        <div>
                          <Tag color="red">Conflict</Tag>
                          <div style={{ marginTop: 6 }}>
                            {scheduleConflict.matches && scheduleConflict.matches.length > 0 ? (
                              scheduleConflict.matches.map((m, idx) => (
                                <div key={idx} style={{ fontSize: 13 }}>
                                  <Text type="danger">{m.course || m.name || 'Scheduled class'}</Text>
                                </div>
                              ))
                            ) : (
                              <Text type="danger">Scheduled class</Text>
                            )}
                          </div>
                        </div>
                      ) : (
                        <Tag color="green">No Conflict</Tag>
                      )
                    ) : (
                      <Text type="secondary">Schedule check unavailable</Text>
                    )
                  ) : (
                    <Spin size="small" />
                  )}
                </div>
              </div>

              <div>
                {sanitizedDescription ? (
                  <div dangerouslySetInnerHTML={{ __html: sanitizedDescription }} />
                ) : (
                  <Text>No description available.</Text>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button onClick={() => { setEventModalVisible(false); setSelectedEvent(null); }}>Close</Button>
                {isAuthenticated !== true ? (
                  <Button disabled>Login to register</Button>
                ) : !isRegistered ? (
                  <Button
                    type="primary"
                    loading={registerLoading}
                    onClick={async () => {
                      if (!selectedEvent || !selectedEvent.id) return;
                      setRegisterLoading(true);
                      try {
                        const resp = await axios.post(`/events/${selectedEvent.id}/register`);
                        setIsRegistered(true);
                        const newId = resp?.data?.id || resp?.data?.registration_id || null;
                        if (newId) setRegistrationId(newId);
                        message.success('You are registered for this event');
                        try { window.dispatchEvent(new Event('registrations-changed')); } catch (e) { }
                      } catch (err) {
                        const status = err?.response?.status;
                        if (status === 401) {
                          setIsAuthenticated(false);
                          message.info('Please log in to register for events');
                        } else {
                          console.error('Registration error', err);
                          message.error('Could not register for event');
                        }
                      } finally {
                        setRegisterLoading(false);
                      }

                      const url = selectedEvent.registrationUrl || selectedEvent.registerUrl || selectedEvent.registration || selectedEvent.signupUrl || selectedEvent.url || selectedEvent.link || null;
                      if (url) window.open(url, '_blank');
                    }}
                  >
                    Register
                  </Button>
                ) : (
                  <Button danger loading={false} onClick={async () => {
                    // best-effort unregister: try to delete by registrationId, else fetch registrations and delete
                    try {
                      if (registrationId) {
                        await axios.delete(`${axios.defaults.baseURL}/registrations/${registrationId}`);
                        setIsRegistered(false);
                        setRegistrationId(null);
                        setEventModalVisible(false);
                        message.success('Unregistered');
                        return;
                      }
                      const regsRes = await axios.get('/registrations');
                      const list = Array.isArray(regsRes.data) ? regsRes.data : [];
                      const match = list.find(r => {
                        const ev = r.event || {};
                        if (ev.id && selectedEvent.id && String(ev.id) === String(selectedEvent.id)) return true;
                        if (ev._id && selectedEvent.id && String(ev._id) === String(selectedEvent.id)) return true;
                        if ((ev.title || ev.name) && (selectedEvent.title || selectedEvent.name) && String(ev.title || ev.name) === String(selectedEvent.title || selectedEvent.name)) return true;
                        return false;
                      });
                      if (match) {
                        const idToDelete = match.registration_id || match.registrationId || match.id;
                        if (idToDelete) {
                          await axios.delete(`${axios.defaults.baseURL}/registrations/${idToDelete}`);
                          setIsRegistered(false);
                          setRegistrationId(null);
                          setEventModalVisible(false);
                          message.success('Unregistered');
                          try { window.dispatchEvent(new Event('registrations-changed')); } catch (e) { }
                          return;
                        }
                      }
                      message.error('Registration not found');
                    } catch (err) {
                      console.error('Unregister error', err);
                      message.error('Failed to unregister');
                    }
                  }}>Unregister</Button>
                )}
              </div>
            </Space>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default EventsPage;

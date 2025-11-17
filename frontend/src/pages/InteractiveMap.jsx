
import React, { useState, useEffect, useRef } from 'react';
import { Layout, Card, Typography, Input, List, Space, Tag, Button, Empty, Modal, Form, InputNumber, message, Spin, AutoComplete, Divider, Popconfirm } from 'antd';
import { EnvironmentOutlined, ClockCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import 'antd/dist/reset.css';
import Map from '../components/Map';
import axios from 'axios';
const API_BASE = 'http://localhost:8000';
// Ensure cookies are sent for auth-protected endpoints (login cookie)
axios.defaults.withCredentials = true;
// make axios use the same backend origin for all relative calls
axios.defaults.baseURL = API_BASE;
import { getRouteCoordinates, calculateBounds } from '../services/routeService';

const { Sider, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

// (placeholder removed) We'll fetch events from backend

const eventTypeColors = {
  career: '#667eea',
  tour: '#43cea2',
  academic: '#f093fb',
  social: '#feca57',
};

function InteractiveMap() {
  const [siderWidth, setSiderWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      // make the right panel 5% bigger by reducing the left sider from 75% -> 70%
      return Math.max(150, Math.floor(window.innerWidth * 0.70));
    }
    return 600;
  });
  
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [sanitizedDescription, setSanitizedDescription] = useState('');
  const [routeCoordinates, setRouteCoordinates] = useState(null);
  const [routeModalVisible, setRouteModalVisible] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [form] = Form.useForm();

  // Direction search state
  const [originLat, setOriginLat] = useState(null);
  const [originLng, setOriginLng] = useState(null);
  const [hasGeolocation, setHasGeolocation] = useState(false);
  const [toSearchValue, setToSearchValue] = useState('');
  const [toSearchOptions, setToSearchOptions] = useState([]);
  const [fromSearchValue, setFromSearchValue] = useState('');
  const [fromSearchOptions, setFromSearchOptions] = useState([]);
  const [manualFromBuilding, setManualFromBuilding] = useState(null);
  const [directionLoading, setDirectionLoading] = useState(false);
  const [allBuildings, setAllBuildings] = useState([]);
  const [events, setEvents] = useState([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registrationId, setRegistrationId] = useState(null);
  // null = unknown/pending, true = authenticated, false = not authenticated
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [unregistering, setUnregistering] = useState(false);

  const locationAnnouncedRef = useRef(false);

  // Load buildings and get geolocation on mount
  useEffect(() => {
    // Load buildings from JSON file
    const loadBuildings = async () => {
      const { getBuildingsList } = await import('../services/buildingService');
      const buildings = await getBuildingsList();
      setAllBuildings(buildings);
    };
    
    loadBuildings();
    // Disable automatic geolocation for now — require manual From selection
    setHasGeolocation(false);

    // Track whether we've already announced automatic detection (uses outer ref)

    // Listen for user location events dispatched by Map component
    const onUserLocation = (e) => {
      const d = e.detail || {};
      if (d.lat && d.lng) {
        setOriginLat(d.lat);
        setOriginLng(d.lng);
        setHasGeolocation(true);
        setFromSearchValue('My Location');
        if (!locationAnnouncedRef.current) {
          message.info('Current location detected and set as origin');
          locationAnnouncedRef.current = true;
        }
      }
    };

    const onSetOrigin = (e) => {
      const d = e.detail || {};
      if (d.lat && d.lng) {
        setOriginLat(d.lat);
        setOriginLng(d.lng);
        setHasGeolocation(true);
        setFromSearchValue('My Location');
        message.success('Origin set to your current location');
      }
    };

    window.addEventListener('user-location-available', onUserLocation);
    window.addEventListener('set-origin-to-user-location', onSetOrigin);
    // cleanup
    return () => {
      window.removeEventListener('user-location-available', onUserLocation);
      window.removeEventListener('set-origin-to-user-location', onSetOrigin);
    };
  }, []);

  // Fetch upcoming events from backend (ends after now)
  useEffect(() => {
    let mounted = true;
    const loadEvents = async () => {
      try {
        // Fetch today's events (include all events that occur any time during today)
        const res = await axios.get('/events?when=today&limit=50');
        if (!mounted) return;
        setEvents(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Failed to load events from backend:', err);
        // leave events as empty array (UI will show empty state)
      }
    };
    loadEvents();
    return () => { mounted = false; };
  }, []);

  // Helpers to normalize event fields with safe fallbacks
  const getEventTitle = (ev) => ev.title || ev.name || ev.displayName || 'Event';
  const getEventLocation = (ev) => ev.location || ev.locationName || ev.venue || ev.place || '';
  const getEventType = (ev) => ev.type || (ev.categories && ev.categories[0]) || 'other';
  const getEventAttendees = (ev) => ev.attendees || ev.attendance || ev.rsvpCount || ev.attendanceCount || 0;
  const getEventDateText = (ev) => {
    const start = ev.startsOn_dt || ev.startsOn || ev.startDate || ev.start;
    if (!start) return '';
    try {
      const d = new Date(start);
      return d.toLocaleString();
    } catch (e) {
      return String(start);
    }
  };
  const getEventEndDateText = (ev) => {
    const end = ev.endsOn_dt || ev.endsOn || ev.endDate || ev.end;
    if (!end) return '';
    try {
      const d = new Date(end);
      return d.toLocaleString();
    } catch (e) {
      return String(end);
    }
  };

  const getEventDescription = (ev) => ev.description || ev.body || ev.details || ev.summary || '';
  const getEventOrganizations = (ev) => {
    // Support multiple possible shapes: organizations, organizationNames, hosts, sponsors, org, organization
    if (!ev) return [];
    if (ev.organizationNames && Array.isArray(ev.organizationNames)) return ev.organizationNames;
    if (ev.organizationNames && typeof ev.organizationNames === 'string') return [ev.organizationNames];
    if (ev.organizations && Array.isArray(ev.organizations)) return ev.organizations;
    if (ev.organization) return Array.isArray(ev.organization) ? ev.organization : [ev.organization];
    if (ev.hosts) return Array.isArray(ev.hosts) ? ev.hosts : [ev.hosts];
    if (ev.sponsors) return Array.isArray(ev.sponsors) ? ev.sponsors : [ev.sponsors];
    if (ev.org) return Array.isArray(ev.org) ? ev.org : [ev.org];
    return [];
  };
  const getEventRegistrationUrl = (ev) => ev.registrationUrl || ev.registerUrl || ev.registration || ev.signupUrl || ev.url || ev.link || null;

  const getOrgDisplayName = (o) => {
    if (!o) return '';
    if (typeof o === 'string') return o;
    if (o.name) return o.name;
    if (o.organizationName) return o.organizationName;
    if (o.displayName) return o.displayName;
    if (o.orgName) return o.orgName;
    if (o.title) return o.title;
    // Last resort: stringify
    try {
      return JSON.stringify(o);
    } catch (e) {
      return String(o);
    }
  };

  // Sanitize HTML descriptions. Prefer `dompurify` if available, otherwise use a conservative fallback.
  useEffect(() => {
    let mounted = true;
    const sanitizeFallback = (html) => {
      if (!html) return '';
      // Remove script/style tags
      let s = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
      s = s.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '');
      // Remove on* attributes (onclick, onerror, etc.)
      s = s.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '');
      // Neutralize javascript: URLs
      s = s.replace(/href\s*=\s*(['"])javascript:[^\1]*\1/gi, '');
      return s;
    };

    const doSanitize = async () => {
      if (!selectedEvent) {
        if (mounted) setSanitizedDescription('');
        return;
      }
      const raw = getEventDescription(selectedEvent) || '';
      try {
        // try to dynamically import DOMPurify (dev may not have it installed)
        const mod = await import('dompurify');
        const DOMPurify = mod.default || mod;
        const clean = DOMPurify.sanitize(raw, { ALLOWED_TAGS: false });
        if (mounted) setSanitizedDescription(clean || '');
      } catch (err) {
        // fallback sanitizer
        if (mounted) setSanitizedDescription(sanitizeFallback(raw));
      }
    };

    // Only sanitize when modal is visible or selected changes
    if (eventModalVisible) doSanitize();
    return () => { mounted = false; };
  }, [selectedEvent, eventModalVisible]);

  const handleUnregisterFromModal = async () => {
    setUnregistering(true);
    try {
      const doDelete = async (id) => {
        const resp = await fetch(`${API_BASE}/registrations/${id}`, { method: 'DELETE', credentials: 'include' });
        if (resp.status === 401) {
          setIsAuthenticated(false);
          const txt = await resp.text().catch(() => 'Unauthorized');
          throw new Error(txt || 'Unauthorized');
        }
        if (!resp.ok) {
          const txt = await resp.text().catch(() => resp.statusText || 'Delete failed');
          throw new Error(`${resp.status} ${resp.statusText} - ${txt}`);
        }
        return true;
      };

      if (!registrationId) {
        // try best-effort: fetch registrations and find id
        try {
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
            if (!idToDelete) throw new Error('Registration id not found');
            await doDelete(idToDelete);
            setIsRegistered(false);
            setRegistrationId(null);
            setEventModalVisible(false);
            message.success('Unregistered from event');
            return;
          }
        } catch (err) {
          console.error('Unregister failed', err);
          message.error(err?.message || 'Failed to unregister');
          return;
        }
        message.error('Registration not found');
        return;
      }

      // have registrationId
      try {
        await doDelete(registrationId);
        setIsRegistered(false);
        setRegistrationId(null);
        setEventModalVisible(false);
        message.success('Unregistered from event');
      } catch (err) {
        console.error('Unregister error', err);
        message.error(err?.message || 'Failed to unregister');
      }
    } finally {
      setUnregistering(false);
    }
  };

  // When the event modal opens, check whether the current user is registered for the event.
  useEffect(() => {
    let mounted = true;
    const checkRegistered = async () => {
      if (!eventModalVisible || !selectedEvent || !selectedEvent.id) {
        if (mounted) setIsRegistered(false);
        return;
      }
        // First verify authentication by calling /me. If unauthenticated, do not show register/unregister.
        setIsAuthenticated(null); // pending
        try {
          const meRes = await axios.get('/me');
          console.debug('InteractiveMap: GET /me ->', meRes?.status, meRes?.data);
          if (meRes && meRes.status === 200) {
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
            setIsRegistered(false);
            setRegistrationId(null);
            return;
          }
        } catch (authErr) {
          console.debug('InteractiveMap: GET /me failed ->', authErr?.response?.status, authErr?.response?.data);
          setIsAuthenticated(false);
          setIsRegistered(false);
          setRegistrationId(null);
          return;
        }

        try {
          const res = await axios.get(`/events/${selectedEvent.id}/is_registered`);
          console.debug(`InteractiveMap: GET /events/${selectedEvent.id}/is_registered ->`, res?.status, res?.data);
          if (!mounted) return;
          const registered = Boolean(res.data && res.data.registered);
          setIsRegistered(registered);
          setRegistrationId(null);
          // If registered, attempt to fetch registration id by listing registrations
          if (registered) {
            try {
              const regs = await axios.get(`${API_BASE}/registrations`);
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
              // ignore; registration id optional
            }
          }
        } catch (err) {
          if (mounted) setIsRegistered(false);
        }
    };
    checkRegistered();
    return () => { mounted = false; };
  }, [selectedEvent, eventModalVisible]);

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

  const filteredEvents = events;

  // Handle "To" search for destination building
  const handleToSearch = (value) => {
    setToSearchValue(value);
    if (allBuildings.length === 0) {
      setToSearchOptions([]);
      return;
    }
    if (!value || value.trim() === '') {
      setToSearchOptions([]);
      return;
    }
    const q = value.toLowerCase();
    const results = allBuildings.filter(b => b.name.toLowerCase().includes(q)).slice(0, 10);
    const options = results.map(b => ({ value: b.name, label: b.name }));
    setToSearchOptions(options);
  };

  // Handle "From" search for origin building (if geolocation disabled)
  const handleFromSearch = (value) => {
    if (hasGeolocation) return; // Don't allow search if geolocation is enabled
    setFromSearchValue(value);
    if (allBuildings.length === 0) {
      setFromSearchOptions([]);
      return;
    }
    if (!value || value.trim() === '') {
      setFromSearchOptions([]);
      return;
    }
    const q = value.toLowerCase();
    const results = allBuildings.filter(b => b.name.toLowerCase().includes(q)).slice(0, 10);
    const options = results.map(b => ({ value: b.name, label: b.name }));
    setFromSearchOptions(options);
  };

  // Handle selecting a destination building
  const handleSelectDestination = async (buildingName) => {
    setToSearchValue(buildingName);
    setToSearchOptions([]);

    // Try exact match first, then case-insensitive, then substring
    let dest = allBuildings.find(b => b.name === buildingName);
    if (!dest) dest = allBuildings.find(b => b.name.toLowerCase() === buildingName.toLowerCase());
    if (!dest) dest = allBuildings.find(b => b.name.toLowerCase().includes(buildingName.toLowerCase()));
    if (!dest) {
      message.error('Selected destination not found');
      return;
    }

    // Determine origin
    let fromLat = originLat;
    let fromLng = originLng;

    if (!hasGeolocation) {
      if (!manualFromBuilding) {
        message.error('Please select your location (From)');
        return;
      }
      fromLat = manualFromBuilding.lat;
      fromLng = manualFromBuilding.lng;
    }

    if (!fromLat || !fromLng) {
      message.error('Could not determine origin location');
      return;
    }

    // Ensure numeric coords
    const oLat = Number(fromLat);
    const oLng = Number(fromLng);
    const dLat = Number(dest.lat);
    const dLng = Number(dest.lng);

    if (!isFinite(oLat) || !isFinite(oLng) || !isFinite(dLat) || !isFinite(dLng)) {
      message.error('Invalid coordinates for origin or destination');
      return;
    }

    // Fetch walking route
    setDirectionLoading(true);
    try {
      const coordinates = await getRouteCoordinates(oLat, oLng, dLat, dLng, 'walking');
      setRouteCoordinates(coordinates);
      message.success(`Route to ${dest.name} calculated!`);
    } catch (error) {
      console.error('Route fetch error:', error);
      // Fallback: draw straight-line polyline if backend fails
      setRouteCoordinates([[oLat, oLng], [dLat, dLng]]);
      const serverMsg = error?.response?.data?.detail || error?.message || 'Unknown error';
      message.warning(`Could not fetch directions (${serverMsg}). Showing straight-line path instead.`);
    } finally {
      setDirectionLoading(false);
    }
  };

  // Handle selecting a from building (manual origin)
  const handleSelectFrom = (buildingName) => {
    setFromSearchValue(buildingName);
    // Try exact match first, then case-insensitive, then substring
    let b = allBuildings.find(x => x.name === buildingName);
    if (!b) b = allBuildings.find(x => x.name.toLowerCase() === buildingName.toLowerCase());
    if (!b) b = allBuildings.find(x => x.name.toLowerCase().includes(buildingName.toLowerCase()));
    setManualFromBuilding(b || null);
    setFromSearchOptions([]);
  };

  const handleCalculateRoute = async (values) => {
    setRouteLoading(true);
    try {
      const { originLat, originLng, destLat, destLng } = values;
      const coordinates = await getRouteCoordinates(originLat, originLng, destLat, destLng);
      
      setRouteCoordinates(coordinates);
      setRouteModalVisible(false);
      message.success('Route calculated successfully!');
      form.resetFields();
    } catch (error) {
      message.error(`Failed to calculate route: ${error.message}`);
    } finally {
      setRouteLoading(false);
    }
  };

  const handleClearRoute = () => {
    setRouteCoordinates(null);
    message.info('Route cleared');
  };

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
            {/* zoom controls moved into Map component for placement under location button */}
            
            <Map
              routeCoordinates={routeCoordinates}
              onRouteChange={setRouteCoordinates}
              directionsProps={{
                hasGeolocation,
                fromSearchValue,
                fromSearchOptions,
                toSearchValue,
                toSearchOptions,
                handleFromSearch,
                handleToSearch,
                handleSelectFrom,
                handleSelectDestination,
                directionLoading,
                manualFromBuilding,
                setManualFromBuilding,
              }}
            />
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
          {/* (Search bar removed from events panel) */}

          {/* Events List */}
          <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: 20,
          }}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              {/* Directions Search Box moved into map overlay */}

              <Divider style={{ margin: '8px 0' }} />

              {/* Events List */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
              }}>
                <Title level={4} style={{ marginBottom: 0 }}>
                  📅 Today's Events
                </Title>
                <Tag color="blue">{filteredEvents.length} events</Tag>
              </div>

              {filteredEvents.length > 0 ? (
                <List
                  dataSource={filteredEvents}
                  renderItem={(event) => {
                    const title = getEventTitle(event);
                    const location = getEventLocation(event);
                    const type = getEventType(event);
                    const attendees = getEventAttendees(event);
                    const dateText = getEventDateText(event);
                    const endText = getEventEndDateText(event);
                    const color = eventTypeColors[type] || '#43cea2';
                    return (
                      <Card
                        hoverable
                        onClick={() => setSelectedEvent(event)}
                        style={{
                          marginBottom: 12,
                          borderRadius: 12,
                          border: selectedEvent?.id === event.id 
                            ? `2px solid ${color}` 
                            : '1px solid #f0f0f0',
                          transition: 'all 0.3s ease',
                          background: selectedEvent?.id === event.id 
                            ? `${color}05`
                            : 'white',
                        }}
                      >
                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text strong style={{ fontSize: 16 }}>{title}</Text>
                            <Tag 
                              color={color}
                              style={{ borderRadius: 12 }}
                            >
                              {type}
                            </Tag>
                          </div>
                          
                          <Space>
                            <EnvironmentOutlined style={{ color: '#43cea2' }} />
                            <Text type="secondary">{location}</Text>
                          </Space>
                          
                          <Space>
                            <ClockCircleOutlined style={{ color: '#667eea' }} />
                            <Text type="secondary">{dateText}</Text>
                          </Space>

                          {endText ? (
                            <Space>
                              <ClockCircleOutlined style={{ color: '#667eea' }} />
                              <Text type="secondary">Ends: {endText}</Text>
                            </Space>
                          ) : null}

                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: 8,
                            paddingTop: 8,
                            borderTop: '1px solid #f0f0f0',
                          }}>
                            <Space size={4}>
                              {/* Attendee count removed per request */}
                            </Space>
                              <Button 
                                type="link" 
                                size="small"
                                onClick={() => { setSelectedEvent(event); setEventModalVisible(true); }}
                                style={{ 
                                  color: color,
                                  padding: 0,
                                }}
                              >
                                View Details →
                              </Button>
                          </div>
                        </Space>
                      </Card>
                    );
                  }}
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

      

      {/* Route Calculation Modal */}
      <Modal
        title="Calculate Route"
        open={routeModalVisible}
        onCancel={() => setRouteModalVisible(false)}
        footer={null}
        centered
      >
        <Spin spinning={routeLoading}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCalculateRoute}
          >
            <Form.Item
              label="Origin Latitude"
              name="originLat"
              rules={[
                { required: true, message: 'Origin latitude is required' },
                { type: 'number', min: -90, max: 90, message: 'Latitude must be between -90 and 90' }
              ]}
              tooltip="Enter latitude between -90 and 90"
            >
              <InputNumber style={{ width: '100%' }} placeholder="e.g., 27.7136" step={0.0001} />
            </Form.Item>

            <Form.Item
              label="Origin Longitude"
              name="originLng"
              rules={[
                { required: true, message: 'Origin longitude is required' },
                { type: 'number', min: -180, max: 180, message: 'Longitude must be between -180 and 180' }
              ]}
              tooltip="Enter longitude between -180 and 180"
            >
              <InputNumber style={{ width: '100%' }} placeholder="e.g., -97.3252" step={0.0001} />
            </Form.Item>

            <Form.Item
              label="Destination Latitude"
              name="destLat"
              rules={[
                { required: true, message: 'Destination latitude is required' },
                { type: 'number', min: -90, max: 90, message: 'Latitude must be between -90 and 90' }
              ]}
              tooltip="Enter latitude between -90 and 90"
            >
              <InputNumber style={{ width: '100%' }} placeholder="e.g., 27.7200" step={0.0001} />
            </Form.Item>

            <Form.Item
              label="Destination Longitude"
              name="destLng"
              rules={[
                { required: true, message: 'Destination longitude is required' },
                { type: 'number', min: -180, max: 180, message: 'Longitude must be between -180 and 180' }
              ]}
              tooltip="Enter longitude between -180 and 180"
            >
              <InputNumber style={{ width: '100%' }} placeholder="e.g., -97.3100" step={0.0001} />
            </Form.Item>

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                block 
                loading={routeLoading}
                style={{
                  background: '#667eea',
                  borderRadius: 8,
                  border: 'none',
                }}
              >
                Calculate Route
              </Button>
            </Form.Item>
          </Form>
        </Spin>
      </Modal>

      {/* Event Details Modal */}
      <Modal
        title={selectedEvent ? getEventTitle(selectedEvent) : 'Event Details'}
        open={eventModalVisible}
        onCancel={() => setEventModalVisible(false)}
        footer={null}
        centered
      >
        {selectedEvent ? (
          <div>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ marginTop: 6 }}>
                      <Tag color={eventTypeColors[getEventType(selectedEvent)] || 'blue'}>{getEventType(selectedEvent)}</Tag>
                      <Text type="secondary" style={{ marginLeft: 8 }}>{getEventLocation(selectedEvent)}</Text>
                    </div>
                  </div>
              </div>

              <div>
                <div>
                  <Text strong>Starts: </Text>
                  <Text type="secondary">{getEventDateText(selectedEvent) || '—'}</Text>
                </div>
                {getEventEndDateText(selectedEvent) ? (
                  <div style={{ marginTop: 6 }}>
                    <Text strong>Ends: </Text>
                    <Text type="secondary">{getEventEndDateText(selectedEvent)}</Text>
                  </div>
                ) : null}
              </div>

              <div>
                {sanitizedDescription ? (
                  <div dangerouslySetInnerHTML={{ __html: sanitizedDescription }} />
                ) : (
                  <Text>No description available.</Text>
                )}
              </div>

              {getEventOrganizations(selectedEvent).length > 0 && (
                <div>
                  <Text strong>Organizations:</Text>
                  <div style={{ marginTop: 8 }}>
                    {getEventOrganizations(selectedEvent).map((o, idx) => (
                      <Tag key={idx} style={{ marginBottom: 6 }}>{getOrgDisplayName(o)}</Tag>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button onClick={() => { setEventModalVisible(false); }}>
                  Close
                </Button>
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
                        // attempt to save registration server-side (requires auth)
                        const resp = await axios.post(`/events/${selectedEvent.id}/register`);
                        setIsRegistered(true);
                        const newId = resp?.data?.id || resp?.data?.registration_id || null;
                        if (newId) setRegistrationId(newId);
                        message.success('You are registered for this event');
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

                      // If there's an external registration URL, open it regardless
                      const url = getEventRegistrationUrl(selectedEvent);
                      if (url) window.open(url, '_blank');
                    }}
                  >
                    Register
                  </Button>
                ) : (
                  <Popconfirm
                    title="Unregister from this event?"
                    onConfirm={handleUnregisterFromModal}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button danger loading={unregistering}>Unregister</Button>
                  </Popconfirm>
                )}
              </div>
            </Space>
          </div>
        ) : null}
      </Modal>

      
    </div>
  );
}

export default InteractiveMap;

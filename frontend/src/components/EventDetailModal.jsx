import React, { useEffect, useState } from 'react';
import { Button, Divider, Modal, Popconfirm, Space, Spin, Tag, Typography, message } from 'antd';
import axios from 'axios';
import {
  computeScheduleConflict,
  eventTypeColors,
  getEventAttendees,
  getEventBenefits,
  getEventCategories,
  getEventDateText,
  getEventDescription,
  getEventEndDateText,
  getEventExternalUrl,
  getEventImageUrl,
  getEventLocation,
  getEventOrganizations,
  getEventRegistrationUrl,
  getEventTheme,
  getEventTitle,
  getEventType,
  getOrgDisplayName,
  sanitizeFallback,
} from '../utils/eventHelpers';

const { Text } = Typography;

const EventDetailModal = ({ event, visible, onClose, onRegistrationChange }) => {
  const [sanitizedDescription, setSanitizedDescription] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationId, setRegistrationId] = useState(null);
  const [scheduleChecked, setScheduleChecked] = useState(false);
  const [scheduleConflict, setScheduleConflict] = useState(null);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [unregistering, setUnregistering] = useState(false);

  useEffect(() => {
    let mounted = true;
    const doSanitize = async () => {
      if (!event) {
        if (mounted) setSanitizedDescription('');
        return;
      }
      const raw = getEventDescription(event);
      try {
        const mod = await import('dompurify');
        const DOMPurify = mod.default || mod;
        const clean = DOMPurify.sanitize(raw, { ALLOWED_TAGS: false });
        if (mounted) setSanitizedDescription(clean || '');
      } catch {
        if (mounted) setSanitizedDescription(sanitizeFallback(raw));
      }
    };
    if (visible) doSanitize();
    return () => {
      mounted = false;
    };
  }, [event, visible]);

  useEffect(() => {
    let mounted = true;
    const checkAll = async () => {
      if (!visible || !event || (!event.id && !event._id)) {
        if (mounted) {
          setIsRegistered(false);
          setIsAuthenticated(null);
          setScheduleChecked(false);
          setScheduleConflict(null);
        }
        return;
      }

      setIsAuthenticated(null);
      let authOk = false;
      try {
        const meRes = await axios.get('/me');
        authOk = Boolean(meRes && meRes.status === 200);
        if (mounted) setIsAuthenticated(authOk);
      } catch {
        if (mounted) {
          setIsAuthenticated(false);
          setIsRegistered(false);
          setRegistrationId(null);
        }
      }

      const eventId = event.id || event._id;

      if (authOk) {
        try {
          const res = await axios.get(`/events/${eventId}/is_registered`);
          const registered = Boolean(res.data && res.data.registered);
          if (mounted) {
            setIsRegistered(registered);
            setRegistrationId(null);
          }
          if (registered) {
            try {
              const regs = await axios.get('/registrations');
              const list = Array.isArray(regs.data) ? regs.data : [];
              const match = list.find((r) => {
                const ev = r.event || {};
                return (ev.id && String(ev.id) === String(eventId)) || (ev._id && String(ev._id) === String(eventId));
              });
              if (match && mounted) setRegistrationId(match.registration_id || match.registrationId || match.id || null);
            } catch {
              // best effort
            }
          }
        } catch {
          if (mounted) setIsRegistered(false);
        }
      }

      try {
        if (mounted) {
          setScheduleChecked(false);
          setScheduleConflict(null);
        }
        const schedRes = await axios.get('/class_schedule');
        const schedules = Array.isArray(schedRes.data) ? schedRes.data : [];
        if (!mounted) return;
        const matches = schedules.filter((s) => computeScheduleConflict(event, s));
        setScheduleConflict(matches.length > 0 ? { conflict: true, matches: matches.map((s) => ({ course: s.course, name: s.name })) } : { conflict: false, matches: [] });
        setScheduleChecked(true);
      } catch {
        if (mounted) {
          setScheduleChecked(true);
          setScheduleConflict(null);
        }
      }
    };

    checkAll();
    return () => {
      mounted = false;
    };
  }, [event, visible]);

  const handleRegister = async () => {
    if (!event) return;
    const eventId = event.id || event._id;
    if (!eventId) return;

    setRegisterLoading(true);
    try {
      const resp = await axios.post(`/events/${eventId}/register`);
      setIsRegistered(true);
      const newId = resp?.data?.id || resp?.data?.registration_id || null;
      if (newId) setRegistrationId(newId);
      message.success('You are registered for this event');
      try {
        window.dispatchEvent(new Event('registrations-changed'));
      } catch {
        // noop
      }
      if (onRegistrationChange) onRegistrationChange();
    } catch (err) {
      if (err?.response?.status === 401) {
        setIsAuthenticated(false);
        message.info('Please log in to register for events');
      } else {
        message.error('Could not register for event');
      }
    } finally {
      setRegisterLoading(false);
    }

    const url = getEventRegistrationUrl(event);
    if (url) window.open(url, '_blank');
  };

  const handleUnregister = async () => {
    setUnregistering(true);
    try {
      if (registrationId) {
        await axios.delete(`/registrations/${registrationId}`);
        setIsRegistered(false);
        setRegistrationId(null);
        message.success('Unregistered from event');
        try {
          window.dispatchEvent(new Event('registrations-changed'));
        } catch {
          // noop
        }
        if (onRegistrationChange) onRegistrationChange();
        return;
      }
      const eventId = event.id || event._id;
      const regsRes = await axios.get('/registrations');
      const list = Array.isArray(regsRes.data) ? regsRes.data : [];
      const match = list.find((r) => {
        const ev = r.event || {};
        return (ev.id && String(ev.id) === String(eventId)) || (ev._id && String(ev._id) === String(eventId));
      });
      if (match) {
        const idToDelete = match.registration_id || match.registrationId || match.id;
        if (idToDelete) {
          await axios.delete(`/registrations/${idToDelete}`);
          setIsRegistered(false);
          setRegistrationId(null);
          message.success('Unregistered from event');
          try {
            window.dispatchEvent(new Event('registrations-changed'));
          } catch {
            // noop
          }
          if (onRegistrationChange) onRegistrationChange();
          return;
        }
      }
      message.error('Registration not found');
    } catch {
      message.error('Failed to unregister');
    } finally {
      setUnregistering(false);
    }
  };

  if (!event) return null;

  const eventImage = getEventImageUrl(event);
  const eventUrl = getEventExternalUrl(event);
  const registrationUrl = getEventRegistrationUrl(event);
  const eventTheme = getEventTheme(event);
  const categories = getEventCategories(event);
  const benefits = getEventBenefits(event);
  const attendeeCount = getEventAttendees(event);

  return (
    <Modal title={getEventTitle(event)} open={visible} onCancel={onClose} footer={null} centered>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {eventImage ? <img src={eventImage} alt={getEventTitle(event)} style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 12 }} /> : null}

        <div>
          <Tag color={eventTypeColors[getEventType(event)] || 'blue'}>{getEventType(event)}</Tag>
          <Text type="secondary" style={{ marginLeft: 8 }}>{getEventLocation(event)}</Text>
        </div>

        <div>
          <Tag>{eventTheme}</Tag>
          {attendeeCount != null ? <Tag color="gold">RSVPs: {attendeeCount}</Tag> : null}
          {categories.slice(0, 3).map((category) => <Tag key={category} color="purple">{category}</Tag>)}
          {benefits.slice(0, 3).map((benefit) => <Tag key={benefit} color="green">{benefit}</Tag>)}
        </div>

        <div>
          <div>
            <Text strong>Starts: </Text>
            <Text type="secondary">{getEventDateText(event) || '-'}</Text>
          </div>
          {getEventEndDateText(event) ? (
            <div style={{ marginTop: 6 }}>
              <Text strong>Ends: </Text>
              <Text type="secondary">{getEventEndDateText(event)}</Text>
            </div>
          ) : null}
          <div style={{ marginTop: 8 }}>
            {scheduleChecked ? (
              scheduleConflict ? (
                scheduleConflict.conflict ? (
                  <div>
                    <Tag color="red">Conflict</Tag>
                    <div style={{ marginTop: 6 }}>
                      {scheduleConflict.matches?.length > 0 ? scheduleConflict.matches.map((m, idx) => (
                        <div key={idx} style={{ fontSize: 13 }}>
                          <Text type="danger">{m.course || m.name || 'Scheduled class'}</Text>
                        </div>
                      )) : <Text type="danger">Scheduled class</Text>}
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
          {sanitizedDescription ? <div dangerouslySetInnerHTML={{ __html: sanitizedDescription }} /> : <Text>No description available.</Text>}
        </div>

        {getEventOrganizations(event).length > 0 ? (
          <div>
            <Text strong>Organizations:</Text>
            <div style={{ marginTop: 8 }}>
              {getEventOrganizations(event).map((o, idx) => <Tag key={idx} style={{ marginBottom: 6 }}>{getOrgDisplayName(o)}</Tag>)}
            </div>
          </div>
        ) : null}

        <Divider style={{ margin: '8px 0' }} />

        <div>
          <Text strong>Event Link: </Text>
          {eventUrl ? (
            <Button type="link" href={eventUrl} target="_blank" rel="noreferrer" style={{ paddingInline: 0 }}>
              Open on Engage
            </Button>
          ) : (
            <Text type="secondary">Not available</Text>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose}>Close</Button>
          {registrationUrl ? <Button href={registrationUrl} target="_blank" rel="noreferrer">Official RSVP</Button> : null}
          {isAuthenticated !== true ? (
            <Button disabled>Login to register</Button>
          ) : !isRegistered ? (
            <Button type="primary" loading={registerLoading} onClick={handleRegister}>Register</Button>
          ) : (
            <Popconfirm title="Unregister from this event?" onConfirm={handleUnregister} okText="Yes" cancelText="No">
              <Button danger loading={unregistering}>Unregister</Button>
            </Popconfirm>
          )}
        </div>
      </Space>
    </Modal>
  );
};

export default EventDetailModal;

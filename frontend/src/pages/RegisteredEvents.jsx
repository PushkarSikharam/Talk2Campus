/*
	RegisteredEvents page
	- Displays the current user's registrations and allows viewing details and unregistering.
	- Sanitizes event descriptions before rendering and checks auth state periodically.
*/
import React, { useEffect, useState } from 'react';
import { List, Card, Typography, Spin, Empty, Button, Modal, Divider, Space, Popconfirm, message, Tag } from 'antd';

const { Title, Paragraph, Text } = Typography;

const API_BASE = '';

const extractDescription = (event) => {
	if (!event) return '';
	return event.description || event.body || event.details || event.summary || (event.raw && (event.raw.description || event.raw.summary)) || (event.properties && event.properties.description) || '';
};

const extractOrganization = (event) => {
	if (!event) return '';
	return event.organization || event.organizer || (event.raw && (event.raw.organization || event.raw.organizer)) || (event.properties && (event.properties.source_name || event.properties.organizer)) || '';
};

const extractOrganizationNames = (event) => {
	if (!event) return '';
	// common variants: organizations (array), organizationNames, organizers, organizer (string)
	if (Array.isArray(event.organizations) && event.organizations.length) {
		return event.organizations.map(o => (o && (o.name || o.title || o))).join(', ');
	}
	if (Array.isArray(event.organizer) && event.organizer.length) {
		return event.organizer.map(o => (o && (o.name || o.title || o))).join(', ');
	}
	if (Array.isArray(event.organizers) && event.organizers.length) {
		return event.organizers.map(o => (o && (o.name || o.title || o))).join(', ');
	}
	if (Array.isArray(event.organizationNames) && event.organizationNames.length) {
		return event.organizationNames.join(', ');
	}
	if (event.organizationNames && typeof event.organizationNames === 'string') return event.organizationNames;
	if (event.organizer && typeof event.organizer === 'string') return event.organizer;
	if (event.organization && typeof event.organization === 'string') return event.organization;
	// nested raw/properties
	if (event.raw) {
		if (Array.isArray(event.raw.organizations) && event.raw.organizations.length) return event.raw.organizations.join(', ');
		if (event.raw.organizationNames) return event.raw.organizationNames;
		if (event.raw.organizer) return event.raw.organizer;
	}
	if (event.properties) {
		if (Array.isArray(event.properties.organizations) && event.properties.organizations.length) return event.properties.organizations.join(', ');
		if (event.properties.source_name) return event.properties.source_name;
		if (event.properties.organization) return event.properties.organization;
	}
	return '';
};

const extractLocation = (event) => {
	if (!event) return '';
	return event.location || event.locationName || event.location_name || event.venue || event.place || (event.properties && (event.properties.address || event.properties.venue)) || (event.raw && (event.raw.location || event.raw.venue || (event.raw.properties && event.raw.properties.address))) || '';
};

// Helpers mirroring InteractiveMap formatting
const getEventOrganizations = (ev) => {
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
const getOrgDisplayName = (o) => {
	if (!o) return '';
	if (typeof o === 'string') return o;
	if (o.name) return o.name;
	if (o.organizationName) return o.organizationName;
	if (o.displayName) return o.displayName;
	if (o.orgName) return o.orgName;
	if (o.title) return o.title;
	try { return JSON.stringify(o); } catch { return String(o); }
};

const eventTypeColors = {
	career: '#667eea',
	tour: '#43cea2',
	academic: '#f093fb',
	social: '#feca57',
};

const getEventType = (ev) => ev?.type || (ev?.categories && ev.categories[0]) || 'other';

const getEventDateText = (ev) => {
	const start = ev?.startsOn_dt || ev?.startsOn || ev?.startDate || ev?.start;
	if (!start) return '';
	try {
		const d = new Date(start);
		return d.toLocaleString();
	} catch {
		return String(start);
	}
};
const getEventEndDateText = (ev) => {
	const end = ev?.endsOn_dt || ev?.endsOn || ev?.endDate || ev?.end;
	if (!end) return '';
	try {
		const d = new Date(end);
		return d.toLocaleString();
	} catch {
		return String(end);
	}
};

// Countdown helper: returns { ms, label, status }
const computeCountdown = (start) => {
	if (!start) return { ms: NaN, label: 'Unknown', status: 'unknown' };
	const s = new Date(start);
	if (isNaN(s)) return { ms: NaN, label: String(start), status: 'unknown' };
	const now = new Date();
	const ms = s.getTime() - now.getTime();
	const absMs = Math.abs(ms);
	const days = Math.floor(absMs / (1000 * 60 * 60 * 24));
	const hours = Math.floor((absMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
	const minutes = Math.floor((absMs % (1000 * 60 * 60)) / (1000 * 60));

	let label = '';
	if (ms > 0) {
		if (days > 0) label = `${days}d ${hours}h`;
		else if (hours > 0) label = `${hours}h ${minutes}m`;
		else label = `${minutes}m`;
	} else {
		// already started or passed
		if (days > 0) label = `${days}d ${hours}h ago`;
		else if (hours > 0) label = `${hours}h ${minutes}m ago`;
		else label = `${minutes}m ago`;
	}

	const status = ms > 0 ? (ms <= 24 * 60 * 60 * 1000 ? 'imminent' : 'upcoming') : 'past';
	return { ms, label, status };
};

// sanitized HTML description for modal
const useSanitizedDescription = (raw) => {
	const [sanitized, setSanitized] = useState('');
	useEffect(() => {
		let mounted = true;
		const sanitizeFallback = (html) => {
			if (!html) return '';
			let s = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
			s = s.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '');
			s = s.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '');
			s = s.replace(/href\s*=\s*(['"])javascript:[^\1]*\1/gi, '');
			return s;
		};

		const doSanitize = async () => {
			if (!raw) {
				if (mounted) setSanitized('');
				return;
			}
			try {
				const mod = await import('dompurify');
				const DOMPurify = mod.default || mod;
				const clean = DOMPurify.sanitize(raw, { ALLOWED_TAGS: false });
				if (mounted) setSanitized(clean || '');
			} catch {
				if (mounted) setSanitized(sanitizeFallback(raw));
			}
		};
		doSanitize();
		return () => { mounted = false; };
	}, [raw]);
	return sanitized;
};

const RegisteredEvents = () => {
	const [loading, setLoading] = useState(true);
	const [registrations, setRegistrations] = useState([]);
	const [error, setError] = useState(null);
	const [selected, setSelected] = useState(null); // { registration, event }
	const [modalVisible, setModalVisible] = useState(false);
	const [unregistering, setUnregistering] = useState(false);
	const [isAuthenticated, setIsAuthenticated] = useState(null);

	// now ticks to keep countdowns fresh
	const [, setNowTick] = useState(Date.now());
	useEffect(() => {
		const id = setInterval(() => setNowTick(Date.now()), 30 * 1000); // update every 30s
		return () => clearInterval(id);
	}, []);

	// sanitized HTML for selected event description
	const selectedRawDescription = selected ? extractDescription(selected.event) : '';
	const sanitizedDescription = useSanitizedDescription(selectedRawDescription);

	const load = async () => {
		setLoading(true);
		setError(null);
		try {
			const resp = await fetch(`${API_BASE}/registrations`, {
				method: 'GET',
				credentials: 'include',
			});
			if (resp.status === 401) {
				setIsAuthenticated(false);
				setRegistrations([]);
				setLoading(false);
				return;
			}
			if (!resp.ok) {
				const txt = await resp.text();
				throw new Error(`${resp.status} ${resp.statusText} - ${txt}`);
			}
			const data = await resp.json();
			setIsAuthenticated(true);
			setRegistrations(data || []);
		} catch (e) {
			console.error('Failed to load registrations', e);
			setError(e.message || 'Failed to load');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { load(); }, []);

	// Periodically verify authentication status (helps reflect login/logout without full page reload)
	useEffect(() => {
		let mounted = true;
		const checkAuth = async () => {
			try {
				const resp = await fetch(`${API_BASE}/me`, { method: 'GET', credentials: 'include' });
				if (!mounted) return;
				if (resp.status === 200) {
					setIsAuthenticated(true);
				} else {
					setIsAuthenticated(false);
				}
			} catch {
				if (!mounted) return;
				setIsAuthenticated(false);
			}
		};

		checkAuth();
		const id = setInterval(checkAuth, 8000);
		return () => { mounted = false; clearInterval(id); };
	}, []);

	const openDetails = (registration) => {
		const event = registration.event || {};
		setSelected({ registration, event });
		setModalVisible(true);
	};

	const closeModal = () => {
		setModalVisible(false);
		setSelected(null);
	};

	const handleUnregister = async (registration_id) => {
		setUnregistering(true);
		try {
			const resp = await fetch(`${API_BASE}/registrations/${registration_id}`, {
				method: 'DELETE',
				credentials: 'include',
			});
			if (resp.status === 401) {
				setIsAuthenticated(false);
				throw new Error('Unauthorized');
			}
			if (!resp.ok) {
				const txt = await resp.text();
				throw new Error(`${resp.status} ${resp.statusText} - ${txt}`);
			}
			message.success('Unregistered successfully');
			// remove from list
			setRegistrations((prev) => prev.filter(r => String(r.registration_id) !== String(registration_id)));
			closeModal();
		} catch (e) {
			console.error('Unregister failed', e);
			// Show server-provided reason when available
			const txt = e?.message || (e?.response && (e.response.data || e.response.statusText)) || 'Failed to unregister';
			message.error(txt);
		} finally {
			setUnregistering(false);
		}
	};

	if (loading) return (
		<div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
			<Spin size="large" />
		</div>
	);

	if (error) return (
		<div style={{ padding: 24 }}>
			<Title level={4}>Error</Title>
			<Paragraph>{error}</Paragraph>
		</div>
	);

	if (!registrations || registrations.length === 0) return (
		<div style={{ padding: 24 }}>
			<Empty description="No registered events found" />
		</div>
	);

	return (
		<div className="page-container" style={{ padding: 24, minHeight: 'calc(100vh - 120px)' }}>
			<Title level={2}>My Registered Events</Title>
			<List
				grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 3 }}
				dataSource={registrations}
				renderItem={(item) => {
					const event = item.event || {};
					const title = event.title || event.name || (event.properties || {}).name || 'Untitled Event';
					const loc = extractLocation(event);
					const startText = getEventDateText(event);
					const endText = getEventEndDateText(event);
					const orgNames = extractOrganizationNames(event);
					return (
						<List.Item>
							<Card hoverable style={{ borderRadius: 12 }}>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
									<div style={{ flex: 1 }}>
										<Title level={4} style={{ marginBottom: 6 }}>{title}</Title>
										<Paragraph style={{ marginBottom: 6, color: '#666' }}>{loc}</Paragraph>
										<Paragraph style={{ marginBottom: 6, color: '#666' }}><Text strong>Organization :</Text> {orgNames || extractOrganization(event) || '—'}</Paragraph>
										<Paragraph style={{ marginBottom: 6, color: '#888' }}>{startText || ''}</Paragraph>
										{endText ? <Paragraph style={{ marginBottom: 12, color: '#888' }}>Ends: {endText}</Paragraph> : null}
									</div>
									<div style={{ marginLeft: 12, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
										{/* Countdown tag */}
										{(() => {
											const cd = computeCountdown(event.startsOn_dt || event.startsOn || event.start || event.startsOn);
											const color = cd.status === 'past' ? 'red' : (cd.status === 'imminent' ? 'orange' : 'green');
											return <Tag color={color} style={{ fontSize: 12 }}>{cd.label}</Tag>;
										})()}
										<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
											<Button type="default" onClick={() => openDetails(item)}>View</Button>
											{!isAuthenticated ? (
												<Button disabled>Login to register</Button>
											) : (
												<Popconfirm
													title="Unregister from this event?"
													onConfirm={() => handleUnregister(item.registration_id)}
													okText="Yes"
													cancelText="No"
												>
													<Button danger>Unregister</Button>
												</Popconfirm>
											)}
										</div>
									</div>
								</div>
							</Card>
							</List.Item>
						);
				}}
			/>

			<Modal
				open={modalVisible}
				onCancel={closeModal}
				footer={null}
				width={720}
				title={selected ? (selected.event.title || selected.event.name || 'Event Details') : 'Event Details'}
			>
				{selected && (
					<div>
						<Space direction="vertical" size={12} style={{ width: '100%' }}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<div>
									<div style={{ marginTop: 6 }}>
										<div style={{ display: 'inline-block' }}>
											<Tag color={eventTypeColors[getEventType(selected.event)] || 'default'}>{getEventType(selected.event)}</Tag>
										</div>
										<Text type="secondary" style={{ marginLeft: 8 }}>{extractLocation(selected.event)}</Text>
									</div>
								</div>
							</div>

							<div>
								<div>
									<Text strong>Starts: </Text>
									<Text type="secondary">{getEventDateText(selected.event) || '—'}</Text>
									{/* countdown in modal */}
									<div style={{ marginTop: 6 }}>
										{(() => {
											const cd = computeCountdown(selected.event.startsOn_dt || selected.event.startsOn || selected.event.start || selected.event.startsOn);
											const color = cd.status === 'past' ? 'red' : (cd.status === 'imminent' ? 'orange' : 'green');
											return <Tag color={color}>{cd.label}</Tag>;
										})()}
									</div>
								</div>
								{getEventEndDateText(selected.event) ? (
									<div style={{ marginTop: 6 }}>
										<Text strong>Ends: </Text>
										<Text type="secondary">{getEventEndDateText(selected.event)}</Text>
									</div>
								) : null}
							</div>

							<div>
								{sanitizedDescription ? (
									<div dangerouslySetInnerHTML={{ __html: sanitizedDescription }} />
								) : (
									<Paragraph>{extractDescription(selected.event) || 'No description available.'}</Paragraph>
								)}
							</div>

							{getEventOrganizations(selected.event).length > 0 && (
								<div>
									<Text strong>Organizations:</Text>
									<div style={{ marginTop: 8 }}>
										{getEventOrganizations(selected.event).map((o, idx) => (
											<Tag key={idx} style={{ marginRight: 6, marginBottom: 6 }}>{getOrgDisplayName(o)}</Tag>
										))}
									</div>
								</div>
							)}

							<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
								<Button onClick={closeModal}>Close</Button>
								{!isAuthenticated ? (
									<Button disabled>Login to register</Button>
								) : (
									<Popconfirm
										title="Unregister from this event?"
										onConfirm={() => handleUnregister(selected.registration.registration_id)}
										okText="Yes"
										cancelText="No"
									>
										<Button danger loading={unregistering}>Unregister</Button>
									</Popconfirm>
								)}
							</div>
						</Space>
					</div>
				)}
			</Modal>
		</div>
	);
};

export default RegisteredEvents;


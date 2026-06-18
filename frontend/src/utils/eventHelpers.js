export const eventTypeColors = {
  career: '#667eea',
  tour: '#43cea2',
  academic: '#f093fb',
  social: '#feca57',
};

export const CAMPUS_TIME_ZONE = 'America/Chicago';

export const getEventStartValue = (ev) =>
  ev?.startsOn_dt || ev?.startsOn || ev?.startDate || ev?.start_date || ev?.startDateTime || ev?.start || null;

export const getEventEndValue = (ev) =>
  ev?.endsOn_dt || ev?.endsOn || ev?.endDate || ev?.end_date || ev?.endDateTime || ev?.end || null;

export const formatCampusDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CAMPUS_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value || '';
  return `${part('month')} ${part('day')} · ${part('hour')}:${part('minute')} ${part('dayPeriod')}`;
};

export const getEventTitle = (ev) => ev?.title || ev?.name || ev?.displayName || 'Event';

export const getEventLocation = (ev) =>
  ev?.location ||
  ev?.locationName ||
  ev?.location_name ||
  ev?.venue ||
  ev?.place ||
  (ev?.properties && (ev.properties.address || ev.properties.venue)) ||
  (ev?.raw && (ev.raw.location || ev.raw.venue || (ev.raw.properties && ev.raw.properties.address))) ||
  '';

export const getEventType = (ev) => ev?.type || ev?.theme || (ev?.categoryNames && ev.categoryNames[0]) || (ev?.categories && ev.categories[0]) || 'other';

export const getEventAttendees = (ev) => {
  const value = ev?.rsvpTotal ?? ev?.attendees ?? ev?.attendeeCount ?? ev?.registrationCount ?? ev?.registeredCount;
  return Number.isFinite(Number(value)) ? Number(value) : null;
};

export const getEventDateText = (ev) => {
  return formatCampusDateTime(getEventStartValue(ev));
};

export const getEventEndDateText = (ev) => {
  return formatCampusDateTime(getEventEndValue(ev));
};

const campusDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CAMPUS_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
};

export const dedupeEvents = (events = []) => {
  const seen = new Set();
  return events.filter((event) => {
    const key = [getEventTitle(event), getEventStartValue(event), getEventLocation(event)]
      .map((part) => String(part || '').trim().toLowerCase())
      .join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const groupEventsByDay = (events = [], nowValue = Date.now()) => {
  const todayKey = campusDateKey(nowValue);
  const tomorrowKey = campusDateKey(nowValue + 24 * 60 * 60 * 1000);
  const groups = new Map();
  events.forEach((event) => {
    const start = getEventStartValue(event);
    const key = campusDateKey(start);
    let label = 'Date to be announced';
    if (key === todayKey) label = 'Today';
    else if (key === tomorrowKey) label = 'Tomorrow';
    else if (key !== 'unknown') {
      label = new Intl.DateTimeFormat('en-US', {
        timeZone: CAMPUS_TIME_ZONE, weekday: 'long', month: 'short', day: 'numeric',
      }).format(new Date(start));
    }
    if (!groups.has(key)) groups.set(key, { key, label, events: [] });
    groups.get(key).events.push(event);
  });
  return Array.from(groups.values());
};

export const getEventDescription = (ev) => {
  if (!ev) return '';
  return ev.description || ev.body || ev.details || ev.summary || (ev.raw && (ev.raw.description || ev.raw.summary)) || (ev.properties && ev.properties.description) || '';
};

export const getEventOrganizations = (ev) => {
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

export const getOrgDisplayName = (o) => {
  if (!o) return '';
  if (typeof o === 'string') return o;
  if (o.name) return o.name;
  if (o.organizationName) return o.organizationName;
  if (o.displayName) return o.displayName;
  if (o.orgName) return o.orgName;
  if (o.title) return o.title;
  try {
    return JSON.stringify(o);
  } catch {
    return String(o);
  }
};

export const getEventRegistrationUrl = (ev) => ev?.registrationUrl || ev?.registerUrl || ev?.registration || ev?.signupUrl || ev?.url || ev?.link || null;
export const getEventImageUrl = (ev) => {
  const value = ev?.imageUrl || ev?.imagePath || ev?.image || null;
  if (!value || String(value).toLowerCase().endsWith('.pdf')) return null;
  if (/^https?:\/\//i.test(String(value))) return String(value);
  return `https://se-images.campuslabs.com/clink/images/${encodeURIComponent(String(value))}?preset=large-w`;
};
export const getEventExternalUrl = (ev) => ev?.externalUrl || ev?.eventUrl || ev?.url || ev?.link || getEventRegistrationUrl(ev) || null;
export const getEventTheme = (ev) => ev?.theme || ev?.type || 'Other';
export const getEventCategories = (ev) => {
  if (Array.isArray(ev?.categoryNames) && ev.categoryNames.length > 0) return ev.categoryNames;
  if (Array.isArray(ev?.categories) && ev.categories.length > 0) return ev.categories;
  if (ev?.theme) return [ev.theme];
  return [];
};
export const getEventBenefits = (ev) => {
  if (Array.isArray(ev?.benefitNames) && ev.benefitNames.length > 0) return ev.benefitNames;
  return [];
};

export const toISODate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const computeScheduleConflict = (ev, schedule) => {
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
      if (sdStr && evDateStr < sdStr) return false;
      if (edStr && evDateStr > edStr) return false;
    }

    if (Array.isArray(schedule.days) && schedule.days.length > 0) {
      const dowMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const evDow = dowMap[evStart.getDay()];
      const okDay = schedule.days.some((d) => d && String(d).toLowerCase().slice(0, 3) === evDow);
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
      if (!((evStartMinutes < schedEnd) && (schedStart < evEndMinutes))) return false;
    }

    return true;
  } catch (e) {
    console.error('computeScheduleConflict error', e);
    return false;
  }
};

export const sanitizeFallback = (html) => {
  if (!html) return '';
  let s = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '');
  s = s.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '');
  s = s.replace(/href\s*=\s*(['"])javascript:[^\1]*\1/gi, '');
  return s;
};

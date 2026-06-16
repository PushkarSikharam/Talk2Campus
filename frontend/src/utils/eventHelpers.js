export const eventTypeColors = {
  career: '#667eea',
  tour: '#43cea2',
  academic: '#f093fb',
  social: '#feca57',
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
  const start = ev?.startsOn_dt || ev?.startsOn || ev?.startDate || ev?.start;
  if (!start) return '';
  try {
    return new Date(start).toLocaleString();
  } catch {
    return String(start);
  }
};

export const getEventEndDateText = (ev) => {
  const end = ev?.endsOn_dt || ev?.endsOn || ev?.endDate || ev?.end;
  if (!end) return '';
  try {
    return new Date(end).toLocaleString();
  } catch {
    return String(end);
  }
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
export const getEventImageUrl = (ev) => ev?.imageUrl || ev?.imagePath || ev?.image || null;
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

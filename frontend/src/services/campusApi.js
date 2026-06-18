import axios from 'axios';

export const loginUser = async (email, password, request = fetch) => {
  const response = await request('/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Login failed');
  return data;
};

export const syncCampusEvents = (client = axios) => client.post('/events/sync');

export const registerForEvent = (eventId, client = axios) => client.post(`/events/${eventId}/register`);

import test from 'node:test';
import assert from 'node:assert/strict';
import { loginUser, registerForEvent, syncCampusEvents } from '../src/services/campusApi.js';
import { getRouteDetails } from '../src/services/routeService.js';

test('login sends credentials as JSON and includes cookies', async () => {
  let captured;
  const request = async (url, options) => {
    captured = { url, options };
    return { ok: true, json: async () => ({ id: 'student-1' }) };
  };
  await loginUser('student@example.edu', 'secret', request);
  assert.equal(captured.url, '/login');
  assert.equal(captured.options.credentials, 'include');
  assert.deepEqual(JSON.parse(captured.options.body), { email: 'student@example.edu', password: 'secret' });
});

test('event registration uses the selected event id', async () => {
  const calls = [];
  await registerForEvent('event-42', { post: async (url) => { calls.push(url); return { data: {} }; } });
  assert.deepEqual(calls, ['/events/event-42/register']);
});

test('event refresh calls the sync endpoint', async () => {
  const calls = [];
  await syncCampusEvents({ post: async (url) => { calls.push(url); return { data: {} }; } });
  assert.deepEqual(calls, ['/events/sync']);
});

test('route request sends walking coordinates and returns route metadata', async () => {
  let captured;
  const client = {
    get: async (url, options) => {
      captured = { url, options };
      return { data: { coordinates: [[27.7, -97.3]], distanceMeters: 800, durationSeconds: 600, steps: [{ instruction: 'Head east' }] } };
    },
  };
  const result = await getRouteDetails(27.7, -97.3, 27.71, -97.31, 'walking', client);
  assert.equal(captured.url, '/route');
  assert.equal(captured.options.params.mode, 'walking');
  assert.equal(result.durationSeconds, 600);
  assert.equal(result.steps[0].instruction, 'Head east');
});

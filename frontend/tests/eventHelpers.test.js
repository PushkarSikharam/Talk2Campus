import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dedupeEvents,
  formatCampusDateTime,
  getEventImageUrl,
  groupEventsByDay,
} from '../src/utils/eventHelpers.js';

test('formats event times in Central Time', () => {
  assert.equal(formatCampusDateTime('2026-06-22T19:30:00Z'), 'Jun 22 · 2:30 PM');
});

test('builds CampusLabs image URLs and ignores PDF attachments', () => {
  assert.equal(
    getEventImageUrl({ imagePath: 'event image.png' }),
    'https://se-images.campuslabs.com/clink/images/event%20image.png?preset=large-w'
  );
  assert.equal(getEventImageUrl({ imagePath: 'flyer.pdf' }), null);
});

test('removes exact duplicate events but preserves recurring sessions', () => {
  const events = [
    { title: 'Pilates', startsOn: '2026-06-22T14:00:00Z', location: 'Gym' },
    { title: 'Pilates', startsOn: '2026-06-22T14:00:00Z', location: 'Gym' },
    { title: 'Pilates', startsOn: '2026-06-23T14:00:00Z', location: 'Gym' },
  ];
  assert.equal(dedupeEvents(events).length, 2);
});

test('groups events into Today and Tomorrow using campus time', () => {
  const now = Date.parse('2026-06-22T16:00:00Z');
  const groups = groupEventsByDay([
    { title: 'Today event', startsOn: '2026-06-22T19:00:00Z' },
    { title: 'Tomorrow event', startsOn: '2026-06-23T19:00:00Z' },
  ], now);
  assert.deepEqual(groups.map((group) => group.label), ['Today', 'Tomorrow']);
});

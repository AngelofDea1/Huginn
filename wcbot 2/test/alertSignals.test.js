import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEvents, resolveLiveStatus, shouldSurfaceLiveMatch } from '../src/services/txline.js';

test('buildEvents extracts yellow cards and penalty/added-time signals', () => {
  const updates = [
    {
      Action: 'yellow_card',
      Clock: { Seconds: 1800 },
      Data: { PlayerId: 42 },
      Score: { Participant1: { Total: { Goals: 0 } }, Participant2: { Total: { Goals: 0 } } },
    },
    {
      Action: 'penalty_goal',
      Clock: { Seconds: 2700 },
      Data: { PlayerId: 99, Participant: 1 },
      Score: { Participant1: { Total: { Goals: 1 } }, Participant2: { Total: { Goals: 0 } } },
    },
    {
      Action: 'added_time',
      Clock: { Seconds: 5400 },
      Data: { MinutesAdded: 3 },
      Score: { Participant1: { Total: { Goals: 1 } }, Participant2: { Total: { Goals: 0 } } },
    },
  ];

  const events = buildEvents(updates);
  assert.equal(events.some(e => e.type === 'yellow_card'), true);
  assert.equal(events.some(e => e.type === 'penalty_goal'), true);
  assert.equal(events.some(e => e.type === 'added_time'), true);
});

test('resolveLiveStatus rejects ambiguous or stale fixture data', () => {
  assert.equal(resolveLiveStatus({ Phase: 0, GameState: 0, Status: 'scheduled' }, null), 'NS');
  assert.equal(resolveLiveStatus({ Phase: 0, GameState: 0, Status: 'scheduled' }, { status: 'NS' }), 'NS');
  assert.equal(resolveLiveStatus({ Phase: 0, GameState: 0, Status: 'scheduled' }, { status: 'LIVE' }), 'NS');
});

test('shouldSurfaceLiveMatch requires an explicit live confirmation', () => {
  assert.equal(shouldSurfaceLiveMatch('LIVE', null), false);
  assert.equal(shouldSurfaceLiveMatch('LIVE', 'NS'), false);
  assert.equal(shouldSurfaceLiveMatch('LIVE', 'LIVE'), true);
  assert.equal(shouldSurfaceLiveMatch('HT', 'HT'), true);
});

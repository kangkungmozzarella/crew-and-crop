import assert from 'node:assert/strict';
import { createCrewBrain } from '../server/crew-brain.js';

// Dry run: deterministic keywords, labelled output.
const dry = createCrewBrain({ dryRun: true });
assert.equal(dry.mode, 'dry-run');
let r = await dry.order({ to: 'crew', text: 'Harvest rice, sweep the yard and chop mature trees' });
assert.equal(r.source, 'dry run');
assert.deepEqual(r.assignments.map(a => a.job), ['harvest', 'sweep', 'chop']);
r = await dry.order({ to: 'Hank', text: 'Plant trees' });
assert.deepEqual(r.assignments, [{ agent: 'Hank', job: 'plant', reply: 'A tree for tomorrow.' }]);
r = await dry.order({ to: 'Dale', text: 'build a spaceship' });
assert.equal(r.assignments[0].job, 'keep');
assert.match(r.assignments[0].reply, /one job/);
r = await dry.order({ to: 'crew', text: 'make it nice' });
assert(r.assignments.every(a => a.job === 'keep'));
await assert.rejects(dry.order({ to: 'Bob', text: 'harvest' }), /Unknown crew member/);
await assert.rejects(dry.order({ to: 'crew', text: '' }), /Order must be/);
r = await dry.diary({ day: 2, agents: [{ name: 'Dale', done: 4, job: 'harvest' }] });
assert.match(r.entries[0].text, /Day 2: 4 jobs finished/);

// Live, with a fake client: check request shape and output validation.
const calls = [];
let next;
const client = { beta: { messages: { create: async params => { calls.push(params); return next; } } } };
const reply = (data, extra = {}) => ({ model: calls.at(-1)?.model, stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(data) }], ...extra });
const live = createCrewBrain({ key: 'test', dryRun: false, client });
assert.equal(live.mode, 'live');

next = { stop_reason: 'end_turn', model: 'claude-sonnet-5-5', content: [{ type: 'text', text: JSON.stringify({ assignments: [
  { agent: 'Dale', job: 'harvest', reply: 'Rice first, coffee second.' },
  { agent: 'Rosie', job: 'sweep', reply: 'Not one leaf for the guests.' },
  { agent: 'Rosie', job: 'chop', reply: 'duplicate, dropped' },
  { agent: 'Hank', job: 'fly', reply: 'invalid job, dropped' }
] }) }] };
r = await live.order({ to: 'crew', text: 'Get the farm tidy before guests arrive', farm: { ripeRice: 3, leaves: 9, barnUsed: 10, barnCapacity: 80 } });
assert.equal(r.source, 'claude-sonnet-5-5');
assert.deepEqual(r.assignments.map(a => `${a.agent}:${a.job}`), ['Dale:harvest', 'Rosie:sweep']);
let p = calls.at(-1);
assert.equal(p.model, 'claude-sonnet-5-5');
assert.equal(p.output_config.format.type, 'json_schema');
assert.equal(p.output_config.effort, 'low');
assert.equal(p.fallbacks, 'default');
assert.deepEqual(p.betas, ['server-side-fallback-2026-07-01']);
const sent = JSON.parse(p.messages[0].content);
assert.equal(sent.order, 'Get the farm tidy before guests arrive');
assert.equal(sent.farm.leaves, 9);

// A single-agent order ignores assignments for other agents.
next = reply({ assignments: [{ agent: 'Dale', job: 'stop', reply: 'nope' }, { agent: 'Hank', job: 'keep', reply: 'I can only farm, not build rockets.' }] });
r = await live.order({ to: 'Hank', text: 'build a spaceship' });
assert.deepEqual(r.assignments.map(a => a.agent), ['Hank']);
assert.equal(r.assignments[0].job, 'keep');

next = reply({ assignments: [] });
await assert.rejects(live.order({ to: 'Dale', text: 'harvest' }), /could not agree/);
next = reply({}, { stop_reason: 'refusal' });
await assert.rejects(live.order({ to: 'Dale', text: 'harvest' }), /declined/);
next = { stop_reason: 'end_turn', content: [{ type: 'text', text: 'not json' }] };
await assert.rejects(live.order({ to: 'Dale', text: 'harvest' }), /unreadable/);

// Diary uses the chat model; Haiku gets no effort or fallback parameters.
next = { stop_reason: 'end_turn', model: 'claude-haiku-4-5', content: [{ type: 'text', text: JSON.stringify({ entries: [{ agent: 'Rosie', text: 'Nine leaves. I counted.' }] }) }] };
r = await live.diary({ day: 1, agents: [{ name: 'Rosie', done: 9, job: 'sweep' }] });
p = calls.at(-1);
assert.equal(p.model, 'claude-haiku-4-5');
assert.equal(p.output_config.effort, undefined);
assert.equal(p.fallbacks, undefined);
assert.deepEqual(r.entries, [{ agent: 'Rosie', text: 'Nine leaves. I counted.' }]);

// Events: dry run takes the first option; live may only pick offered options and only listed agents speak.
const options = [{ id: 'ask-Hank', label: 'Dale asks Hank' }, { id: 'clear-myself', label: 'Dale clears it' }];
const situation = 'A fallen tree blocks the paddy path.';
r = await dry.event({ type: 'path-blocked', situation, agents: ['Dale', 'Hank', 'Rosie'], options });
assert.equal(r.choice, 'ask-Hank');
assert.deepEqual(r.lines.map(l => l.agent), ['Dale', 'Hank']);
assert.match(r.lines[0].text, /Hank, can you help/);
await assert.rejects(dry.event({ type: 'alien-invasion', situation, agents: ['Dale'], options }), /Unknown event/);
await assert.rejects(dry.event({ type: 'path-blocked', situation, agents: ['Dale'], options: options.slice(0, 1) }), /two to five/);
await assert.rejects(dry.event({ type: 'path-blocked', situation, agents: ['Nobody'], options }), /at least one crew member/);

next = reply({ choice: 'clear-myself', lines: [{ agent: 'Dale', text: 'I’ll drag it myself. Coffee after.' }, { agent: 'Rosie', text: 'not involved, dropped' }] });
r = await live.event({ type: 'path-blocked', situation, agents: ['Dale', 'Hank'], options });
p = calls.at(-1);
assert.deepEqual(p.output_config.format.schema.properties.choice.enum, ['ask-Hank', 'clear-myself']);
assert.deepEqual(p.output_config.format.schema.properties.lines.items.properties.agent.enum, ['Dale', 'Hank']);
assert.equal(r.choice, 'clear-myself');
assert.deepEqual(r.lines.map(l => l.agent), ['Dale']);
next = reply({ choice: 'teleport', lines: [] });
await assert.rejects(live.event({ type: 'path-blocked', situation, agents: ['Dale', 'Hank'], options }), /does not offer/);

// The diary receives the day's happenings.
next = reply({ entries: [{ agent: 'Hank', text: 'Cleared a tree for Dale.' }] });
await live.diary({ day: 2, agents: [], events: ['Hank cleared the fallen tree.'] });
assert.deepEqual(JSON.parse(calls.at(-1).messages[0].content).happenedToday, ['Hank cleared the fallen tree.']);

// Chats: two agents, dry run rotates lines, live uses the chat model and drops other speakers.
r = await dry.chat({ agents: ['Dale', 'Rosie'], index: 1 });
assert.deepEqual(r.lines.map(l => l.agent), ['Dale', 'Rosie']);
await assert.rejects(dry.chat({ agents: ['Dale'] }), /two crew members/);
next = reply({ lines: [{ agent: 'Rosie', text: 'Nine leaves today.' }, { agent: 'Hank', text: 'dropped' }, { agent: 'Dale', text: 'Coffee says ten.' }] });
r = await live.chat({ agents: ['Rosie', 'Dale'], facts: { today: ['Crows ate 2 plots.'], weather: 'rain', coins: 12 } });
p = calls.at(-1);
assert.equal(p.model, 'claude-haiku-4-5');
assert.deepEqual(JSON.parse(p.messages[0].content).happenedToday, ['Crows ate 2 plots.']);
assert.deepEqual(r.lines.map(l => l.agent), ['Rosie', 'Dale']);
r = await dry.event({ type: 'trader', situation: 'A trader offers 3 per rice.', agents: ['Dale', 'Hank'], options: [{ id: 'decline', label: 'Decline' }, { id: 'sell-all', label: 'Sell all' }] });
assert.equal(r.choice, 'decline');

console.log('PASS: dry-run orders and diary, live request shape, assignment validation, events (option and speaker limits), chats, diary happenings, refusal and bad output handling. No paid calls.');

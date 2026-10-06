import Anthropic from '@anthropic-ai/sdk';

// The model only understands orders and writes words. Jobs, stock, timers and
// positions stay in the game; the model picks among the jobs the game offers.
export const JOBS = ['harvest', 'sweep', 'chop', 'plant', 'wander', 'stop'];
const CREW = {
  Dale: { role: 'harvester', usual: 'harvest', quirk: 'Hard-working, but stops for coffee whenever passing the kitchen.' },
  Rosie: { role: 'sweeper', usual: 'sweep', quirk: 'A perfectionist who re-sweeps a clean patch if one leaf lands.' },
  Hank: { role: 'lumberjack', usual: 'chop', quirk: 'Eager, but sometimes forgets to plant a sapling after felling a tree.' }
};
const NAMES = Object.keys(CREW);
const JOB_HELP = 'harvest (ripe rice), sweep (yard leaves), chop (mature trees), plant (saplings on stumps), wander (stroll the farm), stop (rest)';
const DRY_REPLIES = {
  harvest: 'Rice duty. Coffee after!', sweep: 'Every last leaf.', chop: 'Timber! Remind me to replant.',
  plant: 'A tree for tomorrow.', wander: 'Taking the scenic route.', stop: 'Taking a breather.'
};
const DRY_UNKNOWN = 'Give me one job: harvest, sweep, chop, plant, wander or stop.';
const DRY_DIARY = {
  Dale: 'Coffee made the work sweeter.', Rosie: 'There is always another leaf.', Hank: 'Tomorrow, remember the saplings.'
};
// Events the game raises when a standing rule cannot handle a situation.
// The game writes the situation and the valid options; the model only picks one
// and writes the exchange. Dry run picks the first option, so the game lists its
// default first. {0} and {1} are the first and second agents involved.
const EVENT_TYPES = ['barn-full', 'path-blocked', 'wheelbarrow', 'rain', 'pests', 'guests', 'trader'];
const DRY_EVENT_LINES = {
  'barn-full': [[0, 'Barn’s full. I’ll wait until there’s room.']],
  'path-blocked': [[0, 'A tree’s down across the path! {1}, can you help?'], [1, 'On my way.']],
  wheelbarrow: [[0, '{1}, I need the wheelbarrow when you’re done.'], [1, 'Almost finished. Hang on.']],
  rain: [[0, 'Rain! {1}, do we keep going?'], [1, 'A bit of rain never hurt anyone.']],
  pests: [[0, 'Crows on the paddy! {1}, can you chase them off?'], [1, 'Shoo! I’m on it.']],
  guests: [[0, 'Guests are coming! Everyone grab a broom.'], [1, 'Sweeping before coffee? For guests, fine.']],
  trader: [[0, 'A trader’s at the gate, {1}. What do you think?'], [1, 'Let’s hear the offer and decide.']]
};
// Idle chats in dry run rotate through these pairs.
const DRY_CHATS = [
  ['Nice day for it.', 'Every day’s a nice day with a full barn.'],
  ['Seen my coffee mug anywhere?', 'By the barn. Next to your other coffee mug.'],
  ['That tree by the path looks wobbly.', 'Don’t jinx it.'],
  ['Think the crows will be back?', 'Only if we stop looking.']
];
// Server-side refusal fallback is only accepted on these models.
const FALLBACK_MODELS = new Set(['claude-sonnet-5-5', 'claude-opus-5-5', 'claude-fable-5-1']);

export class BrainError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }

const crewProfile = NAMES.map(name => `- ${name}, the ${CREW[name].role}. ${CREW[name].quirk}`).join('\n');
const ORDER_SYSTEM = `You run the crew of a small farming game. Turn the owner's order into standing rules the game engine will repeat on its own.

The crew:
${crewProfile}

Jobs the game supports: ${JOB_HELP}.
Use "keep" when an agent should keep their current job, including when the order asks for something the game cannot do.
Each reply is one short speech bubble (under 70 characters) in that agent's own voice; let their quirk show. If you used "keep" because the order is impossible, the reply says so kindly.
Never claim the agent already did something. The game decides what actually happens.`;
const DIARY_SYSTEM = `You write the end-of-day diary for the crew of a small farming game.

The crew:
${crewProfile}

Write one or two sentences per agent, first person, in their own voice. Use only the numbers, jobs and happenings you are given; do not invent events, harvests or other characters.`;

const EVENT_SYSTEM = `You run the crew of a small farming game. The game engine moves, counts and keeps time; it calls you only when a standing rule cannot handle a situation.

The crew:
${crewProfile}

Pick exactly one of the options the game offers, as the agents involved would decide it. Then write their short exchange: one to four speech bubbles, each under 70 characters, in their own voices, consistent with the option you picked. The first agent listed speaks first.
Only the listed agents speak. Never claim the outcome has already happened; the game decides that.`;

const CHAT_SYSTEM = `You write a short idle chat between two crew members of a small farming game who bumped into each other between jobs.

The crew:
${crewProfile}

Write two to four speech bubbles, alternating, each under 70 characters, in their own voices. The first agent listed speaks first. Ground it in the facts given (today's happenings, weather, coins, what they are doing). Do not invent events, numbers or other characters, and do not promise actions; the game decides what happens.`;

const assignmentSchema = {
  type: 'object',
  properties: {
    agent: { type: 'string', enum: NAMES },
    job: { type: 'string', enum: [...JOBS, 'keep'] },
    reply: { type: 'string' }
  },
  required: ['agent', 'job', 'reply'],
  additionalProperties: false
};
const ORDER_SCHEMA = { type: 'object', properties: { assignments: { type: 'array', items: assignmentSchema } }, required: ['assignments'], additionalProperties: false };
const DIARY_SCHEMA = {
  type: 'object',
  properties: { entries: { type: 'array', items: { type: 'object', properties: { agent: { type: 'string', enum: NAMES }, text: { type: 'string' } }, required: ['agent', 'text'], additionalProperties: false } } },
  required: ['entries'],
  additionalProperties: false
};

function text(value, label, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new BrainError(`${label} must be between 1 and ${max} characters.`);
  return value.trim();
}
const count = value => Number.isFinite(value) ? Math.max(0, Math.min(1000, Math.round(value))) : 0;
function farmFacts(farm = {}) {
  return {
    ripeRice: count(farm.ripeRice), leaves: count(farm.leaves), matureTrees: count(farm.matureTrees), stumps: count(farm.stumps),
    barnUsed: count(farm.barnUsed), barnCapacity: count(farm.barnCapacity), night: farm.night === true
  };
}
function parseJobs(order) {
  const s = order.toLowerCase();
  if (/\b(stop|rest|wait)\b/.test(s)) return ['stop'];
  return [...new Set([...s.matchAll(/\b(harvest|sweep|chop|plant|wander)\b/g)].map(m => m[1]))];
}

export function createCrewBrain({ key = '', model = 'claude-sonnet-5-5', chatModel = 'claude-haiku-4-5', dryRun = !key, client } = {}) {
  const mode = dryRun ? 'dry-run' : 'live';
  const api = dryRun ? null : client || new Anthropic({ apiKey: key });

  async function ask(useModel, system, content, schema) {
    const params = {
      model: useModel, max_tokens: 16000, system,
      messages: [{ role: 'user', content }],
      output_config: { format: { type: 'json_schema', schema } }
    };
    // Haiku 4.5 rejects effort; quick game decisions need little thinking elsewhere.
    if (!useModel.startsWith('claude-haiku')) params.output_config.effort = 'low';
    if (FALLBACK_MODELS.has(useModel)) { params.betas = ['server-side-fallback-2026-07-01']; params.fallbacks = 'default'; }
    let response;
    try {
      response = await api.beta.messages.create(params);
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError) throw new BrainError('Claude rejected the API key. Check ANTHROPIC_API_KEY in .env.', 502);
      if (e instanceof Anthropic.RateLimitError) throw new BrainError('Claude is rate limited. Wait a moment, then send the order again.', 503);
      if (e instanceof Anthropic.APIError) throw new BrainError(`Claude request failed (HTTP ${e.status ?? 'network'}). Check the model name and account, then retry.`, 502);
      throw e;
    }
    if (response.stop_reason === 'refusal') throw new BrainError('Claude declined this request. Try wording the order differently.', 422);
    if (response.stop_reason === 'max_tokens') throw new BrainError('Claude ran out of room before answering. Try a shorter order.', 502);
    const body = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
    try { return { data: JSON.parse(body), source: response.model }; } catch { throw new BrainError('Claude returned an unreadable answer. Send the order again.', 502); }
  }

  function cleanAssignments(list, allowed) {
    const seen = new Set(), result = [];
    for (const a of Array.isArray(list) ? list : []) {
      if (!allowed.includes(a?.agent) || seen.has(a.agent) || ![...JOBS, 'keep'].includes(a.job) || typeof a.reply !== 'string') continue;
      seen.add(a.agent);
      result.push({ agent: a.agent, job: a.job, reply: a.reply.trim().slice(0, 120) || '…' });
    }
    if (!result.length) throw new BrainError('The crew could not agree on a rule. Send the order again.', 502);
    return result;
  }

  async function order(data = {}) {
    const said = text(data.text, 'Order', 300);
    const to = data.to === 'crew' ? 'crew' : NAMES.includes(data.to) ? data.to : null;
    if (!to) throw new BrainError('Unknown crew member.');
    const allowed = to === 'crew' ? NAMES : [to];
    const current = Object.fromEntries(NAMES.map(n => [n, JOBS.includes(data.jobs?.[n]) ? data.jobs[n] : 'wander']));

    if (mode === 'dry-run') {
      const jobs = parseJobs(said);
      if (to === 'crew') {
        if (!jobs.length) return { source: 'dry run', assignments: NAMES.map(agent => ({ agent, job: 'keep', reply: DRY_UNKNOWN })) };
        return { source: 'dry run', assignments: NAMES.map((agent, i) => {
          const job = jobs.includes(CREW[agent].usual) ? CREW[agent].usual : jobs[Math.min(i, jobs.length - 1)];
          return { agent, job, reply: DRY_REPLIES[job] };
        }) };
      }
      if (jobs.length !== 1) return { source: 'dry run', assignments: [{ agent: to, job: 'keep', reply: DRY_UNKNOWN }] };
      return { source: 'dry run', assignments: [{ agent: to, job: jobs[0], reply: DRY_REPLIES[jobs[0]] }] };
    }

    const content = JSON.stringify({
      orderFor: to === 'crew' ? 'the whole crew: split the work sensibly, one assignment per agent' : `${to} only: return exactly one assignment, for ${to}`,
      order: said, currentJobs: current, farm: farmFacts(data.farm)
    });
    const { data: answer, source } = await ask(model, ORDER_SYSTEM, content, ORDER_SCHEMA);
    return { source, assignments: cleanAssignments(answer.assignments, allowed) };
  }

  async function diary(data = {}) {
    const day = count(data.day) || 1;
    const agents = NAMES.map(name => {
      const a = (Array.isArray(data.agents) ? data.agents : []).find(a => a?.name === name) || {};
      return { name, jobsFinished: count(a.done), standingOrder: JOBS.includes(a.job) ? a.job : 'wander' };
    });
    // Short facts the game logged today, such as who cleared a fallen tree.
    const happened = (Array.isArray(data.events) ? data.events : []).filter(e => typeof e === 'string' && e.length <= 200).slice(-10);
    if (mode === 'dry-run') {
      return { source: 'dry run', entries: agents.map(a => ({ agent: a.name, text: `Day ${day}: ${a.jobsFinished} jobs finished. ${DRY_DIARY[a.name]}` })) };
    }
    const { data: answer, source } = await ask(chatModel, DIARY_SYSTEM, JSON.stringify({ day, agents, happenedToday: happened, farm: farmFacts(data.farm) }), DIARY_SCHEMA);
    const entries = NAMES.map(name => {
      const e = (Array.isArray(answer.entries) ? answer.entries : []).find(e => e?.agent === name && typeof e.text === 'string' && e.text.trim());
      return e && { agent: name, text: e.text.trim().slice(0, 400) };
    }).filter(Boolean);
    if (!entries.length) throw new BrainError('The diary came back empty. It will be retried tomorrow.', 502);
    return { source, entries };
  }

  async function event(data = {}) {
    if (!EVENT_TYPES.includes(data.type)) throw new BrainError('Unknown event.');
    const situation = text(data.situation, 'Situation', 500);
    const agents = [...new Set(Array.isArray(data.agents) ? data.agents : [])].filter(n => NAMES.includes(n));
    if (!agents.length) throw new BrainError('An event needs at least one crew member.');
    const options = (Array.isArray(data.options) ? data.options : []).filter(o => typeof o?.id === 'string' && /^[\w-]{1,30}$/.test(o.id) && typeof o.label === 'string' && o.label.length <= 200);
    if (options.length < 2 || options.length > 5 || new Set(options.map(o => o.id)).size !== options.length) throw new BrainError('An event needs two to five distinct options.');

    if (mode === 'dry-run') {
      const lines = DRY_EVENT_LINES[data.type]
        .filter(([who]) => agents[who])
        .map(([who, line]) => ({ agent: agents[who], text: line.replace('{1}', agents[1] || 'anyone') }));
      return { source: 'dry run', choice: options[0].id, lines };
    }

    const schema = {
      type: 'object',
      properties: {
        choice: { type: 'string', enum: options.map(o => o.id) },
        lines: { type: 'array', items: { type: 'object', properties: { agent: { type: 'string', enum: agents }, text: { type: 'string' } }, required: ['agent', 'text'], additionalProperties: false } }
      },
      required: ['choice', 'lines'],
      additionalProperties: false
    };
    const content = JSON.stringify({ event: data.type, situation, agentsInvolved: agents, options, farm: farmFacts(data.farm) });
    const { data: answer, source } = await ask(model, EVENT_SYSTEM, content, schema);
    if (!options.some(o => o.id === answer.choice)) throw new BrainError('The crew picked an option the game does not offer.', 502);
    const lines = (Array.isArray(answer.lines) ? answer.lines : [])
      .filter(l => agents.includes(l?.agent) && typeof l.text === 'string' && l.text.trim())
      .slice(0, 4)
      .map(l => ({ agent: l.agent, text: l.text.trim().slice(0, 120) }));
    return { source, choice: answer.choice, lines };
  }

  async function chat(data = {}) {
    const agents = [...new Set(Array.isArray(data.agents) ? data.agents : [])].filter(n => NAMES.includes(n)).slice(0, 2);
    if (agents.length !== 2) throw new BrainError('A chat needs two crew members.');
    const facts = data.facts || {};
    const strings = (list, max, n) => (Array.isArray(list) ? list : []).filter(v => typeof v === 'string' && v.length <= max).slice(-n);
    if (mode === 'dry-run') {
      const pair = DRY_CHATS[count(data.index) % DRY_CHATS.length];
      return { source: 'dry run', lines: pair.map((text, i) => ({ agent: agents[i], text })) };
    }
    const content = JSON.stringify({
      agents, happenedToday: strings(facts.today, 200, 6), doing: strings(facts.doing, 80, 2),
      weather: facts.weather === 'rain' ? 'rain' : 'clear', coins: count(facts.coins), farm: farmFacts(data.farm)
    });
    const schema = {
      type: 'object',
      properties: { lines: { type: 'array', items: { type: 'object', properties: { agent: { type: 'string', enum: agents }, text: { type: 'string' } }, required: ['agent', 'text'], additionalProperties: false } } },
      required: ['lines'],
      additionalProperties: false
    };
    const { data: answer, source } = await ask(chatModel, CHAT_SYSTEM, content, schema);
    const lines = (Array.isArray(answer.lines) ? answer.lines : [])
      .filter(l => agents.includes(l?.agent) && typeof l.text === 'string' && l.text.trim())
      .slice(0, 4)
      .map(l => ({ agent: l.agent, text: l.text.trim().slice(0, 120) }));
    if (!lines.length) throw new BrainError('The chat came back empty.', 502);
    return { source, lines };
  }

  return { mode, model: mode === 'live' ? model : null, chatModel: mode === 'live' ? chatModel : null, order, diary, event, chat };
}

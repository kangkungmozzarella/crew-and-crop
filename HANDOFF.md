# Crew & Crop: handoff

Start here. This file carries the plan agreed in an earlier Claude Code session (the Kantor Kita project) so this session can begin without that conversation.

## The idea

A small 2D farming game in the spirit of Hay Day, where a crew of AI agents runs the farm. The player gives each agent standing orders in plain English ("harvest the rice whenever it's ready, wander around while you wait"). The agents carry those orders out on their own, fill the gaps between jobs with idle life, talk to each other, and report back.

The point of the project, and the reason it should get attention on Threads and LinkedIn: **AI you can normally only read about, made visible and fun to watch.** The owner's earlier project, Kantor Kita (a 3D office where AI teammates draft tasks), drew far more engagement than their non-AI projects, so the AI angle has to be real and visible here.

## Core design rule (agreed, do not drop)

**AI understands, decides and talks. The game engine moves, counts and keeps time.**

- A standing order is sent to the model **once**. The model turns it into a structured rule (task, trigger, follow-up steps, idle behaviour). The game then runs that rule on its own clock. Example:

  ```
  task    : harvest rice
  when    : rice is ripe (every 5 minutes)
  then    : store in the barn, replant
  between : wander around the farm
  ```

- The model is **not** polled on a timer. It is called only when something needs thinking:
  - a new order, or two orders that clash (reschedule)
  - an exception the rule can't handle: barn full, path blocked, a random event
  - conversation between agents, and the end-of-day diary
- Money, stock, growth timers and positions live in code. The model never invents state; it chooses among valid actions the game offers.
- Walking, chopping, sweeping and harvesting animations are plain scripted behaviour. Labelling scripted chores as "AI" would be dishonest and would be called out.

## Version 1 scope (keep it small)

- **Farm:** one rice paddy (ripens every 1 minute during testing, configurable), a yard where leaves fall and pile up, a few trees that age, a barn, and a small house where the crew sleeps.
- **Crew of three, each with a personality that changes how they work** (the rules carry the quirk; the model gives it a voice):
  - **Dale**, harvester. Hard-working, but stops for coffee whenever he passes the kitchen.
  - **Rosie**, sweeper. A perfectionist who re-sweeps a clean patch if one leaf lands.
  - **Hank**, lumberjack. Eager, but sometimes forgets to plant a sapling after felling a tree.
- **One command box per agent** for standing orders, plus one **crew-wide box** for vague goals ("get the farm tidy before guests arrive at 3"), which the model splits across the three agents. This is the "wow" moment: one sentence, three people moving.
- **Visible reaction within seconds** of every order: a speech bubble with the agent's reply, then movement.
- **Small interactions between agents**: asking for help (a fallen tree blocks the paddy path), negotiating over a shared item (one wheelbarrow).
- **Day and night cycle**: morning, noon, evening, night; the crew goes home to sleep.
- **Farm diary** at the end of each day: one or two lines per agent, in their own voice. Easy to screenshot.
- **Dry-run mode** without an API key, clearly labelled, so everything can be tried for free.

Later versions, one social post each: random events (rain, pests, surprise guests), animals, a market town where AI traders haggle (an earlier idea, "AI market"), and viewers voting on events.

## Look and feel

- 2D, but **not** plain boxes: an illustrated farm seen from the side or a slight top-down angle, tents and fences, crops that grow in visible stages, small animations (falling leaves, swaying trees, sweeping dust, harvest pops), lighting that changes with the time of day. Think cozy indie game.
- **All product text is English**: UI, dialogue, diary, logs, README. Characters have English names.
- The owner dislikes generic "AI slop" UI. The `antislop`, `antislop-ui` and `antislop-copywriting` skills are available; load them before building the interface.
- Must work on phone width (375px) without horizontal scroll.

## Suggested stack (from Kantor Kita, proven there)

- Vanilla HTML/CSS/JS with Canvas 2D (or PixiJS from a CDN if Canvas gets heavy). No build step.
- A tiny Node server (Node 22, no npm dependencies): serves `public/`, holds game state, and calls the Claude API so the key never reaches the browser. Listen on `127.0.0.1` only until there is authentication.
- Claude Messages API via `fetch`. Before writing model code, load the `claude-api` skill and confirm current model ids and pricing. Plan: a lightweight model (Haiku) for chatter and bubbles, a stronger one (Sonnet) for turning orders into rules and for crew-wide planning. Model per agent is configurable.
- `.env` with `ANTHROPIC_API_KEY` (copy from `.env.example`); `.env` and any save data are git-ignored.
- Ask the model for structured JSON (the rule format above) and validate it in code; reject or ask again on invalid output.
- Browser tests with Playwright. On this machine: `PLAYWRIGHT_MODULE=/Users/kurosim/.npm/_npx/e41f203b7505f1fb/node_modules/playwright`. Tests must use dry run and never call the paid API.

## Lessons from Kantor Kita worth reusing

- Characters walking: plan paths on a grid around obstacles, let characters turn before they move, play the walk animation only while they actually cover ground, and make anyone who has waited about 3 seconds go ahead anyway, otherwise crowds at a doorway deadlock.
- Make every AI output reviewable and labelled (model name, or "dry run"), and say plainly in the UI what is simulated.
- A fake page clock (`page.clock`) makes frame-by-frame video recording and timing tests reliable.

## Working with the owner

- They chat in **Indonesian**; reply in Indonesian. The product itself stays English.
- Git: commit and push promptly when asked; **never** add a `Co-Authored-By` trailer or any AI attribution to commits or PRs.
- GitHub account: `kangkungmozzarella`. New repos are **private** unless told otherwise. Ask before creating a repo.
- The local git email is `andrea.micola@kurosim.com`; do not change git config without asking.
- They like seeing progress: screenshots and short videos for posts, a quick summary of what changed and how to try it.

## First steps for this session

1. `git init` in this folder; add `.gitignore` (`.env`, `node_modules/`, save data, `.DS_Store`).
2. Build the static farm scene and the three agents moving on scripted routines, in dry run, so the owner can see it early.
3. Add command boxes, the rule format, and order handling in dry run (deterministic parsing of a few phrasings).
4. Wire in the real model behind the same interface, then the crew-wide goal, interactions and the diary.
5. Tests, README, then show the owner and commit.

## Open questions to confirm with the owner

- Side view or slight top-down for the 2D art?
- Can the player also plant and harvest by hand, or only give orders and watch?
- Should the market be part of this game later, or a separate project?

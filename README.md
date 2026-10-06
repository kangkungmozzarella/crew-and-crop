# Crew & Crop

A small farming-game prototype inspired by Hay Day. Dale harvests rice, Rosie sweeps leaves, and Hank chops trees. Give standing orders and watch them repeat. This version uses original Three.js 3D models. Claude turns plain-English orders into standing rules and writes the crew's diary; without an API key, a clearly labelled dry run uses keyword matching and scripted lines.

## Run

Node 22 or newer:

```sh
npm install
npm start
```

Open http://127.0.0.1:3000. Three.js is served locally from public/vendor; the game does not fetch assets or libraries from a CDN. The 3D view requires WebGL2.

## Camera

Drag to rotate the farm, scroll to zoom, or use two fingers to zoom and pan. Camera buttons offer the same actions. Focus the farm canvas to use arrow keys, +/minus and Home. Camera movement also works while the simulation is paused. If WebGL is unavailable, the page shows an error and orders remain usable.

## Play

Give the crew an order in plain English, or give one farmer their own. In dry run, use the job words: `Harvest rice, sweep the yard and chop mature trees`; individual orders need exactly one of `harvest`, `sweep`, `chop`, `plant`, `wander` or `stop`. Unsupported orders leave the current job unchanged. Crops ripen in 60 simulation seconds, a day lasts four minutes, and the crew sleeps at night. Use Pause or Speed to control the clock. Harvest ripe rice manually with the button below the farm. Send Hank a planting order to replace stumps.

The barn holds 80 items total. At capacity, collection waits. **Sell at the stall** sells everything at 2 coins per rice and 4 per wood; barn expansion is not implemented. Progress, standing orders and diaries are saved in this browser. Reset farm asks before deleting the saved farm. Harvested rice and felled wood are carried first and hauled to the barn in the farm's single wheelbarrow, three items per trip. No synchronization, pathfinding around buildings or coffee detours are implemented yet.

## Checks

With Playwright and Chromium available, run `npm test` while the server is running. Set `PLAYWRIGHT_MODULE` if Playwright lives outside the default local installation. Tests use an isolated browser, fake time and dry-run mode. Screenshots are written to `artifacts/`.

## Next

Barn expansion paid with coins, animals that produce goods, a market town where AI traders haggle with each other, viewers voting on events, and obstacle-aware travel. The game keeps control of stock, positions and timers.

The 3D renderer uses [Three.js](https://threejs.org/docs/) and its OrbitControls. The dependency license is copied to `public/vendor/THREE-LICENSE.txt` during installation.

## Expanded farm

The scene follows the first detailed farm reference supplied by the owner: cream farmhouse and red gambrel barn, fenced golden crop field and vegetable beds, chicken yard, cow/sheep shelters, fruit trees, pond, ducks, footbridge, flowers, hay and a cart. The terrain is roughly 32 by 23 world units, approximately twice the former footprint. The camera uses orthographic projection for the reference's isometric proportions and supports close zoom and panning.

The playable crop cells and lumber trees keep their existing data and save format. The vegetable beds, livestock and ducks are scenic models with gentle idle animation; they do not produce stock or accept jobs yet. Preview screenshots use an isolated browser with ripe crops staged at simulation time 40 seconds.

While there is no available work, the crew follows small scripted idle routines: Dale takes a coffee break, Rosie checks the garden, and Hank visits the orchard. They stroll between stops with short pauses and resume their standing order as soon as work becomes available. Idle routines produce no inventory or job counts. Stop keeps a character resting; night and simulation pause still take priority. A full barn blocks collection but allows idle life. These routines are scripted, not model decisions.

## Large farm districts

The latest layout has a 65×48 terrain footprint, approximately four times the prior 32×23 bounding area. New districts include large western crop beds, a fruit orchard, greenhouses, additional homes, silos, a tractor workshop, cow/sheep/chicken paddocks, a lake with ducks, stream and bridges, a dock, picnic tables and a flower garden. Objects retain their original scale. The central farm remains playable with the same saved progress; the extra fields, livestock and buildings are scenic.

Use **Explore the farm** to switch between Whole farm, Farmyard & crew, Western fields, Fruit orchard, Farm village & workshop, Livestock pastures and Lake & gardens. Zoom and orbit work in every view, including while paused. Reset view and Home return to Whole farm.

Run `node tests/farm-areas.mjs` with the server running to check all district views, camera controls, keyboard, paused navigation, image changes and responsive layouts. District screenshots go to `artifacts/farm-large-*.png`. `node tests/idle-life.mjs` checks idle and standing-order behaviour independently of the renderer.

## How the AI works

**AI understands, decides and talks. The game engine moves, counts and keeps time.**

Each order goes to the server once. In live mode, Claude turns it into a standing rule for each agent it concerns: one of the jobs the game supports (`harvest`, `sweep`, `chop`, `plant`, `wander`, `stop`, or `keep` the current one) plus a short reply in that agent's voice. A crew order such as "Get the farm tidy before guests arrive" is split across Dale, Rosie and Hank. The game then repeats those rules on its own clock; the model is not polled. At the end of each farm day, a smaller model writes one or two diary lines per agent from the day's real job counts and what happened.

The model is also called when a standing rule cannot handle a situation. The game describes it and offers the valid options; the model picks one and writes a short exchange between the agents involved, which plays out as speech bubbles:

- **Fallen tree.** From day 2, wind knocks a tree across the paddy path each morning, or use **Knock a tree onto the path**. Whoever needs to cross stops and decides: ask someone to clear it (Hank is twice as fast with his axe) or drag it aside alone.
- **Wheelbarrow.** When one agent needs the wheelbarrow while another is using it, they settle it: wait, keep working and haul later, or carry the load by hand at half speed. The choice holds for 45 farm seconds.
- **Full barn.** When the barn fills and harvesters still have work, they choose to wait, sweep, plant or rest.
- **Rain.** Rice grows 1.5× faster and more leaves fall; the crew keeps working or shelters by the barn until it passes.
- **Crows.** Crows land on the paddy and eat up to four plots after 25 farm seconds unless someone chases them off; the crew picks who goes, or leaves them.
- **Guests.** Guests arrive 30 farm seconds after notice. The crew sweeps together, leaves it to Rosie, or carries on; fewer leaves in the yard earn a bigger tip (2, 8 or 15 coins).
- **Trader.** A trader offers random prices. The crew sells everything, sells half, declines, or haggles for one coin more on each; the game, not the model, decides whether the trader accepts.

From day 2 the game schedules these by time of day: a fallen tree in the morning, a trader around midday, and up to two random slots for rain, crows or guests. **Make something happen** starts any of them on demand.

When two idle agents meet, they may chat: two to four lines grounded in what happened today, written by the diary model. At most two chats happen per farm day.

Only one problem is settled at a time. If the server cannot be reached, the game uses its default option and says so in the notebook.

The model never changes stock, growth or positions, and its output is validated against a JSON schema and the list of crew members and jobs. Orders it cannot map to a job keep the agent's current rule, and the agent says why. Every reply and diary line is labelled with the model that wrote it, or `dry run`.

Without an API key, the game runs in **dry run**: orders are matched by keyword and replies and diaries are scripted. To enable Claude, copy `.env.example` to `.env`, set `ANTHROPIC_API_KEY`, change `CREW_MODE` to `live`, and restart `npm start`. `ANTHROPIC_MODEL` (default `claude-sonnet-5-5`) reads orders; `ANTHROPIC_CHAT_MODEL` (default `claude-haiku-4-5`) writes the diary. Each order, problem, chat and diary is one request; orders, current jobs and farm counts are sent to Anthropic. The key stays on the server. Orders on Sonnet 5.5 use Anthropic's server-side refusal fallback.

Verification: `npm run test:brain` checks dry-run parsing, events, the live request shape and output validation with a fake client; it makes no paid calls. `node tests/crew-events.mjs` (server running) plays every problem, the stall sale and an idle chat through in the browser. Live provider behaviour is unverified until a key is configured.

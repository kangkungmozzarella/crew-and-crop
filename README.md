# Crew & Crop

A small farming-game prototype inspired by Hay Day. Dale harvests rice, Rosie sweeps leaves, and Hank chops trees. Give standing orders and watch them repeat. This version uses original Three.js 3D models and **dry-run rules with scripted dialogue**. A server-side Claude adapter supports collaborative text tasks; without an API key the workflow uses clearly labeled samples.

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

Give the crew `Harvest rice, sweep the yard and chop mature trees`. Individual orders accept one job: `harvest`, `sweep`, `chop`, `plant`, `wander` or `stop`. Unsupported phrases leave the current job unchanged. Crops ripen in 60 simulation seconds, a day lasts four minutes, and the crew sleeps at night. Use Pause or Speed to control the clock. Harvest ripe rice manually with the button below the farm. Send Hank a planting order to replace stumps.

The barn holds 80 items total. At capacity, collection waits; selling and barn expansion are not implemented. Progress, standing orders and scripted diaries are saved in this browser. Reset farm asks before deleting the saved farm. No synchronization, pathfinding around buildings, shared-tool negotiation, coffee detours or real model planning is implemented yet.

## Checks

With Playwright and Chromium available, run `npm test` while the server is running. Set `PLAYWRIGHT_MODULE` if Playwright lives outside the default local installation. Tests use an isolated browser, fake time and dry-run mode. Screenshots are written to `artifacts/`.

## Next

Extend the text task workflow with explicit tool integrations and obstacle-aware travel. The game keeps control of stock, positions and timers; agent results require owner review.

The 3D renderer uses [Three.js](https://threejs.org/docs/) and its OrbitControls. The dependency license is copied to `public/vendor/THREE-LICENSE.txt` during installation.

## Expanded farm

The scene follows the first detailed farm reference supplied by the owner: cream farmhouse and red gambrel barn, fenced golden crop field and vegetable beds, chicken yard, cow/sheep shelters, fruit trees, pond, ducks, footbridge, flowers, hay and a cart. The terrain is roughly 32 by 23 world units, approximately twice the former footprint. The camera uses orthographic projection for the reference's isometric proportions and supports close zoom and panning.

The playable crop cells and lumber trees keep their existing data and save format. The vegetable beds, livestock and ducks are scenic models with gentle idle animation; they do not produce stock or accept jobs yet. Preview screenshots use an isolated browser with ripe crops staged at simulation time 40 seconds.

While there is no available work, the crew follows small scripted idle routines: Dale takes a coffee break, Rosie checks the garden, and Hank visits the orchard. They stroll between stops with short pauses and resume their standing order as soon as work becomes available. Idle routines produce no inventory or job counts. Stop keeps a character resting; night and simulation pause still take priority. A full barn blocks collection but allows idle life. These routines are scripted, not model decisions.

## Large farm districts

The latest layout has a 65×48 terrain footprint, approximately four times the prior 32×23 bounding area. New districts include large western crop beds, a fruit orchard, greenhouses, additional homes, silos, a tractor workshop, cow/sheep/chicken paddocks, a lake with ducks, stream and bridges, a dock, picnic tables and a flower garden. Objects retain their original scale. The central farm remains playable with the same saved progress; the extra fields, livestock and buildings are scenic.

Use **Explore the farm** to switch between Whole farm, Farmyard & crew, Western fields, Fruit orchard, Farm village & workshop, Livestock pastures and Lake & gardens. Zoom and orbit work in every view, including while paused. Reset view and Home return to Whole farm.

Run `node tests/farm-areas.mjs` with the server running to check all district views, camera controls, keyboard, paused navigation, image changes and responsive layouts. District screenshots go to `artifacts/farm-large-*.png`. `node tests/idle-life.mjs` checks idle and standing-order behaviour independently of the renderer.

## Agent tasks and the result barn

Give the crew a goal in **Put the crew to work**, together with facts and constraints. Dale produces a plan, Rosie uses that plan to draft the deliverable, and Hank checks the draft. Open **View task** or a farmer's **View agent task** to inspect each handoff. Clicking a farmer in the 3D view opens the task too.

Only a running backend stage makes its farmer work at the task field. Farm time, speed and harvest animations cannot complete an agent task. **Pause** pauses the farm simulation; backend tasks continue. The scripted chore controls are a separate sandbox.

Hank's result waits for owner review. Request a revision to send it back through Rosie and Hank, or approve it to store it in **Result barn**. Approved results can be read and downloaded. Questions and failed stages offer an answer or manual retry. A server restart interrupts a running request and requires a manual retry. Goals, stage outputs, revisions and approvals persist locally in `data/projects.json`; do not delete that file unless you intend to erase task history.

By default, missing API credentials select **dry run**. Every sample output is labeled; dry run demonstrates the workflow without producing actual AI deliverables. To enable Claude, copy `.env.example` to `.env`, set `ANTHROPIC_API_KEY`, change `WORKFLOW_MODE` to `live`, and restart `npm start`. Keep the key in `.env`; never put it in public files. Each stage sends the goal, context and previous handoffs to Anthropic. Revisions make additional requests. Existing dry-run projects stay dry run after configuration changes.

The live adapter uses the [Anthropic Messages API](https://platform.claude.com/docs/en/api/messages/create). These agents produce and check text; they have no browsing, file execution or publishing tools. Supplied facts and owner review remain necessary. API errors and truncated outputs stop the stage rather than silently accepting a partial result.

Verification: `npm run test:workflow` checks orchestration and a mocked Claude adapter without paid requests. `TEST_URL=http://127.0.0.1:3011 node tests/workflow-browser.mjs` checks the UI against an isolated dry-run server; use a temporary `WORKFLOW_DATA_FILE` when testing to keep personal task data separate.

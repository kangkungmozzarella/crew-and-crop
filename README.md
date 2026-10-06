# Crew & Crop

A small farming-game prototype inspired by Hay Day. Dale harvests rice, Rosie sweeps leaves, and Hank chops trees. Give standing orders and watch them repeat. This version uses original Three.js 3D models and **dry-run rules with scripted dialogue**. No AI provider is connected and no paid calls are made.

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

Add validated structured rules, obstacle-aware travel and a server-side model adapter. Real AI should interpret new orders and handle exceptions; the game should keep control of stock, positions and timers.

The 3D renderer uses [Three.js](https://threejs.org/docs/) and its OrbitControls. The dependency license is copied to `public/vendor/THREE-LICENSE.txt` during installation.

## Expanded farm

The scene follows the first detailed farm reference supplied by the owner: cream farmhouse and red gambrel barn, fenced golden crop field and vegetable beds, chicken yard, cow/sheep shelters, fruit trees, pond, ducks, footbridge, flowers, hay and a cart. The terrain is roughly 32 by 23 world units, approximately twice the former footprint. The camera uses orthographic projection for the reference's isometric proportions and supports close zoom and panning.

The playable crop cells and lumber trees keep their existing data and save format. The vegetable beds, livestock and ducks are scenic models with gentle idle animation; they do not produce stock or accept jobs yet. Preview screenshots use an isolated browser with ripe crops staged at simulation time 40 seconds.

While there is no available work, the crew follows small scripted idle routines: Dale takes a coffee break, Rosie checks the garden, and Hank visits the orchard. They stroll between stops with short pauses and resume their standing order as soon as work becomes available. Idle routines produce no inventory or job counts. Stop keeps a character resting; night and simulation pause still take priority. A full barn blocks collection but allows idle life. These routines are scripted, not model decisions.

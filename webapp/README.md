# Algorithm Lab

An interactive library covering Binary Search, Insertion Sort, Selection Sort, Bubble Sort, Merge Sort, Quicksort, BFS, DFS, Dijkstra shortest paths, and naive string matching. It uses the existing Logic Workshop palette and Alexandria font, with Egyptian Arabic explanations, an English toggle, and English pseudocode.

Open **[dist/index.html](dist/index.html)** in a browser. The built file contains the font, styles, code, and both lessons; it works offline and needs no backend or account.

From the project root:

```sh
npm run build:web
npm run web
npm run test:web
```

`npm run web` rebuilds the standalone file and serves it at `http://127.0.0.1:5163`. Set `LAB_PORT` to choose another port. Restart it after editing the source. Existing video-production commands remain available.

## Explore a lesson

- Play or pause, change speed, step forward or backward, reset, or seek to any execution step.
- Follow the highlighted pseudocode line, variables, comparisons, and card movements together.
- Edit up to 16 integers for searching and sorting; try reverse order, duplicate identities, and empty inputs.
- Explore BFS and DFS on undirected graphs, or Dijkstra on directed nonnegative weighted graphs. Graphs support up to 8 nodes and 20 edges. Each editor explains its syntax.
- Slide a pattern through text with naive first-match search; indices count Unicode code points. Try overlapping candidates, missing matches, and empty patterns.
- Binary Search checks sorted order. “Sort & apply” explicitly sorts the input before building the trace; returned indices refer to that sorted input.
- Open “The idea” for the invariant, three conceptual steps, prerequisites, complexity, and edge cases.
- Use Space to play or pause and arrow keys to step when focus is outside a control. Native keyboard interaction remains available on buttons, inputs, and the timeline.

## Source and verification

`algorithms.js` produces immutable execution snapshots. Both playback and line highlighting use those snapshots. Insertion Sort keeps actual copied array values separate from card identities and the illustrated insertion gap. A faint value in that gap is still present in memory until overwritten.

`lessons/*.js` supply independent trace generators, theory, and input schemas through the [shared contract](lessons/CONTRACT.md). `lesson-view.js` draws moving cards, aligned character rows, graph edges, queue/stack collections, and theory.

`app.js` handles interaction and bilingual copy; `styles.css` contains the responsive design; `build.mjs` makes the portable HTML file. `tests/algorithms.test.cjs` checks results, stability, card conservation, bounds checks, line mappings, and input validation.

`tests/browser-check.js` exercises the actual interface, including seeking, playback, input validation, language switching, theory tabs, and responsive layout. It is a QA fixture and is not bundled into the app. Results are recorded in `review/qa.json`. `node webapp/prepare-preview.mjs` generates compact standalone and inline review versions after building.

The complexity figures describe the algorithms themselves. The visualizer additionally stores execution history so users can seek backward. No inputs are uploaded; only the language preference is saved locally. The bundled font's license is in `dist/FONT-LICENSE.txt`.

## Cloudflare

The project uses Cloudflare Workers static assets, configured in `wrangler.jsonc`. From an authenticated Cloudflare account, run `npm run deploy:web` to test, build, and deploy the static output from the current checkout. Only `webapp/dist` is uploaded; server-side credentials are not needed by the published app.

GitHub Actions runs the algorithm and contract tests and builds the app on pushes to `main` and pull requests. Cloudflare publication is explicit through the deploy command; no GitHub deployment secrets are required.

# CS Concept Lab lesson interface

Each lesson is one dependency-free classic JavaScript module at `webapp/lessons/<id>.js`. Attach the object to `globalThis.AlgorithmLessons[id]` and export it through `module.exports` when available. Do not require another new lesson. `globalThis.AlgorithmLab` is available in the browser; tests may require `../algorithms.js` explicitly if needed.

The host owns navigation, inputs, playback, seeking, pseudocode, localization, layout and scene animation. A lesson owns its pure trace generator, validation, explanatory content, examples, and tests. Do not edit shared app files.

## Lesson object

- `id`: the assigned slug; `name`: English name; `category`: `sort`, `graph`, or `string`; `number`: assigned two-digit lesson number.
- `label`: uppercase concept name; `cost`: concise worst-case time such as `O(n²)`.
- `description`, `note`: bilingual objects `{en: string, ar: string}`. Use conversational Egyptian Arabic with English identifiers.
- `code`: an array of English pseudocode lines; line references are one-based. Prefer readable short lines (<60 characters). Use `value`, never `key`, for a saved array value. Match the algorithm actually traced, including helper routines.
- `fields`: array of `{name, label: bilingual, help?: bilingual, type: 'text'|'textarea', maxLength?: number}`. Use `numbers` for sorts. Graphs use a text adjacency/edge representation and a start node; explain the accepted syntax. All fields are strings in raw input.
- `defaults`: raw input object with string values.
- `presets`: array of `{id, label: bilingual, input: rawInput}`; include at least default and meaningful edge cases.
- `parse(rawInput)`: returns validated algorithm input; reject excessive or malformed input. Throw an Error with optional `.userMessage = {en,ar}`. No DOM use. All constraints must also be enforced by `build` on its public input.
- `build(parsedInput)`: returns a finite, deterministic array of immutable-by-snapshot frames (independent deep copies; no input mutation). First frame is ready, last has `state.done === true` and a meaningful `state.result`.
- `summary(parsedInput)`: bilingual short dataset summary.
- `theory`: `{title,intro,invariant,steps:[{title,body}],notes:[bilingual],costs:[{label:bilingual,value:string}]}`; all title/body text bilingual. Include prerequisites, complexity assumptions, correctness invariant, and honest tradeoffs.

## Frame

```
{
  kind: 'ready' | ...,
  lines: [oneBasedLineNumber],
  title: {en, ar}, explanation: {en, ar}, equation: '',
  state: {done:false, result:null, ...algorithmState},
  variables: [{name:'left', value:0}],
  metrics: [{label:{en:'Comparisons',ar:'مقارنات'},value:0}],
  scene: {
    rows: [{id:'numbers',label:{en:'Array',ar:'الصف'},layout:'cards',cells:[
      {id:'item-0',value:7,index:0,tone:'active',marker:'i'}
    ]}],
    graph: null,
    collections: [{label:{en:'Queue',ar:'الطابور'},values:['A','B']}],
    note:{en:'...',ar:'...'}
  }
}
```

Scene fields are optional. `tone` can be `default`, `active`, `sorted`, `muted`, `pivot`, or `found`. Cell identities must stay stable across movements so the host can animate them; duplicate values need different identities. The same identity must not appear twice within a row. Use distinct row/cell IDs for scratch copies. `index` and `marker` are optional. Rows display empty inputs sensibly. `layout:'aligned'` keeps character cells horizontally aligned in a scrollable viewport (use blank cells to offset a pattern; set a unique cell ID on every blank). All data is plain text, never HTML.

`scene.graph` supports `{nodes:[{id,label,tone,detail?}],edges:[{from,to,weight?,tone?,directed?:boolean}]}`. The host positions nodes evenly on a circle, highlights current and visited nodes/edges, and shows weights and details. Order nodes deterministically. Use at most 8 nodes and 20 edges. For shortest paths use Dijkstra with nonnegative weights, and label it explicitly. Infinity should be displayed as the string `∞` in snapshots, never lost as JSON null. Show priority/frontier selection and successful/unsuccessful relaxation with actual line references.

String matching: implement the naive first-match algorithm; label the implementation and explain its worst-case behavior. Text is at most 24 Unicode code points and pattern at most 10. Define empty-pattern behavior and match indices consistently (code points). Include overlapping candidate alignments and not-found input.

Sorting: at most 16 safe integers in [-999,999], allow an empty array, negatives and duplicates. Show every comparison and movement in the trace, truthful line references, correct boundaries and stable item identity. Merge sort should make auxiliary storage/merge visible. Quicksort should show its pivot, partition and subproblem stack/ranges; document its chosen partition scheme and unstable behavior.

BFS/DFS: visit only the start node's reachable component; state that explicitly. Define deterministic neighbor order. Show queue or recursion/stack, discovered/visited status, and examined edges. Include cycles, a disconnected graph, a singleton, and empty graph behavior. Validate node labels as single ASCII uppercase letters A-H so inputs are safe and labels remain concise.

Explain the state and the cause of each operation; do not recite the entire list of numbers. Exact comparison equations and indices are useful. No new dependencies, network calls, visual HTML, or shared-file changes inside lessons.

## Verification

Add `webapp/tests/<id>.test.cjs` using `node:test` and `assert`. Test actual results over multiple inputs, validation, no input mutation, independent snapshots, line ranges, scene references and relevant invariants. Sorting tests should include randomized arrays and duplicate identities; graph/string tests should cover edge cases. Tests must pass with `node --test webapp/tests/<id>.test.cjs`. Commit only your module and test file; the coordinator integrates, publishes and deploys.

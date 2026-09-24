# Sorting visualizer

The lazy-loaded `/sorting` page supports 5–80 bars and Bubble Sort, Insertion
Sort, Merge Sort, and Quick Sort. The selector, descriptions, complexity table,
stability, and in-place labels come from `SORTING_ALGORITHMS` metadata.

## Adding an algorithm

1. Implement a pure generator matching `SortingAlgorithm.sort` in
   `src/app/sorting/sorting-algorithms.ts` (or import it from a separate file).
   Copy the readonly input and emit typed comparison, swap, write, pivot,
   insertion, and completion events as needed. The generator must not update
   Angular signals or the DOM.
2. Add its metadata and English/Finnish name and description keys. The selector,
   explanatory text, and complexity table are rendered from this registry.
3. Add representative input cases to the registry-driven algorithm tests and
   run `npm test` and `npm run build`.

The shared `VisualizationPlayback` consumes one event at a time and owns speed,
start/pause/resume, manual step, reset, elapsed playback time, and cancellation.
The page applies each event to bar state. Playback is opt-in and Single step can
be used without timed animation. The timer measures active playback duration,
including the selected delays; it is not a benchmark of raw execution time.

## Complexity

| Algorithm      | Best       | Average    | Worst      | Space                        | Stable | In-place |
| -------------- | ---------- | ---------- | ---------- | ---------------------------- | ------ | -------- |
| Bubble Sort    | O(n)       | O(n²)      | O(n²)      | O(1)                         | Yes    | Yes      |
| Insertion Sort | O(n)       | O(n²)      | O(n²)      | O(1)                         | Yes    | Yes      |
| Merge Sort     | O(n log n) | O(n log n) | O(n log n) | O(n)                         | Yes    | No       |
| Quick Sort     | O(n log n) | O(n log n) | O(n²)      | O(log n) average, O(n) worst | No     | Yes      |

These are standard algorithm bounds; the event generator and visualizer use
additional state. Quick Sort uses the last value as its pivot, making already
ordered input a visible worst-case example. Merge Sort writes a buffered range
back into the bars, so temporary duplicate values during that animation are
expected.

See [Algorithms Visualizer](algorithms-visualizer.md) for search and pathfinding
behavior, the shared event model, and the pathfinding cost rules.

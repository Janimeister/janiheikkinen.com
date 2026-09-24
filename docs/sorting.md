# Sorting visualizer

The lazy-loaded `/sorting` page supports 5–80 bars (default 30), Bubble Sort and
Merge Sort, and 1–100 operations per second. Speed changes apply during playback.
Reset or selecting another algorithm restores the original shuffled input for
comparison. Changing the count or shuffling cancels playback and creates a new
input. Playback is opt-in; Single step provides a motion-free alternative.

## Adding an algorithm

1. Implement a pure generator matching `SortingAlgorithm.sort` in
   `src/app/sorting/sorting-algorithms.ts` (or import it from a separate file).
   Copy the readonly input; emit `compare`, `swap`, or `write` operations with
   zero-based indices. Operations must replay to the sorted result. The generator
   must terminate; the player marks the entire array complete when it does.
2. Add metadata to `SORTING_ALGORITHMS` and English/Finnish name and description
   keys to `src/app/i18n/translations.ts`. The selector and explanation are derived
   from this registry, so no page or playback changes are required.
3. Run `npm test` and `npm run build`. The registry-driven correctness tests
   automatically cover the new algorithm, including duplicates and empty input.

Generators contain no timers, DOM code or Angular dependencies. The component
consumes one operation per timer tick and cancels timers on pause, reset, shuffle,
algorithm/size changes and destruction. Steps are generated lazily, not stored.
Comparisons count emitted comparison operations; writes count one per write and
two per swap, excluding internal copies and merge buffers. Displayed memory bounds
include the generator's input copy. Merge writes may temporarily duplicate values;
this is expected while a buffered merged range is written back.

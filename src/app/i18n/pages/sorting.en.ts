// English copy for /sorting; it travels with the page's own chunk.
export const SORTING_EN = {
  'sorting.elapsed': 'Elapsed animation time',
  'sorting.elapsedHelp':
    'Actual playback time, including animation delays at the chosen speed. Pauses and manual steps add no time. Speed changes affect the remaining playback, not time already elapsed. This is not a CPU benchmark.',
  'sorting.complexity': 'Time complexity',
  'sorting.best': 'Best case',
  'sorting.average': 'Average case',
  'sorting.worst': 'Worst case',
  'sorting.complexityHelp':
    'n is the number of values. Big O describes how work grows as n increases; animation speed does not change it. Bubble Sort can stop in O(n), and Insertion Sort takes O(n) on nearly sorted input. Merge Sort stays O(n log n); this Quick Sort uses the last value as pivot, so ordered inputs can reach O(n²). Space describes the standard algorithm, excluding visualization state.',
  'sorting.subtitle':
    'Watch order emerge one operation at a time. Compare four approaches on the same shuffled numbers.',
  'sorting.algorithm': 'Algorithm',
  'sorting.size': 'Numbers',
  'sorting.sizeHelp': '5–80 numbers to keep the bars readable.',
  'sorting.speed': 'Speed',
  'sorting.speedHelp': '1–100 operations per second. Adjustable while running.',
  'sorting.start': 'Start',
  'sorting.pause': 'Pause',
  'sorting.resume': 'Resume',
  'sorting.step': 'Single step',
  'sorting.reset': 'Reset',
  'sorting.shuffle': 'Shuffle',
  'sorting.controlsHelp':
    'Reset and algorithm changes restore the same numbers. Changing the count or shuffling starts a new set. Use Single step to explore without playback.',
  'sorting.comparisons': 'Comparisons',
  'sorting.writes': 'Array writes',
  'sorting.chart':
    'Sorting visualization with {count} numbers. Current values are available below.',
  'sorting.legend':
    'Thick top edge: comparison · ⇄: swap · Dashed outline: partition · P: pivot · Horizontal stripes: sorted prefix (may move) · Diagonal stripes: shifting or final positions · K: held insertion value · ↓: insertion position',
  'sorting.values': 'Current values',
  'sorting.space': 'Working memory',
  'sorting.spaceHelp':
    'These values describe the standard algorithm; the event generator and visualizer use additional memory.',
  'sorting.bubble': 'Bubble Sort',
  'sorting.merge': 'Merge Sort',
  'sorting.bubbleDescription':
    'Compare neighboring numbers and swap them when out of order. Each pass moves the largest remaining number to the end; stop early if no swaps are needed.',
  'sorting.mergeDescription':
    'Split the array into halves, sort each half, then merge them in order. The animation compares the two halves before writing the merged result back; temporary duplicate values during writes are expected.',
  'sorting.ready': 'Ready',
  'sorting.running': 'Sorting…',
  'sorting.paused': 'Paused',
  'sorting.done': 'Sorted!',
  'sorting.insertion': 'Insertion Sort',
  'sorting.quick': 'Quick Sort',
  'sorting.insertionDescription':
    'Keep a sorted prefix and insert the next value where it belongs. It is stable and in-place, and works especially well on short or nearly sorted lists.',
  'sorting.quickDescription':
    'Partition around the last value as a pivot, then sort the smaller ranges. It is fast on average and in-place, but this pivot choice can take quadratic time on already ordered data.',
  'sorting.stability': 'Stable',
  'sorting.inPlace': 'In place',
  'sorting.stable': 'Yes',
  'sorting.unstable': 'No',
  'sorting.yes': 'Yes',
  'sorting.no': 'No',
  'sorting.pivotLabel': 'Pivot',
  'sorting.keyLabel': 'Value being inserted',
  'sorting.sortedLabel': 'Final sorted position',
  'sorting.prefixLabel': 'Sorted prefix (may still move)',
  'sorting.valueLabel': 'Value',
  'sorting.insertingValue':
    'Inserting {value}; K marks the saved value and the arrow marks its final position.',
} as const;

# Algorithms Visualizer

The visualizers are available at `/sorting`, `/searching`, and `/pathfinding`. Their category links keep the three pages together while preserving the existing Sorting URL.

## Shared playback

An algorithm is a typed generator that yields events. A page owns the visible state and applies those events; algorithm modules do not touch Angular or the DOM. `VisualizationPlayback` owns the shared ready/running/paused/done state, speed, timer, elapsed playback time, manual stepping, and cancellation. Resetting, changing an algorithm, or destroying a page clears its pending timeout and clock.

The shared `AlgorithmMetadata` type supplies catalog identity, translated name and description, category, time and space complexity, requirements, and optional characteristics. Category catalogs extend it with the data and event types their algorithm needs. Adding an algorithm means adding a generator and a catalog entry; the playback system does not need to change.

## Sorting

Sorting generators emit comparisons, swaps, writes, insertion shifts, pivot and partition selections, and sorted-position marks. The page translates these into bar highlights and keeps comparison/write counts separately.

| Algorithm      | Best       | Average    | Worst      | Space                        | Stable | In-place |
| -------------- | ---------- | ---------- | ---------- | ---------------------------- | ------ | -------- |
| Bubble Sort    | O(n)       | O(n²)      | O(n²)      | O(1)                         | Yes    | Yes      |
| Insertion Sort | O(n)       | O(n²)      | O(n²)      | O(1)                         | Yes    | Yes      |
| Merge Sort     | O(n log n) | O(n log n) | O(n log n) | O(n)                         | Yes    | No       |
| Quick Sort     | O(n log n) | O(n log n) | O(n²)      | O(log n) average, O(n) worst | No     | Yes      |

Quick Sort uses Lomuto partitioning with the last value as pivot. This makes its worst case visible on already ordered inputs. The displayed space values describe each standard algorithm and exclude the event player and its visualization copy.

## Searching

The generated array is ordered and contains distinct values. Linear Search also works on unsorted data and inspects from left to right. Binary Search requires sorted data, halves its range after each comparison, and returns the first matching index if duplicates are supplied to its pure algorithm.

The target input accepts any value from 1 to 999. Buttons choose a value from the current data or a value beyond its range. Comparison count is the number of inspections; the displayed elapsed time includes playback delay.

## Pathfinding

The grid has 10 rows and 12 columns and permits only up, right, down, and left moves. Entering a normal tile costs 1, medium terrain costs 3, and high-cost terrain costs 8. The starting tile is free; reported path cost sums the cost of each tile entered after it.

- Breadth-First Search treats every move as equal and minimizes the number of edges. It ignores terrain costs when choosing a path; the result still reports that path's actual terrain cost.
- Dijkstra expands the open node with the lowest known cost and finds a minimum-cost path through weighted terrain.
- A* uses the same weighted costs and adds Manhattan distance to the destination. Each move costs at least 1, so this heuristic is admissible and consistent for the four-direction grid.

Dijkstra and A* use a simple open-set scan to select their next node, so their current grid implementation is O(V²). BFS is O(V + E). The 120-cell grid keeps those implementations responsive and easy to inspect. A priority queue would be a sensible follow-up if the grid were made substantially larger.

All three algorithms emit the same frontier, visit, and path events and return route, cost, and visit statistics. Walls and weighted terrain can be edited independently of the algorithm; resetting a run preserves the grid.

## Testing

Algorithm unit tests exercise sorted and edge-case inputs independently from playback. Component tests cover controls, event rendering, resets, statistics, and cancellation. Playwright tests use an explicitly selected search target and fixed grid edits so their core algorithm scenarios are deterministic.

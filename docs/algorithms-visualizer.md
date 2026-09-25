# Algorithms Visualizer

The visualizers are available at `/sorting`, `/searching`, and `/pathfinding`. Their category links keep the three pages together while preserving the existing Sorting URL.

## Shared playback

An algorithm is a typed generator that yields events. A page owns the visible state and applies those events; algorithm modules do not touch Angular or the DOM. `VisualizationPlayback` owns the shared ready/running/paused/done state, speed, timer, elapsed playback time, manual stepping, and cancellation. Resetting, changing an algorithm, or destroying a page clears its pending timeout and clock and closes the generator so its cleanup runs. A disposed player cannot restart work.

The shared `AlgorithmMetadata` type supplies catalog identity, translated name and description, category, time and space complexity, requirements, and optional characteristics. Category catalogs extend it with the data and event types their algorithm needs. Adding an algorithm means adding a generator and a catalog entry; the playback system does not need to change.

## Sorting

Sorting generators emit comparisons, swaps, writes, insertion shifts, pivot and partition selections, sorted-prefix updates, and final sorted-position marks. Insertion compares against a held key, which stays visible as the insertion hole moves left; its sorted prefix is distinct from positions that will never move again. The page translates these into bar highlights and keeps comparison/write counts separately.

| Algorithm      | Best       | Average    | Worst      | Space                        | Stable | In-place |
| -------------- | ---------- | ---------- | ---------- | ---------------------------- | ------ | -------- |
| Bubble Sort    | O(n)       | O(n²)      | O(n²)      | O(1)                         | Yes    | Yes      |
| Insertion Sort | O(n)       | O(n²)      | O(n²)      | O(1)                         | Yes    | Yes      |
| Merge Sort     | O(n log n) | O(n log n) | O(n log n) | O(n)                         | Yes    | No       |
| Quick Sort     | O(n log n) | O(n log n) | O(n²)      | O(log n) average, O(n) worst | No     | Yes      |

Quick Sort uses Lomuto partitioning with the last value as pivot. This makes its worst case visible on already ordered inputs. The displayed space values describe each standard algorithm and exclude the event player and its visualization copy.

## Searching

The generated array contains 1–80 ordered, distinct values. Linear Search also works on unsorted data and inspects from left to right. Binary Search requires sorted data, halves its range after each comparison, and returns the first matching index if duplicates are supplied to its pure algorithm.

The target input accepts any value from 1 to 999. Buttons choose a value from the current data or a value beyond its range. Comparison count is the number of inspections; the displayed elapsed time includes playback delay.

## Pathfinding

The grid has 10 rows and 12 columns and permits only up, right, down, and left moves. Entering a normal tile costs 1, medium terrain costs 3, and high-cost terrain costs 8. The starting tile is free; reported path cost sums the cost of each tile entered after it.

- Breadth-First Search treats every move as equal and minimizes the number of edges. It ignores terrain costs when choosing a path; the result still reports that path's actual terrain cost.
- Dijkstra expands the open node with the lowest known cost and finds a minimum-cost path through weighted terrain.
- A* uses the same weighted costs and adds Manhattan distance to the destination. Each move costs at least 1, so this heuristic is admissible and consistent for the four-direction grid.

Dijkstra and A* use a simple open-set scan to select their next node, so their current grid implementation is O(V²). BFS is O(V + E). The 120-cell grid keeps those implementations responsive and easy to inspect. A priority queue would be a sensible follow-up if the grid were made substantially larger.

All three algorithms emit the same frontier, visit, and path events and return route, cost, and visit statistics. Walls and weighted terrain can be edited independently of the algorithm; resetting a run preserves the grid. Reloading the example layout keeps relocated endpoints traversable.

## Testing

Algorithm unit tests exercise sorted and edge-case inputs independently from playback. Component tests cover controls, event rendering, resets, statistics, and cancellation. Playwright visualizer tests seed dataset generation, select explicit targets, and edit fixed grid cells. They also fail on console errors or unhandled exceptions. Shared playback tests check that reset, reconfiguration, and destruction close generators and remove every pending timer. Weighted path tests compare Dijkstra and A* against an independent relaxation oracle on seeded layouts.

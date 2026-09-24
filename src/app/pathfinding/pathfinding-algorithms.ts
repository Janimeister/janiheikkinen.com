import type { TranslationKey } from '../i18n/translations';
import type { AlgorithmMetadata } from '../visualization/algorithm-metadata';

export type Terrain = 'normal' | 'medium' | 'high' | 'wall';

export interface PathfindingInput {
  readonly rows: number;
  readonly columns: number;
  readonly terrain: readonly Terrain[];
  readonly start: number;
  readonly destination: number;
}

export interface PathResult {
  readonly found: boolean;
  readonly path: readonly number[];
  /** Cost of entering path cells; the start cell is free. */
  readonly cost: number | null;
  readonly visited: number;
}

export type PathfindingStep =
  | { type: 'frontier'; node: number }
  | { type: 'visit'; node: number }
  | { type: 'pathNode'; node: number }
  | { type: 'noPath' };

export interface PathfindingAlgorithm extends Omit<
  AlgorithmMetadata<'pathfinding'>,
  'time' | 'requirements'
> {
  readonly time: string;
  readonly requirements: readonly [TranslationKey, ...TranslationKey[]];
  readonly findPath: (input: PathfindingInput) => Generator<PathfindingStep, PathResult, unknown>;
}

export function terrainCost(terrain: Terrain): number {
  if (terrain === 'medium') return 3;
  if (terrain === 'high') return 8;
  return 1;
}

export function gridNeighbours(node: number, rows: number, columns: number): number[] {
  const row = Math.floor(node / columns);
  const column = node % columns;
  const neighbours: number[] = [];
  if (row > 0) neighbours.push(node - columns);
  if (column + 1 < columns) neighbours.push(node + 1);
  if (row + 1 < rows) neighbours.push(node + columns);
  if (column > 0) neighbours.push(node - 1);
  return neighbours;
}

function reconstructPath(parent: readonly number[], start: number, destination: number): number[] {
  const reversed = [destination];
  let cursor = destination;
  while (cursor !== start && parent[cursor] >= 0) {
    cursor = parent[cursor];
    reversed.push(cursor);
  }
  return reversed.reverse();
}

function pathCost(path: readonly number[], terrain: readonly Terrain[]): number {
  return path.slice(1).reduce((cost, node) => cost + terrainCost(terrain[node]), 0);
}

function resultFor(
  input: PathfindingInput,
  parent: readonly number[],
  visited: number,
): PathResult {
  const path = reconstructPath(parent, input.start, input.destination);
  return {
    found: true,
    path,
    cost: pathCost(path, input.terrain),
    visited,
  };
}

export function* breadthFirstSearch(
  input: PathfindingInput,
): Generator<PathfindingStep, PathResult, unknown> {
  const count = input.rows * input.columns;
  if (input.start === input.destination) {
    yield { type: 'visit', node: input.start };
    yield { type: 'pathNode', node: input.start };
    return { found: true, path: [input.start], cost: 0, visited: 1 };
  }
  const visited = new Set<number>([input.start]);
  const parent = Array<number>(count).fill(-1);
  const queue = [input.start];
  let cursor = 0;
  let visitCount = 0;
  yield { type: 'frontier', node: input.start };
  while (cursor < queue.length) {
    const node = queue[cursor++];
    visitCount++;
    yield { type: 'visit', node };
    if (node === input.destination) {
      const result = resultFor(input, parent, visitCount);
      for (const pathNode of result.path) yield { type: 'pathNode', node: pathNode };
      return result;
    }
    for (const neighbour of gridNeighbours(node, input.rows, input.columns)) {
      if (visited.has(neighbour) || input.terrain[neighbour] === 'wall') continue;
      visited.add(neighbour);
      parent[neighbour] = node;
      queue.push(neighbour);
      yield { type: 'frontier', node: neighbour };
    }
  }
  yield { type: 'noPath' };
  return { found: false, path: [], cost: null, visited: visitCount };
}

function* weightedSearch(
  input: PathfindingInput,
  heuristic: boolean,
): Generator<PathfindingStep, PathResult, unknown> {
  const count = input.rows * input.columns;
  const distances = Array<number>(count).fill(Number.POSITIVE_INFINITY);
  const parent = Array<number>(count).fill(-1);
  const closed = new Set<number>();
  const open = new Set<number>([input.start]);
  distances[input.start] = 0;
  let visitCount = 0;
  const estimate = (node: number) => {
    if (!heuristic) return 0;
    const rowDistance = Math.abs(
      Math.floor(node / input.columns) - Math.floor(input.destination / input.columns),
    );
    const columnDistance = Math.abs((node % input.columns) - (input.destination % input.columns));
    // Every move costs at least one, so Manhattan distance is admissible and consistent.
    return rowDistance + columnDistance;
  };
  yield { type: 'frontier', node: input.start };

  while (open.size > 0) {
    let current = -1;
    let best = Number.POSITIVE_INFINITY;
    for (const candidate of open) {
      const score = distances[candidate] + estimate(candidate);
      if (score < best || (score === best && candidate < current)) {
        current = candidate;
        best = score;
      }
    }
    if (current < 0) break;
    open.delete(current);
    closed.add(current);
    visitCount++;
    yield { type: 'visit', node: current };
    if (current === input.destination) {
      const result = resultFor(input, parent, visitCount);
      for (const pathNode of result.path) yield { type: 'pathNode', node: pathNode };
      return result;
    }
    for (const neighbour of gridNeighbours(current, input.rows, input.columns)) {
      if (closed.has(neighbour) || input.terrain[neighbour] === 'wall') continue;
      const candidateCost = distances[current] + terrainCost(input.terrain[neighbour]);
      if (candidateCost < distances[neighbour]) {
        distances[neighbour] = candidateCost;
        parent[neighbour] = current;
        open.add(neighbour);
        yield { type: 'frontier', node: neighbour };
      }
    }
  }

  yield { type: 'noPath' };
  return { found: false, path: [], cost: null, visited: visitCount };
}

export function* dijkstraSearch(
  input: PathfindingInput,
): Generator<PathfindingStep, PathResult, unknown> {
  return yield* weightedSearch(input, false);
}

export function* aStarSearch(
  input: PathfindingInput,
): Generator<PathfindingStep, PathResult, unknown> {
  return yield* weightedSearch(input, true);
}

/** Algorithms share grid events and metadata so additional graph searches can join this catalog. */
export const PATHFINDING_ALGORITHMS: readonly PathfindingAlgorithm[] = [
  {
    id: 'bfs',
    category: 'pathfinding',
    nameKey: 'pathfinding.bfs',
    descriptionKey: 'pathfinding.bfsDescription',
    time: 'O(V + E)',
    space: 'O(V)',
    requirements: ['pathfinding.bfsRequirement'],
    findPath: breadthFirstSearch,
  },
  {
    id: 'dijkstra',
    category: 'pathfinding',
    nameKey: 'pathfinding.dijkstra',
    descriptionKey: 'pathfinding.dijkstraDescription',
    time: 'O(V²) with the grid open-set scan',
    space: 'O(V)',
    requirements: ['pathfinding.weightedRequirement'],
    findPath: dijkstraSearch,
  },
  {
    id: 'astar',
    category: 'pathfinding',
    nameKey: 'pathfinding.astar',
    descriptionKey: 'pathfinding.astarDescription',
    time: 'O(V²) with the grid open-set scan',
    space: 'O(V)',
    requirements: ['pathfinding.astarRequirement'],
    findPath: aStarSearch,
  },
];

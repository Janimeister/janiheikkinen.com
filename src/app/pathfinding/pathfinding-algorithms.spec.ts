import { describe, expect, it } from 'vitest';
import {
  aStarSearch,
  breadthFirstSearch,
  dijkstraSearch,
  PATHFINDING_ALGORITHMS,
  type PathfindingInput,
  type PathResult,
  type Terrain,
} from './pathfinding-algorithms';

function input(
  rows: number,
  columns: number,
  start: number,
  destination: number,
): PathfindingInput {
  return {
    rows,
    columns,
    start,
    destination,
    terrain: Array.from({ length: rows * columns }, () => 'normal'),
  };
}

function runPath(generator: Generator<unknown, PathResult, unknown>): PathResult {
  let step = generator.next();
  while (!step.done) step = generator.next();
  return step.value;
}

function withTerrain(
  source: PathfindingInput,
  change: (terrain: Terrain[]) => void,
): PathfindingInput {
  const terrain = [...source.terrain];
  change(terrain);
  return { ...source, terrain };
}

describe('Breadth-First Search', () => {
  it('returns a shortest path by number of moves on an unweighted grid', () => {
    const result = runPath(breadthFirstSearch(input(3, 4, 0, 11)));
    expect(result.found).toBe(true);
    expect(result.path[0]).toBe(0);
    expect(result.path.at(-1)).toBe(11);
    expect(result.path.length - 1).toBe(5);
    expect(result.cost).toBe(5);
  });

  it('handles an adjacent destination and start equal to destination', () => {
    expect(runPath(breadthFirstSearch(input(2, 2, 0, 1))).path).toEqual([0, 1]);
    expect(runPath(breadthFirstSearch(input(2, 2, 1, 1))).cost).toBe(0);
  });

  it('reports an unreachable destination behind a wall barrier', () => {
    const grid = withTerrain(input(3, 3, 3, 5), (terrain) => {
      terrain[1] = 'wall';
      terrain[4] = 'wall';
      terrain[7] = 'wall';
    });
    expect(runPath(breadthFirstSearch(grid))).toMatchObject({ found: false, path: [], cost: null });
  });
});

describe('Weighted pathfinding', () => {
  const source = input(5, 7, 14, 20);
  const costlyDirectRoute = withTerrain(source, (terrain) => {
    for (let column = 1; column <= 5; column++) terrain[2 * 7 + column] = 'high';
  });

  it('lets Dijkstra choose a longer route with lower total cost', () => {
    const unweighted = runPath(breadthFirstSearch(costlyDirectRoute));
    const weighted = runPath(dijkstraSearch(costlyDirectRoute));
    expect(unweighted.path.length - 1).toBe(6);
    expect(unweighted.cost).toBe(41);
    expect(weighted.path.length - 1).toBeGreaterThan(unweighted.path.length - 1);
    expect(weighted.cost).toBeLessThan(unweighted.cost!);
  });

  it('A* matches Dijkstra optimal cost with weights and walls', () => {
    const grid = withTerrain(costlyDirectRoute, (terrain) => {
      terrain[1 * 7 + 3] = 'wall';
      terrain[3 * 7 + 3] = 'medium';
      terrain[3 * 7 + 4] = 'medium';
    });
    expect(runPath(aStarSearch(grid)).cost).toBe(runPath(dijkstraSearch(grid)).cost);
  });

  it('reports no path when every connection is blocked', () => {
    const grid = withTerrain(input(3, 3, 3, 5), (terrain) => {
      terrain[1] = 'wall';
      terrain[4] = 'wall';
      terrain[7] = 'wall';
    });
    expect(runPath(dijkstraSearch(grid)).found).toBe(false);
    expect(runPath(aStarSearch(grid)).found).toBe(false);
  });

  it('registers descriptions and characteristics for each algorithm', () => {
    expect(PATHFINDING_ALGORITHMS.map(({ id }) => id)).toEqual(['bfs', 'dijkstra', 'astar']);
    for (const algorithm of PATHFINDING_ALGORITHMS) {
      expect(algorithm.category).toBe('pathfinding');
      expect(algorithm.descriptionKey).toContain('pathfinding.');
      expect(algorithm.requirements).toHaveLength(1);
    }
  });
});

/** Types for public/data/helsinki-trams.json, written by scripts/build-tram-map.mjs. */

/** `[lon, lat]`, WGS 84, rounded to 5 decimals. */
export type LonLat = readonly [lon: number, lat: number];
export type Ring = readonly LonLat[];
/** Rings filled with the even–odd rule, so inner rings are holes. */
export type Polygon = readonly Ring[];

export interface BBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface TramLine {
  /** The line as riders see it, and as HFP reports it in `desi`: `'4'`, `'10'`, `'H'`. */
  desi: string;
  /** HSL's route colour from GTFS. The page uses per-line theme colours instead, for contrast. */
  color: string;
  shapes: readonly (readonly LonLat[])[];
}

export interface TramStop {
  /** GTFS `stop_id` without the `HSL:` prefix, as in HFP's `next_stop`. */
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export interface MapLabel {
  name: string;
  lat: number;
  lon: number;
  /** 1 = district (placed first), 2 = sub-district or island. */
  rank: number;
}

export interface TramMapData {
  bbox: BBox;
  generatedAt: string;
  gtfsVersion: string;
  sources: { gtfs: string; land: 'overpass' | 'land-polygons' };
  lines: readonly TramLine[];
  stops: readonly TramStop[];
  /** The sea (the box minus the land) first, then lakes. */
  water: readonly Polygon[];
  parks: readonly Polygon[];
  labels: readonly MapLabel[];
}

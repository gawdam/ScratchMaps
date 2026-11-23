import type { Feature, FeatureCollection, Geometry, LineString, Position } from 'geojson';

export const nationPalette = [
  '#dfc28b',
  '#b7be96',
  '#cf9678',
  '#e3cf99',
  '#b4bec2',
  '#c5c38e',
] as const;

const visitCoordinates = (value: unknown, visit: (longitude: number, latitude: number) => void) => {
  if (!Array.isArray(value)) {
    return;
  }

  if (value.length >= 2 && value.every((coordinate) => typeof coordinate === 'number')) {
    const [longitude, latitude] = value;
    if (typeof longitude === 'number' && typeof latitude === 'number') {
      visit(longitude, latitude);
    }
    return;
  }

  for (const child of value) {
    visitCoordinates(child, visit);
  }
};

const visitGeometry = (geometry: Geometry | null, visit: (longitude: number, latitude: number) => void) => {
  if (!geometry) {
    return;
  }

  if (geometry.type === 'GeometryCollection') {
    for (const child of geometry.geometries) {
      visitGeometry(child, visit);
    }
    return;
  }

  visitCoordinates(geometry.coordinates, visit);
};

export const getCountryCoastline = (collection: FeatureCollection): FeatureCollection<LineString> => {
  const edges = new Map<string, { coordinates: [Position, Position]; owners: Set<number> }>();
  const rings: Position[][] = [];

  const positionKey = (position: Position) => `${position[0]},${position[1]}`;
  const edgeKey = (start: Position, end: Position) => {
    const [startLongitude, startLatitude] = start;
    const [endLongitude, endLatitude] = end;
    if (
      startLongitude === undefined ||
      startLatitude === undefined ||
      endLongitude === undefined ||
      endLatitude === undefined
    ) {
      return null;
    }

    const startKey = `${startLongitude.toFixed(4)},${startLatitude.toFixed(4)}`;
    const endKey = `${endLongitude.toFixed(4)},${endLatitude.toFixed(4)}`;
    return startKey < endKey ? `${startKey}|${endKey}` : `${endKey}|${startKey}`;
  };

  const addRing = (ring: Position[], featureIndex: number) => {
    rings.push(ring);
    for (let index = 0; index < ring.length; index += 1) {
      const start = ring[index];
      const end = ring[(index + 1) % ring.length];
      if (!start || !end) {
        continue;
      }

      const [startLongitude, startLatitude] = start;
      const [endLongitude, endLatitude] = end;
      if (
        startLongitude === undefined ||
        startLatitude === undefined ||
        endLongitude === undefined ||
        endLatitude === undefined
      ) {
        continue;
      }

      if (startLongitude === endLongitude && startLatitude === endLatitude) {
        continue;
      }
      const key = edgeKey(start, end);
      if (!key) {
        continue;
      }
      let edge = edges.get(key);
      if (!edge) {
        edge = { coordinates: [start, end], owners: new Set<number>() };
        edges.set(key, edge);
      }
      edge.owners.add(featureIndex);
    }
  };

  const visitRings = (geometry: Geometry | null, featureIndex: number) => {
    if (!geometry) {
      return;
    }

    switch (geometry.type) {
      case 'Polygon':
        for (const ring of geometry.coordinates) {
          addRing(ring, featureIndex);
        }
        break;
      case 'MultiPolygon':
        for (const polygon of geometry.coordinates) {
          for (const ring of polygon) {
            addRing(ring, featureIndex);
          }
        }
        break;
      case 'GeometryCollection':
        for (const child of geometry.geometries) {
          visitRings(child, featureIndex);
        }
        break;
      default:
        break;
    }
  };

  collection.features.forEach((feature, featureIndex) => {
    visitRings(feature.geometry, featureIndex);
  });

  const coastlines: Position[][] = [];
  for (const ring of rings) {
    let line: Position[] = [];
    const addLine = () => {
      if (line.length > 1) {
        coastlines.push(line);
      }
      line = [];
    };

    for (let index = 0; index < ring.length; index += 1) {
      const start = ring[index];
      const end = ring[(index + 1) % ring.length];
      if (!start || !end) {
        addLine();
        continue;
      }

      const key = edgeKey(start, end);
      const edge = key ? edges.get(key) : undefined;
      if (edge?.owners.size !== 1) {
        addLine();
        continue;
      }

      const last = line[line.length - 1];
      if (last === undefined || positionKey(last) !== positionKey(start)) {
        addLine();
        line.push(start);
      }
      line.push(end);
    }

    addLine();
  }

  return {
    type: 'FeatureCollection',
    features: coastlines.map((coordinates) => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates },
    })),
  };
};

export const colorCountries = (collection: FeatureCollection): Map<Feature, number> => {
  const adjacency = collection.features.map(() => new Set<number>());
  const vertexOwners = new Map<string, Set<number>>();

  collection.features.forEach((feature, featureIndex) => {
    const vertices = new Set<string>();
    visitGeometry(feature.geometry, (longitude, latitude) => {
      vertices.add(`${longitude.toFixed(4)},${latitude.toFixed(4)}`);
    });

    for (const vertex of vertices) {
      let owners = vertexOwners.get(vertex);
      if (!owners) {
        owners = new Set<number>();
        vertexOwners.set(vertex, owners);
      }
      owners.add(featureIndex);
    }
  });

  for (const owners of vertexOwners.values()) {
    const neighbors = [...owners];
    for (let first = 0; first < neighbors.length; first += 1) {
      const firstOwner = neighbors[first];
      if (firstOwner === undefined) {
        continue;
      }
      for (let second = first + 1; second < neighbors.length; second += 1) {
        const secondOwner = neighbors[second];
        if (secondOwner === undefined) {
          continue;
        }
        adjacency[firstOwner]?.add(secondOwner);
        adjacency[secondOwner]?.add(firstOwner);
      }
    }
  }

  const order = collection.features.map((_, index) => index);
  order.sort((first, second) => (adjacency[second]?.size ?? 0) - (adjacency[first]?.size ?? 0) || first - second);

  const colors = new Map<Feature, number>();
  const assignedColors = new Array<number>(collection.features.length).fill(-1);
  for (const featureIndex of order) {
    const unavailable = new Set<number>();
    for (const neighbor of adjacency[featureIndex] ?? []) {
      const color = assignedColors[neighbor];
      if (color !== undefined && color >= 0) {
        unavailable.add(color);
      }
    }

    let colorIndex = 0;
    while (unavailable.has(colorIndex) && colorIndex < nationPalette.length) {
      colorIndex += 1;
    }
    if (colorIndex === nationPalette.length) {
      colorIndex = featureIndex % nationPalette.length;
    }

    assignedColors[featureIndex] = colorIndex;
    const feature = collection.features[featureIndex];
    if (feature) {
      colors.set(feature, colorIndex);
    }
  }

  return colors;
};

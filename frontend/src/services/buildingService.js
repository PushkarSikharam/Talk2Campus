let buildingsCache = null;

/**
 * Compute a simple centroid for a GeoJSON Polygon ring (array of [lng, lat])
 */
const centroidFromRing = (ring) => {
  if (!Array.isArray(ring) || ring.length === 0) return null;
  let sumLat = 0;
  let sumLng = 0;
  let count = 0;
  ring.forEach((pt) => {
    if (Array.isArray(pt) && pt.length >= 2) {
      // GeoJSON coordinate order is [lng, lat]
      sumLng += Number(pt[0]);
      sumLat += Number(pt[1]);
      count += 1;
    }
  });
  if (count === 0) return null;
  return { lat: sumLat / count, lng: sumLng / count };
};

/**
 * Parse the buildings GeoJSON (FeatureCollection) and extract building names with coordinates
 * Tries `buildingsNew.txt` (bundled via import.meta.url) first, then falls back to `/buildings.txt`.
 * @returns {Array} Array of { name, lat, lng, id? }
 */
export const getBuildingsList = async () => {
  if (buildingsCache) return buildingsCache;

  const tryUrls = [
    // Prefer the new file in the source assets (Vite-friendly URL)
    new URL('../assets/buildingsNew.txt', import.meta.url).href,
    // older public fallback
    '/buildings.txt',
    new URL('../assets/buildings.txt', import.meta.url).href,
  ];

  let buildingsData = null;
  for (const url of tryUrls) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const text = await resp.text();
      buildingsData = JSON.parse(text);
      if (buildingsData) {
        // stop on first successful parse
        break;
      }
    } catch (e) {
      // try next
    }
  }

  if (!buildingsData) {
    console.error('Could not load any buildings file');
    return [];
  }

  const buildings = [];

  // If the file is a GeoJSON FeatureCollection, parse features
  if (buildingsData.type === 'FeatureCollection' && Array.isArray(buildingsData.features)) {
    buildingsData.features.forEach((feat) => {
      if (!feat || !feat.geometry) return;
      const props = feat.properties || {};
      const name = props.source_name || props.name || props.displayName || props.title || '';
      let coord = null;
      const geom = feat.geometry;
      if (geom.type === 'Polygon' && Array.isArray(geom.coordinates) && geom.coordinates.length > 0) {
        // coordinates: [ [ [lng, lat], ... ] ] -> use first ring
        coord = centroidFromRing(geom.coordinates[0]);
      } else if (geom.type === 'MultiPolygon' && Array.isArray(geom.coordinates) && geom.coordinates.length > 0) {
        // use first polygon's first ring
        coord = centroidFromRing(geom.coordinates[0][0]);
      } else if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
        coord = { lng: Number(geom.coordinates[0]), lat: Number(geom.coordinates[1]) };
      }

      if (coord && name) {
        buildings.push({ name: String(name).trim(), lat: coord.lat, lng: coord.lng, id: props.source_id || props.id });
      }
    });
  } else {
    // Fallback: traverse object structure (legacy format)
    const traverse = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      if (obj.name && (obj.lat !== undefined && obj.lng !== undefined)) {
        buildings.push({ name: String(obj.name).trim(), lat: Number(obj.lat), lng: Number(obj.lng) });
      }
      if (obj.name && (obj.latitude !== undefined && obj.longitude !== undefined)) {
        buildings.push({ name: String(obj.name).trim(), lat: Number(obj.latitude), lng: Number(obj.longitude) });
      }
      if (obj.name && obj.shape && Array.isArray(obj.shape.paths)) {
        const ring = obj.shape.paths[0] || obj.shape.paths;
        if (Array.isArray(ring) && ring.length > 0) {
          // ring entries may be [lat, lng] in the legacy format
          let sumLat = 0;
          let sumLng = 0;
          let count = 0;
          ring.forEach((pt) => {
            if (Array.isArray(pt) && pt.length >= 2) {
              sumLat += Number(pt[0]);
              sumLng += Number(pt[1]);
              count += 1;
            }
          });
          if (count > 0) {
            buildings.push({ name: String(obj.name).trim(), lat: sumLat / count, lng: sumLng / count });
          }
        }
      }
      if (Array.isArray(obj)) obj.forEach(traverse);
      else Object.keys(obj).forEach((k) => traverse(obj[k]));
    };
    traverse(buildingsData);
  }

  // Deduplicate by name (keep first occurrence)
  const unique = Array.from(new Map(buildings.map(b => [b.name, b])).values());
  unique.sort((a, b) => a.name.localeCompare(b.name));
  buildingsCache = unique;
  console.log(`Loaded ${buildingsCache.length} buildings from file`);
  return buildingsCache;
};

/**
 * Filter buildings by search query
 * @param {string} query - Search query
 * @returns {Array} Filtered buildings
 */
export const searchBuildings = (query, buildings) => {
  if (!buildings || buildings.length === 0) {
    return [];
  }
  
  if (!query || query.trim() === '') {
    return buildings.slice(0, 10); // Show first 10 if no query
  }

  const lowerQuery = query.toLowerCase();
  return buildings
    .filter(building => 
      building.name.toLowerCase().includes(lowerQuery)
    )
    .slice(0, 10); // Limit to 10 results
};

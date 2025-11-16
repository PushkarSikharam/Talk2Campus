let buildingsCache = null;

/**
 * Parse the buildings GeoJSON and extract building names with coordinates
 * @returns {Array} Array of { name, lat, lng }
 */
export const getBuildingsList = async () => {
  if (buildingsCache) {
    return buildingsCache;
  }

  try {
    const response = await fetch('/buildings.txt');
    const text = await response.text();
    const buildingsData = JSON.parse(text);

    const buildings = [];

    // The campus JSON contains nested structures: some entries are under
    // children.locations with lat/lng, others include a shape polygon.
    // Traverse the entire object and extract named locations.
    const traverse = (obj) => {
      if (!obj || typeof obj !== 'object') return;

      // Direct lat/lng properties
      if (obj.name && (obj.lat !== undefined && obj.lng !== undefined)) {
        buildings.push({ name: String(obj.name).trim(), lat: Number(obj.lat), lng: Number(obj.lng) });
      }

      // Some entries use 'latitude'/'longitude'
      if (obj.name && (obj.latitude !== undefined && obj.longitude !== undefined)) {
        buildings.push({ name: String(obj.name).trim(), lat: Number(obj.latitude), lng: Number(obj.longitude) });
      }

      // Polygon shapes: compute simple centroid from paths
      if (obj.name && obj.shape && Array.isArray(obj.shape.paths)) {
        const ring = obj.shape.paths[0] || obj.shape.paths;
        if (Array.isArray(ring) && ring.length > 0) {
          let sumLat = 0;
          let sumLng = 0;
          let count = 0;
          ring.forEach((pt) => {
            if (Array.isArray(pt) && pt.length >= 2) {
              // shape paths appear as [lat, lng]
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

      // Recurse into arrays and objects
      if (Array.isArray(obj)) {
        obj.forEach(traverse);
      } else {
        Object.keys(obj).forEach((k) => traverse(obj[k]));
      }
    };

    traverse(buildingsData);

    // Remove duplicates
    const uniqueBuildings = Array.from(
      new Map(buildings.map(b => [b.name, b])).values()
    );

    buildingsCache = uniqueBuildings.sort((a, b) => a.name.localeCompare(b.name));
    console.log(`Loaded ${buildingsCache.length} unique buildings`);
    return buildingsCache;
  } catch (error) {
    console.error('Error loading buildings:', error);
    return [];
  }
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

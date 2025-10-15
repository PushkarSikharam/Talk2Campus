import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Tooltip } from 'react-leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';


const BuildingsPolygons = () => {
  const [features, setFeatures] = useState([]);

  useEffect(() => {
    axios.get('/src/assets/buildings.txt')
      .then(res => {
        const geojson = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
        setFeatures(geojson.features || []);
      })
      .catch(() => setFeatures([]));
  }, []);

  return features.map((feature, idx) => {
    if (feature.geometry.type === 'Polygon') {
      const positions = feature.geometry.coordinates.map(ring => ring.map(([lng, lat]) => [lat, lng]));
      return (
        <Polygon key={idx} positions={positions} pathOptions={{ color: 'blue', weight: 2 }}>
          <Tooltip direction="top" sticky>{feature.properties?.name || 'Building'}</Tooltip>
        </Polygon>
      );
    }
    return null;
  });
};

const Map = () => (
  <MapContainer center={[27.7136, -97.3252]} zoom={15} style={{ height: '100%', width: '100%' }}>
    <TileLayer
      attribution='Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    />
    <BuildingsPolygons />
  </MapContainer>
);

export default Map;

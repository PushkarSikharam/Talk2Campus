import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Tooltip, Popup, useMap, Polyline, CircleMarker, Marker } from 'react-leaflet';
import { Card, Typography, Space, Button, Tag } from 'antd';
import { EnvironmentOutlined, InfoCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './Map.css';

const { Text } = Typography;

// Create Google Maps style start marker (blue circle with white dot)
const createStartMarkerIcon = () => {
  return L.divIcon({
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: #1f7fe8;
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">
        <div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
    className: 'custom-marker',
  });
};

// Create Google Maps style end marker (red pin)
const createEndMarkerIcon = () => {
  return L.divIcon({
    html: `
      <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
        <path d="M16 0C8.27 0 2 6.27 2 14C2 24 16 40 16 40C16 40 30 24 30 14C30 6.27 23.73 0 16 0Z" fill="#EA4335"/>
        <circle cx="16" cy="14" r="5" fill="white"/>
      </svg>
    `,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
    className: 'custom-marker',
  });
};

// Component to auto-zoom to route
const RouteAutoZoom = ({ routeCoordinates }) => {
  const map = useMap();

  useEffect(() => {
    if (routeCoordinates && routeCoordinates.length > 0) {
      // Create bounds from route coordinates
      const bounds = L.latLngBounds(routeCoordinates);
      // Fit map to bounds with padding
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 28 });
    }
  }, [routeCoordinates, map]);

  return null;
};

// Custom map controls component
const MapControls = ({ onClearRoute }) => {
  const map = useMap();

  const zoomIn = () => map.zoomIn();
  const zoomOut = () => map.zoomOut();
  const resetView = () => map.setView([27.7136, -97.3252], 15);

  return null;
};

const BuildingsPolygons = () => {
  const [features, setFeatures] = useState([]);
  const [hoveredBuilding, setHoveredBuilding] = useState(null);

  useEffect(() => {
    axios.get('/src/assets/buildings.txt')
      .then(res => {
        const geojson = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
        setFeatures(geojson.features || []);
      })
      .catch(() => setFeatures([]));
  }, []);

  // Color palette for different building types
  const getBuildingColor = (buildingName) => {
    if (!buildingName) return '#43cea2';
    const name = buildingName.toLowerCase();
    
    if (name.includes('engineering') || name.includes('science')) return '#667eea';
    if (name.includes('library')) return '#f093fb';
    if (name.includes('student') || name.includes('center')) return '#feca57';
    if (name.includes('athletic') || name.includes('gym')) return '#ff6b6b';
    if (name.includes('dining') || name.includes('food')) return '#48dbfb';
    return '#43cea2';
  };

  return features.map((feature, idx) => {
    if (feature.geometry.type === 'Polygon') {
      const positions = feature.geometry.coordinates.map(ring => 
        ring.map(([lng, lat]) => [lat, lng])
      );
      const buildingName = feature.properties?.name || 'Building';
      const buildingColor = getBuildingColor(buildingName);
      const isHovered = hoveredBuilding === idx;

      return (
        <Polygon 
          key={idx} 
          positions={positions} 
          pathOptions={{ 
            color: buildingColor,
            weight: isHovered ? 3 : 2,
            fillOpacity: isHovered ? 0.5 : 0.3,
            fillColor: buildingColor,
          }}
          eventHandlers={{
            mouseover: () => setHoveredBuilding(idx),
            mouseout: () => setHoveredBuilding(null),
          }}
        >
          <Tooltip 
            direction="top" 
            sticky
            className="custom-tooltip"
          >
            <div style={{ 
              padding: '4px 8px',
              borderRadius: 8,
              background: 'white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}>
              <Text strong style={{ fontSize: 13 }}>
                {buildingName}
              </Text>
            </div>
          </Tooltip>
          
          <Popup>
            <Card 
              bordered={false}
              style={{ 
                width: 250,
                margin: -12,
              }}
              bodyStyle={{ padding: 12 }}
            >
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: buildingColor,
                  }} />
                  <Text strong style={{ fontSize: 15 }}>
                    {buildingName}
                  </Text>
                </div>

                {feature.properties?.description && (
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    {feature.properties.description}
                  </Text>
                )}

                <div style={{ 
                  display: 'flex', 
                  gap: 8,
                  flexWrap: 'wrap',
                }}>
                  <Tag color={buildingColor} style={{ margin: 0, borderRadius: 8 }}>
                    Building
                  </Tag>
                  {feature.properties?.type && (
                    <Tag style={{ margin: 0, borderRadius: 8 }}>
                      {feature.properties.type}
                    </Tag>
                  )}
                </div>

                <Button 
                  type="primary" 
                  size="small"
                  icon={<EnvironmentOutlined />}
                  style={{
                    width: '100%',
                    borderRadius: 8,
                    background: buildingColor,
                    border: 'none',
                  }}
                >
                  Get Directions
                </Button>
              </Space>
            </Card>
          </Popup>
        </Polygon>
      );
    }
    return null;
  });
};

const Map = ({ routeCoordinates, onRouteChange }) => {
  const handleRouteUpdate = (coords) => {
    if (onRouteChange) {
      onRouteChange(coords);
    }
  };

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <MapContainer 
        center={[27.7136, -97.3252]} 
        zoom={15} 
        style={{ 
          height: '100%', 
          width: '100%',
          borderRadius: 0,
        }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Draw route as dark blue line with dots (Google Maps style) */}
        {routeCoordinates && routeCoordinates.length > 0 && (
          <>
            {/* Main dark blue polyline */}
            <Polyline
              positions={routeCoordinates}
              pathOptions={{
                color: '#1f7fe8',
                weight: 5,
                opacity: 0.85,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            
            {/* Dots along the route (every 2nd point to avoid clutter) */}
            {routeCoordinates.map((coord, idx) => {
              // Show dots every 2 coordinates to avoid too many markers
              if (idx % 2 === 0) {
                return (
                  <CircleMarker
                    key={`dot-${idx}`}
                    center={coord}
                    radius={3}
                    pathOptions={{
                      color: '#1f7fe8',
                      fillColor: '#1f7fe8',
                      fillOpacity: 1,
                      weight: 0,
                    }}
                  />
                );
              }
              return null;
            })}
            
            {/* Start marker (Google style - blue circle) */}
            {routeCoordinates.length > 0 && (
              <Marker
                position={routeCoordinates[0]}
                icon={createStartMarkerIcon()}
              >
                <Popup>
                  <Text style={{ fontSize: 12 }}>Start</Text>
                </Popup>
              </Marker>
            )}
            
            {/* End marker (Google style - red pin) */}
            {routeCoordinates.length > 1 && (
              <Marker
                position={routeCoordinates[routeCoordinates.length - 1]}
                icon={createEndMarkerIcon()}
              >
                <Popup>
                  <Text style={{ fontSize: 12 }}>Destination</Text>
                </Popup>
              </Marker>
            )}
          </>
        )}
        
        <RouteAutoZoom routeCoordinates={routeCoordinates} />
        <BuildingsPolygons />
        <MapControls onClearRoute={() => handleRouteUpdate(null)} />
      </MapContainer>

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        zIndex: 1000,
        background: 'white',
        padding: 16,
        borderRadius: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        maxWidth: 200,
      }}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <Text strong style={{ fontSize: 13 }}>
            <InfoCircleOutlined style={{ marginRight: 6, color: '#43cea2' }} />
            Building Types
          </Text>
          
          {[
            { color: '#667eea', label: 'Academic' },
            { color: '#f093fb', label: 'Library' },
            { color: '#feca57', label: 'Student Services' },
            { color: '#ff6b6b', label: 'Athletic' },
            { color: '#48dbfb', label: 'Dining' },
            { color: '#43cea2', label: 'Other' },
          ].map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                background: item.color,
              }} />
              <Text style={{ fontSize: 12 }}>{item.label}</Text>
            </div>
          ))}
        </Space>
      </div>
    </div>
  );
};

export default Map;

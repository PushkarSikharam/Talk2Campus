import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Tooltip, Popup, useMap } from 'react-leaflet';
import { Card, Typography, Space, Button, Tag } from 'antd';
import { EnvironmentOutlined, InfoCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import './Map.css';

const { Text } = Typography;

// Custom map controls component
const MapControls = () => {
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

const Map = () => {
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
        <BuildingsPolygons />
        <MapControls />
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

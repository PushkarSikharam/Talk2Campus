import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Tooltip, Popup, useMap, Polyline, CircleMarker, Marker } from 'react-leaflet';
import { Card, Typography, Space, Button, Tag, AutoComplete, Spin, message } from 'antd';
import { EnvironmentOutlined, InfoCircleOutlined, DeleteOutlined, DownOutlined, ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons';
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

// Create a simple human/location icon for user's current location
const createUserLocationIcon = () => {
  return L.divIcon({
    html: `
      <div style="display:flex;align-items:center;justify-content:center;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C13.1046 2 14 2.89543 14 4C14 5.10457 13.1046 6 12 6C10.8954 6 10 5.10457 10 4C10 2.89543 10.8954 2 12 2Z" fill="#1f7fe8"/>
          <path d="M4 20C4 16 8 13 12 13C16 13 20 16 20 20" stroke="#1f7fe8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    `,
    className: 'custom-marker user-location-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
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

// Custom map controls component: renders persistent location / zoom / reset buttons using the leaflet map instance
const MapControls = ({ onClearRoute, userLocation }) => {
  const map = useMap();

  const doZoomIn = () => {
    if (!map) return;
    try {
      if (typeof map.zoomIn === 'function') map.zoomIn();
      else if (typeof map.getZoom === 'function' && typeof map.setZoom === 'function') map.setZoom(map.getZoom() + 1);
    } catch (e) {
      // ignore
    }
  };

  const doZoomOut = () => {
    if (!map) return;
    try {
      if (typeof map.zoomOut === 'function') map.zoomOut();
      else if (typeof map.getZoom === 'function' && typeof map.setZoom === 'function') map.setZoom(map.getZoom() - 1);
    } catch (e) {
      // ignore
    }
  };

  return (
    <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1200, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', pointerEvents: 'auto' }}>
      {/* If we have a user location, show the use-location circular button first */}
      {userLocation && (
        <Button
          shape="circle"
          size="middle"
          onClick={() => window.dispatchEvent(new CustomEvent('set-origin-to-user-location', { detail: userLocation }))}
          className="use-location-btn"
          aria-label="Use my current location"
          title="Use my current location"
          style={{ marginBottom: 6 }}
        >
          <EnvironmentOutlined style={{ color: '#1f7fe8', fontSize: 18 }} />
        </Button>
      )}

      <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
        <button onClick={doZoomIn} style={{ border: 'none', background: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', borderRadius: 8, padding: 8, cursor: 'pointer' }} aria-label="Zoom in">
          <ZoomInOutlined style={{ fontSize: 14, color: '#333' }} />
        </button>
        <button onClick={doZoomOut} style={{ border: 'none', background: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', borderRadius: 8, padding: 8, cursor: 'pointer' }} aria-label="Zoom out">
          <ZoomOutOutlined style={{ fontSize: 14, color: '#333' }} />
        </button>
      </div>
    </div>
  );
};

const BuildingsPolygons = ({ directionsProps = null }) => {
  const [features, setFeatures] = useState([]);
  const [hoveredBuilding, setHoveredBuilding] = useState(null);

  useEffect(() => {
    const load = async () => {
      // prefer bundled new file, fallback to public build file
      const tryUrls = [
        new URL('../assets/buildingsNew.txt', import.meta.url).href,
        '/buildings.txt',
        new URL('../assets/buildings.txt', import.meta.url).href,
      ];

      for (const url of tryUrls) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const dataText = await res.text();
          const geojson = typeof dataText === 'string' ? JSON.parse(dataText) : dataText;
          setFeatures(geojson.features || []);
          return;
        } catch (e) {
          // try next
        }
      }

      setFeatures([]);
    };

    load();
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
      const buildingName = feature.properties?.source_name || feature.properties?.name || 'Building';
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
          <Tooltip direction="top" className="custom-tooltip">
            <Text strong style={{ fontSize: 13 }}>{buildingName}</Text>
          </Tooltip>
          
          <Popup offset={[0, 14]} className="building-popup">
            <div className="building-popup-content">
              <div className="building-popup-header">
                <div className="building-popup-color-dot" style={{ background: buildingColor }} />
                <Text strong style={{ fontSize: 15 }}>{buildingName}</Text>
              </div>

              {feature.properties?.description && (
                <div style={{ marginTop: 6 }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>{feature.properties.description}</Text>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                <Tag color={buildingColor} style={{ margin: 0, borderRadius: 8 }}>Building</Tag>
                {feature.properties?.type && (
                  <Tag style={{ margin: 0, borderRadius: 8 }}>{feature.properties.type}</Tag>
                )}
              </div>

              <div style={{ marginTop: 10 }}>
                <Button
                  type="primary"
                  size="small"
                  icon={<EnvironmentOutlined />}
                  style={{ width: '100%', borderRadius: 8, background: buildingColor, border: 'none' }}
                  onClick={() => {
                    // If the parent provided directions handlers, call them to set the destination and compute route
                    try {
                      if (directionsProps && typeof directionsProps.handleSelectDestination === 'function') {
                        directionsProps.handleSelectDestination(buildingName);
                      } else {
                        // Fallback: dispatch a window event that InteractiveMap can listen to
                        window.dispatchEvent(new CustomEvent('map-get-directions', { detail: { name: buildingName, feature } }));
                      }
                    } catch (e) {
                      // ignore
                    }
                  }}
                >
                  Get Directions
                </Button>
              </div>
            </div>
          </Popup>
        </Polygon>
      );
    }
    return null;
  });
};

const Map = ({ routeCoordinates, onRouteChange, directionsProps = null }) => {
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [animPosition, setAnimPosition] = useState(null);
  const animRef = React.useRef({ raf: null, startTime: null, start: null, end: null, duration: 800 });
  const [legendCollapsed, setLegendCollapsed] = useState(false);
  const mapRef = useRef(null);


  // Auto-collapse legend when a route is active (navigation on)
  useEffect(() => {
    if (routeCoordinates && routeCoordinates.length > 0) {
      setLegendCollapsed(true);
    } else {
      setLegendCollapsed(false);
    }
  }, [routeCoordinates]);

  const handleRouteUpdate = (coords) => {
    if (onRouteChange) {
      onRouteChange(coords);
    }
  };

  // Request current position once on mount. If permission granted, store and dispatch event.
  useEffect(() => {
    if (!navigator || !navigator.geolocation) return;
    let mounted = true;

    const requestLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!mounted) return;
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracy = pos.coords.accuracy;
          const loc = { lat, lng, accuracy };
          // Animate marker from previous to new location for smooth motion
          const prev = animPosition || userLocation;
          setUserLocation(loc);
          window.dispatchEvent(new CustomEvent('user-location-available', { detail: loc }));
          // start animation only if we have a previous position
          if (prev && prev.lat != null && prev.lng != null) {
            // cancel previous animation
            if (animRef.current.raf) cancelAnimationFrame(animRef.current.raf);
            animRef.current.startTime = null;
            animRef.current.start = { lat: prev.lat, lng: prev.lng };
            animRef.current.end = { lat: loc.lat, lng: loc.lng };
            animRef.current.duration = 800; // ms
            const step = (t) => {
              if (!animRef.current.startTime) animRef.current.startTime = t;
              const elapsed = t - animRef.current.startTime;
              const frac = Math.min(1, elapsed / animRef.current.duration);
              const curLat = animRef.current.start.lat + (animRef.current.end.lat - animRef.current.start.lat) * frac;
              const curLng = animRef.current.start.lng + (animRef.current.end.lng - animRef.current.start.lng) * frac;
              setAnimPosition({ lat: curLat, lng: curLng });
              if (frac < 1) {
                animRef.current.raf = requestAnimationFrame(step);
              } else {
                animRef.current.raf = null;
                // ensure final position equals end
                setAnimPosition({ lat: animRef.current.end.lat, lng: animRef.current.end.lng });
              }
            };
            animRef.current.raf = requestAnimationFrame(step);
          } else {
            // first time: set animPosition immediately
            setAnimPosition({ lat: loc.lat, lng: loc.lng });
          }
        },
        (err) => {
          if (!mounted) return;
          setLocationError(err && err.message ? err.message : String(err));
        },
        { enableHighAccuracy: true, maximumAge: 5_000 }
      );
    };

    // Initial request
    requestLocation();
    // Poll every 5 seconds to update marker for smoother navigation
    const id = setInterval(requestLocation, 5_000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      {/* Quick action: set "from" to current location (moved to top-right, Google-Maps-like) */}
      {userLocation && (
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1200, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          <Button
            shape="circle"
            size="middle"
            onClick={() => window.dispatchEvent(new CustomEvent('set-origin-to-user-location', { detail: userLocation }))}
            className="use-location-btn"
            aria-label="Use my current location"
            title="Use my current location"
          >
            <EnvironmentOutlined style={{ color: '#1f7fe8', fontSize: 18 }} />
          </Button>
        </div>
      )}
      <MapContainer 
        center={[27.7136, -97.3252]} 
        zoom={15} 
        style={{ 
          height: '100%', 
          width: '100%',
          borderRadius: 0,
        }}
        zoomControl={false}
        whenCreated={(m) => { mapRef.current = m; }}
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
        {/* Show user's current location if available */}
        {userLocation && (
          <>
            <Marker position={[animPosition?.lat ?? userLocation.lat, animPosition?.lng ?? userLocation.lng]} icon={createUserLocationIcon()}>
              <Popup>
                <div style={{ minWidth: 140 }}>
                  <Text strong>You are here</Text>
                  <div style={{ fontSize: 12 }}>
                    {userLocation.accuracy ? `${Math.round(userLocation.accuracy)}m accuracy` : null}
                  </div>
                </div>
              </Popup>
            </Marker>
            {userLocation.accuracy && (
              <CircleMarker
                center={[userLocation.lat, userLocation.lng]}
                radius={Math.max(8, Math.min(40, userLocation.accuracy / 4))}
                pathOptions={{ color: '#1f7fe8', fillOpacity: 0.08, weight: 1 }}
              />
            )}
          </>
        )}
        
        <RouteAutoZoom routeCoordinates={routeCoordinates} />
        <BuildingsPolygons directionsProps={directionsProps} />
        <MapControls onClearRoute={() => handleRouteUpdate(null)} userLocation={userLocation} />
      </MapContainer>

      {/* In-map Directions Card (moved from sidebar) - always visible */}
      {directionsProps && (
        <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 1200, width: 260 }}>
          <Card size="small" style={{ padding: '10px 12px', borderRadius: 12, boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              {/* header icon removed per request */}

              {/* From Field */}
              {!directionsProps.hasGeolocation && (
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>FROM</Text>
                  <AutoComplete
                    placeholder="Search your building"
                    value={directionsProps.fromSearchValue}
                    options={directionsProps.fromSearchOptions}
                    onSearch={directionsProps.handleFromSearch}
                    onSelect={(value) => directionsProps.handleSelectFrom(value)}
                    onChange={(value) => directionsProps.handleFromSearch(value)}
                    style={{ marginTop: 6, width: '100%' }}
                    filterOption={false}
                    allowClear
                    dropdownStyle={{ zIndex: 3000 }}
                    getPopupContainer={(triggerNode) => document.body}
                  />
                </div>
              )}

              {/* To Field */}
              <div>
                <Text type="secondary" style={{ fontSize: 11 }}>TO</Text>
                <div style={{ marginTop: 6 }}>
                  <Spin spinning={directionsProps.directionLoading}>
                    <AutoComplete
                      placeholder="Search destination building"
                      value={directionsProps.toSearchValue}
                      options={directionsProps.toSearchOptions}
                      onSearch={directionsProps.handleToSearch}
                      onSelect={(value) => directionsProps.handleSelectDestination(value)}
                      onChange={(value) => directionsProps.handleToSearch(value)}
                      style={{ width: '100%' }}
                      filterOption={false}
                      allowClear
                      dropdownStyle={{ zIndex: 3000 }}
                      getPopupContainer={(triggerNode) => document.body}
                    />
                  </Spin>
                </div>
              </div>

              <div>
                <Button
                  type="primary"
                  block
                  onClick={async () => {
                    const val = directionsProps.toSearchValue;
                    if (!val || val.trim() === '') {
                      message.info('Please enter a destination');
                      return;
                    }
                    directionsProps.handleSelectDestination(val);
                  }}
                  style={{ borderRadius: 8 }}
                >
                  Navigate
                </Button>
              </div>
            </Space>
          </Card>
        </div>
      )}

      {/* Legend (collapses automatically when a route is active) */}
      <div style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 1000 }}>
        {legendCollapsed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button size="small" shape="round" onClick={() => setLegendCollapsed(false)}>
              <InfoCircleOutlined />
            </Button>
          </div>
        ) : (
          <div style={{
            background: 'white',
            padding: 16,
            borderRadius: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            maxWidth: 220,
          }}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text strong style={{ fontSize: 13 }}>
                    <InfoCircleOutlined style={{ marginRight: 6, color: '#43cea2' }} />
                    Building Types
                  </Text>
                </div>
                <div>
                  <button onClick={() => setLegendCollapsed(true)} style={{ border: 'none', background: 'transparent', padding: 4, cursor: 'pointer' }} aria-label="Collapse legend">
                    <DownOutlined style={{ fontSize: 12, color: '#666' }} />
                  </button>
                </div>
              </div>
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
        )}
      </div>
    </div>
  );
};

export default Map;

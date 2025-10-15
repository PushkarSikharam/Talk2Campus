
import React, { useState } from 'react';
import { Layout } from 'antd';
import 'antd/dist/reset.css';
import Map from '../components/Map';

const { Sider, Content } = Layout;

function InteractiveMap() {
  // Set default width to 75% of container (map gets 75%)
  const [siderWidth, setSiderWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      return Math.max(150, Math.floor(window.innerWidth * 0.75));
    }
    return 600;
  });

  // Handler for resizing the sider
  const handleMouseDown = (e) => {
    const startX = e.clientX;
    const startWidth = siderWidth;
    const onMouseMove = (moveEvent) => {
  // Limit min 150px, max 90% of container
  const container = document.getElementById('splitter-layout');
  const maxWidth = container ? container.offsetWidth * 0.9 : window.innerWidth * 0.9;
  const newWidth = Math.min(maxWidth, Math.max(150, startWidth + moveEvent.clientX - startX));
  setSiderWidth(newWidth);
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <Layout id="splitter-layout" style={{ height: '80vh', border: '1px solid #eee', width: '100%' }}>
      <Sider
        width={siderWidth}
        style={{ background: '#fafafa', position: 'relative', minWidth: 150, maxWidth: '90%' }}
        theme="light"
        trigger={null}
        collapsible={false}
      >
        <div style={{ height: '100%', width: '100%' }}>
          <Map />
        </div>
        {/* Splitter handle */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 6,
            height: '100%',
            cursor: 'col-resize',
            background: '#e0e0e0',
            zIndex: 10,
          }}
          onMouseDown={handleMouseDown}
        />
      </Sider>
      <Content style={{ background: '#fff', padding: 16 }}>
        Events Panel
      </Content>
    </Layout>
  );
}

export default InteractiveMap;
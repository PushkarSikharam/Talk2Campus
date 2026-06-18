import React, { useEffect, useState } from 'react';
import { CalendarOutlined } from '@ant-design/icons';
import { getEventImageUrl, getEventTitle } from '../utils/eventHelpers';

const EventArtwork = ({ event, className = '', fallbackClassName = '', children = null }) => {
  const imageUrl = getEventImageUrl(event);
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [imageUrl]);

  const showImage = imageUrl && !failed;
  return (
    <div className={`${className} ${showImage ? 'has-image' : fallbackClassName}`.trim()}>
      {showImage ? (
        <img src={imageUrl} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <CalendarOutlined aria-hidden="true" />
      )}
      {children}
      <span className="sr-only">Artwork for {getEventTitle(event)}</span>
    </div>
  );
};

export default EventArtwork;

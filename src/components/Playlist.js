import React, { useState } from 'react';
import ReactPlayer from 'react-player';
import { FaShare, FaYoutube, FaCheck } from 'react-icons/fa';
import {
  FacebookShareButton,
  TwitterShareButton,
  LinkedinShareButton,
  FacebookIcon,
  TwitterIcon,
  LinkedinIcon,
} from 'react-share';
import '../styles/Playlist.css';

function Playlist({ items, playlistId, onSaveToYoutube }) {
  const [activeVideo, setActiveVideo] = useState(null);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const getTotalDuration = () => {
    return items.reduce((total, item) => {
      // Convert ISO 8601 duration to minutes
      const match = item.duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
      const hours = (match[1] ? parseInt(match[1]) : 0) * 60;
      const minutes = (match[2] ? parseInt(match[2]) : 0);
      const seconds = (match[3] ? parseInt(match[3]) : 0) / 60;
      return total + hours + minutes + seconds;
    }, 0);
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatViews = (views) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M views`;
    }
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K views`;
    }
    return `${views} views`;
  };

  const shareUrl = playlistId 
    ? `https://www.youtube.com/playlist?list=${playlistId}`
    : window.location.href;

  if (!items.length) {
    return null;
  }

  return (
    <div className="playlist">
      <div className="playlist-header">
        <h2>Your Learning Playlist</h2>
        <div className="playlist-stats">
          <span>{items.length} videos</span>
          <span>•</span>
          <span>{formatDuration(getTotalDuration())} total</span>
        </div>
        <div className="playlist-actions">
          <button 
            className="share-button"
            onClick={() => setShowShareMenu(!showShareMenu)}
          >
            <FaShare /> Share
          </button>
          {showShareMenu && (
            <div className="share-menu">
              <FacebookShareButton url={shareUrl}>
                <FacebookIcon size={32} round />
              </FacebookShareButton>
              <TwitterShareButton url={shareUrl}>
                <TwitterIcon size={32} round />
              </TwitterShareButton>
              <LinkedinShareButton url={shareUrl}>
                <LinkedinIcon size={32} round />
              </LinkedinShareButton>
            </div>
          )}
        </div>
      </div>

      <div className="playlist-content">
        {activeVideo && (
          <div className="video-player">
            <ReactPlayer
              url={`https://www.youtube.com/watch?v=${activeVideo}`}
              width="100%"
              height="400px"
              controls
            />
          </div>
        )}

        <div className="playlist-items">
          {items.map((item, index) => (
            <div 
              key={item.id} 
              className={`playlist-item ${activeVideo === item.id ? 'active' : ''}`}
              onClick={() => setActiveVideo(item.id)}
            >
              <div className="item-number">{index + 1}</div>
              <div className="item-thumbnail">
                <img src={item.thumbnail} alt={item.title} />
                {!activeVideo && <div className="play-overlay">▶</div>}
              </div>
              <div className="item-details">
                <h3>{item.title}</h3>
                <p className="channel-title">{item.channelTitle}</p>
                <div className="video-stats">
                  <span>{formatViews(item.views)}</span>
                  <span>•</span>
                  <span>{formatDuration(parseInt(item.duration))}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Playlist;

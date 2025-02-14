import axios from 'axios';

const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY;
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';

export const searchYouTubeVideos = async (query) => {
  try {
    // Add educational context to the query
    const enhancedQuery = `${query} (tutorial OR lecture OR course OR education)`;
    
    // First, search for videos with educational content
    const searchResponse = await fetch(
      `${YOUTUBE_API_BASE_URL}/search?part=snippet&maxResults=50&q=${encodeURIComponent(enhancedQuery)}&type=video&relevanceLanguage=en&videoEmbeddable=true&videoDuration=medium&key=${YOUTUBE_API_KEY}`
    );

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      if (errorData.error?.code === 403 && errorData.error?.message?.includes('quota')) {
        throw new Error('QUOTA_EXCEEDED');
      }
      throw new Error(errorData.error?.message || 'Failed to fetch videos');
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.items || searchData.items.length === 0) {
      // Try a fallback search without educational context
      const fallbackResponse = await fetch(
        `${YOUTUBE_API_BASE_URL}/search?part=snippet&maxResults=50&q=${encodeURIComponent(query)}&type=video&relevanceLanguage=en&videoEmbeddable=true&key=${YOUTUBE_API_KEY}`
      );
      
      if (!fallbackResponse.ok) {
        throw new Error('Failed to fetch videos in fallback search');
      }
      
      searchData = await fallbackResponse.json();
      
      if (!searchData.items || searchData.items.length === 0) {
        console.log(`No results found for query: ${query}`);
        return [];
      }
    }

    // Get video IDs for detailed info
    const videoIds = searchData.items.map(item => item.id.videoId).join(',');
    
    // Get detailed video information
    const detailsResponse = await fetch(
      `${YOUTUBE_API_BASE_URL}/videos?part=contentDetails,statistics,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY}`
    );

    if (!detailsResponse.ok) {
      const errorData = await detailsResponse.json();
      throw new Error(errorData.error?.message || 'Failed to fetch video details');
    }

    const detailsData = await detailsResponse.json();

    // Map search results with video details
    const videos = searchData.items.map(searchItem => {
      const details = detailsData.items.find(
        detailItem => detailItem.id === searchItem.id.videoId
      );

      if (!details) return null;

      // Parse duration from ISO 8601 format
      const duration = details.contentDetails.duration;
      const durationInMinutes = parseDuration(duration);

      // Skip videos that are too short (less than 3 minutes) or too long (more than 60 minutes)
      if (durationInMinutes < 3 || durationInMinutes > 60) return null;

      // Skip videos with very low engagement
      if (parseInt(details.statistics.viewCount || '0') < 100) return null;

      return {
        id: searchItem.id.videoId,
        title: searchItem.snippet.title,
        description: searchItem.snippet.description,
        thumbnail: searchItem.snippet.thumbnails.medium.url,
        channelTitle: searchItem.snippet.channelTitle,
        publishedAt: searchItem.snippet.publishedAt,
        duration: durationInMinutes,
        viewCount: parseInt(details.statistics.viewCount || '0'),
        likeCount: parseInt(details.statistics.likeCount || '0'),
        url: `https://www.youtube.com/watch?v=${searchItem.id.videoId}`
      };
    }).filter(video => video !== null);

    // If no valid videos found after filtering
    if (videos.length === 0) {
      console.log(`No valid videos found for query: ${query}`);
      return [];
    }

    // Sort videos by view count to prioritize popular content
    return videos.sort((a, b) => b.viewCount - a.viewCount);
  } catch (error) {
    console.error('Error searching YouTube videos:', error);
    if (error.message === 'QUOTA_EXCEEDED') {
      throw new Error(`YouTube API quota exceeded. Please try again tomorrow or contact the administrator.
      
Alternative options:
1. Browse educational platforms directly (Coursera, edX, MIT OpenCourseWare)
2. Check university course materials
3. Visit documentation and tutorial websites
4. Join relevant Discord communities or forums`);
    }
    throw new Error(`Failed to search YouTube videos: ${error.message}`);
  }
};

// Helper function to parse ISO 8601 duration to minutes
const parseDuration = (duration) => {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  
  const hours = (match[1] ? parseInt(match[1]) : 0);
  const minutes = (match[2] ? parseInt(match[2]) : 0);
  const seconds = (match[3] ? parseInt(match[3]) : 0);
  
  return Math.round(hours * 60 + minutes + seconds / 60);
};

export const searchVideos = async (keywords, maxResults = 50) => {
  try {
    const response = await axios.get(`${YOUTUBE_API_BASE_URL}/search`, {
      params: {
        part: 'snippet',
        maxResults,
        q: keywords.join(' '),
        type: 'video',
        key: process.env.REACT_APP_YOUTUBE_API_KEY,
      },
    });

    const videoIds = response.data.items.map(item => item.id.videoId);
    const videoStats = await getVideoStats(videoIds);

    return response.data.items.map((item, index) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.high.url,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      ...videoStats[index],
    }));
  } catch (error) {
    console.error('Error searching videos:', error);
    throw error;
  }
};

const getVideoStats = async (videoIds) => {
  try {
    const response = await axios.get(`${YOUTUBE_API_BASE_URL}/videos`, {
      params: {
        part: 'statistics,contentDetails',
        id: videoIds.join(','),
        key: process.env.REACT_APP_YOUTUBE_API_KEY,
      },
    });

    return response.data.items.map(item => ({
      views: parseInt(item.statistics.viewCount),
      likes: parseInt(item.statistics.likeCount),
      duration: item.contentDetails.duration,
    }));
  } catch (error) {
    console.error('Error getting video stats:', error);
    throw error;
  }
};

export const createPlaylist = async (title, description, videoIds, accessToken) => {
  try {
    // Create a new playlist
    const playlistResponse = await axios.post(
      `${YOUTUBE_API_BASE_URL}/playlists`,
      {
        snippet: {
          title,
          description,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          part: 'snippet',
          key: process.env.REACT_APP_YOUTUBE_API_KEY,
        },
      }
    );

    const playlistId = playlistResponse.data.id;

    // Add videos to the playlist
    for (const videoId of videoIds) {
      await axios.post(
        `${YOUTUBE_API_BASE_URL}/playlistItems`,
        {
          snippet: {
            playlistId,
            resourceId: {
              kind: 'youtube#video',
              videoId,
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            part: 'snippet',
            key: process.env.REACT_APP_YOUTUBE_API_KEY,
          },
        }
      );
    }

    return playlistId;
  } catch (error) {
    console.error('Error creating playlist:', error);
    throw error;
  }
};

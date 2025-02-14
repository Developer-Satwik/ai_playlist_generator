import axios from 'axios';

const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

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

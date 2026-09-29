export type { Track, Playlist, MusicProvider } from '../../types';

export function parseSpotifyPlaylistId(input: string): { playlistId: string | null; error?: string } {
  if (!input || typeof input !== 'string') {
    return { playlistId: null, error: 'Please enter a Spotify playlist URL or ID.' };
  }

  const trimmed = input.trim();

  // spotify:playlist:PLAYLIST_ID
  const uriMatch = trimmed.match(/^spotify:playlist:([a-zA-Z0-9]{22})$/i);
  if (uriMatch) {
    return { playlistId: uriMatch[1] };
  }

  // https://open.spotify.com/.../playlist/PLAYLIST_ID
  const urlMatch = trimmed.match(/open\.spotify\.com\/(?:[a-z]{2,5}(?:-[a-z]{2,5})?\/)?playlist\/([a-zA-Z0-9]{22})/i);
  if (urlMatch) {
    return { playlistId: urlMatch[1] };
  }

  // 22-character alphanumeric Spotify ID
  if (/^[a-zA-Z0-9]{22}$/.test(trimmed)) {
    return { playlistId: trimmed };
  }

  return { playlistId: null, error: 'Invalid Spotify playlist.' };
}

/**
 * Robustly parses and validates Spotify track identifiers from various URL formats.
 * Supported formats:
 * 1. https://open.spotify.com/track/TRACK_ID
 * 2. https://open.spotify.com/intl-xx/track/TRACK_ID
 * 3. spotify:track:TRACK_ID
 * 4. URLs containing query parameters such as ?si=...
 * 5. Direct 22-character alphanumeric Spotify ID
 */
export function parseSpotifyTrackId(input: string): { trackId: string | null; error?: string } {
  if (!input || typeof input !== 'string') {
    return { trackId: null, error: 'Please enter a Spotify track URL or ID.' };
  }

  const trimmed = input.trim();

  // spotify:track:TRACK_ID
  const uriMatch = trimmed.match(/^spotify:track:([a-zA-Z0-9]{22})$/i);
  if (uriMatch) {
    return { trackId: uriMatch[1] };
  }

  // https://open.spotify.com/.../track/TRACK_ID (supports international prefixes e.g. /intl-de/track/...)
  const urlMatch = trimmed.match(/open\.spotify\.com\/(?:[a-z]{2,5}(?:-[a-z]{2,5})?\/)?track\/([a-zA-Z0-9]{22})/i);
  if (urlMatch) {
    return { trackId: urlMatch[1] };
  }

  // 22-character alphanumeric Spotify ID
  if (/^[a-zA-Z0-9]{22}$/.test(trimmed)) {
    return { trackId: trimmed };
  }

  return { trackId: null, error: 'Invalid Spotify track URL or ID format.' };
}

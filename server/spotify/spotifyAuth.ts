import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface SpotifyTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // timestamp in ms
  scope?: string;
}

export interface SpotifyUserProfile {
  id: string;
  displayName: string;
  email?: string;
  imageUrl?: string;
  country?: string;
  product?: string;
}

interface StoredSessionAuth {
  tokens: SpotifyTokens;
  profile?: SpotifyUserProfile;
}

// In-memory token storage associated with admin session ID
const sessionSpotifyAuth = new Map<string, StoredSessionAuth>();
const CACHE_FILE = path.resolve(process.cwd(), '.spotify_auth_cache.json');

function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (typeof data === 'object' && data !== null) {
        for (const [key, value] of Object.entries(data)) {
          sessionSpotifyAuth.set(key, value as StoredSessionAuth);
        }
      }
    }
  } catch {
    // Non-fatal
  }
}

function saveCache() {
  try {
    const obj: Record<string, StoredSessionAuth> = {};
    for (const [k, v] of sessionSpotifyAuth.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch {
    // Non-fatal
  }
}

loadCache();

// State parameter storage with 10-minute expiration for CSRF protection
interface PendingState {
  sessionId: string;
  createdAt: number;
}
const pendingStates = new Map<string, PendingState>();

// Periodic cleanup of expired states
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of pendingStates.entries()) {
    if (now - data.createdAt > 10 * 60 * 1000) {
      pendingStates.delete(state);
    }
  }
}, 60 * 1000);

export function getSpotifyConfig() {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim() || '';
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim() || '';
  const configured = Boolean(clientId && clientSecret);

  return {
    clientId,
    clientSecret,
    configured,
  };
}

export function generateAuthState(sessionId: string): string {
  const state = crypto.randomBytes(24).toString('hex');
  pendingStates.set(state, { sessionId, createdAt: Date.now() });
  return state;
}

export function validateAuthState(state: string): string | null {
  const data = pendingStates.get(state);
  if (!data) return null;
  pendingStates.delete(state);
  if (Date.now() - data.createdAt > 10 * 60 * 1000) return null;
  return data.sessionId;
}

export function getStoredTokens(sessionId: string): SpotifyTokens | null {
  const auth = sessionSpotifyAuth.get(sessionId);
  if (auth) return auth.tokens;
  if (sessionSpotifyAuth.size === 1) {
    return Array.from(sessionSpotifyAuth.values())[0]?.tokens || null;
  }
  return sessionSpotifyAuth.get('default-session')?.tokens || null;
}

export function getStoredProfile(sessionId: string): SpotifyUserProfile | undefined {
  const auth = sessionSpotifyAuth.get(sessionId);
  if (auth?.profile) return auth.profile;
  if (sessionSpotifyAuth.size === 1) {
    return Array.from(sessionSpotifyAuth.values())[0]?.profile;
  }
  return sessionSpotifyAuth.get('default-session')?.profile;
}

export function setStoredTokens(sessionId: string, tokens: SpotifyTokens, profile?: SpotifyUserProfile) {
  sessionSpotifyAuth.set(sessionId, { tokens, profile });
  saveCache();
}

export function clearStoredTokens(sessionId: string) {
  sessionSpotifyAuth.delete(sessionId);
  saveCache();
}

const activeRefreshes = new Map<string, Promise<string | null>>();

/**
 * Ensures an active, unexpired Spotify access token for the given session.
 * Automatically refreshes the token if expired using the refresh token.
 * Concurrency-safe: deduplicates parallel refresh requests.
 */
export async function getValidAccessToken(sessionId: string): Promise<string | null> {
  const tokens = getStoredTokens(sessionId);
  if (!tokens) return null;

  // If token is valid for at least another 60 seconds, return it
  if (tokens.expiresAt > Date.now() + 60000) {
    return tokens.accessToken;
  }

  // Token expired, attempt refresh if refresh token exists
  if (tokens.refreshToken) {
    const { clientId, clientSecret } = getSpotifyConfig();
    if (!clientId || !clientSecret) return null;

    const existingRefresh = activeRefreshes.get(sessionId);
    if (existingRefresh) {
      return existingRefresh;
    }

    const refreshPromise = (async () => {
      try {
        const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const response = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${basic}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: tokens.refreshToken!,
          }),
          signal: AbortSignal.timeout(8000),
        });

        if (!response.ok) {
          console.error('[Spotify Auth] Failed to refresh token:', await response.text());
          return null;
        }

        const data = await response.json();
        const updatedTokens: SpotifyTokens = {
          accessToken: data.access_token,
          refreshToken: data.refresh_token || tokens.refreshToken,
          expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
          scope: data.scope || tokens.scope,
        };

        setStoredTokens(sessionId, updatedTokens, getStoredProfile(sessionId));
        return updatedTokens.accessToken;
      } catch (err) {
        console.error('[Spotify Auth] Error refreshing token:', err);
        return null;
      } finally {
        activeRefreshes.delete(sessionId);
      }
    })();

    activeRefreshes.set(sessionId, refreshPromise);
    return refreshPromise;
  }

  return null;
}

/**
 * Obtains an application-level token (Client Credentials flow) if configured.
 * This allows fetching public playlists even without individual user authentication.
 */
let appToken: { token: string; expiresAt: number } | null = null;

export async function getClientCredentialsToken(): Promise<string | null> {
  const { clientId, clientSecret, configured } = getSpotifyConfig();
  if (!configured) return null;

  if (appToken && appToken.expiresAt > Date.now() + 60000) {
    return appToken.token;
  }

  try {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      console.error('[Spotify Auth] Client credentials error:', await response.text());
      return null;
    }

    const data = await response.json();
    appToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    };
    return appToken.token;
  } catch (err) {
    console.error('[Spotify Auth] Error getting client credentials token:', err);
    return null;
  }
}

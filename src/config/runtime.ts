import { env } from './env';

export class InsecureWebSocketError extends Error {
  public code = 'INSECURE_WEBSOCKET_IN_PRODUCTION';
  constructor(message: string) {
    super(message);
    this.name = 'InsecureWebSocketError';
  }
}

export interface RuntimeConfig {
  apiUrl: string;
  wsUrl: string;
  isProduction: boolean;
  isSecure: boolean;
  configurationError: string | null;
}

/**
 * Validates whether the configured WebSocket URL satisfies production security standards.
 * In production or HTTPS environments, all WebSocket traffic MUST use wss://.
 */
export function validateWebSocketUrl(url: string, isProduction: boolean, isHttps: boolean): {
  isValid: boolean;
  error: string | null;
} {
  if (!url) {
    return { isValid: false, error: 'WebSocket URL is undefined or empty.' };
  }

  const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');

  // If in production or on an HTTPS page, insecure ws:// is strictly prohibited
  if ((isProduction || isHttps) && !isLocalhost && url.startsWith('ws://')) {
    return {
      isValid: false,
      error: `Security Violation: SyncRoom detected a production HTTPS environment but an insecure WebSocket URL was configured (${url}). Production WebSockets must strictly use wss://.`,
    };
  }

  return { isValid: true, error: null };
}

/**
 * Computes runtime WebSocket and API endpoints dynamically.
 */
export function getRuntimeConfig(): RuntimeConfig {
  const isBrowser = typeof window !== 'undefined';
  const isHttps = isBrowser ? window.location.protocol === 'https:' : false;
  const isProduction = env.IS_PROD || (isBrowser && isHttps && !window.location.hostname.includes('localhost'));

  // 1. Resolve WebSocket URL: prefer VITE_WS_URL, then browser origin with wss/ws
  let resolvedWsUrl = env.WS_URL?.trim();

  if (!resolvedWsUrl && isBrowser) {
    const protocol = isHttps ? 'wss:' : 'ws:';
    resolvedWsUrl = `${protocol}//${window.location.host}/ws`;
  }

  if (!resolvedWsUrl) {
    resolvedWsUrl = '';
  }

  // 2. Validate Security
  const validation = validateWebSocketUrl(resolvedWsUrl, isProduction, isHttps);

  // 3. Resolve API URL: prefer VITE_API_URL, then browser origin
  let resolvedApiUrl = env.API_URL?.trim();
  if (!resolvedApiUrl && isBrowser) {
    resolvedApiUrl = window.location.origin;
  }
  if (!resolvedApiUrl) {
    resolvedApiUrl = '';
  }

  return {
    apiUrl: resolvedApiUrl,
    wsUrl: resolvedWsUrl,
    isProduction,
    isSecure: isHttps || resolvedWsUrl.startsWith('wss:'),
    configurationError: validation.isValid ? null : validation.error,
  };
}

export function getWebSocketUrl(): string {
  const config = getRuntimeConfig();
  if (config.configurationError) {
    throw new InsecureWebSocketError(config.configurationError);
  }
  return config.wsUrl;
}

export function getApiBaseUrl(): string {
  const config = getRuntimeConfig();
  return config.apiUrl;
}

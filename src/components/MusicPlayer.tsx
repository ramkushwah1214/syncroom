import React from 'react';
import { Track, UserRole, PlayerState } from '../types';
import { ArtworkDisplay } from './ArtworkDisplay';
import { ProgressBar } from './ProgressBar';
import { AdminControls } from './AdminControls';
import { ListeningView } from './ListeningView';
import { AudioVisualizer } from './AudioVisualizer';
import { VolumeControl } from './VolumeControl';
import { Sparkles, Music, Radio, VolumeX, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import { useSynchronizedPlayback } from '../hooks/useSynchronizedPlayback';
import { spotifyMusicProvider } from '../services/music/SpotifyMusicProvider';

interface MusicPlayerProps {
  track: Track | null;
  playerState: PlayerState;
  role: UserRole;
  adminName?: string;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (position: number) => void;
  isShuffle?: boolean;
  onToggleShuffle?: () => void;
  repeatMode?: 'off' | 'all' | 'one';
  onToggleRepeat?: () => void;
  onOpenAddTrack?: () => void;
  className?: string;
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({
  track,
  playerState,
  role,
  adminName = 'Host',
  onPlayPause,
  onNext,
  onPrevious,
  onSeek,
  isShuffle,
  onToggleShuffle,
  repeatMode,
  onToggleRepeat,
  onOpenAddTrack,
  className = '',
}) => {
  const isAdmin = role === 'admin';
  const {
    isUnlocked,
    enableAudio,
    syncStatus,
    setVolume,
    volume,
    currentTime,
    providerStatus,
    providerError,
  } = useSynchronizedPlayback();

  const handleConnectSpotify = async () => {
    try {
      const auth = await spotifyMusicProvider.getAuthUrl();
      if (auth.url) {
        window.open(auth.url, 'spotify_oauth', 'width=600,height=720,status=no,toolbar=no,menubar=no');
      }
    } catch (err) {
      console.error('Failed to open Spotify OAuth', err);
    }
  };

  if (!track) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-8 rounded-3xl bg-neutral-900/40 border border-neutral-800/80 min-h-[480px] text-center ${className}`}
      >
        <div className="w-16 h-16 rounded-2xl bg-neutral-800/60 border border-neutral-700/60 flex items-center justify-center text-neutral-400 mb-4">
          <Music className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold text-neutral-200 mb-1">Queue is empty</h3>
        <p className="text-sm text-neutral-400 max-w-sm mb-6">
          Add tracks to the room queue to begin synchronized playback across all connected devices.
        </p>
        {isAdmin && onOpenAddTrack && (
          <button
            type="button"
            onClick={onOpenAddTrack}
            className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-medium text-sm transition-all"
          >
            Add First Track
          </button>
        )}
      </div>
    );
  }

  // Display position smoothly from local audio or authoritative playerState
  const displayPosition =
    isUnlocked && playerState.isPlaying && currentTime > 0
      ? currentTime
      : playerState.position;

  return (
    <div
      className={`flex flex-col items-center justify-between w-full max-w-xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 rounded-3xl bg-neutral-900/40 border border-neutral-800/80 backdrop-blur-xl shadow-2xl relative overflow-hidden ${className}`}
    >
      {/* Ambient background glow matching current track accent */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-[100px] opacity-15 pointer-events-none transition-colors duration-1000"
        style={{ backgroundColor: track.coverGradient?.accent || '#f59e0b' }}
      />

      {/* Autoplay restriction prompt for all listeners */}
      {(!isUnlocked || providerStatus === 'AUTOPLAY_BLOCKED') && (
        <div className="w-full mb-3 z-20">
          <button
            type="button"
            onClick={enableAudio}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-200 transition-all text-xs group"
          >
            <div className="flex items-center gap-2">
              <VolumeX className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
              <span className="font-semibold">Tap to Enable Audio</span>
            </div>
            <span className="text-[11px] font-mono underline decoration-amber-400/50 group-hover:decoration-amber-300">
              Enable audio
            </span>
          </button>
        </div>
      )}

      {/* Dynamic Playback Provider Status Banners for Spotify Tracks */}
      {track.provider === 'spotify' && (
        <>
          {(providerStatus === 'CONNECT_SPOTIFY' || providerStatus === 'AUTH_REQUIRED') && (
            <div className="w-full mb-3 z-20 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-2.5 min-w-0">
                <Radio className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
                <div className="flex flex-col text-left">
                  <span className="font-semibold text-emerald-100">Connect Spotify to enable audio</span>
                  <span className="text-[11px] text-emerald-300/80">Connect your Spotify Premium account so this device can stream synchronized audio.</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleConnectSpotify}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-xs transition-colors shrink-0 ml-3"
              >
                Connect Spotify
              </button>
            </div>
          )}

          {providerStatus === 'PREMIUM_REQUIRED' && (
            <div className="w-full mb-3 z-20 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <div className="flex flex-col text-left">
                  <span className="font-semibold text-rose-100">Spotify Premium Required</span>
                  <span className="text-[11px] text-rose-300/80">
                    The official Spotify Web Playback SDK requires an active Spotify Premium subscription.
                  </span>
                </div>
              </div>
              <a
                href="https://www.spotify.com/premium"
                target="_blank"
                rel="noreferrer noopener"
                className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-neutral-950 font-semibold text-xs transition-colors shrink-0 ml-3 flex items-center gap-1"
              >
                <span>Upgrade</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {(providerStatus === 'CONNECTING_PLAYER' || providerStatus === 'INITIALIZING') && (
            <div className="w-full mb-3 z-20 p-2.5 rounded-xl bg-neutral-800/60 border border-neutral-700/60 text-neutral-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" />
                <span className="truncate">Connecting Spotify Web Player device...</span>
              </div>
              <span className="text-[11px] text-neutral-500 font-mono">Initializing</span>
            </div>
          )}

          {providerStatus === 'DEVICE_NOT_READY' && (
            <div className="w-full mb-3 z-20 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">Spotify player device offline. Reconnecting...</span>
              </div>
            </div>
          )}

          {providerStatus === 'AUTOPLAY_BLOCKED' && (
            <div className="w-full mb-3 z-20 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <VolumeX className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">Browser audio blocked. Tap Enable Audio to start playback.</span>
              </div>
              <button
                type="button"
                onClick={enableAudio}
                className="px-2.5 py-1 rounded-md bg-amber-400 hover:bg-amber-300 text-neutral-950 font-semibold text-[11px] shrink-0 ml-2"
              >
                Tap to Enable Audio
              </button>
            </div>
          )}

          {providerStatus === 'PLAYBACK_ERROR' && (
            <div className="w-full mb-3 z-20 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="truncate">{providerError || 'Spotify playback error occurred.'}</span>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={onPlayPause}
                  className="px-2.5 py-1 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-medium text-[11px] shrink-0 ml-2 transition-colors"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {providerStatus === 'PROVIDER_UNAVAILABLE' && (
            <div className="w-full mb-3 z-20 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">Audio playback provider is not configured.</span>
              </div>
              {track.externalUrl && (
                <a
                  href={track.externalUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 shrink-0 ml-2"
                >
                  <span>Spotify</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          {(providerStatus === 'PLAYER_READY' || providerStatus === 'PLAYING' || providerStatus === 'PAUSED') && (
            <div className="w-full mb-3 z-20 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-medium">Spotify Web Player Active</span>
              </div>
              <span className="font-mono text-emerald-400/80 uppercase text-[10px]">
                {providerStatus === 'PLAYING' ? 'Streaming Audio' : providerStatus}
              </span>
            </div>
          )}
        </>
      )}
      {track.playbackStatus === 'PROVIDER_RESTRICTED' && (
        <div className="w-full mb-3 z-20 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="truncate">Restricted by Spotify ({track.restrictionReason || 'restriction'})</span>
          </div>
          {track.externalUrl && (
            <a
              href={track.externalUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 shrink-0 ml-2"
            >
              <span>Spotify</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* Track Category / Live Audio Visualizer Bar */}
      <div className="w-full flex items-center justify-between mb-4 z-10">
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <span className="flex items-center gap-1 text-amber-400/90 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Now Playing</span>
          </span>
          <span className="text-neutral-700" aria-hidden="true">·</span>
          <span>{track.genre || 'Synchronized Room Audio'}</span>
        </div>

        <div className="flex items-center gap-3">
          {isUnlocked && (
            <div
              className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-neutral-400"
              title={`Clock drift: ${syncStatus.driftMs > 0 ? '+' : ''}${syncStatus.driftMs}ms | Latency: ${syncStatus.rttMs}ms RTT`}
            >
              <Radio className="w-3 h-3 text-emerald-400" />
              <span>Sync: {syncStatus.driftMs > 0 ? '+' : ''}${syncStatus.driftMs}ms</span>
            </div>
          )}
          <AudioVisualizer isPlaying={playerState.isPlaying} />
        </div>
      </div>

      {/* Large Music Artwork */}
      <div className="my-2 sm:my-4 w-full flex justify-center z-10">
        <ArtworkDisplay
          track={track}
          isPlaying={playerState.isPlaying}
          size="lg"
          showVinylPeek={true}
        />
      </div>

      {/* Song title & Artist info */}
      <div className="w-full text-center my-2 sm:my-4 z-10 px-2">
        <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white font-display truncate">
          {track.title}
        </h2>
        <p className="text-xs sm:text-base text-neutral-400 mt-0.5 sm:mt-1 font-medium truncate">
          {track.artist}
        </p>
      </div>

      {/* Progress Bar (Interactive seek for Admin, Read-only progress for Listener) */}
      <div className="w-full z-10 mt-2 mb-4">
        <ProgressBar
          position={displayPosition}
          duration={track.duration}
          onSeek={onSeek}
          isAdmin={isAdmin}
        />
      </div>

      {/* Role-Specific Controls */}
      <div className="w-full z-10 mt-2">
        {isAdmin ? (
          /* Admin Controls */
          <div className="flex flex-col gap-4">
            <AdminControls
              isPlaying={playerState.isPlaying}
              isConnecting={track.provider === 'spotify' && (providerStatus === 'CONNECTING_PLAYER' || providerStatus === 'INITIALIZING')}
              onPlayPause={onPlayPause}
              onNext={onNext}
              onPrevious={onPrevious}
              isShuffle={isShuffle}
              onToggleShuffle={onToggleShuffle}
              repeatMode={repeatMode}
              onToggleRepeat={onToggleRepeat}
            />

            {/* Local device volume & quick queue action */}
            <div className="flex items-center justify-between pt-3 border-t border-neutral-800/70 text-xs">
              <VolumeControl initialVolume={volume} onVolumeChange={setVolume} />

              {onOpenAddTrack && (
                <button
                  type="button"
                  onClick={onOpenAddTrack}
                  className="text-xs text-neutral-400 hover:text-amber-300 font-medium transition-colors flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-neutral-800/50"
                >
                  <span>+ Add to Queue</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Listener View (Personal audio controls, listening status) */
          <ListeningView
            adminName={adminName}
            isUnlocked={isUnlocked}
            onEnableAudio={enableAudio}
            volume={volume}
            onVolumeChange={setVolume}
            syncOffsetMs={syncStatus.clockOffsetMs}
          />
        )}
      </div>
    </div>
  );
};

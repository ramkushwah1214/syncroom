import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Track } from '../types';
import { spotifyMusicProvider } from '../services/music/SpotifyMusicProvider';
import { parseSpotifyTrackId } from '../services/music/MusicProvider';
import { ArtworkDisplay } from './ArtworkDisplay';
import { X, Search, Plus, Check, Music, Loader2, Link2, AlertCircle, ExternalLink } from 'lucide-react';

interface AddTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTrack: (track: Track) => void;
  existingTrackIds?: string[];
  onOpenImportSpotify?: () => void;
}

export const AddTrackModal: React.FC<AddTrackModalProps> = ({
  isOpen,
  onClose,
  onAddTrack,
  existingTrackIds = [],
  onOpenImportSpotify,
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'url'>('url');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // URL resolution state (Feature 1)
  const [urlInput, setUrlInput] = useState('');
  const [isResolvingUrl, setIsResolvingUrl] = useState(false);
  const [urlResolvedTrack, setUrlResolvedTrack] = useState<Track | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  const doSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    // Auto-detect if user pasted a Spotify track URL into the search box!
    const trackCheck = parseSpotifyTrackId(trimmed);
    if (trackCheck.trackId) {
      setActiveTab('url');
      setUrlInput(trimmed);
      handleResolveUrl(trimmed);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    try {
      const results = await spotifyMusicProvider.searchTracks(trimmed);
      setSearchResults(results);
    } catch (err: unknown) {
      setSearchResults([]);
      const msg = err instanceof Error ? err.message : 'Search failed';
      setSearchError(msg);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'search') return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      doSearch(searchQuery);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, doSearch, activeTab]);

  const handleResolveUrl = async (inputStr: string) => {
    const trimmed = inputStr.trim();
    if (!trimmed) {
      setUrlError('Please enter a Spotify track URL or ID.');
      setUrlResolvedTrack(null);
      return;
    }

    const { trackId, error: parseError } = parseSpotifyTrackId(trimmed);
    if (!trackId) {
      setUrlError(parseError || 'Invalid Spotify track format. Supported: https://open.spotify.com/track/... or spotify:track:...');
      setUrlResolvedTrack(null);
      return;
    }

    setIsResolvingUrl(true);
    setUrlError(null);
    setUrlResolvedTrack(null);

    try {
      const track = await spotifyMusicProvider.resolveTrack(trackId);
      setUrlResolvedTrack(track);
    } catch (err: any) {
      setUrlResolvedTrack(null);
      if (err.status === 'TRACK_NOT_FOUND') {
        setUrlError('Spotify track not found. Please verify the URL or ID.');
      } else if (err.status === 'SPOTIFY_AUTH_REQUIRED') {
        setUrlError('Spotify authorization required to fetch track metadata. Please connect Spotify.');
      } else if (err.status === 'TRACK_UNAVAILABLE') {
        setUrlError('This track is restricted or unavailable on Spotify in this region.');
      } else {
        setUrlError(err.message || 'Failed to resolve Spotify track.');
      }
    } finally {
      setIsResolvingUrl(false);
    }
  };

  if (!isOpen) return null;

  const handleAdd = (track: Track) => {
    onAddTrack(track);
    setJustAddedId(track.id);
    setTimeout(() => {
      setJustAddedId(null);
    }, 1500);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-track-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl p-5 sm:p-6 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div>
            <h3 id="add-track-modal-title" className="font-display font-bold text-lg text-white">
              Add Songs to Queue
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Paste a Spotify song link or search the catalog
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[36px] min-h-[36px] p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 flex items-center justify-center transition-colors touch-manipulation"
            aria-label="Close add songs modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-950/80 rounded-xl border border-neutral-800/80 my-3">
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'url'
                ? 'bg-neutral-800 text-white shadow-sm font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Link2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Paste Spotify URL</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'search'
                ? 'bg-neutral-800 text-white shadow-sm font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-amber-400" />
            <span>Search Catalog</span>
          </button>
        </div>

        {/* Tab 1: Paste Song URL (Feature 1) */}
        {activeTab === 'url' && (
          <div className="flex-1 flex flex-col min-h-[240px] space-y-3 overflow-y-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleResolveUrl(urlInput);
              }}
              className="space-y-2"
            >
              <div className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <Link2 className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="https://open.spotify.com/track/... or spotify:track:..."
                    value={urlInput}
                    onChange={(e) => {
                      setUrlInput(e.target.value);
                      setUrlError(null);
                    }}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData('text');
                      setUrlInput(pasted);
                      handleResolveUrl(pasted);
                    }}
                    className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 transition-colors"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={isResolvingUrl || !urlInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:pointer-events-none text-neutral-950 text-xs sm:text-sm font-semibold shrink-0 transition-colors flex items-center gap-1.5"
                >
                  {isResolvingUrl ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Resolving...</span>
                    </>
                  ) : (
                    <span>Resolve</span>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-neutral-500">
                Supports standard links, international links (e.g. /intl-de/), URIs, and links with tracking parameters.
              </p>
            </form>

            {/* Error state */}
            {urlError && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/50 flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">{urlError}</p>
                </div>
              </div>
            )}

            {/* Resolved Track Preview Card */}
            {urlResolvedTrack && (
              <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 flex flex-col gap-3 animate-in fade-in">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-neutral-800 shadow-md">
                    <ArtworkDisplay track={urlResolvedTrack} size="md" showVinylPeek={false} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-white truncate">
                      {urlResolvedTrack.title}
                    </h4>
                    <p className="text-xs text-neutral-400 truncate mt-0.5">
                      {urlResolvedTrack.artist}
                    </p>
                    <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                      {urlResolvedTrack.album} · <span className="font-mono tabular-nums">{formatDuration(urlResolvedTrack.duration)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
                  <div className="flex items-center gap-2">
                    {existingTrackIds.includes(urlResolvedTrack.id) && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">
                        Already in Queue
                      </span>
                    )}
                    {urlResolvedTrack.externalUrl && (
                      <a
                        href={urlResolvedTrack.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-amber-400 transition-colors"
                      >
                        <span>Open on Spotify</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAdd(urlResolvedTrack)}
                    disabled={justAddedId === urlResolvedTrack.id}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                      justAddedId === urlResolvedTrack.id
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-400 text-neutral-950 hover:bg-amber-300'
                    }`}
                  >
                    {justAddedId === urlResolvedTrack.id ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Added to Queue!</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Add to Queue</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {!urlResolvedTrack && !urlError && !isResolvingUrl && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-neutral-500 text-xs gap-2">
                <Music className="w-8 h-8 text-neutral-700" />
                <p>Paste any real Spotify song link above to load its metadata.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Search Catalog */}
        {activeTab === 'search' && (
          <div className="flex-1 flex flex-col min-h-[240px]">
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by title, artist, or genre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 transition-colors"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[300px]">
              {isSearching ? (
                <div className="py-12 text-center text-neutral-500 text-sm flex flex-col items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                  <span>Searching Spotify...</span>
                </div>
              ) : searchError ? (
                <div className="py-8 px-4 text-center text-neutral-400 text-sm flex flex-col items-center gap-3 bg-neutral-950/60 rounded-xl border border-neutral-800">
                  <Music className="w-8 h-8 text-amber-400/80" />
                  <div>
                    <p className="font-medium text-neutral-200">{searchError}</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      Connect your Spotify account to search the full Spotify catalog, or paste a Spotify song link.
                    </p>
                  </div>
                  {onOpenImportSpotify && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenImportSpotify();
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-[#1db954]/20 hover:bg-[#1db954]/30 border border-[#1db954]/40 text-xs text-[#1ed760] font-medium transition-colors"
                    >
                      Open Spotify Connect / Import
                    </button>
                  )}
                </div>
              ) : searchQuery.trim() && searchResults.length === 0 ? (
                <div className="py-12 text-center text-neutral-500 text-sm">
                  No matching tracks found on Spotify.
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-12 text-center text-neutral-500 text-sm flex flex-col items-center gap-3">
                  <Music className="w-8 h-8 text-neutral-600" />
                  <p>Search for tracks above or switch to Paste Spotify URL.</p>
                </div>
              ) : (
                searchResults.map((track) => {
                  const isAlreadyQueued = existingTrackIds.includes(track.id);
                  const wasJustAdded = justAddedId === track.id;

                  return (
                    <div
                      key={track.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950/50 hover:bg-neutral-800/40 border border-neutral-800/60 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-neutral-800">
                          <ArtworkDisplay track={track} size="sm" showVinylPeek={false} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-200 truncate">
                            {track.title}
                          </p>
                          <p className="text-xs text-neutral-400 truncate">
                            {track.artist} · <span className="font-mono tabular-nums">{formatDuration(track.duration)}</span>
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAdd(track)}
                        disabled={wasJustAdded}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          wasJustAdded
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : isAlreadyQueued
                            ? 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'
                            : 'bg-amber-400 text-neutral-950 hover:bg-amber-300'
                        }`}
                      >
                        {wasJustAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>{isAlreadyQueued ? 'Add Again' : 'Add to Queue'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 mt-3 border-t border-neutral-800 flex items-center justify-between">
          {onOpenImportSpotify ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenImportSpotify();
              }}
              className="px-3 py-1.5 rounded-xl bg-[#1db954]/15 hover:bg-[#1db954]/25 border border-[#1db954]/30 text-xs text-[#1ed760] font-semibold transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
              <span>Import Spotify Playlist</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm text-neutral-200 font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

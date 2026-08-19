import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { StoryEpisode, Language } from '../types';
import { authService } from '../services/authService';
import { 
  Award, 
  Music, 
  Play, 
  Pause, 
  Vote, 
  Loader2, 
  AlertCircle, 
  Check, 
  Sparkles, 
  Volume2, 
  VolumeX,
  Volume1,
  ArrowLeft, 
  RotateCcw, 
  Trophy,
  Activity,
  Search,
  Heart,
  Download,
  Disc,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
  FileText,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  Maximize2,
  Minimize2,
  Radio,
  X,
  Layers,
  ListPlus,
  ListMusic,
  Plus,
  Trash2,
  Edit2,
  FolderPlus
} from 'lucide-react';

export interface Playlist {
  id: string;
  name: string;
  songCids: string[];
  createdAt: number;
  isSystemFavorites?: boolean;
}

interface VotingInterfaceProps {
  episodes: StoryEpisode[];
  uiLang: Language;
  initialMode?: 'EPISODES_ONLY' | 'MUSIC_ONLY';
  onClose?: () => void;
}

interface SongData {
  cid: string;
  name: string;
  albumCid: string;
  artistes?: string[];
  artists?: string[];
}

interface AlbumData {
  cid: string;
  name: string;
  coverUrl: string;
}

interface SongDetail {
  cid: string;
  name: string;
  albumCid: string;
  sourceUrl: string;
  lyricUrl?: string | null;
  mvUrl?: string | null;
  artists?: string[];
  artistes?: string[];
}

interface LyricLine {
  time: number;
  text: string;
}

function parseLrc(lrcText: string): LyricLine[] {
  if (!lrcText) return [];
  const lines = lrcText.split(/\r?\n/);
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/;

  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const msStr = match[3] || '0';
      const milliseconds = parseInt(msStr.padEnd(3, '0').slice(0, 3), 10);
      const timeInSeconds = minutes * 60 + seconds + milliseconds / 1000;
      const text = line.replace(/\[\d{2}:\d{2}(?:\.\d{2,3})?\]/g, '').trim();
      if (text) {
        result.push({ time: timeInSeconds, text });
      }
    } else {
      const trimmed = line.trim();
      if (
        trimmed &&
        !trimmed.startsWith('[ti:') &&
        !trimmed.startsWith('[ar:') &&
        !trimmed.startsWith('[al:') &&
        !trimmed.startsWith('[by:') &&
        !trimmed.startsWith('[offset:')
      ) {
        result.push({ time: 0, text: trimmed });
      }
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

interface VotingResults {
  episodeVotes: Record<string, number>;
  songVotes: Record<string, number>;
  userVote: {
    episodeId: string | null;
    songCid: string | null;
  };
}

// Pair for A/B matchups
interface Matchup<T> {
  id: string;
  optionA: T;
  optionB: T;
}

export const VotingInterface: React.FC<VotingInterfaceProps> = ({ 
  episodes: initialEpisodes, 
  uiLang,
  initialMode,
  onClose
}) => {
  const navigate = useNavigate();
  const isRu = uiLang === 'ru_RU' || uiLang === 'ru_RU_CN';

  // UI Modes: 'MODE_SELECT' | 'EPISODE_DUEL' | 'MUSIC_DUEL' | 'RESULTS' | 'MUSIC_PORTAL'
  const [currentView, setCurrentView] = useState<'MODE_SELECT' | 'EPISODE_DUEL' | 'MUSIC_DUEL' | 'RESULTS' | 'MUSIC_PORTAL'>('MUSIC_PORTAL');
  const [loading, setLoading] = useState(true);
  const [loadingMusic, setLoadingMusic] = useState(true);
  
  // Real-time voting tallies from database
  const [votes, setVotes] = useState<VotingResults>({
    episodeVotes: {},
    songVotes: {},
    userVote: { episodeId: null, songCid: null }
  });

  // Music portal states
  const [musicSearchQuery, setMusicSearchQuery] = useState('');
  const [selectedAlbumCid, setSelectedAlbumCid] = useState<string | null>(null);
  const [downloadingSongCid, setDownloadingSongCid] = useState<string | null>(null);
  const [downloadingAlbumCid, setDownloadingAlbumCid] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number } | null>(null);
  const [audioProgress, setAudioProgress] = useState({ currentTime: 0, duration: 0 });

  // Dynamic Lists aligned with user's custom GitHub repository
  const [episodesList, setEpisodesList] = useState<StoryEpisode[]>(initialEpisodes);
  const [albums, setAlbums] = useState<AlbumData[]>([]);
  const [songs, setSongs] = useState<SongData[]>([]);

  // Discord auth states
  const [discordUser, setDiscordUser] = useState<{ username: string; avatar?: string; id: string } | null>(null);
  const [isDiscordMember, setIsDiscordMember] = useState(false);
  const [isCheckingDiscord, setIsCheckingDiscord] = useState(false);

  // Matchup queues
  const [episodeMatchups, setEpisodeMatchups] = useState<Matchup<any>[]>([]);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);
  const [episodeUserWinners, setEpisodeUserWinners] = useState<Record<string, string>>({}); // matchupId -> winnerItemId
  const [episodePool, setEpisodePool] = useState<any[]>([]);
  const [episodeTotalRounds, setEpisodeTotalRounds] = useState<number>(20);

  const [musicMatchups, setMusicMatchups] = useState<Matchup<any>[]>([]);
  const [currentMusicIndex, setCurrentMusicIndex] = useState(0);
  const [musicUserWinners, setMusicUserWinners] = useState<Record<string, string>>({}); // matchupId -> winnerItemId
  const [musicPool, setMusicPool] = useState<any[]>([]);
  const [musicTotalRounds, setMusicTotalRounds] = useState<number>(20);

  // Audio player preview states
  const [playingSongCid, setPlayingSongCid] = useState<string | null>(null);
  const [playingSongDetail, setPlayingSongDetail] = useState<SongDetail | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const albumShelfRef = useRef<HTMLDivElement | null>(null);

  // Playlists & Favorites states
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      const saved = localStorage.getItem('ak-music-playlists-v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse playlists:', e);
    }
    return [
      {
        id: 'favs',
        name: isRu ? 'Избранные треки' : 'Favorite Tracks',
        songCids: [],
        createdAt: Date.now(),
        isSystemFavorites: true
      }
    ];
  });

  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>('favs');
  const [addToPlaylistSong, setAddToPlaylistSong] = useState<SongData | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [editingPlaylistName, setEditingPlaylistName] = useState('');

  // Active Playback Context/Queue state
  const [activeQueue, setActiveQueue] = useState<SongData[]>([]);
  const [playbackContextName, setPlaybackContextName] = useState<string>('');

  const activeQueueRef = useRef<SongData[]>([]);
  const playingSongCidRef = useRef<string | null>(null);
  const isShuffleRef = useRef<boolean>(false);
  const isLoopingRef = useRef<boolean>(false);
  const togglePlaySongRef = useRef<((song: SongData) => void) | null>(null);

  // Player Controls & Lyrics states
  const [isAudioPaused, setIsAudioPaused] = useState(true);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);

  const [currentLyrics, setCurrentLyrics] = useState<LyricLine[] | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  const [activeLyricIndex, setActiveLyricIndex] = useState<number>(-1);

  const [showLyricsModal, setShowLyricsModal] = useState(false);
  const [showFullPlayer, setShowFullPlayer] = useState(false);
  const [duelLyricsSong, setDuelLyricsSong] = useState<SongData | null>(null);
  const [duelLyricsLines, setDuelLyricsLines] = useState<LyricLine[] | null>(null);
  const [loadingDuelLyrics, setLoadingDuelLyrics] = useState(false);

  // Auto-track active lyric line for karaoke synchronization
  useEffect(() => {
    if (!currentLyrics || currentLyrics.length === 0) {
      setActiveLyricIndex(-1);
      return;
    }
    const curTime = audioProgress.currentTime;
    let activeIdx = -1;
    for (let i = 0; i < currentLyrics.length; i++) {
      if (currentLyrics[i].time <= curTime) {
        activeIdx = i;
      } else {
        break;
      }
    }
    setActiveLyricIndex(activeIdx);
  }, [audioProgress.currentTime, currentLyrics]);

  // Smooth scroll active lyric line into view
  useEffect(() => {
    if (activeLyricIndex >= 0 && (showLyricsModal || showFullPlayer)) {
      const el = document.getElementById(`lyric-line-${activeLyricIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeLyricIndex, showLyricsModal, showFullPlayer]);

  // Non-passive wheel event listener to allow horizontal scrolling with mouse wheel without scrolling the main page
  useEffect(() => {
    const el = albumShelfRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [currentView, albums]);

  // Precomputed filtered songs for soundtrack hub
  const filteredSongs = songs.filter(s => {
    if (selectedAlbumCid && s.albumCid !== selectedAlbumCid) {
      return false;
    }
    const q = musicSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || 
      (s.artistes && s.artistes.some(a => a.toLowerCase().includes(q))) ||
      (s.artists && s.artists.some(a => a.toLowerCase().includes(q)));
  });

  // Automatically pause/stop audio playback if the voted song changes or if active album filter changes
  useEffect(() => {
    if (playingSongCid && votes.userVote?.songCid === playingSongCid) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setPlayingSongCid(null);
      setPlayingSongDetail(null);
    }
  }, [votes.userVote?.songCid]);

  // Sync Playlists to localStorage
  useEffect(() => {
    localStorage.setItem('ak-music-playlists-v1', JSON.stringify(playlists));
  }, [playlists]);

  // Sync state refs for audio event handlers
  useEffect(() => {
    activeQueueRef.current = activeQueue;
  }, [activeQueue]);

  useEffect(() => {
    playingSongCidRef.current = playingSongCid;
  }, [playingSongCid]);

  useEffect(() => {
    isShuffleRef.current = isShuffle;
  }, [isShuffle]);

  useEffect(() => {
    isLoopingRef.current = isLooping;
  }, [isLooping]);

  // Dynamic Monthly Season detection
  const currentMonthId = (() => {
    const d = new Date();
    return `${d.getFullYear()}_${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  const getSeasonName = () => {
    const monthsRu = [
      'ЯНВАРЬ', 'ФЕВРАЛЬ', 'МАРТ', 'АПРЕЛЬ', 'МАЙ', 'ИЮНЬ', 
      'ИЮЛЬ', 'АВГУСТ', 'СЕНТЯБРЬ', 'ОКТЯБРЬ', 'НОЯБРЬ', 'ДЕКАБРЬ'
    ];
    const monthsEn = [
      'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 
      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ];
    const d = new Date();
    const month = d.getMonth();
    const year = d.getFullYear();
    return isRu ? `${monthsRu[month]} ${year}` : `${monthsEn[month]} ${year}`;
  };

  const t = {
    seasonTitle: isRu ? 'ТЕКУЩИЙ СЕЗОН' : 'CURRENT SEASON',
    monthlyBadge: isRu ? 'ОБНОВЛЯЕТСЯ КАЖДЫЙ МЕСЯЦ' : 'UPDATES MONTHLY',
    welcomeTitle: isRu ? 'СИСТЕМА СРАЖЕНИЙ REKORDS' : 'REKORDS DUEL SYSTEM',
    welcomeSubtitle: isRu ? 'ВЫБЕРИТЕ КАТЕГОРИЮ ДЛЯ СРАЖЕНИЙ ОДИН НА ОДИН' : 'CHOOSE A CATEGORY FOR HEAD-TO-HEAD DUELS',
    episodeMode: isRu ? 'СХВАТКА ЭПИЗОДОВ' : 'EPISODE DUEL',
    episodeModeDesc: isRu ? 'Выбирайте лучшую историю Arknights в парах лицом к лицу.' : 'Evaluate the best Arknights lore narrative side-by-side.',
    musicMode: isRu ? 'СХВАТКА ТРЕКОВ' : 'SOUNDTRACK DUEL',
    musicModeDesc: isRu ? 'Сравнивайте легендарные саундтреки от Monster Siren Records.' : 'Compare legendary soundtracks from Monster Siren Records side-by-side.',
    exitButton: isRu ? 'ВЕРНУТЬСЯ НА ГЛАВНУЮ' : 'RETURN TO MAIN TERMINAL',
    chooseBest: isRu ? 'КАКОЙ ЭПИЗОД ЛУЧШЕ?' : 'WHICH IS BETTER?',
    chooseMusic: isRu ? 'КАКОЙ ТРЕК КРУЧЕ?' : 'WHICH SOUNDTRACK IS GREATER?',
    matchCount: (cur: number, tot: number) => isRu ? `Сражение ${cur} из ${tot}` : `Matchup ${cur} of ${tot}`,
    playBtn: isRu ? 'Слушать трек' : 'Play Track',
    stopBtn: isRu ? 'Остановить' : 'Stop Preview',
    chooseThis: isRu ? 'ГОЛОСОВАТЬ ЗА ЭТОТ' : 'CHOOSE THIS ONE',
    allEvaluated: isRu ? 'ОЦЕНКА УСПЕШНО ЗАВЕРШЕНА!' : 'EVALUATION COMPLETED!',
    resultsTitle: isRu ? 'РЕЗУЛЬТАТЫ СЕЗОНА' : 'SEASON STANDINGS',
    globalStandings: isRu ? 'МИРОВОЙ ЛЕЙДЕРБОРД (РЕАЛЬНОЕ ВРЕМЯ)' : 'GLOBAL LEADERBOARD (REAL-TIME)',
    yourTopPicks: isRu ? 'ВАШИ ПОБЕДНЫЕ ГОЛОСА В ЭТОМ МЕСЯЦЕ' : 'YOUR CHAMPION PICKS THIS MONTH',
    restartDuel: isRu ? 'НАЧАТЬ НОВОЕ СРАЖЕНИЕ' : 'START NEW DUEL',
    allEpisodesCovers: isRu ? '100% обложек загружено с Китая' : '100% of covers loaded from CN source',
    credits: isRu ? 'Источники: Hypergryph, Monster Siren, Arknights Wiki' : 'Sources: Hypergryph, Monster Siren, Arknights Wiki'
  };

  // Sync initialEpisodes with episodesList
  useEffect(() => {
    if (initialEpisodes && initialEpisodes.length > 0) {
      setEpisodesList(initialEpisodes);
    }
  }, [initialEpisodes]);

  // 1. Fetch real-time global vote counts
  const fetchVotes = async () => {
    try {
      const headers = authService.getAuthHeaders();
      const response = await fetch('/api/vote', {
        headers,
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setVotes(data);
      }
    } catch (e) {
      console.error('Failed to load global votes:', e);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Discord User authentication status
  const fetchDiscordUser = async () => {
    setIsCheckingDiscord(true);
    try {
      const state = await authService.fetchUser();
      setDiscordUser(state.user);
      setIsDiscordMember(state.isMember);
    } catch (error) {
      console.error('Failed to fetch Discord user:', error);
      setDiscordUser(null);
      setIsDiscordMember(false);
    } finally {
      setIsCheckingDiscord(false);
    }
  };

  const handleDiscordLogin = () => {
    authService.login();
  };

  // 3. Fetch Monster Siren Soundtrack Catalog
  const fetchMonsterSirenCatalog = async () => {
    try {
      setLoadingMusic(true);
      const fetchDirectOrProxy = async (url: string) => {
        try {
          const directRes = await fetch(url);
          if (directRes.ok) return directRes;
        } catch {
          // Fallback to proxy if direct fetch fails
        }
        return fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
      };

      const albumsRes = await fetchDirectOrProxy('https://monster-siren.hypergryph.com/api/albums');
      if (!albumsRes.ok) throw new Error('Albums failed');
      const albumsJson = await albumsRes.json();
      const albumList: AlbumData[] = albumsJson.data?.list || albumsJson.data || [];
      setAlbums(albumList);

      const songsRes = await fetchDirectOrProxy('https://monster-siren.hypergryph.com/api/songs');
      if (!songsRes.ok) throw new Error('Songs failed');
      const songsJson = await songsRes.json();
      const songList: SongData[] = songsJson.data?.list || songsJson.data || [];
      setSongs(songList);
    } catch (e) {
      console.error('Failed to load Monster Siren records, using high-quality local cache:', e);
      // Fallback songs with high fidelity
      setAlbums([
        { cid: 'album-1', name: 'Rhodes Island Records', coverUrl: 'https://monster-siren.hypergryph.com/images/default.jpg' },
        { cid: 'album-2', name: 'Spark for Dream', coverUrl: 'https://monster-siren.hypergryph.com/images/default.jpg' }
      ]);
      setSongs([
        { cid: '342938', name: 'Spark for Dream', albumCid: 'album-2' },
        { cid: '492812', name: 'Renegade', albumCid: 'album-1' },
        { cid: '501234', name: 'Radiant', albumCid: 'album-1' },
        { cid: '129841', name: 'Speed of Light', albumCid: 'album-1' },
        { cid: '192841', name: 'Towerfiertz', albumCid: 'album-1' },
        { cid: '201948', name: 'Boiling Blood', albumCid: 'album-1' }
      ]);
    } finally {
      setLoadingMusic(false);
    }
  };

  // 4. Initialize everything on mount & set up online real-time polling
  useEffect(() => {
    fetchVotes();
    fetchDiscordUser();
    fetchMonsterSirenCatalog();

    // Poll live votes once a day (24 hours) to keep the online leaderboard synchronized
    const votesInterval = setInterval(() => {
      fetchVotes();
    }, 24 * 60 * 60 * 1000);

    // Set up global preview player
    audioRef.current = new Audio();
    
    const handleEnded = () => {
      if (isLoopingRef.current && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(console.error);
        return;
      }

      const queue = activeQueueRef.current;
      const currentCid = playingSongCidRef.current;

      if (queue.length > 0 && currentCid && togglePlaySongRef.current) {
        let nextIndex = 0;
        if (isShuffleRef.current) {
          nextIndex = Math.floor(Math.random() * queue.length);
        } else {
          const curIdx = queue.findIndex(s => s.cid === currentCid);
          nextIndex = curIdx < 0 ? 0 : (curIdx + 1) % queue.length;
        }
        const nextSong = queue[nextIndex];
        if (nextSong) {
          togglePlaySongRef.current(nextSong);
          return;
        }
      }

      setPlayingSongCid(null);
      setPlayingSongDetail(null);
      setAudioProgress({ currentTime: 0, duration: 0 });
    };

    const handleTimeUpdate = () => {
      if (audioRef.current) {
        setAudioProgress({
          currentTime: audioRef.current.currentTime,
          duration: audioRef.current.duration || 0
        });
      }
    };

    audioRef.current.addEventListener('ended', handleEnded);
    audioRef.current.addEventListener('timeupdate', handleTimeUpdate);

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'DISCORD_AUTH_SUCCESS') {
        fetchDiscordUser();
        fetchVotes();
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      clearInterval(votesInterval);
      window.removeEventListener('message', handleMessage);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener('ended', handleEnded);
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        audioRef.current = null;
      }
    };
  }, []);

  // 4b. Auto-start mode triggers
  useEffect(() => {
    if (initialMode === 'EPISODES_ONLY') {
      const completed = localStorage.getItem(`ak_duel_completed_ep_v2_${currentMonthId}`) === 'true';
      if (completed) {
        setCurrentView('RESULTS');
      } else {
        if (episodesList.length >= 2) {
          startEpisodeDuel();
        }
      }
    }
  }, [initialMode, episodesList.length]);

  // 5. Build Pairwise Matches
  // Shuffle array using Fisher-Yates
  const shuffleArray = <T,>(arr: T[]): T[] => {
    const newArr = [...arr];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  };

  const startEpisodeDuel = () => {
    if (episodesList.length < 2) return;
    const shuffled = shuffleArray(episodesList);
    const optionA = shuffled[0];
    const optionB = shuffled[1];
    const pool = shuffled.slice(2);
    const totalRounds = Math.min(20, episodesList.length - 1);

    const initialMatchup: Matchup<any> = {
      id: 'ep_match_0',
      optionA,
      optionB
    };

    setEpisodeMatchups([initialMatchup]);
    setEpisodePool(pool);
    setEpisodeTotalRounds(totalRounds);
    setCurrentEpisodeIndex(0);
    setEpisodeUserWinners({});
    setCurrentView('EPISODE_DUEL');
  };

  const startMusicDuel = () => {
    if (songs.length < 2) return;
    const shuffled = shuffleArray(songs);
    const optionA = shuffled[0];
    const optionB = shuffled[1];
    const pool = shuffled.slice(2);
    const totalRounds = Math.min(20, songs.length - 1);

    const initialMatchup: Matchup<any> = {
      id: 'music_match_0',
      optionA,
      optionB
    };

    setMusicMatchups([initialMatchup]);
    setMusicPool(pool);
    setMusicTotalRounds(totalRounds);
    setCurrentMusicIndex(0);
    setMusicUserWinners({});
    setCurrentView('MUSIC_DUEL');
  };

  // 6. Handle Selection
  const handleSelectEpisodeOption = async (selectedEp: any, matchId: string) => {
    // Record user winner
    setEpisodeUserWinners(prev => ({ ...prev, [matchId]: selectedEp.id }));
    
    // Record vote to database (POST /api/vote)
    try {
      const headers = authService.getAuthHeaders({ 'Content-Type': 'application/json' });
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ episodeId: selectedEp.id })
      });
      if (response.ok) {
        const freshVotes = await response.json();
        setVotes(freshVotes);
      }
    } catch (err) {
      console.error('Failed to commit episode vote:', err);
    }

    const currentMatchup = episodeMatchups[currentEpisodeIndex];
    if (!currentMatchup) return;

    const isOptionAChosen = selectedEp.id === currentMatchup.optionA.id;

    if (currentEpisodeIndex + 1 < episodeTotalRounds) {
      let nextPool = [...episodePool];
      if (nextPool.length === 0) {
        nextPool = shuffleArray(episodesList.filter(e => e.id !== selectedEp.id));
      }

      const newChallenger = nextPool.shift() || episodesList.find(e => e.id !== selectedEp.id)!;
      setEpisodePool(nextPool);

      const nextMatchup: Matchup<any> = {
        id: `ep_match_${currentEpisodeIndex + 1}`,
        optionA: isOptionAChosen ? selectedEp : newChallenger,
        optionB: isOptionAChosen ? newChallenger : selectedEp
      };

      setEpisodeMatchups(prev => [...prev, nextMatchup]);
      setCurrentEpisodeIndex(prev => prev + 1);
    } else {
      // Finished all! Save completed flag locally for the current month
      localStorage.setItem(`ak_duel_completed_ep_v2_${currentMonthId}`, 'true');
      setCurrentView('RESULTS');
    }
  };

  const handleSelectMusicOption = async (selectedSong: any, matchId: string) => {
    setMusicUserWinners(prev => ({ ...prev, [matchId]: selectedSong.cid }));
    
    // Record vote to database
    try {
      const headers = authService.getAuthHeaders({ 'Content-Type': 'application/json' });
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ songCid: selectedSong.cid })
      });
      if (response.ok) {
        const freshVotes = await response.json();
        setVotes(freshVotes);
      }
    } catch (err) {
      console.error('Failed to commit song vote:', err);
    }

    const currentMatchup = musicMatchups[currentMusicIndex];
    if (!currentMatchup) return;

    const isOptionAChosen = selectedSong.cid === currentMatchup.optionA.cid;
    const losingSong = isOptionAChosen ? currentMatchup.optionB : currentMatchup.optionA;

    // Stop playing audio if the losing song was being previewed
    if (playingSongCid === losingSong.cid) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setPlayingSongCid(null);
      setPlayingSongDetail(null);
    }

    if (currentMusicIndex + 1 < musicTotalRounds) {
      let nextPool = [...musicPool];
      if (nextPool.length === 0) {
        nextPool = shuffleArray(songs.filter(s => s.cid !== selectedSong.cid));
      }

      const newChallenger = nextPool.shift() || songs.find(s => s.cid !== selectedSong.cid)!;
      setMusicPool(nextPool);

      const nextMatchup: Matchup<any> = {
        id: `music_match_${currentMusicIndex + 1}`,
        optionA: isOptionAChosen ? selectedSong : newChallenger,
        optionB: isOptionAChosen ? newChallenger : selectedSong
      };

      setMusicMatchups(prev => [...prev, nextMatchup]);
      setCurrentMusicIndex(prev => prev + 1);
    } else {
      localStorage.setItem(`ak_duel_completed_music_v2_${currentMonthId}`, 'true');
      setCurrentView('RESULTS');
    }
  };

  // Playlist Management Helpers
  const createPlaylist = (name: string, initialSongCid?: string) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const newPl: Playlist = {
      id: `pl_${Date.now()}`,
      name: trimmed,
      songCids: initialSongCid ? [initialSongCid] : [],
      createdAt: Date.now()
    };
    setPlaylists(prev => [...prev, newPl]);
    setNewPlaylistName('');
    setShowCreatePlaylistModal(false);
    return newPl.id;
  };

  const deletePlaylist = (playlistId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const pl = playlists.find(p => p.id === playlistId);
    if (pl?.isSystemFavorites) return;
    setPlaylists(prev => prev.filter(p => p.id !== playlistId));
    if (selectedPlaylistId === playlistId) {
      setSelectedPlaylistId('favs');
    }
  };

  const renamePlaylist = (playlistId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setPlaylists(prev => prev.map(p => p.id === playlistId ? { ...p, name: trimmed } : p));
    setEditingPlaylistId(null);
    setEditingPlaylistName('');
  };

  const toggleSongInPlaylist = (playlistId: string, songCid: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPlaylists(prev => prev.map(p => {
      if (p.id !== playlistId) return p;
      const exists = p.songCids.includes(songCid);
      const updatedCids = exists 
        ? p.songCids.filter(c => c !== songCid)
        : [...p.songCids, songCid];
      return { ...p, songCids: updatedCids };
    }));
  };

  const removeSongFromPlaylist = (playlistId: string, songCid: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPlaylists(prev => prev.map(p => {
      if (p.id !== playlistId) return p;
      return { ...p, songCids: p.songCids.filter(c => c !== songCid) };
    }));
  };

  const isSongFavorite = (songCid: string) => {
    const favsPl = playlists.find(p => p.id === 'favs');
    return favsPl ? favsPl.songCids.includes(songCid) : false;
  };

  const toggleFavoriteTrack = (songCid: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    toggleSongInPlaylist('favs', songCid);
  };

  const playPlaylist = (playlist: Playlist, startSongCid?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const playlistSongs = songs.filter(s => playlist.songCids.includes(s.cid));
    if (playlistSongs.length === 0) return;

    setActiveQueue(playlistSongs);
    setPlaybackContextName(`${isRu ? 'Плейлист:' : 'Playlist:'} ${playlist.name}`);
    setSelectedPlaylistId(playlist.id);

    const startSong = startSongCid 
      ? playlistSongs.find(s => s.cid === startSongCid) || playlistSongs[0]
      : playlistSongs[0];

    togglePlaySong(startSong);
  };

  // Player Controls & Audio Navigation Helpers
  const playNextSong = () => {
    const queue = activeQueue.length > 0 ? activeQueue : (filteredSongs.length > 0 ? filteredSongs : songs);
    if (queue.length === 0) return;
    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * queue.length);
      togglePlaySong(queue[randomIndex]);
      return;
    }
    const currentIndex = queue.findIndex(s => s.cid === playingSongCid);
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % queue.length;
    togglePlaySong(queue[nextIndex]);
  };

  const playPrevSong = () => {
    const queue = activeQueue.length > 0 ? activeQueue : (filteredSongs.length > 0 ? filteredSongs : songs);
    if (queue.length === 0) return;
    const currentIndex = queue.findIndex(s => s.cid === playingSongCid);
    const prevIndex = currentIndex <= 0 ? queue.length - 1 : currentIndex - 1;
    togglePlaySong(queue[prevIndex]);
  };

  const togglePlayPause = () => {
    if (!audioRef.current || !playingSongCid) return;
    if (audioRef.current.paused) {
      audioRef.current.play().then(() => setIsAudioPaused(false)).catch(() => setIsAudioPaused(true));
    } else {
      audioRef.current.pause();
      setIsAudioPaused(true);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (audioRef.current) {
      audioRef.current.volume = nextMute ? 0 : volume;
    }
  };

  const openDuelLyrics = async (song: SongData, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDuelLyricsSong(song);
    setLoadingDuelLyrics(true);
    setDuelLyricsLines(null);
    try {
      const detailUrl = encodeURIComponent(`https://monster-siren.hypergryph.com/api/song/${song.cid}`);
      const response = await fetch(`/api/proxy?url=${detailUrl}`);
      if (response.ok) {
        const json = await response.json();
        const detail: SongDetail = json.data;
        if (detail?.lyricUrl) {
          const lrcRes = await fetch(`/api/proxy?url=${encodeURIComponent(detail.lyricUrl)}`);
          if (lrcRes.ok) {
            const lrcText = await lrcRes.text();
            setDuelLyricsLines(parseLrc(lrcText));
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load duel lyrics:', err);
    } finally {
      setLoadingDuelLyrics(false);
    }
  };

  // 7. Play Audio Preview with Lyrics Fetching
  const togglePlaySong = async (song: SongData, e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); // prevent triggering option selection
    
    // Maintain ref for auto-advance in handleEnded
    togglePlaySongRef.current = togglePlaySong;

    // Automatically set activeQueue if current queue doesn't contain this song and not in playlist mode
    if (selectedAlbumCid !== 'PLAYLISTS' && !activeQueue.some(s => s.cid === song.cid)) {
      const currentContextList = filteredSongs.length > 0 ? filteredSongs : songs;
      setActiveQueue(currentContextList);
      if (selectedAlbumCid) {
        const album = albums.find(a => a.cid === selectedAlbumCid);
        if (album) setPlaybackContextName(`${isRu ? 'Альбом:' : 'Album:'} ${album.name}`);
      } else {
        setPlaybackContextName(isRu ? 'Все треки' : 'All Tracks');
      }
    }

    if (playingSongCid === song.cid) {
      if (audioRef.current) {
        if (audioRef.current.paused) {
          audioRef.current.play().then(() => setIsAudioPaused(false)).catch(() => setIsAudioPaused(true));
        } else {
          audioRef.current.pause();
          setIsAudioPaused(true);
        }
      }
      return;
    }

    setLoadingAudio(true);
    setAudioError(null);
    setCurrentLyrics(null);
    setActiveLyricIndex(-1);

    try {
      const detailUrl = encodeURIComponent(`https://monster-siren.hypergryph.com/api/song/${song.cid}`);
      const response = await fetch(`/api/proxy?url=${detailUrl}`);
      if (!response.ok) throw new Error('Failed to retrieve streaming details');
      const json = await response.json();
      
      const detail: SongDetail = json.data;
      if (!detail || !detail.sourceUrl) {
        throw new Error('Streaming URL omitted from database records');
      }

      setPlayingSongDetail(detail);
      setPlayingSongCid(song.cid);

      if (audioRef.current) {
        // Play directly from origin CDN URL to save Vercel Outgoing Bandwidth (Fast Origin Transfer)
        audioRef.current.src = detail.sourceUrl;
        audioRef.current.volume = isMuted ? 0 : volume;
        audioRef.current.loop = isLooping;
        audioRef.current.play().then(() => {
          setIsAudioPaused(false);
        }).catch((err) => {
          console.warn('Audio play deferred:', err);
          setIsAudioPaused(true);
        });
      }

      // Fetch official LRC lyrics if available
      if (detail.lyricUrl) {
        setLoadingLyrics(true);
        try {
          const lyricRes = await fetch(`/api/proxy?url=${encodeURIComponent(detail.lyricUrl)}`);
          if (lyricRes.ok) {
            const lrcText = await lyricRes.text();
            setCurrentLyrics(parseLrc(lrcText));
          }
        } catch (lErr) {
          console.warn('Failed to load lyrics for song:', lErr);
        } finally {
          setLoadingLyrics(false);
        }
      }
    } catch (err) {
      console.error('Error playing preview:', err);
      setAudioError(isRu ? 'Аудио недоступно' : 'Audio stream offline');
      setPlayingSongCid(null);
      setIsAudioPaused(true);
    } finally {
      setLoadingAudio(false);
    }
  };

  // 7b. Direct Song Voting
  const handleDirectVoteSong = async (songCid: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (!discordUser) {
      handleDiscordLogin();
      return;
    }
    if (!isDiscordMember) {
      alert(isRu 
        ? 'Голосовать могут только подтверждённые участники нашего Discord сервера.'
        : 'Only verified Discord server members are eligible to cast votes.'
      );
      return;
    }

    const isCurrentlyVoted = votes.userVote?.songCid === songCid;
    const targetCid = isCurrentlyVoted ? null : songCid;

    // Immediately stop audio if voting on the song currently being previewed
    if (playingSongCid === songCid) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setPlayingSongCid(null);
      setPlayingSongDetail(null);
    }

    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songCid: targetCid })
      });
      if (response.ok) {
        const freshVotes = await response.json();
        setVotes(freshVotes);
      } else {
        const errJson = await response.json().catch(() => ({}));
        alert(errJson.error || (isRu ? 'Не удалось проголосовать' : 'Failed to cast vote'));
      }
    } catch (err) {
      console.error('Failed to commit song vote:', err);
      alert(isRu ? 'Ошибка сети при голосовании' : 'Network error during voting');
    }
  };
  
  // 7c. Direct Track and Album Downloads with Cover Image
  const downloadSingleTrack = async (song: SongData, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    setDownloadingSongCid(song.cid);
    try {
      const detailUrl = encodeURIComponent(`https://monster-siren.hypergryph.com/api/song/${song.cid}`);
      const response = await fetch(`/api/proxy?url=${detailUrl}`);
      if (!response.ok) throw new Error('Failed to retrieve song details');
      const json = await response.json();
      
      const detail: SongDetail = json.data;
      if (!detail || !detail.sourceUrl) {
        throw new Error('Streaming URL omitted from database records');
      }

      const safeName = song.name.replace(/[/\\?%*:|"<>]/g, '_').trim() || 'track';

      // 1. Fetch audio stream (Try direct first to save server bandwidth, fallback to proxy)
      let audioRes;
      try {
        audioRes = await fetch(detail.sourceUrl);
        if (!audioRes.ok) throw new Error();
      } catch (e) {
        const audioProxyUrl = `/api/proxy?url=${encodeURIComponent(detail.sourceUrl)}`;
        audioRes = await fetch(audioProxyUrl);
      }
      if (!audioRes.ok) throw new Error('Failed to download audio content');

      const audioBlob = await audioRes.blob();

      // 2. Fetch cover image (Try direct first to save server bandwidth, fallback to proxy)
      const coverUrl = getSongCoverUrl(song);
      let coverBlob: Blob | null = null;
      if (coverUrl) {
        try {
          let coverRes;
          try {
            coverRes = await fetch(coverUrl);
            if (!coverRes.ok) throw new Error();
          } catch (e) {
            coverRes = await fetch(`/api/proxy?url=${encodeURIComponent(coverUrl)}`);
          }
          if (coverRes.ok) {
            coverBlob = await coverRes.blob();
          }
        } catch (cErr) {
          console.warn('Cover image download warning:', cErr);
        }
      }

      // 3. Download audio file
      const audioObjUrl = URL.createObjectURL(audioBlob);
      const audioLink = document.createElement('a');
      audioLink.href = audioObjUrl;
      audioLink.download = `${safeName}.mp3`;
      document.body.appendChild(audioLink);
      audioLink.click();
      document.body.removeChild(audioLink);
      setTimeout(() => URL.revokeObjectURL(audioObjUrl), 3000);

      // 4. Download cover image file if available
      if (coverBlob) {
        setTimeout(() => {
          const coverObjUrl = URL.createObjectURL(coverBlob!);
          const coverLink = document.createElement('a');
          coverLink.href = coverObjUrl;
          coverLink.download = `${safeName}_cover.jpg`;
          document.body.appendChild(coverLink);
          coverLink.click();
          document.body.removeChild(coverLink);
          setTimeout(() => URL.revokeObjectURL(coverObjUrl), 3000);
        }, 300);
      }
    } catch (err) {
      console.error('Failed to download track:', err);
      alert(isRu ? 'Не удалось скачать трек' : 'Failed to download track');
    } finally {
      setDownloadingSongCid(null);
    }
  };

  const downloadAlbum = async (album: AlbumData, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    setDownloadingAlbumCid(album.cid);

    try {
      // 1. Fetch official album detail to get exact list of tracks
      let albumTracks: { cid: string; name: string }[] = [];
      try {
        const albumDetailUrl = encodeURIComponent(`https://monster-siren.hypergryph.com/api/album/${album.cid}/detail`);
        const albumRes = await fetch(`/api/proxy?url=${albumDetailUrl}`);
        if (albumRes.ok) {
          const albumJson = await albumRes.json();
          if (albumJson.data?.songs && Array.isArray(albumJson.data.songs)) {
            albumTracks = albumJson.data.songs;
          }
        }
      } catch (e) {
        console.warn('Failed to fetch official album detail, falling back to local list:', e);
      }

      // Fallback to local songs matching albumCid
      if (albumTracks.length === 0) {
        albumTracks = songs.filter(s => s.albumCid === album.cid).map(s => ({ cid: s.cid, name: s.name }));
      }

      if (albumTracks.length === 0) {
        alert(isRu ? 'В этом альбоме нет треков' : 'No tracks found in this album');
        setDownloadingAlbumCid(null);
        return;
      }

      setDownloadProgress({ current: 0, total: albumTracks.length });

      // @ts-ignore
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();

      // Download and save album cover image inside the ZIP! (Try direct first to save server bandwidth, fallback to proxy)
      if (album.coverUrl) {
        try {
          let coverRes;
          try {
            coverRes = await fetch(album.coverUrl);
            if (!coverRes.ok) throw new Error();
          } catch (e) {
            coverRes = await fetch(`/api/proxy?url=${encodeURIComponent(album.coverUrl)}`);
          }
          if (coverRes.ok) {
            const coverBlob = await coverRes.blob();
            zip.file('cover.jpg', coverBlob);
          }
        } catch (cErr) {
          console.warn('Could not add album cover to zip:', cErr);
        }
      }

      for (let i = 0; i < albumTracks.length; i++) {
        const songItem = albumTracks[i];
        
        setDownloadProgress({ current: i + 1, total: albumTracks.length });

        const detailUrl = encodeURIComponent(`https://monster-siren.hypergryph.com/api/song/${songItem.cid}`);
        const response = await fetch(`/api/proxy?url=${detailUrl}`);
        if (!response.ok) continue;
        const json = await response.json();
        
        const detail: SongDetail = json.data;
        if (!detail || !detail.sourceUrl) continue;

        // Try direct first to save server bandwidth, fallback to proxy
        let audioRes;
        try {
          audioRes = await fetch(detail.sourceUrl);
          if (!audioRes.ok) throw new Error();
        } catch (e) {
          const audioProxyUrl = `/api/proxy?url=${encodeURIComponent(detail.sourceUrl)}`;
          audioRes = await fetch(audioProxyUrl);
        }
        if (!audioRes.ok) continue;

        const audioBlob = await audioRes.blob();
        const safeTrackName = songItem.name.replace(/[/\\?%*:|"<>]/g, '_').trim() || `track_${i + 1}`;
        zip.file(`${i + 1}. ${safeTrackName}.mp3`, audioBlob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      const safeAlbumName = album.name.replace(/[/\\?%*:|"<>]/g, '_').trim() || 'album';
      const filename = `${safeAlbumName}.zip`;
      const objectUrl = URL.createObjectURL(zipBlob);

      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 3000);
    } catch (err) {
      console.error('Failed to download album:', err);
      alert(isRu ? 'Не удалось скачать альбом' : 'Failed to download album');
    } finally {
      setDownloadingAlbumCid(null);
      setDownloadProgress(null);
    }
  };

  // Format time utility (MM:SS)
  const formatTime = (secs: number): string => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };
  const getEpisodeCoverUrl = (ep: any) => {
    const BANNERS_BASE_URL = 'https://fastly.jsdelivr.net/gh/neponum/zoot-data@main/banners';
    const imageId = ep.storyEntryPicId || ep.id;
    const chineseName = ep.chineseName || ep.name;
    
    const safeImageId = imageId.replace(/[:：\s<>"/\\|?*]/g, '').trim();
    const safeChineseName = (chineseName || '').replace(/[:：\s<>"/\\|?*]/g, '').trim();
    
    if (ep.id.startsWith('main_')) {
      const num = ep.id.replace('main_', '');
      const paddedNum = num.length === 1 ? `0${num}` : num;
      return `${BANNERS_BASE_URL}/main_${paddedNum}.png`;
    } else if (ep.id.startsWith('is_')) {
      const num = ep.id.replace('is_', '');
      return `${BANNERS_BASE_URL}/IS_${num}.png`;
    } else if (safeChineseName && !/[\u4e00-\u9fa5]/.test(safeImageId)) {
      return `${BANNERS_BASE_URL}/情报处理室_${safeChineseName}.png`;
    } else {
      return `${BANNERS_BASE_URL}/${safeImageId}.png`;
    }
  };

  const handleCoverError = (ep: any, e: React.SyntheticEvent<HTMLImageElement>) => {
    const BANNERS_BASE_URL = 'https://fastly.jsdelivr.net/gh/neponum/zoot-data@main/banners';
    const img = e.currentTarget;
    const currentSrc = img.src;
    const decodedSrc = decodeURIComponent(currentSrc);
    const chineseName = ep.chineseName || ep.name;
    const imageId = ep.storyEntryPicId || ep.id;
    
    const safeImageId = imageId.replace(/[:：\s<>"/\\|?*]/g, '').trim();
    const safeChineseName = (chineseName || '').replace(/[:：\s<>"/\\|?*]/g, '').trim();
    
    let nextSrc = '';
    if (decodedSrc.includes(`${BANNERS_BASE_URL}/情报处理室_${safeChineseName}.png`)) {
      nextSrc = `${BANNERS_BASE_URL}/${safeImageId}.png`;
    } else if (decodedSrc.includes(`${BANNERS_BASE_URL}/main_`) && ep.id.startsWith('main_')) {
      const num = ep.id.replace('main_', '');
      if (!decodedSrc.endsWith(`main_${num}.png`)) {
        nextSrc = `${BANNERS_BASE_URL}/main_${num}.png`;
      } else {
        img.style.display = 'none';
        return;
      }
    } else {
      img.style.display = 'none';
      return;
    }
    img.src = nextSrc;
  };

  const getSongCoverUrl = (song: SongData) => {
    const album = albums.find(a => a.cid === song.albumCid);
    return album?.coverUrl || 'https://monster-siren.hypergryph.com/images/default.jpg';
  };

  const getSongArtist = (song: SongData): string => {
    return (song.artistes || song.artists || []).join(', ') || 'Monster Siren Artist';
  };

  // 9. Computations & Standings
  const totalEpisodeVotes = (Object.values(votes.episodeVotes) as number[]).reduce((a, b) => a + b, 0);
  const totalSongVotes = (Object.values(votes.songVotes) as number[]).reduce((a, b) => a + b, 0);

  const globalLeaderboardEpisodes = [...episodesList]
    .map(ep => ({
      id: ep.id,
      name: ep.name,
      chineseName: ep.chineseName,
      count: votes.episodeVotes[ep.id] || 0
    }))
    .sort((a, b) => b.count - a.count);

  const globalLeaderboardSongs = [...songs]
    .map(song => ({
      cid: song.cid,
      name: song.name,
      coverUrl: getSongCoverUrl(song),
      count: votes.songVotes[song.cid] || 0
    }))
    .sort((a, b) => b.count - a.count)
    .filter(s => s.count > 0 || songs.length <= 15); // filter active ones to look neat

  // Get user winners to display on results
  const userWinningEpisodes = Object.values(episodeUserWinners).map(id => 
    episodesList.find(ep => ep.id === id)
  ).filter(Boolean);

  const userWinningSongs = Object.values(musicUserWinners).map(cid => 
    songs.find(s => s.cid === cid)
  ).filter(Boolean);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden text-white bg-[#060606] relative p-4 md:p-8 font-mono">
      
      {/* Dynamic Seasonal Header / Ambient backdrop */}
      <div className="absolute inset-0 bg-radial-gradient from-blue-900/10 to-transparent pointer-events-none" />
      
      {/* Top Meta Bar */}
      <div className="flex flex-row items-center justify-between border-b border-white/10 pb-4 mb-6 shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          <Award className="w-5 h-5 text-blue-500 animate-pulse" />
          <div>
            <span className="text-[8px] font-black text-blue-400 block tracking-[0.2em]">{t.seasonTitle}</span>
            <span className="text-xs font-black tracking-widest text-white uppercase">{getSeasonName()}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Discord Status Widget */}
          <div className="flex items-center gap-2 border border-white/5 bg-zinc-950/60 px-3 py-1.5 rounded-sm">
            {isCheckingDiscord ? (
              <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
            ) : discordUser ? (
              <div className="flex items-center gap-2">
                {discordUser.avatar && (
                  <img src={discordUser.avatar} className="w-4 h-4 rounded-full border border-white/20" alt="" referrerPolicy="no-referrer" />
                )}
                <span className="text-[9px] font-black tracking-wider text-white/80">{discordUser.username.toUpperCase()}</span>
                {isDiscordMember ? (
                  <span className="text-[7px] font-mono px-1.5 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-xs uppercase">MEMBER</span>
                ) : (
                  <span className="text-[7px] font-mono px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xs uppercase">GUEST</span>
                )}
              </div>
            ) : (
              <button 
                onClick={handleDiscordLogin}
                className="text-[8px] font-black tracking-widest bg-[#5865F2] hover:bg-[#4752C4] text-white px-2 py-1 rounded-sm uppercase transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Activity className="w-2.5 h-2.5" />
                {isRu ? 'ВОЙТИ ЧЕРЕЗ DISCORD' : 'DISCORD LOG IN'}
              </button>
            )}
          </div>

          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[7.5px] font-bold text-white/30 tracking-widest uppercase">{t.monthlyBadge}</span>
            <span className="text-[8px] font-mono font-bold text-blue-500 tracking-wide animate-pulse">SYSTEM COMPLIANT</span>
          </div>
          
          <button
            onClick={() => {
              if (currentView === 'EPISODE_DUEL' || currentView === 'MUSIC_DUEL' || currentView === 'RESULTS') {
                if (initialMode === 'EPISODES_ONLY') {
                  if (onClose) onClose();
                  else navigate('/');
                } else if (initialMode === 'MUSIC_ONLY') {
                  setCurrentView('MUSIC_PORTAL');
                } else {
                  setCurrentView('MODE_SELECT');
                }
              } else {
                if (onClose) {
                  onClose();
                } else {
                  navigate('/');
                }
              }
            }}
            className="h-9 px-4 border border-white/10 hover:border-white/30 bg-zinc-950/80 hover:bg-zinc-900 transition-all rounded-sm flex items-center gap-2 text-[9px] font-black tracking-widest uppercase cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {currentView === 'EPISODE_DUEL' || currentView === 'MUSIC_DUEL' || currentView === 'RESULTS' 
              ? (isRu ? 'НАЗАД' : 'BACK') 
              : (onClose ? (isRu ? 'ЗАКРЫТЬ' : 'CLOSE') : t.exitButton)}
          </button>
        </div>
      </div>

      {/* Main Container Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar relative z-10">
        
        {/* VIEW 5: MUSIC_PORTAL (Soundtrack Hub & Dedicated Music Player) */}
        {currentView === 'MUSIC_PORTAL' && (
          <div className="max-w-6xl mx-auto w-full py-2 px-1 flex flex-col gap-6 animate-in fade-in duration-300">
            
            {/* Top Interactive Banner: Live Player Station */}
            {(() => {
              const defaultSong = songs[0];
              const activeSong = songs.find(s => s.cid === playingSongCid) || defaultSong;
              
              if (!activeSong) {
                return (
                  <div className="bg-zinc-950/40 border border-white/5 rounded-sm p-8 text-center">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto mb-2" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                      {isRu ? 'ЗАГРУЗКА КАТАЛОГА САУНДТРЕКОВ...' : 'SYNCHRONIZING AUDIO CHANNELS...'}
                    </span>
                  </div>
                );
              }

              const isPlaying = playingSongCid === activeSong.cid;
              const isVoted = votes.userVote?.songCid === activeSong.cid;
              const votesCount = votes.songVotes[activeSong.cid] || 0;
              const artistName = getSongArtist(activeSong);
              
              const formatTime = (secs: number) => {
                if (isNaN(secs) || secs === Infinity) return '0:00';
                const m = Math.floor(secs / 60);
                const s = Math.floor(secs % 60);
                return `${m}:${String(s).padStart(2, '0')}`;
              };

              const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
                if (!audioRef.current || !audioRef.current.duration) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const width = rect.width;
                const percentage = clickX / width;
                audioRef.current.currentTime = percentage * audioRef.current.duration;
              };

              return (
                <div className="bg-zinc-950/85 border border-white/10 p-6 rounded-sm relative overflow-hidden flex flex-col lg:flex-row items-center gap-6 shadow-xl">
                  <div className="absolute inset-0 bg-radial-gradient from-blue-500/5 via-transparent to-transparent pointer-events-none" />
                  
                  <div className="relative shrink-0 w-28 h-28 md:w-32 md:h-32 group select-none">
                    <div className={`w-full h-full rounded-full border-2 border-white/10 bg-zinc-900 overflow-hidden relative shadow-2xl transition-transform duration-1000 ${isPlaying ? 'animate-[spin_6s_linear_infinite]' : ''}`}>
                      <img 
                        src={getSongCoverUrl(activeSong)} 
                        alt={activeSong.name}
                        className="w-full h-full object-cover opacity-60"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-[35%] rounded-full bg-black/90 border border-white/10 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-zinc-800 border border-white/5" />
                      </div>
                    </div>
                    {isPlaying && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping" />
                    )}
                  </div>

                  <div className="flex-1 w-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[7.5px] font-mono text-blue-400 border border-blue-400/20 px-1.5 py-0.5 rounded-xs tracking-widest uppercase font-black">
                          {isPlaying ? (isRu ? 'ВОСПРОИЗВЕДЕНИЕ' : 'NOW PLAYING') : (isRu ? 'ГОТОВ К ВОСПРОИЗВЕДЕНИЮ' : 'PLAYER STANDBY')}
                        </span>
                        {isVoted && (
                          <span className="text-[7.5px] font-mono text-amber-400 border border-amber-400/20 px-1.5 py-0.5 rounded-xs tracking-widest uppercase font-black flex items-center gap-1">
                            <Heart className="w-2 h-2 fill-amber-400" />
                            {isRu ? 'ВАШ ВЫБОР' : 'YOUR VOTE'}
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-sm md:text-base font-black uppercase text-white tracking-wider truncate">
                        {activeSong.name}
                      </h3>
                      <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-0.5 truncate">
                        {artistName}
                      </p>
                    </div>

                    <div className="my-4 w-full">
                      <div 
                        onClick={handleProgressBarClick}
                        className="h-1.5 bg-white/5 border border-white/5 rounded-full relative cursor-pointer group/bar overflow-hidden"
                      >
                        <div 
                          className="h-full bg-blue-500 group-hover/bar:bg-blue-400 transition-all rounded-full"
                          style={{ width: `${(audioProgress.currentTime / (audioProgress.duration || 1)) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[7.5px] font-mono text-white/30 uppercase tracking-widest mt-1.5 font-bold">
                        <span>{formatTime(audioProgress.currentTime)}</span>
                        <span>{formatTime(audioProgress.duration)}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => togglePlaySong(activeSong, e)}
                          className="px-4 py-2 bg-white text-black hover:bg-zinc-200 text-[9px] font-black tracking-widest uppercase rounded-sm flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          {isPlaying ? (
                            <>
                              <Pause className="w-3 h-3 fill-black text-black" />
                              {isRu ? 'ПАУЗА' : 'PAUSE'}
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 fill-black text-black" />
                              {isRu ? 'СЛУШАТЬ' : 'PLAY'}
                            </>
                          )}
                        </button>

                        {isPlaying && (
                          <button
                            onClick={() => {
                              if (audioRef.current) audioRef.current.pause();
                              setPlayingSongCid(null);
                              setPlayingSongDetail(null);
                              setAudioProgress({ currentTime: 0, duration: 0 });
                            }}
                            className="px-3 py-2 bg-zinc-900 border border-white/10 hover:border-red-500/30 text-[8px] font-black tracking-widest uppercase rounded-sm text-white/60 hover:text-red-400 transition-all cursor-pointer"
                          >
                            {isRu ? 'СТОП' : 'STOP'}
                          </button>
                        )}
                        
                        {loadingAudio && (
                          <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                        )}
                        {audioError && (
                          <span className="text-[7.5px] font-bold text-red-400 tracking-wider uppercase flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {audioError}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleDirectVoteSong(activeSong.cid, e)}
                          className={`px-4 py-2 rounded-sm text-[9px] font-black tracking-widest uppercase border transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                            isVoted 
                              ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)] hover:bg-amber-500/20' 
                              : 'bg-zinc-950/60 border-white/10 hover:border-blue-500 text-white hover:bg-blue-500/5'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isVoted ? 'fill-amber-400 text-amber-400' : 'text-white/60'}`} />
                          {isVoted 
                            ? (isRu ? 'УЖЕ ОТДАН ГОЛОС' : 'VOTED') 
                            : (isRu ? 'ПРОГОЛОСОВАТЬ' : 'CAST VOTE')}
                        </button>

                        <div className="flex flex-col items-end shrink-0 border-l border-white/5 pl-3">
                          <span className="text-[7px] font-bold text-white/30 uppercase tracking-widest">{isRu ? 'ГОЛОСОВ ТРЕКА' : 'TRACK VOTES'}</span>
                          <span className="text-xs font-mono font-black text-blue-400">{votesCount}</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })()}

            {/* Official Hypergryph & Monster Siren Copyright Notice Banner */}
            <div className="bg-blue-950/20 border border-blue-500/20 rounded-sm p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xs bg-blue-500/10 border border-blue-500/30 text-blue-400 shrink-0">
                  <ShieldCheck className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[9.5px] font-black tracking-widest text-blue-400 uppercase">
                      {isRu ? 'ОФИЦИАЛЬНЫЙ КАТАЛОГ MONSTER SIREN RECORDS' : 'OFFICIAL MONSTER SIREN RECORDS CATALOG'}
                    </span>
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-xs bg-white/5 border border-white/10 text-white/60 font-mono">
                      monster-siren.hypergryph.com
                    </span>
                  </div>
                  <p className="text-[8.5px] font-medium text-white/60 leading-relaxed mt-0.5">
                    {isRu 
                      ? 'Все музыкальные треки, обложки альбомов и аудиоматериалы загружаются напрямую с официального портала Monster Siren Records. Все авторские права и интеллектуальная собственность принадлежат HYPERGRYPH / Studio Montagne / 塞壬唱片-MSR.'
                      : 'All audio recordings, cover art, and media assets are retrieved directly from the official Monster Siren Records portal. All rights and intellectual property belong strictly to HYPERGRYPH / Studio Montagne / 塞壬唱片-MSR.'}
                  </p>
                </div>
              </div>
              <a 
                href="https://monster-siren.hypergryph.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="shrink-0 px-3 py-1.5 rounded-xs bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-500/50 text-blue-400 text-[8.5px] font-black tracking-widest uppercase transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3 h-3" />
                {isRu ? 'ОФИЦИАЛЬНЫЙ САЙТ MSR' : 'OFFICIAL MSR SITE'}
              </a>
            </div>

            {/* Full Width Album Discography Showcase Shelf */}
            <div className="bg-zinc-950/80 border border-white/10 p-5 rounded-sm mb-6 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-xs bg-blue-500/10 border border-blue-500/20">
                    <FolderOpen className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black tracking-widest text-white uppercase flex items-center gap-2">
                      {isRu ? 'ДИСКОГРАФИЯ MONSTER SIREN' : 'MONSTER SIREN DISCOGRAPHY'}
                      <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-xs bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {albums.length} {isRu ? 'АЛЬБОМОВ' : 'ALBUMS'}
                      </span>
                    </h3>
                    <p className="text-[8px] font-bold text-white/40 tracking-wider uppercase mt-0.5 flex items-center gap-2">
                      <span>{isRu ? 'Официальные релизы и саундтреки Arknights от 塞壬唱片-MSR' : 'Official Arknights OST releases from 塞壬唱片-MSR'}</span>
                      <span className="text-blue-400/70 font-mono hidden md:inline">• {isRu ? '(листайте колёсиком мыши)' : '(scroll with mouse wheel)'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      const el = document.getElementById('msr-album-shelf');
                      if (el) el.scrollBy({ left: -280, behavior: 'smooth' });
                    }}
                    className="p-1.5 rounded-xs bg-black/80 border border-white/10 hover:border-white/30 text-white/60 hover:text-white transition-all cursor-pointer"
                    title={isRu ? 'Прокрутить назад' : 'Scroll left'}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      const el = document.getElementById('msr-album-shelf');
                      if (el) el.scrollBy({ left: 280, behavior: 'smooth' });
                    }}
                    className="p-1.5 rounded-xs bg-black/80 border border-white/10 hover:border-white/30 text-white/60 hover:text-white transition-all cursor-pointer"
                    title={isRu ? 'Прокрутить вперед' : 'Scroll right'}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Horizontal Scrollable Album Cards */}
              <div 
                id="msr-album-shelf" 
                ref={albumShelfRef}
                className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pt-1 scroll-smooth"
              >
                {/* All Tracks Card */}
                <div 
                  onClick={() => setSelectedAlbumCid(null)}
                  className={`flex-shrink-0 w-36 sm:w-40 p-2.5 rounded-xs border transition-all cursor-pointer select-none flex flex-col justify-between group ${
                    selectedAlbumCid === null 
                      ? 'bg-gradient-to-b from-blue-950/40 to-blue-900/10 border-blue-500/60 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]' 
                      : 'bg-black/60 border-white/5 hover:border-white/20 text-white/60 hover:text-white'
                  }`}
                >
                  <div className="w-full aspect-square rounded-xs bg-zinc-900 border border-white/10 flex items-center justify-center mb-2 overflow-hidden relative group-hover:border-white/30 transition-all">
                    <Disc className={`w-8 h-8 ${selectedAlbumCid === null ? 'text-blue-400 animate-[spin_6s_linear_infinite]' : 'text-white/20 group-hover:text-white/40'}`} />
                  </div>
                  <div>
                    <span className="text-[9px] font-black tracking-widest uppercase block truncate">
                      {isRu ? 'ВСЕ ТРЕКИ' : 'ALL TRACKS'}
                    </span>
                    <span className="text-[7.5px] font-bold text-white/30 uppercase tracking-widest block mt-0.5">
                      {songs.length} {isRu ? 'ТРЕКОВ' : 'TRACKS'}
                    </span>
                  </div>
                </div>

                {/* My Playlists Card */}
                <div 
                  onClick={() => {
                    setSelectedAlbumCid('PLAYLISTS');
                    if (!selectedPlaylistId) setSelectedPlaylistId('favs');
                  }}
                  className={`flex-shrink-0 w-36 sm:w-40 p-2.5 rounded-xs border transition-all cursor-pointer select-none flex flex-col justify-between group ${
                    selectedAlbumCid === 'PLAYLISTS' 
                      ? 'bg-gradient-to-b from-amber-950/40 to-amber-900/10 border-amber-500/60 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]' 
                      : 'bg-black/60 border-amber-500/20 hover:border-amber-500/50 text-amber-400/80 hover:text-amber-300'
                  }`}
                >
                  <div className="w-full aspect-square rounded-xs bg-amber-950/20 border border-amber-500/30 flex items-center justify-center mb-2 overflow-hidden relative group-hover:border-amber-500/60 transition-all">
                    <ListMusic className="w-8 h-8 text-amber-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black tracking-widest uppercase block truncate text-amber-400">
                      {isRu ? 'МОИ ПЛЕЙЛИСТЫ' : 'MY PLAYLISTS'}
                    </span>
                    <span className="text-[7.5px] font-bold text-amber-400/50 uppercase tracking-widest block mt-0.5">
                      {playlists.length} {isRu ? 'ПЛЕЙЛИСТОВ' : 'PLAYLISTS'}
                    </span>
                  </div>
                </div>

                {/* Album Cards */}
                {albums.map((album) => {
                  const isSelected = selectedAlbumCid === album.cid;
                  const albumSongsCount = songs.filter(s => s.albumCid === album.cid).length;
                  if (albumSongsCount === 0) return null;

                  return (
                    <div 
                      key={album.cid}
                      onClick={() => setSelectedAlbumCid(album.cid)}
                      className={`flex-shrink-0 w-36 sm:w-40 p-2.5 rounded-xs border transition-all cursor-pointer select-none flex flex-col justify-between group ${
                        isSelected 
                          ? 'bg-gradient-to-b from-blue-950/40 to-blue-900/10 border-blue-500/60 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]' 
                          : 'bg-black/60 border-white/5 hover:border-white/20 text-white/60 hover:text-white'
                      }`}
                    >
                      <div className="w-full aspect-square rounded-xs overflow-hidden bg-zinc-900 border border-white/10 mb-2 relative group-hover:border-white/30 transition-all">
                        <img 
                          src={album.coverUrl} 
                          alt={album.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                          referrerPolicy="no-referrer"
                        />
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-blue-400 border border-black shadow-[0_0_8px_#3b82f6]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className={`text-[9px] font-black tracking-wider uppercase truncate ${isSelected ? 'text-blue-400' : 'text-white/90 group-hover:text-white'}`}>
                          {album.name}
                        </h4>
                        <span className="text-[7.5px] font-bold text-white/30 uppercase tracking-widest block mt-0.5">
                          {albumSongsCount} {isRu ? 'ТРЕКОВ' : 'TRACKS'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                  
                  <div className="lg:col-span-2 bg-zinc-950/65 border border-white/10 p-5 rounded-sm flex flex-col justify-between min-h-[500px]">
                    <div>
                      {selectedAlbumCid === 'PLAYLISTS' ? (
                        <div className="flex flex-col gap-4">
                          {/* Playlists Header Bar */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                            <div>
                              <span className="text-[8px] font-black text-amber-400 tracking-widest uppercase block">
                                {isRu ? 'МОЯ МУЗЫКАЛЬНАЯ КОЛЛЕКЦИЯ' : 'MY MUSIC COLLECTION'}
                              </span>
                              <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                                {isRu ? 'ПЛЕЙЛИСТЫ И ИЗБРАННЫЕ ТРЕКИ' : 'PLAYLISTS & FAVORITES'}
                              </h3>
                            </div>

                            <button
                              onClick={() => setShowCreatePlaylistModal(true)}
                              className="px-3 py-1.5 rounded-sm bg-amber-500 hover:bg-amber-400 text-black text-[8.5px] font-black tracking-widest uppercase transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.25)] cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              {isRu ? 'СОЗДАТЬ ПЛЕЙЛИСТ' : 'NEW PLAYLIST'}
                            </button>
                          </div>

                          {/* Horizontal Playlist Selector Tabs */}
                          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                            {playlists.map((pl) => {
                              const isSelected = selectedPlaylistId === pl.id;
                              const count = pl.songCids.length;
                              return (
                                <button
                                  key={pl.id}
                                  onClick={() => setSelectedPlaylistId(pl.id)}
                                  className={`px-3 py-2 rounded-xs border text-[9px] font-black tracking-wider uppercase whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                                    isSelected
                                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
                                      : 'bg-black/60 border-white/10 text-white/60 hover:border-white/20 hover:text-white'
                                  }`}
                                >
                                  {pl.isSystemFavorites ? <Heart className="w-3 h-3 text-amber-400 fill-amber-400" /> : <ListMusic className="w-3 h-3 text-amber-400" />}
                                  <span>{pl.name}</span>
                                  <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[7.5px] font-mono text-white/70">
                                    {count}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Selected Playlist Content */}
                          {(() => {
                            const activePl = playlists.find(p => p.id === selectedPlaylistId) || playlists[0];
                            if (!activePl) return null;

                            const plSongs = songs.filter(s => activePl.songCids.includes(s.cid));

                            return (
                              <div className="flex flex-col gap-4 mt-2">
                                {/* Active Playlist Details Card */}
                                <div className="p-4 bg-gradient-to-r from-amber-950/30 via-zinc-900/40 to-transparent border border-amber-500/20 rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xs overflow-hidden bg-amber-950/40 border border-amber-500/30 shrink-0 flex items-center justify-center relative">
                                      {plSongs[0] ? (
                                        <img src={getSongCoverUrl(plSongs[0])} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      ) : (
                                        <ListMusic className="w-6 h-6 text-amber-400" />
                                      )}
                                    </div>

                                    <div>
                                      <div className="flex items-center gap-2">
                                        {editingPlaylistId === activePl.id ? (
                                          <div className="flex items-center gap-2">
                                            <input
                                              type="text"
                                              value={editingPlaylistName}
                                              onChange={(e) => setEditingPlaylistName(e.target.value)}
                                              className="bg-black/80 border border-amber-500/50 text-white text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-xs focus:outline-none"
                                              autoFocus
                                            />
                                            <button
                                              onClick={() => renamePlaylist(activePl.id, editingPlaylistName)}
                                              className="px-2 py-0.5 bg-amber-500 text-black text-[8px] font-bold uppercase rounded-xs"
                                            >
                                              OK
                                            </button>
                                          </div>
                                        ) : (
                                          <h3 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
                                            {activePl.name}
                                            {!activePl.isSystemFavorites && (
                                              <button
                                                onClick={() => {
                                                  setEditingPlaylistId(activePl.id);
                                                  setEditingPlaylistName(activePl.name);
                                                }}
                                                className="text-white/40 hover:text-white transition-colors cursor-pointer"
                                                title={isRu ? 'Переименовать' : 'Rename'}
                                              >
                                                <Edit2 className="w-3 h-3" />
                                              </button>
                                            )}
                                          </h3>
                                        )}
                                      </div>

                                      <span className="text-[8px] text-white/40 font-mono uppercase tracking-widest block mt-0.5">
                                        {plSongs.length} {isRu ? 'композиций в этом плейлисте' : 'tracks in this playlist'}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                                    {plSongs.length > 0 && (
                                      <button
                                        onClick={(e) => playPlaylist(activePl, undefined, e)}
                                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-[9px] font-black tracking-widest uppercase rounded-sm flex items-center gap-2 transition-all shadow-[0_0_12px_rgba(245,158,11,0.2)] cursor-pointer"
                                      >
                                        <Play className="w-3.5 h-3.5 fill-black text-black" />
                                        {isRu ? 'СЛУШАТЬ ПЛЕЙЛИСТ' : 'PLAY PLAYLIST'}
                                      </button>
                                    )}

                                    {!activePl.isSystemFavorites && (
                                      <button
                                        onClick={(e) => deletePlaylist(activePl.id, e)}
                                        className="p-2 bg-zinc-900 border border-white/10 hover:border-red-500/50 hover:bg-red-500/10 text-white/40 hover:text-red-400 rounded-sm transition-all cursor-pointer"
                                        title={isRu ? 'Удалить плейлист' : 'Delete playlist'}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Playlist Songs List */}
                                {plSongs.length === 0 ? (
                                  <div className="py-16 text-center border border-dashed border-white/10 rounded-sm bg-black/40">
                                    <FolderPlus className="w-8 h-8 text-white/20 mx-auto mb-2" />
                                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
                                      {isRu ? 'В этом плейлисте пока нет треков' : 'This playlist is currently empty'}
                                    </p>
                                    <p className="text-[8px] text-white/20 uppercase tracking-wider mt-1">
                                      {isRu ? 'Нажмите "+" возле любого трека в каталоге, чтобы добавить его сюда' : 'Click "+" on any track in the catalog to add it here'}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-1 max-h-[500px] overflow-y-auto no-scrollbar pr-1">
                                    {plSongs.map((song, idx) => {
                                      const isPlaying = playingSongCid === song.cid;
                                      const artist = getSongArtist(song);
                                      const isDownloadingSingle = downloadingSongCid === song.cid;

                                      return (
                                        <div
                                          key={song.cid}
                                          onClick={(e) => playPlaylist(activePl, song.cid, e)}
                                          className={`flex items-center justify-between p-2 rounded-xs border transition-all cursor-pointer ${
                                            isPlaying 
                                              ? 'bg-amber-950/20 border-amber-500/40 text-amber-300' 
                                              : 'bg-transparent border-transparent hover:bg-white/[0.02] hover:border-white/5'
                                          }`}
                                        >
                                          <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
                                            <span className="text-[9px] font-mono text-white/30 w-5 text-right font-bold">
                                              {idx + 1}
                                            </span>

                                            <div className="w-8 h-8 rounded-xs overflow-hidden bg-zinc-900 border border-white/5 relative flex-shrink-0">
                                              <img src={getSongCoverUrl(song)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                              {isPlaying && (
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                  <div className="flex gap-[2px] items-end h-3">
                                                    <span className="w-[1.5px] bg-amber-400 rounded-full animate-[bounce_0.8s_infinite]" />
                                                    <span className="w-[1.5px] bg-amber-400 rounded-full animate-[bounce_0.8s_infinite_0.15s] h-2" />
                                                    <span className="w-[1.5px] bg-amber-400 rounded-full animate-[bounce_0.8s_infinite_0.3s] h-1" />
                                                  </div>
                                                </div>
                                              )}
                                            </div>

                                            <div className="min-w-0">
                                              <h4 className={`text-[10px] font-black uppercase tracking-wide truncate ${isPlaying ? 'text-amber-300' : 'text-white/90'}`}>
                                                {song.name}
                                              </h4>
                                              <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest truncate mt-0.5">
                                                {artist}
                                              </p>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-2 shrink-0">
                                            <button
                                              onClick={(e) => downloadSingleTrack(song, e)}
                                              disabled={isDownloadingSingle}
                                              className="w-7 h-7 rounded-sm bg-zinc-950 border border-white/5 hover:border-blue-500/50 text-white/40 hover:text-blue-400 flex items-center justify-center transition-all cursor-pointer"
                                              title={isRu ? 'Скачать трек' : 'Download track'}
                                            >
                                              {isDownloadingSingle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                            </button>

                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setAddToPlaylistSong(song);
                                              }}
                                              className="w-7 h-7 rounded-sm bg-zinc-950 border border-white/5 hover:border-amber-500/50 text-white/40 hover:text-amber-400 flex items-center justify-center transition-all cursor-pointer"
                                              title={isRu ? 'Добавить в плейлист' : 'Add to playlist'}
                                            >
                                              <ListPlus className="w-3.5 h-3.5" />
                                            </button>

                                            <button
                                              onClick={(e) => removeSongFromPlaylist(activePl.id, song.cid, e)}
                                              className="w-7 h-7 rounded-sm bg-zinc-950 border border-white/5 hover:border-red-500/50 text-white/40 hover:text-red-400 flex items-center justify-center transition-all cursor-pointer"
                                              title={isRu ? 'Удалить из плейлиста' : 'Remove from playlist'}
                                            >
                                              <X className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <>
                          {/* Selected Album Banner */}
                          {selectedAlbumCid && (() => {
                            const selectedAlbum = albums.find(a => a.cid === selectedAlbumCid);
                            if (!selectedAlbum) return null;
                            const albumSongs = songs.filter(s => s.albumCid === selectedAlbumCid);
                            const isDownloading = downloadingAlbumCid === selectedAlbumCid;

                            return (
                              <div className="mb-4 bg-gradient-to-r from-blue-950/30 via-blue-950/5 to-transparent border border-blue-500/20 p-3 rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xs overflow-hidden shrink-0 border border-white/10 bg-zinc-900">
                                    <img 
                                      src={selectedAlbum.coverUrl} 
                                      alt="" 
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                  <div>
                                    <span className="text-[7px] font-black text-blue-400 tracking-widest uppercase">
                                      {isRu ? 'ВЫБРАННЫЙ АЛЬБОМ' : 'SELECTED ALBUM'}
                                    </span>
                                    <h4 className="text-[10px] font-black text-white uppercase tracking-wider truncate max-w-[240px]">
                                      {selectedAlbum.name}
                                    </h4>
                                    <span className="text-[8px] text-white/40 tracking-widest uppercase font-bold leading-none block mt-0.5">
                                      {albumSongs.length} {isRu ? 'треков (Обложка входит в ZIP)' : 'tracks (Cover art included in ZIP)'}
                                    </span>
                                  </div>
                                </div>

                                <button
                                  onClick={(e) => downloadAlbum(selectedAlbum, e)}
                                  disabled={!!downloadingAlbumCid}
                                  className={`px-3 py-1.5 rounded-sm text-[8px] font-black tracking-widest uppercase border transition-all flex items-center gap-1.5 select-none cursor-pointer ${
                                    isDownloading 
                                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' 
                                      : 'bg-blue-600 border-transparent hover:bg-blue-500 text-white hover:shadow-[0_0_12px_rgba(37,99,235,0.2)]'
                                  }`}
                                >
                                  {isDownloading ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      {isRu ? `СКАЧИВАНИЕ (${downloadProgress?.current}/${downloadProgress?.total})` : `DOWNLOADING (${downloadProgress?.current}/${downloadProgress?.total})`}
                                    </>
                                  ) : (
                                    <>
                                      <Download className="w-3 h-3" />
                                      {isRu ? 'СКАЧАТЬ АЛЬБОМ + ОБЛОЖКУ (ZIP)' : 'DOWNLOAD ALBUM + COVER (ZIP)'}
                                    </>
                                  )}
                                </button>
                              </div>
                            );
                          })()}

                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-4">
                            <div className="relative flex-1">
                              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-white/30" />
                              <input
                                type="text"
                                value={musicSearchQuery}
                                onChange={(e) => setMusicSearchQuery(e.target.value)}
                                placeholder={isRu ? 'ПОИСК САУНДТРЕКОВ...' : 'SEARCH SOUNDTRACKS...'}
                                className="w-full bg-black/60 border border-white/10 focus:border-blue-500/50 rounded-sm py-2 pl-9 pr-4 text-[10px] font-bold tracking-wider placeholder:text-white/20 text-white uppercase focus:outline-none transition-all"
                              />
                            </div>
                            
                            <span className="text-[7.5px] font-mono text-white/30 uppercase tracking-widest font-bold self-center">
                              {filteredSongs.length} / {songs.length} {isRu ? 'ТРЕКОВ НАЙДЕНО' : 'SOUNDTRACKS MATCHED'}
                            </span>
                          </div>

                          {loadingMusic ? (
                            <div className="py-20 text-center">
                              <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto mb-2" />
                              <span className="text-[9px] font-bold tracking-widest uppercase text-white/40">
                                {isRu ? 'ПОЛУЧЕНИЕ САУНДТРЕКОВ MONSTER SIREN...' : 'FETCHING MONSTER SIREN DISCOGRAPHY...'}
                              </span>
                            </div>
                          ) : filteredSongs.length === 0 ? (
                            <div className="py-20 text-center text-white/30 text-[9px] font-bold uppercase tracking-widest">
                              {isRu ? 'Совпадений не обнаружено' : 'No track matches found'}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1 max-h-[550px] overflow-y-auto no-scrollbar pr-1">
                              {filteredSongs.map((song) => {
                                const isPlaying = playingSongCid === song.cid;
                                const isVoted = votes.userVote?.songCid === song.cid;
                                const isFav = isSongFavorite(song.cid);
                                const votesCount = votes.songVotes[song.cid] || 0;
                                const artist = getSongArtist(song);
                                const isDownloadingSingle = downloadingSongCid === song.cid;

                                return (
                                  <div 
                                    key={song.cid} 
                                    onClick={(e) => togglePlaySong(song, e)}
                                    className={`flex items-center justify-between p-2 rounded-xs border transition-all cursor-pointer ${
                                      isPlaying 
                                        ? 'bg-blue-950/10 border-blue-500/20' 
                                        : 'bg-transparent border-transparent hover:bg-white/[0.02] hover:border-white/5'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
                                      <div className="w-8 h-8 rounded-xs overflow-hidden bg-zinc-900 border border-white/5 relative flex-shrink-0">
                                        <img 
                                          src={getSongCoverUrl(song)} 
                                          alt="" 
                                          className="w-full h-full object-cover"
                                          referrerPolicy="no-referrer"
                                        />
                                        {isPlaying && (
                                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <div className="flex gap-[2px] items-end h-3">
                                              <span className="w-[1.5px] bg-blue-400 rounded-full animate-[bounce_0.8s_infinite]" />
                                              <span className="w-[1.5px] bg-blue-400 rounded-full animate-[bounce_0.8s_infinite_0.15s] h-2" />
                                              <span className="w-[1.5px] bg-blue-400 rounded-full animate-[bounce_0.8s_infinite_0.3s] h-1" />
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      <div className="min-w-0">
                                        <h4 className={`text-[10px] font-black uppercase tracking-wide truncate ${isPlaying ? 'text-blue-400' : 'text-white/90'}`}>
                                          {song.name}
                                        </h4>
                                        <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest truncate mt-0.5">
                                          {artist}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      {/* Download button */}
                                      <button
                                        onClick={(e) => downloadSingleTrack(song, e)}
                                        disabled={isDownloadingSingle}
                                        className={`w-7 h-7 rounded-sm border flex items-center justify-center transition-all cursor-pointer ${
                                          isDownloadingSingle 
                                            ? 'bg-blue-500/25 border-blue-500 text-blue-400' 
                                            : 'bg-zinc-950 border-white/5 hover:border-blue-500/50 text-white/40 hover:text-blue-400 hover:bg-blue-500/5'
                                        }`}
                                        title={isRu ? 'Скачать трек' : 'Download track'}
                                      >
                                        {isDownloadingSingle ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <Download className="w-3.5 h-3.5" />
                                        )}
                                      </button>

                                      {/* Add to Playlist button */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setAddToPlaylistSong(song);
                                        }}
                                        className="w-7 h-7 rounded-sm bg-zinc-950 border border-white/5 hover:border-amber-500/50 text-white/40 hover:text-amber-400 flex items-center justify-center transition-all cursor-pointer"
                                        title={isRu ? 'Добавить в плейлист' : 'Add to playlist'}
                                      >
                                        <ListPlus className="w-3.5 h-3.5" />
                                      </button>

                                      {/* Direct Vote & Favorite Heart button */}
                                      <button
                                        onClick={(e) => handleDirectVoteSong(song.cid, e)}
                                        className={`w-7 h-7 rounded-sm border flex items-center justify-center transition-all cursor-pointer ${
                                          isVoted || isFav
                                            ? 'bg-amber-500/15 border-amber-500 text-amber-400' 
                                            : 'bg-zinc-950 border-white/5 hover:border-blue-500/50 text-white/40 hover:text-white'
                                        }`}
                                        title={isRu ? 'Проголосовать и добавить в избранное' : 'Vote & Favorite'}
                                      >
                                        <Heart className={`w-3.5 h-3.5 ${(isVoted || isFav) ? 'fill-amber-400' : ''}`} />
                                      </button>

                                      <div className="w-12 text-right">
                                        <span className="text-[9px] font-mono font-black text-white/60 tracking-wider">
                                          {votesCount}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

              <div className="flex flex-col gap-6">
                
                <div className="bg-zinc-950/85 border border-white/10 p-5 rounded-sm relative overflow-hidden flex flex-col justify-between min-h-[180px] shadow-lg">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Music className="w-24 h-24" />
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span className="text-[8px] font-black tracking-[0.2em] text-amber-400 uppercase">{isRu ? 'ТУРНИРНЫЙ РЕЖИМ' : 'MATCHUP ARENA'}</span>
                    </div>
                    <h3 className="text-xs md:text-sm font-black tracking-wider uppercase text-white mb-2">
                      {isRu ? 'СХВАТКА САУНДТРЕКОВ' : 'SOUNDTRACK DUELS'}
                    </h3>
                    <p className="text-[9px] md:text-[9.5px] leading-relaxed text-white/50 tracking-wider">
                      {isRu 
                        ? 'Запустите случайную турнирную сетку из лучших треков Monster Siren и отберите свои любимые композиции в дуэлях!'
                        : 'Launch a randomized head-to-head bracket of Monster Siren soundtracks to crown your ultimate monthly champions!'}
                    </p>
                  </div>

                  <button
                    onClick={startMusicDuel}
                    className="w-full mt-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-black tracking-widest uppercase rounded-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                  >
                    <Activity className="w-3.5 h-3.5 animate-pulse" />
                    {isRu ? 'НАЧАТЬ ТУРНИР' : 'ENTER ARENA'}
                  </button>
                </div>

                <div className="bg-zinc-950/85 border border-white/10 p-5 rounded-sm flex-1 flex flex-col justify-between">
                  <div>
                    <div className="border-b border-white/10 pb-3 mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-blue-400" />
                        <span className="text-[9px] font-black tracking-widest text-white uppercase">{isRu ? 'ЛИДЕРЫ МЕСЯЦА' : 'MONTH LEADERBOARD'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[7.5px] font-mono font-bold tracking-widest uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {isRu ? 'ОНЛАЙН' : 'ONLINE'}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      {globalLeaderboardSongs.slice(0, 5).map((item, idx) => {
                        return (
                          <div key={item.cid} className="flex items-center justify-between text-[9px] font-bold">
                            <div className="flex items-center gap-2 min-w-0 mr-2">
                              <span className="text-[8px] font-mono text-white/20">
                                {String(idx + 1).padStart(2, '0')}
                              </span>
                              {item.coverUrl && (
                                <img 
                                  src={item.coverUrl} 
                                  alt=""
                                  className="w-3.5 h-3.5 object-cover border border-white/5 rounded-xs shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                              )}
                              <span className="uppercase tracking-wide truncate text-white/80 text-[8.5px]">
                                {item.name}
                              </span>
                            </div>
                            <span className="font-mono text-blue-400 text-[8.5px] pl-1 shrink-0">
                              {item.count}
                            </span>
                          </div>
                        );
                      })}
                      {globalLeaderboardSongs.length === 0 && (
                        <span className="text-[8px] font-bold text-white/25 uppercase tracking-widest text-center py-6">
                          {isRu ? 'Нет проголосовавших треков' : 'No votes registered yet'}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setCurrentView('RESULTS')}
                    className="w-full mt-5 py-2 border border-white/10 hover:border-blue-500/50 bg-transparent text-white/70 hover:text-white text-[8px] font-black tracking-widest uppercase rounded-sm transition-all text-center cursor-pointer"
                  >
                    {isRu ? 'ПОЛНАЯ ТАБЛИЦА РЕЗУЛЬТАТОВ' : 'VIEW FULL RESULTS'}
                  </button>
                </div>

              </div>

            </div>

          </div>
        )}
        
        {/* VIEW 1: MODE_SELECT */}
        {currentView === 'MODE_SELECT' && (
          <div className="h-full flex flex-col justify-center max-w-4xl mx-auto w-full py-6">
            <div className="text-center mb-10">
              <h2 className="text-base md:text-xl font-black tracking-[0.4em] mb-2 uppercase text-white">
                {t.welcomeTitle}
              </h2>
              <p className="text-[9px] md:text-[10px] text-white/40 tracking-widest uppercase font-bold max-w-xl mx-auto leading-relaxed">
                {t.welcomeSubtitle}
              </p>
            </div>

            <div className="max-w-xl mx-auto w-full">
              {/* MUSIC CARD */}
              <div 
                onClick={startMusicDuel}
                className="group border border-white/10 hover:border-blue-500/50 bg-zinc-950/70 p-6 rounded-sm cursor-pointer transition-all duration-300 flex flex-col justify-between min-h-[220px] relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Music className="w-32 h-32" />
                </div>
                <div>
                  <div className="w-10 h-10 rounded-sm bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-all">
                    <Music className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-sm font-black tracking-wider uppercase mb-2 group-hover:text-blue-400 transition-colors">
                    {t.musicMode}
                  </h3>
                  <p className="text-[10px] leading-relaxed text-white/50 tracking-wider">
                    {t.musicModeDesc}
                  </p>
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
                  <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">
                    {songs.length} {isRu ? 'Треков доступно' : 'Soundtracks Loaded'}
                  </span>
                  <span className="text-[9px] font-black text-blue-400 group-hover:translate-x-1 transition-transform tracking-widest uppercase">
                    {isRu ? 'НАЧАТЬ →' : 'START →'}
                  </span>
                </div>
              </div>
            </div>

            {/* View Global Standings quick jump */}
            <div className="mt-10 text-center">
              <button
                onClick={() => setCurrentView('RESULTS')}
                className="px-6 py-2 border border-white/5 hover:border-white/15 bg-white/[0.02] text-[9px] font-black tracking-widest text-white/50 hover:text-white uppercase transition-all rounded-sm cursor-pointer"
              >
                {isRu ? 'ПОСМОТРЕТЬ ТЕКУЩИЕ РЕЗУЛЬТАТЫ ГЛОБАЛЬНОГО ГОЛОСОВАНИЯ' : 'VIEW REAL-TIME GLOBAL LEADERBOARD'}
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: EPISODE DUEL */}
        {currentView === 'EPISODE_DUEL' && episodeMatchups.length > 0 && (
          <div className="max-w-4xl mx-auto w-full py-4 h-full flex flex-col justify-between">
            {/* Header / Info */}
            <div className="text-center mb-6">
              <span className="text-[8px] font-black tracking-[0.3em] text-blue-500 uppercase block mb-1">
                {t.chooseBest}
              </span>
              <span className="text-xs font-black tracking-widest uppercase text-white font-mono">
                {t.matchCount(currentEpisodeIndex + 1, episodeTotalRounds)}
              </span>
              
              {/* Progress Bar */}
              <div className="w-48 h-1 bg-zinc-900 border border-white/5 mx-auto mt-3 overflow-hidden rounded-full">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${((currentEpisodeIndex + 1) / episodeTotalRounds) * 100}%` }}
                />
              </div>
            </div>

            {/* Duel Cards Side-by-Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch my-auto py-4">
              {/* Option A */}
              {(() => {
                const ep = episodeMatchups[currentEpisodeIndex].optionA;
                return (
                  <div
                    onClick={() => {
                      if (discordUser && isDiscordMember) {
                        handleSelectEpisodeOption(ep, episodeMatchups[currentEpisodeIndex].id);
                      }
                    }}
                    className={`group border border-white/10 ${discordUser && isDiscordMember ? 'hover:border-blue-500 cursor-pointer' : 'cursor-default'} bg-zinc-950/80 rounded-sm transition-all duration-500 flex flex-col justify-between overflow-hidden relative`}
                  >
                    {/* Cover Frame */}
                    <div className="aspect-[16/9] w-full bg-black overflow-hidden relative border-b border-white/5">
                      <img 
                        src={getEpisodeCoverUrl(ep)} 
                        alt={ep.name}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                        onError={(e) => handleCoverError(ep, e)}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent opacity-60" />
                    </div>

                    {/* Meta info */}
                    <div className="p-5 flex flex-col justify-between flex-1">
                      <div className="mb-4">
                        <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest block mb-1">
                          {ep.entryType || 'MAINLINE'}
                        </span>
                        <h3 className="text-xs md:text-sm font-black uppercase text-white tracking-wider leading-snug group-hover:text-blue-400 transition-colors">
                          {ep.name}
                        </h3>
                        {ep.chineseName && ep.chineseName !== ep.name && (
                          <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest block mt-1">
                            {ep.chineseName}
                          </span>
                        )}
                      </div>

                      {!discordUser ? (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDiscordLogin();
                          }}
                          className="w-full py-2.5 border border-blue-500/30 hover:border-blue-500 bg-blue-950/20 text-blue-400 hover:bg-blue-600 hover:text-white transition-all text-[9px] font-black tracking-widest uppercase rounded-sm flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Activity className="w-3.5 h-3.5" />
                          {isRu ? 'ВОЙДИТЕ ЧЕРЕЗ DISCORD ДЛЯ ГОЛОСОВАНИЯ' : 'LOGIN WITH DISCORD TO VOTE'}
                        </button>
                      ) : !isDiscordMember ? (
                        <button 
                          disabled
                          className="w-full py-2.5 border border-red-500/30 bg-red-950/20 text-red-400 transition-all text-[8px] font-black tracking-widest uppercase rounded-sm cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          {isRu ? 'ТОЛЬКО ДЛЯ УЧАСТНИКОВ НАШЕГО ДИСКОРДА' : 'DISCORD SERVER MEMBERS ONLY'}
                        </button>
                      ) : (
                        <button className="w-full py-2.5 border border-white/10 group-hover:border-blue-500 bg-white/[0.02] group-hover:bg-blue-600 group-hover:text-white transition-all text-[9px] font-black tracking-widest text-white/40 uppercase">
                          {t.chooseThis}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Option B */}
              {(() => {
                const ep = episodeMatchups[currentEpisodeIndex].optionB;
                return (
                  <div
                    onClick={() => {
                      if (discordUser && isDiscordMember) {
                        handleSelectEpisodeOption(ep, episodeMatchups[currentEpisodeIndex].id);
                      }
                    }}
                    className={`group border border-white/10 ${discordUser && isDiscordMember ? 'hover:border-blue-500 cursor-pointer' : 'cursor-default'} bg-zinc-950/80 rounded-sm transition-all duration-500 flex flex-col justify-between overflow-hidden relative`}
                  >
                    {/* Cover Frame */}
                    <div className="aspect-[16/9] w-full bg-black overflow-hidden relative border-b border-white/5">
                      <img 
                        src={getEpisodeCoverUrl(ep)} 
                        alt={ep.name}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                        onError={(e) => handleCoverError(ep, e)}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent opacity-60" />
                    </div>

                    {/* Meta info */}
                    <div className="p-5 flex flex-col justify-between flex-1">
                      <div className="mb-4">
                        <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest block mb-1">
                          {ep.entryType || 'MAINLINE'}
                        </span>
                        <h3 className="text-xs md:text-sm font-black uppercase text-white tracking-wider leading-snug group-hover:text-blue-400 transition-colors">
                          {ep.name}
                        </h3>
                        {ep.chineseName && ep.chineseName !== ep.name && (
                          <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest block mt-1">
                            {ep.chineseName}
                          </span>
                        )}
                      </div>

                      {!discordUser ? (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDiscordLogin();
                          }}
                          className="w-full py-2.5 border border-blue-500/30 hover:border-blue-500 bg-blue-950/20 text-blue-400 hover:bg-blue-600 hover:text-white transition-all text-[9px] font-black tracking-widest uppercase rounded-sm flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Activity className="w-3.5 h-3.5" />
                          {isRu ? 'ВОЙДИТЕ ЧЕРЕЗ DISCORD ДЛЯ ГОЛОСОВАНИЯ' : 'LOGIN WITH DISCORD TO VOTE'}
                        </button>
                      ) : !isDiscordMember ? (
                        <button 
                          disabled
                          className="w-full py-2.5 border border-red-500/30 bg-red-950/20 text-red-400 transition-all text-[8px] font-black tracking-widest uppercase rounded-sm cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          {isRu ? 'ТОЛЬКО ДЛЯ УЧАСТНИКОВ НАШЕГО ДИСКОРДА' : 'DISCORD SERVER MEMBERS ONLY'}
                        </button>
                      ) : (
                        <button className="w-full py-2.5 border border-white/10 group-hover:border-blue-500 bg-white/[0.02] group-hover:bg-blue-600 group-hover:text-white transition-all text-[9px] font-black tracking-widest text-white/40 uppercase">
                          {t.chooseThis}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* VIEW 3: MUSIC DUEL */}
        {currentView === 'MUSIC_DUEL' && musicMatchups.length > 0 && (
          <div className="max-w-4xl mx-auto w-full py-4 h-full flex flex-col justify-between">
            {/* Header / Info */}
            <div className="text-center mb-6">
              <span className="text-[8px] font-black tracking-[0.3em] text-blue-500 uppercase block mb-1">
                {t.chooseMusic}
              </span>
              <span className="text-xs font-black tracking-widest uppercase text-white font-mono">
                {t.matchCount(currentMusicIndex + 1, musicTotalRounds)}
              </span>
              
              {/* Progress Bar */}
              <div className="w-48 h-1 bg-zinc-900 border border-white/5 mx-auto mt-3 overflow-hidden rounded-full">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${((currentMusicIndex + 1) / musicTotalRounds) * 100}%` }}
                />
              </div>
            </div>

            {/* Duel Cards Side-by-Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch my-auto py-4">
              {/* Option A */}
              {(() => {
                const song = musicMatchups[currentMusicIndex].optionA;
                const isPlaying = playingSongCid === song.cid;
                return (
                  <div
                    onClick={() => {
                      if (discordUser && isDiscordMember) {
                        handleSelectMusicOption(song, musicMatchups[currentMusicIndex].id);
                      }
                    }}
                    className={`group border border-white/10 ${discordUser && isDiscordMember ? 'hover:border-blue-500 cursor-pointer' : 'cursor-default'} bg-zinc-950/80 rounded-sm transition-all duration-500 flex flex-col justify-between overflow-hidden relative p-5`}
                  >
                    <div>
                      {/* Album cover art thumbnail */}
                      <div className="aspect-square w-40 h-40 bg-zinc-900 border border-white/5 rounded-sm overflow-hidden mx-auto mb-4 relative shadow-2xl">
                        <img 
                          src={getSongCoverUrl(song)} 
                          alt={song.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        {/* Audio play overlay button */}
                        <button
                          onClick={(e) => togglePlaySong(song, e)}
                          className={`absolute bottom-2 right-2 w-9 h-9 rounded-full border flex items-center justify-center transition-all bg-black/85 backdrop-blur-md shadow-lg ${
                            isPlaying ? 'border-blue-400 text-blue-400' : 'border-white/20 text-white/70 hover:text-white'
                          }`}
                        >
                          {isPlaying ? (
                            <Pause className="w-4 h-4 text-blue-400 stroke-[3] fill-blue-400" />
                          ) : (
                            <Play className="w-4 h-4 text-white translate-x-0.5 fill-white" />
                          )}
                        </button>
                      </div>

                      <div className="text-center mb-6">
                        <h3 className="text-xs md:text-sm font-black uppercase text-white tracking-wider line-clamp-1 group-hover:text-blue-400 transition-colors">
                          {song.name}
                        </h3>
                        <p className="text-[8px] font-mono text-white/30 uppercase mt-1 tracking-widest line-clamp-1">
                          {(song.artistes || song.artists || []).join(', ') || 'Monster Siren Artist'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={(e) => togglePlaySong(song, e)}
                          className={`py-2 border flex items-center justify-center gap-1.5 rounded-sm transition-all text-[8.5px] font-bold tracking-widest uppercase ${
                            isPlaying 
                              ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' 
                              : 'border-white/5 bg-white/[0.01] text-white/40 hover:text-white hover:border-white/20'
                          }`}
                        >
                          {isPlaying ? t.stopBtn : t.playBtn}
                        </button>
                        <button
                          onClick={(e) => openDuelLyrics(song, e)}
                          className="py-2 border border-white/5 hover:border-blue-500/50 bg-white/[0.01] hover:bg-blue-500/10 text-white/50 hover:text-blue-400 flex items-center justify-center gap-1.5 rounded-sm transition-all text-[8.5px] font-bold tracking-widest uppercase cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-400" />
                          {isRu ? 'ТЕКСТ' : 'LYRICS'}
                        </button>
                      </div>
                      {!discordUser ? (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDiscordLogin();
                          }}
                          className="w-full py-2.5 border border-blue-500/30 hover:border-blue-500 bg-blue-950/20 text-blue-400 hover:bg-blue-600 hover:text-white transition-all text-[9px] font-black tracking-widest uppercase rounded-sm flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Activity className="w-3.5 h-3.5" />
                          {isRu ? 'ВОЙДИТЕ ЧЕРЕЗ DISCORD' : 'LOGIN WITH DISCORD'}
                        </button>
                      ) : !isDiscordMember ? (
                        <button 
                          disabled
                          className="w-full py-2.5 border border-red-500/30 bg-red-950/20 text-red-400 transition-all text-[8px] font-black tracking-widest uppercase rounded-sm cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          {isRu ? 'ТОЛЬКО ДЛЯ УЧАСТНИКОВ ДИСКОРДА' : 'DISCORD MEMBERS ONLY'}
                        </button>
                      ) : (
                        <button className="w-full py-2.5 border border-white/10 group-hover:border-blue-500 bg-white/[0.02] group-hover:bg-blue-600 group-hover:text-white transition-all text-[9px] font-black tracking-widest text-white/40 uppercase">
                          {t.chooseThis}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Option B */}
              {(() => {
                const song = musicMatchups[currentMusicIndex].optionB;
                const isPlaying = playingSongCid === song.cid;
                return (
                  <div
                    onClick={() => {
                      if (discordUser && isDiscordMember) {
                        handleSelectMusicOption(song, musicMatchups[currentMusicIndex].id);
                      }
                    }}
                    className={`group border border-white/10 ${discordUser && isDiscordMember ? 'hover:border-blue-500 cursor-pointer' : 'cursor-default'} bg-zinc-950/80 rounded-sm transition-all duration-500 flex flex-col justify-between overflow-hidden relative p-5`}
                  >
                    <div>
                      {/* Album cover art thumbnail */}
                      <div className="aspect-square w-40 h-40 bg-zinc-900 border border-white/5 rounded-sm overflow-hidden mx-auto mb-4 relative shadow-2xl">
                        <img 
                          src={getSongCoverUrl(song)} 
                          alt={song.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        {/* Audio play overlay button */}
                        <button
                          onClick={(e) => togglePlaySong(song, e)}
                          className={`absolute bottom-2 right-2 w-9 h-9 rounded-full border flex items-center justify-center transition-all bg-black/85 backdrop-blur-md shadow-lg ${
                            isPlaying ? 'border-blue-400 text-blue-400' : 'border-white/20 text-white/70 hover:text-white'
                          }`}
                        >
                          {isPlaying ? (
                            <Pause className="w-4 h-4 text-blue-400 stroke-[3] fill-blue-400" />
                          ) : (
                            <Play className="w-4 h-4 text-white translate-x-0.5 fill-white" />
                          )}
                        </button>
                      </div>

                      <div className="text-center mb-6">
                        <h3 className="text-xs md:text-sm font-black uppercase text-white tracking-wider line-clamp-1 group-hover:text-blue-400 transition-colors">
                          {song.name}
                        </h3>
                        <p className="text-[8px] font-mono text-white/30 uppercase mt-1 tracking-widest line-clamp-1">
                          {(song.artistes || song.artists || []).join(', ') || 'Monster Siren Artist'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={(e) => togglePlaySong(song, e)}
                          className={`py-2 border flex items-center justify-center gap-1.5 rounded-sm transition-all text-[8.5px] font-bold tracking-widest uppercase ${
                            isPlaying 
                              ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' 
                              : 'border-white/5 bg-white/[0.01] text-white/40 hover:text-white hover:border-white/20'
                          }`}
                        >
                          {isPlaying ? t.stopBtn : t.playBtn}
                        </button>
                        <button
                          onClick={(e) => openDuelLyrics(song, e)}
                          className="py-2 border border-white/5 hover:border-blue-500/50 bg-white/[0.01] hover:bg-blue-500/10 text-white/50 hover:text-blue-400 flex items-center justify-center gap-1.5 rounded-sm transition-all text-[8.5px] font-bold tracking-widest uppercase cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-400" />
                          {isRu ? 'ТЕКСТ' : 'LYRICS'}
                        </button>
                      </div>
                      {!discordUser ? (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDiscordLogin();
                          }}
                          className="w-full py-2.5 border border-blue-500/30 hover:border-blue-500 bg-blue-950/20 text-blue-400 hover:bg-blue-600 hover:text-white transition-all text-[9px] font-black tracking-widest uppercase rounded-sm flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Activity className="w-3.5 h-3.5" />
                          {isRu ? 'ВОЙДИТЕ ЧЕРЕЗ DISCORD' : 'LOGIN WITH DISCORD'}
                        </button>
                      ) : !isDiscordMember ? (
                        <button 
                          disabled
                          className="w-full py-2.5 border border-red-500/30 bg-red-950/20 text-red-400 transition-all text-[8px] font-black tracking-widest uppercase rounded-sm cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          {isRu ? 'ТОЛЬКО ДЛЯ УЧАСТНИКОВ ДИСКОРДА' : 'DISCORD MEMBERS ONLY'}
                        </button>
                      ) : (
                        <button className="w-full py-2.5 border border-white/10 group-hover:border-blue-500 bg-white/[0.02] group-hover:bg-blue-600 group-hover:text-white transition-all text-[9px] font-black tracking-widest text-white/40 uppercase">
                          {t.chooseThis}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Audio Status Toast Banner if playing */}
            {playingSongDetail && (
              <div className="mt-4 p-3 bg-blue-950/25 border border-blue-500/20 rounded-sm flex items-center justify-between gap-3 animate-pulse">
                <div className="flex items-center gap-2 min-w-0">
                  <Volume2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="text-[9px] font-black uppercase text-blue-400 truncate tracking-wider">
                    {isRu ? 'ВОСПРОИЗВЕДЕНИЕ:' : 'NOW PLAYING:'} {playingSongDetail.name}
                  </span>
                </div>
                <button
                  onClick={() => {
                    if (audioRef.current) audioRef.current.pause();
                    setPlayingSongCid(null);
                    setPlayingSongDetail(null);
                  }}
                  className="text-[8px] font-black tracking-widest text-white hover:text-red-400 transition-colors uppercase font-mono"
                >
                  STOP
                </button>
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: STANDINGS & LEADERBOARD */}
        {currentView === 'RESULTS' && (
          <div className="max-w-6xl mx-auto w-full py-2 animate-in fade-in duration-300">
            
            {/* Completion Banner */}
            <div className="bg-gradient-to-r from-blue-900/15 via-blue-900/5 to-transparent border border-blue-500/20 p-5 rounded-sm mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 rounded-sm border border-blue-500/20 flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xs md:text-sm font-black tracking-wider text-white uppercase">{t.allEvaluated}</h3>
                  <p className="text-[8px] md:text-[9.5px] text-white/40 uppercase tracking-widest mt-1">
                    {isRu 
                      ? 'Ваши фавориты учтены и добавлены к общему зачёту этого месяца!' 
                      : 'Your preferences have been registered to the cumulative seasonal records.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {initialMode !== 'MUSIC_ONLY' && (
                  <button
                    onClick={startEpisodeDuel}
                    className="px-4 py-2 bg-zinc-950 border border-white/10 hover:border-blue-500 text-[8px] md:text-[9.5px] font-black tracking-widest uppercase rounded-sm transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3 h-3 text-white/50" />
                    {t.restartDuel} (EP)
                  </button>
                )}
                {initialMode !== 'EPISODES_ONLY' && (
                  <button
                    onClick={startMusicDuel}
                    className="px-4 py-2 bg-zinc-950 border border-white/10 hover:border-blue-500 text-[8px] md:text-[9.5px] font-black tracking-widest uppercase rounded-sm transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3 h-3 text-white/50" />
                    {t.restartDuel} (MS)
                  </button>
                )}
              </div>
            </div>

            {/* Main Leaderboard Grid */}
            <div className={`grid grid-cols-1 ${initialMode ? 'grid-cols-1 max-w-3xl mx-auto' : 'lg:grid-cols-2'} gap-8 items-stretch`}>
              
              {/* Episodes Global Standings */}
              {initialMode !== 'MUSIC_ONLY' && (
                <div className="bg-zinc-950/75 border border-white/10 p-5 rounded-sm flex flex-col justify-between">
                  <div>
                    <div className="border-b border-white/10 pb-3 mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-blue-400" />
                        <span className="text-[10px] font-black tracking-widest text-white uppercase">{isRu ? 'РЕЙТИНГ ЭПИЗОДОВ' : 'EPISODE STANDINGS'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[7.5px] font-mono font-bold tracking-widest uppercase">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {isRu ? 'ОНЛАЙН' : 'ONLINE'}
                        </div>
                        <span className="text-[8px] font-mono text-white/30 tracking-widest font-bold">
                          {totalEpisodeVotes} {isRu ? 'ГОЛОСОВ' : 'TOTAL VOTES'}
                        </span>
                      </div>
                    </div>

                    {/* Leaderboard list */}
                    <div className="flex flex-col gap-3.5 max-h-[480px] overflow-y-auto no-scrollbar pr-1">
                      {globalLeaderboardEpisodes.map((item, idx) => {
                        const percentage = totalEpisodeVotes > 0 ? (item.count / totalEpisodeVotes) * 100 : 0;
                        return (
                          <div key={item.id} className="group relative">
                            <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[9px] font-mono text-white/20">
                                  {String(idx + 1).padStart(2, '0')}
                                </span>
                                <span className="uppercase tracking-wide truncate text-white/90">
                                  {item.name}
                                </span>
                              </div>
                              <span className="font-mono text-white/60 tracking-wider text-[9px] pl-2 shrink-0">
                                {item.count} ({percentage.toFixed(1)}%)
                              </span>
                            </div>

                            {/* Progress Line */}
                            <div className="h-1.5 bg-zinc-900 border border-white/5 overflow-hidden rounded-full">
                              <div 
                                className="h-full bg-blue-500/80 group-hover:bg-blue-500 transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Music Global Standings */}
              {initialMode !== 'EPISODES_ONLY' && (
                <div className="bg-zinc-950/75 border border-white/10 p-5 rounded-sm flex flex-col justify-between">
                  <div>
                    <div className="border-b border-white/10 pb-3 mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Music className="w-4 h-4 text-blue-400" />
                        <span className="text-[10px] font-black tracking-widest text-white uppercase">{isRu ? 'РЕЙТИНГ САУНДТРЕКОВ' : 'SOUNDTRACK STANDINGS'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[7.5px] font-mono font-bold tracking-widest uppercase">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {isRu ? 'ОНЛАЙН' : 'ONLINE'}
                        </div>
                        <span className="text-[8px] font-mono text-white/30 tracking-widest font-bold">
                          {totalSongVotes} {isRu ? 'ГОЛОСОВ' : 'TOTAL VOTES'}
                        </span>
                      </div>
                    </div>

                    {/* Leaderboard list */}
                    <div className="flex flex-col gap-3.5 max-h-[480px] overflow-y-auto no-scrollbar pr-1">
                      {globalLeaderboardSongs.map((item, idx) => {
                        const percentage = totalSongVotes > 0 ? (item.count / totalSongVotes) * 100 : 0;
                        return (
                          <div key={item.cid} className="group relative">
                            <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[9px] font-mono text-white/20">
                                  {String(idx + 1).padStart(2, '0')}
                                </span>
                                {item.coverUrl && (
                                  <img 
                                    src={item.coverUrl} 
                                    alt=""
                                    className="w-4 h-4 object-cover border border-white/5 rounded-xs shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                )}
                                <span className="uppercase tracking-wide truncate text-white/90">
                                  {item.name}
                                </span>
                              </div>
                              <span className="font-mono text-white/60 tracking-wider text-[9px] pl-2 shrink-0">
                                {item.count} ({percentage.toFixed(1)}%)
                              </span>
                            </div>

                            {/* Progress Line */}
                            <div className="h-1.5 bg-zinc-900 border border-white/5 overflow-hidden rounded-full">
                              <div 
                                className="h-full bg-blue-500/80 group-hover:bg-blue-500 transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Info and action */}
            <div className="mt-8 p-4 bg-zinc-950/40 border border-white/5 rounded-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <span className="text-[8.5px] text-white/30 uppercase tracking-widest">
                {t.allEpisodesCovers} • {t.credits}
              </span>
              <button
                onClick={() => {
                  if (initialMode === 'EPISODES_ONLY') {
                    if (onClose) onClose();
                  } else if (initialMode === 'MUSIC_ONLY') {
                    setCurrentView('MUSIC_PORTAL');
                  } else {
                    setCurrentView('MODE_SELECT');
                  }
                }}
                className="px-5 py-2 border border-white/10 hover:border-blue-500 text-[8.5px] font-black tracking-widest uppercase transition-all rounded-sm cursor-pointer"
              >
                {initialMode === 'EPISODES_ONLY' 
                  ? (isRu ? 'ЗАКРЫТЬ' : 'CLOSE') 
                  : initialMode === 'MUSIC_ONLY'
                    ? (isRu ? 'ВЕРНУТЬСЯ В ПЛЕЕР' : 'BACK TO PLAYER')
                    : (isRu ? 'ВЕРНУТЬСЯ К ВЫБОРУ РЕЖИМА' : 'BACK TO DUEL MODE SELECTION')}
              </button>
            </div>

          </div>
        )}

      </div>

      {/* PERSISTENT FLOATING BOTTOM AUDIO PLAYER BAR */}
      {playingSongCid && playingSongDetail && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/95 border-t border-white/10 backdrop-blur-xl px-4 py-2.5 flex items-center justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom duration-300">
          {/* Left: Artwork + Meta info */}
          <div className="flex items-center gap-3 w-1/4 min-w-[200px]">
            <div 
              onClick={() => setShowFullPlayer(true)}
              className="w-11 h-11 rounded-sm bg-zinc-900 border border-white/10 overflow-hidden shrink-0 relative cursor-pointer group shadow-lg"
            >
              <img 
                src={getSongCoverUrl({ cid: playingSongCid, name: playingSongDetail.name, albumCid: playingSongDetail.albumCid })} 
                alt={playingSongDetail.name} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Maximize2 className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="min-w-0">
              <h4 className="text-[10px] md:text-xs font-black uppercase text-white tracking-wider truncate">
                {playingSongDetail.name}
              </h4>
              <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest truncate mt-0.5">
                {(playingSongDetail.artistes || playingSongDetail.artists || []).join(', ') || 'Monster Siren Records'}
              </p>
            </div>

            <button
              onClick={(e) => handleDirectVoteSong(playingSongCid, e)}
              className={`p-1.5 rounded-sm transition-colors ${
                votes.userVote?.songCid === playingSongCid ? 'text-amber-400' : 'text-white/30 hover:text-white'
              }`}
              title={isRu ? 'В избранное / Голос' : 'Favorite / Vote'}
            >
              <Heart className={`w-4 h-4 ${votes.userVote?.songCid === playingSongCid ? 'fill-amber-400' : ''}`} />
            </button>

            <button
              onClick={() => setShowLyricsModal(true)}
              className={`p-1.5 rounded-sm transition-colors relative ${
                showLyricsModal ? 'text-blue-400' : 'text-white/30 hover:text-white'
              }`}
              title={isRu ? 'Текст песни' : 'Lyrics'}
            >
              <FileText className="w-4 h-4" />
              {currentLyrics && currentLyrics.length > 0 && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
              )}
            </button>
          </div>

          {/* Center: Playback Controls & Timeline Slider */}
          <div className="flex flex-col items-center gap-1.5 flex-1 max-w-xl mx-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsShuffle(!isShuffle)}
                className={`p-1 rounded-sm transition-colors ${isShuffle ? 'text-blue-400' : 'text-white/30 hover:text-white'}`}
                title={isRu ? 'Случайный порядок' : 'Shuffle'}
              >
                <Shuffle className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={playPrevSong}
                className="p-1 text-white/60 hover:text-white transition-colors cursor-pointer"
                title={isRu ? 'Предыдущий трек' : 'Previous track'}
              >
                <SkipBack className="w-4 h-4 fill-current" />
              </button>

              <button
                onClick={togglePlayPause}
                className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                {isAudioPaused ? (
                  <Play className="w-4 h-4 translate-x-0.5 fill-current" />
                ) : (
                  <Pause className="w-4 h-4 fill-current" />
                )}
              </button>

              <button
                onClick={playNextSong}
                className="p-1 text-white/60 hover:text-white transition-colors cursor-pointer"
                title={isRu ? 'Следующий трек' : 'Next track'}
              >
                <SkipForward className="w-4 h-4 fill-current" />
              </button>

              <button
                onClick={() => {
                  const nextLoop = !isLooping;
                  setIsLooping(nextLoop);
                  if (audioRef.current) audioRef.current.loop = nextLoop;
                }}
                className={`p-1 rounded-sm transition-colors ${isLooping ? 'text-blue-400' : 'text-white/30 hover:text-white'}`}
                title={isRu ? 'Повтор трека' : 'Repeat'}
              >
                <Repeat className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Timeline Scrub Slider */}
            <div className="w-full flex items-center gap-2">
              <span className="text-[8px] font-mono text-white/40 w-8 text-right shrink-0">
                {formatTime(audioProgress.currentTime)}
              </span>
              <input 
                type="range"
                min={0}
                max={audioProgress.duration || 100}
                step={0.1}
                value={audioProgress.currentTime}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (audioRef.current) audioRef.current.currentTime = val;
                  setAudioProgress(prev => ({ ...prev, currentTime: val }));
                }}
                className="w-full h-1 bg-zinc-800 accent-blue-500 rounded-lg cursor-pointer"
              />
              <span className="text-[8px] font-mono text-white/40 w-8 text-left shrink-0">
                {formatTime(audioProgress.duration)}
              </span>
            </div>
          </div>

          {/* Right: Volume & Expand Player */}
          <div className="flex items-center justify-end gap-3 w-1/4 min-w-[160px]">
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleMute}
                className="p-1 text-white/40 hover:text-white transition-colors cursor-pointer"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input 
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-16 md:w-20 h-1 bg-zinc-800 accent-blue-500 rounded-lg cursor-pointer"
              />
            </div>

            <button
              onClick={() => setShowFullPlayer(true)}
              className="p-1.5 rounded-sm text-white/40 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              title={isRu ? 'Развернуть плеер' : 'Expand player'}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* FULL SCREEN KARAOKE PLAYER & LYRICS MODAL */}
      {(showFullPlayer || showLyricsModal) && playingSongCid && playingSongDetail && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col p-4 md:p-8 animate-in fade-in duration-300">
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <Disc className="w-5 h-5 text-blue-400 animate-[spin_8s_linear_infinite]" />
              <div>
                <span className="text-[8px] font-black tracking-[0.2em] text-blue-400 block uppercase">
                  MONSTER SIREN AUDIO STATION
                </span>
                <h3 className="text-xs md:text-sm font-black tracking-wider uppercase text-white">
                  {playingSongDetail.name}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowFullPlayer(false);
                  setShowLyricsModal(false);
                }}
                className="p-2 rounded-full border border-white/10 hover:border-white/30 bg-white/5 text-white/70 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Content Layout */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 py-6 overflow-hidden">
            {/* Left 5 cols: Large Cover Art, Meta & Playback Controls */}
            <div className="lg:col-span-5 flex flex-col justify-between h-full bg-zinc-950/60 border border-white/10 p-6 rounded-sm shadow-2xl">
              <div className="flex flex-col items-center text-center">
                <div className="w-48 h-48 md:w-64 md:h-64 rounded-sm border border-white/10 overflow-hidden shadow-[0_0_40px_rgba(59,130,246,0.2)] mb-6 relative group">
                  <img 
                    src={getSongCoverUrl({ cid: playingSongCid, name: playingSongDetail.name, albumCid: playingSongDetail.albumCid })}
                    alt={playingSongDetail.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {!isAudioPaused && (
                    <div className="absolute top-3 right-3 px-2 py-1 rounded-xs bg-blue-600/90 text-white text-[8px] font-mono font-black tracking-widest uppercase flex items-center gap-1.5 shadow-lg">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      PLAYING
                    </div>
                  )}
                </div>

                <h2 className="text-base md:text-xl font-black tracking-wider uppercase text-white mb-1 leading-tight">
                  {playingSongDetail.name}
                </h2>
                <p className="text-[10px] md:text-xs font-bold text-white/50 uppercase tracking-widest mb-4">
                  {(playingSongDetail.artistes || playingSongDetail.artists || []).join(', ') || 'Monster Siren Records'}
                </p>

                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={(e) => handleDirectVoteSong(playingSongCid, e)}
                    className={`px-3 py-1.5 rounded-sm border text-[9px] font-black tracking-widest uppercase transition-all flex items-center gap-1.5 ${
                      votes.userVote?.songCid === playingSongCid
                        ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                        : 'bg-zinc-900 border-white/10 hover:border-amber-500/50 text-white/60 hover:text-white'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${votes.userVote?.songCid === playingSongCid ? 'fill-amber-400' : ''}`} />
                    {votes.userVote?.songCid === playingSongCid ? (isRu ? 'В ИЗБРАННОМ' : 'VOTED') : (isRu ? 'ГОЛОСОВАТЬ' : 'VOTE')}
                  </button>

                  <button
                    onClick={(e) => downloadSingleTrack({ cid: playingSongCid, name: playingSongDetail.name, albumCid: playingSongDetail.albumCid }, e)}
                    className="px-3 py-1.5 rounded-sm border border-white/10 hover:border-blue-500 bg-zinc-900 text-white/70 hover:text-white text-[9px] font-black tracking-widest uppercase transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {isRu ? 'СКАЧАТЬ MP3' : 'DOWNLOAD MP3'}
                  </button>
                </div>
              </div>

              {/* Playback Controls & Timeline in Full Player */}
              <div className="w-full">
                <div className="w-full flex items-center gap-3 mb-2">
                  <span className="text-[9px] font-mono text-white/40 w-10 text-right shrink-0">
                    {formatTime(audioProgress.currentTime)}
                  </span>
                  <input 
                    type="range"
                    min={0}
                    max={audioProgress.duration || 100}
                    step={0.1}
                    value={audioProgress.currentTime}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (audioRef.current) audioRef.current.currentTime = val;
                      setAudioProgress(prev => ({ ...prev, currentTime: val }));
                    }}
                    className="w-full h-1.5 bg-zinc-800 accent-blue-500 rounded-lg cursor-pointer"
                  />
                  <span className="text-[9px] font-mono text-white/40 w-10 text-left shrink-0">
                    {formatTime(audioProgress.duration)}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-6 mt-4">
                  <button
                    onClick={() => setIsShuffle(!isShuffle)}
                    className={`p-2 rounded-sm transition-colors ${isShuffle ? 'text-blue-400' : 'text-white/30 hover:text-white'}`}
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>

                  <button
                    onClick={playPrevSong}
                    className="p-2 text-white/70 hover:text-white transition-colors cursor-pointer"
                  >
                    <SkipBack className="w-5 h-5 fill-current" />
                  </button>

                  <button
                    onClick={togglePlayPause}
                    className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-xl transition-transform active:scale-95 cursor-pointer"
                  >
                    {isAudioPaused ? (
                      <Play className="w-5 h-5 translate-x-0.5 fill-current" />
                    ) : (
                      <Pause className="w-5 h-5 fill-current" />
                    )}
                  </button>

                  <button
                    onClick={playNextSong}
                    className="p-2 text-white/70 hover:text-white transition-colors cursor-pointer"
                  >
                    <SkipForward className="w-5 h-5 fill-current" />
                  </button>

                  <button
                    onClick={() => {
                      const nextLoop = !isLooping;
                      setIsLooping(nextLoop);
                      if (audioRef.current) audioRef.current.loop = nextLoop;
                    }}
                    className={`p-2 rounded-sm transition-colors ${isLooping ? 'text-blue-400' : 'text-white/30 hover:text-white'}`}
                  >
                    <Repeat className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right 7 cols: Karaoke Synchronized Lyrics Container */}
            <div className="lg:col-span-7 flex flex-col h-full bg-zinc-950/60 border border-white/10 p-6 rounded-sm shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <h3 className="text-xs font-black tracking-widest text-white uppercase">
                    {isRu ? 'ТЕКСТ ПЕСНИ / СИНХРОННЫЙ LRC' : 'SONG LYRICS / KARAOKE LRC'}
                  </h3>
                </div>
                {currentLyrics && currentLyrics.length > 0 && (
                  <span className="text-[8px] font-mono font-bold px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xs uppercase">
                    {currentLyrics.length} LINES SYNCHRONIZED
                  </span>
                )}
              </div>

              {loadingLyrics ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                  <span className="text-[10px] font-bold tracking-widest uppercase text-white/50">
                    {isRu ? 'ЗАГРУЗКА ТЕКСТА С СЕРВЕРА MSR...' : 'FETCHING LYRICS FROM MSR API...'}
                  </span>
                </div>
              ) : currentLyrics && currentLyrics.length > 0 ? (
                <div className="flex-1 overflow-y-auto no-scrollbar py-6 flex flex-col gap-4 text-center scroll-smooth">
                  {currentLyrics.map((line, idx) => {
                    const isActive = activeLyricIndex === idx;
                    return (
                      <p
                        id={`lyric-line-${idx}`}
                        key={idx}
                        onClick={() => {
                          if (audioRef.current && line.time > 0) {
                            audioRef.current.currentTime = line.time;
                          }
                        }}
                        className={`cursor-pointer transition-all duration-300 py-1.5 px-3 rounded-sm leading-relaxed ${
                          isActive
                            ? 'text-blue-400 text-sm md:text-lg font-black tracking-wide scale-105 bg-blue-500/10 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                            : 'text-white/40 hover:text-white/80 text-xs md:text-sm font-semibold tracking-wider'
                        }`}
                      >
                        {line.text}
                      </p>
                    );
                  })}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <Disc className="w-12 h-12 text-white/10 mb-4 animate-[spin_12s_linear_infinite]" />
                  <h4 className="text-xs font-black uppercase text-white/60 tracking-wider mb-2">
                    {isRu ? 'ИНСТРУМЕНТАЛЬНЫЙ ТРЕК ИЛИ ТЕКСТ ОТСУТСТВУЕТ' : 'INSTRUMENTAL OR NO LYRICS PROVIDED'}
                  </h4>
                  <p className="text-[9px] text-white/30 tracking-widest uppercase max-w-sm leading-relaxed">
                    {isRu 
                      ? 'Для данной композиции на официальном сервере Monster Siren Records текст не предоставлен. Композиция является инструментальной или не содержит слов.'
                      : 'No official lyrics file is indexed for this soundtrack in the Monster Siren Records database.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DUEL LYRICS MODAL */}
      {duelLyricsSong && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-white/10 rounded-sm w-full max-w-2xl max-h-[80vh] flex flex-col p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-blue-400" />
                <div>
                  <span className="text-[7.5px] font-black text-blue-400 block uppercase tracking-widest">DUEL TRACK LYRICS</span>
                  <h3 className="text-xs md:text-sm font-black text-white uppercase tracking-wider">{duelLyricsSong.name}</h3>
                </div>
              </div>

              <button
                onClick={() => setDuelLyricsSong(null)}
                className="p-1.5 rounded-sm border border-white/10 hover:border-white/30 text-white/60 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar py-4">
              {loadingDuelLyrics ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto mb-2" />
                  <span className="text-[9px] font-bold tracking-widest uppercase text-white/40">
                    {isRu ? 'ЗАГРУЗКА ТЕКСТА ПЕСНИ...' : 'LOADING SONG LYRICS...'}
                  </span>
                </div>
              ) : duelLyricsLines && duelLyricsLines.length > 0 ? (
                <div className="flex flex-col gap-3 text-center">
                  {duelLyricsLines.map((line, idx) => (
                    <p key={idx} className="text-xs md:text-sm font-semibold text-white/80 leading-relaxed tracking-wider">
                      {line.text}
                    </p>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-[9.5px] font-black uppercase text-white/40 tracking-wider">
                    {isRu ? 'ИНСТРУМЕНТАЛЬНЫЙ ТРЕК ИЛИ ТЕКСТ ОТСУТСТВУЕТ' : 'INSTRUMENTAL TRACK / NO LYRICS'}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-white/10 mt-4 flex justify-end shrink-0">
              <button
                onClick={() => setDuelLyricsSong(null)}
                className="px-4 py-2 border border-white/10 hover:border-blue-500 bg-white/5 text-[9px] font-black tracking-widest uppercase rounded-sm cursor-pointer transition-all"
              >
                {isRu ? 'ЗАКРЫТЬ' : 'CLOSE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Playlist Modal */}
      {showCreatePlaylistModal && (
        <div className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-amber-500/40 p-6 rounded-sm max-w-md w-full shadow-[0_0_30px_rgba(245,158,11,0.15)] relative">
            <button
              onClick={() => setShowCreatePlaylistModal(false)}
              className="absolute top-4 right-4 p-1 rounded-xs bg-white/5 border border-white/10 hover:border-amber-500 text-white/50 hover:text-amber-400 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <ListPlus className="w-5 h-5 text-amber-400" />
              <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider">
                {isRu ? 'СОЗДАТЬ НОВЫЙ ПЛЕЙЛИСТ' : 'CREATE NEW PLAYLIST'}
              </h3>
            </div>
            <p className="text-[8.5px] font-semibold text-white/50 uppercase tracking-widest mb-4">
              {isRu ? 'Введите название для нового музыкального плейлиста' : 'Enter a title for your custom soundtrack playlist'}
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              createPlaylist(newPlaylistName);
            }}>
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder={isRu ? 'Название плейлиста...' : 'Playlist title...'}
                className="w-full bg-black/80 border border-white/10 focus:border-amber-500 rounded-sm py-2 px-3 text-[10px] font-bold tracking-wider text-white uppercase focus:outline-none mb-4"
                autoFocus
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreatePlaylistModal(false)}
                  className="px-3 py-1.5 rounded-sm border border-white/10 text-white/60 hover:text-white text-[8.5px] font-black uppercase tracking-wider cursor-pointer"
                >
                  {isRu ? 'ОТМЕНА' : 'CANCEL'}
                </button>
                <button
                  type="submit"
                  disabled={!newPlaylistName.trim()}
                  className="px-4 py-1.5 rounded-sm bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-[8.5px] font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  {isRu ? 'СОЗДАТЬ' : 'CREATE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Track to Playlist Modal */}
      {addToPlaylistSong && (
        <div className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-amber-500/40 p-6 rounded-sm max-w-md w-full shadow-[0_0_30px_rgba(245,158,11,0.15)] relative">
            <button
              onClick={() => setAddToPlaylistSong(null)}
              className="absolute top-4 right-4 p-1 rounded-xs bg-white/5 border border-white/10 hover:border-amber-500 text-white/50 hover:text-amber-400 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
              <div className="w-10 h-10 rounded-xs overflow-hidden bg-zinc-900 border border-white/10 shrink-0">
                <img src={getSongCoverUrl(addToPlaylistSong)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[7.5px] font-black text-amber-400 tracking-widest uppercase block">
                  {isRu ? 'ДОБАВИТЬ В ПЛЕЙЛИСТ' : 'ADD TO PLAYLIST'}
                </span>
                <h4 className="text-[11px] font-black text-white uppercase tracking-wider truncate">
                  {addToPlaylistSong.name}
                </h4>
                <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest truncate">
                  {getSongArtist(addToPlaylistSong)}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto no-scrollbar mb-4 pr-1">
              {playlists.map((pl) => {
                const inPlaylist = pl.songCids.includes(addToPlaylistSong.cid);
                return (
                  <div
                    key={pl.id}
                    onClick={() => toggleSongInPlaylist(pl.id, addToPlaylistSong.cid)}
                    className={`p-2.5 rounded-xs border transition-all cursor-pointer flex items-center justify-between ${
                      inPlaylist
                        ? 'bg-amber-950/20 border-amber-500/50 text-amber-300'
                        : 'bg-black/60 border-white/10 hover:border-white/20 text-white/70 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {pl.isSystemFavorites ? <Heart className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" /> : <ListMusic className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      <span className="text-[9.5px] font-bold uppercase tracking-wider truncate">{pl.name}</span>
                      <span className="text-[8px] font-mono text-white/30">({pl.songCids.length})</span>
                    </div>

                    <div className={`px-2 py-0.5 rounded-xs text-[8px] font-black uppercase tracking-wider border ${
                      inPlaylist
                        ? 'bg-amber-500 text-black border-amber-500'
                        : 'bg-white/5 border-white/10 text-white/60'
                    }`}>
                      {inPlaylist ? (isRu ? 'ДОБАВЛЕНО' : 'ADDED') : (isRu ? '+ ДОБАВИТЬ' : '+ ADD')}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Create & Add */}
            <div className="pt-3 border-t border-white/10">
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!newPlaylistName.trim()) return;
                const newId = createPlaylist(newPlaylistName, addToPlaylistSong.cid);
                if (newId) setAddToPlaylistSong(null);
              }} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder={isRu ? 'Создать новый плейлист...' : 'Create new playlist...'}
                  className="flex-1 bg-black/80 border border-white/10 focus:border-amber-500 rounded-sm py-1.5 px-3 text-[9px] font-bold text-white uppercase focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!newPlaylistName.trim()}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-[8px] font-black uppercase rounded-sm transition-all cursor-pointer shrink-0"
                >
                  {isRu ? '+ СОЗДАТЬ' : '+ CREATE'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

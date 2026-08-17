import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Upload, 
  FileText, 
  Layers, 
  X, 
  RefreshCw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Trash2, 
  ArrowLeft, 
  Eye, 
  Download, 
  Check, 
  Compass, 
  Sparkles,
  Link as LinkIcon,
  Github,
  Search,
  Database,
  Cloud,
  Loader2,
  AlertTriangle,
  FolderOpen,
  ArrowDownToLine,
  ChevronRight,
  Info,
  Settings
} from 'lucide-react';

// Color translations from Obsidian Canvas color index
const CANVAS_COLORS: Record<string, { bg: string, border: string, text: string, accent: string }> = {
  default: {
    bg: 'bg-[#1e1e1e]/90',
    border: 'border-white/20',
    text: 'text-white/80',
    accent: 'border-white/40'
  },
  '1': { // Red
    bg: 'bg-[#bf4141]/10',
    border: 'border-[#bf4141]/50',
    text: 'text-red-200',
    accent: 'border-[#bf4141]'
  },
  '2': { // Orange
    bg: 'bg-[#d08770]/10',
    border: 'border-[#d08770]/50',
    text: 'text-orange-200',
    accent: 'border-[#d08770]'
  },
  '3': { // Yellow
    bg: 'bg-[#ebcb8b]/10',
    border: 'border-[#ebcb8b]/50',
    text: 'text-yellow-200',
    accent: 'border-[#ebcb8b]'
  },
  '4': { // Green
    bg: 'bg-[#a3be8c]/10',
    border: 'border-[#a3be8c]/50',
    text: 'text-green-200',
    accent: 'border-[#a3be8c]'
  },
  '5': { // Cyan
    bg: 'bg-[#88c0d0]/10',
    border: 'border-[#88c0d0]/50',
    text: 'text-cyan-200',
    accent: 'border-[#88c0d0]'
  },
  '6': { // Purple
    bg: 'bg-[#b48ead]/10',
    border: 'border-[#b48ead]/50',
    text: 'text-purple-200',
    accent: 'border-[#b48ead]'
  }
};

interface ImportedFile {
  name: string;
  type: 'md' | 'canvas';
  content: string;
  importedAt: number;
  source: 'local' | 'github' | 'demo';
  githubPath?: string;      // relative path in github repo (e.g. docs/file.md)
  syncStatus?: 'synced' | 'remote' | 'syncing' | 'error';
  downloadUrl?: string;     // raw.githubusercontent URL
}

export const ObsidianArchiveViewer: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [files, setFiles] = useState<ImportedFile[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  
  // Navigation sidebar sub-tabs: 'files' or 'github'
  const [sidebarTab, setSidebarTab] = useState<'files' | 'github'>('files');

  // GitHub repository settings states
  const [repoName, setRepoName] = useState<string>(() => {
    const saved = localStorage.getItem('ak-gh-repo');
    if (!saved || saved === 'neponum/zoot-data' || saved === 'neponum/zoot-wiki') {
      return 'Andrey4OO/Arknights';
    }
    return saved;
  });
  const [branch, setBranch] = useState<string>(() => localStorage.getItem('ak-gh-branch') || 'main');
  const [subfolder, setSubfolder] = useState<string>(() => localStorage.getItem('ak-gh-folder') || '');
  const [token, setToken] = useState<string>(() => localStorage.getItem('ak-gh-token') || '');
  
  // Statuses for GitHub fetches
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [filterQuery, setFilterQuery] = useState<string>('');

  // Auto-fetching state to prevent redundant active requests for specific files
  const [loadingFilesMap, setLoadingFilesMap] = useState<Record<string, boolean>>({});

  // Keep a persistent ref registry of all file paths attempted to fetch in the current session (to prevent retry loops on failed fetches)
  const attemptedFetchesRef = useRef<Record<string, boolean>>({});

  // Canvas zoom/pan states
  const [pan, setPan] = useState({ x: 50, y: 50 });
  const [zoom, setZoom] = useState(0.85);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [showConnectionSettings, setShowConnectionSettings] = useState<boolean>(false);
  const [selectedCanvasNode, setSelectedCanvasNode] = useState<any | null>(null);

  // Close separate node reader and return to canvas on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedCanvasNode(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Helper to get storage key based on current repo
  const getStorageKey = (repo: string) => `ak-wiki-files-${repo.trim().toLowerCase()}`;

  // Load files on mount
  useEffect(() => {
    let savedRepo = localStorage.getItem('ak-gh-repo');
    if (!savedRepo || savedRepo === 'neponum/zoot-data' || savedRepo === 'neponum/zoot-wiki') {
      savedRepo = 'Andrey4OO/Arknights';
      localStorage.setItem('ak-gh-repo', 'Andrey4OO/Arknights');
    }

    try {
      const storageKey = `ak-wiki-files-${savedRepo.trim().toLowerCase()}`;
      const saved = localStorage.getItem(storageKey);
      let parsed: ImportedFile[] = [];
      if (saved) {
        parsed = JSON.parse(saved);
      }
      
      if (parsed.length > 0) {
        setFiles(parsed);
        
        // Prioritize file path from current browser URL
        const path = window.location.pathname;
        let initialFile: string | null = null;
        if (path.startsWith('/records/')) {
          const urlFile = decodeURIComponent(path.slice('/records/'.length));
          if (parsed.some(f => f.name.toLowerCase() === urlFile.toLowerCase())) {
            initialFile = parsed.find(f => f.name.toLowerCase() === urlFile.toLowerCase())?.name || null;
          }
        }

        if (initialFile) {
          setSelectedFileName(initialFile);
        } else {
          const lastSelected = localStorage.getItem(`ak-gh-last-selected-${savedRepo}`);
          if (lastSelected && parsed.some(f => f.name === lastSelected)) {
            setSelectedFileName(lastSelected);
          } else {
            const canvasFile = parsed.find(f => f.type === 'canvas');
            setSelectedFileName(canvasFile ? canvasFile.name : parsed[0].name);
          }
        }
      } else {
        setFiles([]);
        
        // Pre-set file name from URL if present so loading state matches immediately
        const path = window.location.pathname;
        if (path.startsWith('/records/')) {
          const urlFile = decodeURIComponent(path.slice('/records/'.length));
          if (urlFile) {
            setSelectedFileName(urlFile);
          } else {
            setSelectedFileName(null);
          }
        } else {
          setSelectedFileName(null);
        }
      }
    } catch (e) {
      console.error("Failed to load imported files:", e);
    }

    if (savedRepo && savedRepo.includes('/')) {
      const storageKey = `ak-wiki-files-${savedRepo.trim().toLowerCase()}`;
      const hasCached = !!localStorage.getItem(storageKey);
      if (!hasCached) {
        silentConnectGitHub(savedRepo, true);
      } else {
        silentConnectGitHub(savedRepo, false);
      }
    }
  }, []);

  // Sync selectedFileName to the browser's address bar
  useEffect(() => {
    const decodedCurrent = decodeURIComponent(location.pathname);
    if (!decodedCurrent.startsWith('/records')) {
      return;
    }

    if (selectedFileName) {
      const expectedDecodedPath = `/records/${selectedFileName}`;
      if (decodedCurrent.toLowerCase() !== expectedDecodedPath.toLowerCase()) {
        const expectedPath = `/records/${encodeURIComponent(selectedFileName)}`;
        navigate(expectedPath);
      }
    } else {
      if (decodedCurrent !== '/records' && decodedCurrent !== '/records/') {
        navigate('/records');
      }
    }
  }, [selectedFileName, location.pathname, navigate]);

  // Sync back browser URL changes into React state (back/forward history or loaded files updates)
  useEffect(() => {
    const decodedPath = decodeURIComponent(location.pathname);
    if (!decodedPath.startsWith('/records')) {
      return;
    }

    if (decodedPath.startsWith('/records/')) {
      const urlFile = decodedPath.slice('/records/'.length);
      if (urlFile && urlFile.toLowerCase() !== selectedFileName?.toLowerCase()) {
        const matched = files.find(f => f.name.toLowerCase() === urlFile.toLowerCase());
        if (matched) {
          if (matched.name !== selectedFileName) {
            setSelectedFileName(matched.name);
          }
        } else {
          // Preset even if files list is loading, so the reader handles the sync nicely
          if (files.length === 0) {
            setSelectedFileName(urlFile);
          }
        }
      }
    } else if (decodedPath === '/records' || decodedPath === '/records/') {
      // If the user navigates directly to the root of /records, reset to the default canvas file if we have files loaded
      if (files.length > 0) {
        const canvasFile = files.find(f => f.type === 'canvas');
        const defaultFile = canvasFile ? canvasFile.name : files[0].name;
        if (selectedFileName !== defaultFile) {
          setSelectedFileName(defaultFile);
        }
      } else {
        if (selectedFileName !== null) {
          setSelectedFileName(null);
        }
      }
    }
  }, [location.pathname, files, selectedFileName]);

  // Save selected file preference
  useEffect(() => {
    if (selectedFileName) {
      const savedRepo = repoName.trim() || 'Andrey4OO/Arknights';
      localStorage.setItem(`ak-gh-last-selected-${savedRepo}`, selectedFileName);
    }
  }, [selectedFileName, repoName]);

  // Save files to localstorage
  const saveFiles = (newFiles: ImportedFile[]) => {
    setFiles(newFiles);
    localStorage.setItem(`ak-wiki-files-${repoName.trim().toLowerCase()}`, JSON.stringify(newFiles));
  };

  const silentConnectGitHub = async (repoToSync: string, showStatus = false) => {
    if (showStatus) {
      setIsSyncing(true);
      setSyncMessage({ text: "Подключение к репозиторию...", type: 'info' });
    }
    try {
      const cleanRepo = repoToSync.trim();
      const cleanBranch = localStorage.getItem('ak-gh-branch') || 'main';
      const cleanFolder = (localStorage.getItem('ak-gh-folder') || '').trim().replace(/^\/|\/$/g, '');
      const savedToken = localStorage.getItem('ak-gh-token') || '';

      const apiUrl = `https://api.github.com/repos/${cleanRepo}/git/trees/${cleanBranch}?recursive=true`;
      
      const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3+json',
      };
      if (savedToken.trim()) {
        headers['Authorization'] = `token ${savedToken.trim()}`;
      }

      const response = await fetch(apiUrl, { headers });
      if (!response.ok) {
        if (showStatus) {
          setSyncMessage({ text: `Не удалось загрузить индекс файлов (${response.status})`, type: 'error' });
        }
        return;
      }

      const data = await response.json();
      if (!data || !Array.isArray(data.tree)) return;

      const items = data.tree;

      const eligibleItems = items.filter((item: any) => 
        item.type === 'blob' && (item.path.endsWith('.md') || item.path.endsWith('.canvas'))
      );

      const cleanFolderLower = cleanFolder.toLowerCase();
      const filteredItems = eligibleItems.filter((item: any) => {
        if (!cleanFolder) return true;
        return item.path.toLowerCase().startsWith(cleanFolderLower + '/');
      });

      const storageKey = `ak-wiki-files-${cleanRepo.toLowerCase()}`;
      const saved = localStorage.getItem(storageKey);
      const existingFiles: ImportedFile[] = saved ? JSON.parse(saved) : [];

      const merged: ImportedFile[] = [];
      filteredItems.forEach((item: any) => {
        const pathLower = item.path.toLowerCase();
        const existing = existingFiles.find(f => f.name.toLowerCase() === pathLower);
        const downloadUrl = `https://raw.githubusercontent.com/${cleanRepo}/${cleanBranch}/${item.path}`;

        if (existing) {
          merged.push({
            ...existing,
            source: 'github',
            githubPath: item.path,
            downloadUrl: downloadUrl
          });
        } else {
          merged.push({
            name: item.path,
            type: item.path.endsWith('.canvas') ? 'canvas' : 'md',
            content: '',
            source: 'github',
            githubPath: item.path,
            syncStatus: 'remote',
            downloadUrl: downloadUrl,
            importedAt: Date.now()
          });
        }
      });

      setFiles(merged);
      localStorage.setItem(storageKey, JSON.stringify(merged));

      if (showStatus) {
        setSyncMessage({ 
          text: `Успешно подключено к репозиторию! Найдено файлов: ${filteredItems.length}.`, 
          type: 'success' 
        });
      }

      const currentSelected = localStorage.getItem(`ak-gh-last-selected-${cleanRepo}`);
      if (!currentSelected || !merged.some(f => f.name === currentSelected)) {
        const canvasFile = merged.find(f => f.type === 'canvas');
        if (canvasFile) {
          setSelectedFileName(canvasFile.name);
        } else if (merged.length > 0) {
          setSelectedFileName(merged[0].name);
        }
      }

    } catch (e) {
      console.error("Failed to silently sync from GitHub:", e);
      if (showStatus) {
        setSyncMessage({ text: "Не удалось загрузить данные с GitHub.", type: 'error' });
      }
    } finally {
      if (showStatus) {
        setIsSyncing(false);
      }
    }
  };

  const handleResetToWiki = () => {
    setRepoName('Andrey4OO/Arknights');
    setBranch('main');
    setSubfolder('');
    localStorage.setItem('ak-gh-repo', 'Andrey4OO/Arknights');
    localStorage.setItem('ak-gh-branch', 'main');
    localStorage.setItem('ak-gh-folder', '');
    silentConnectGitHub('Andrey4OO/Arknights', true);
  };

  const handleClearCache = () => {
    if (window.confirm("Очистить сохраненный локальный кэш файлов? Все файлы будут заново загружены с GitHub.")) {
      const storageKey = `ak-wiki-files-${repoName.trim().toLowerCase()}`;
      localStorage.removeItem(storageKey);
      setFiles([]);
      setSelectedFileName(null);
      silentConnectGitHub(repoName, true);
    }
  };



  // Panning & zooming mechanics
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('textarea') || target.closest('a') || target.closest('.no-drag')) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 1.08;
    const nextZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
    setZoom(Math.max(0.12, Math.min(3, nextZoom)));
  };

  const handleZoomIn = () => setZoom(z => Math.min(3, z * 1.15));
  const handleZoomOut = () => setZoom(z => Math.max(0.12, z / 1.15));
  const handleResetView = () => {
    setZoom(0.8);
    setPan({ x: 100, y: 80 });
  };

  // Fetch individual raw file content from GitHub (fully bypasses rate limits)
  const fetchRawGitHubFile = async (filePath: string): Promise<string> => {
    const cleanRepo = repoName.trim();
    const cleanBranch = branch.trim() || 'main';
    
    // Construct the direct raw.githubusercontent.com URL (has wild CORS allowances!)
    const rawUrl = `https://raw.githubusercontent.com/${cleanRepo}/${cleanBranch}/${filePath}`;
    
    const headers: HeadersInit = {};
    if (token.trim()) {
      headers['Authorization'] = `token ${token.trim()}`;
    }

    const res = await fetch(rawUrl, { headers });
    if (!res.ok) {
      throw new Error(`Failed to load raw file content: ${res.statusText}`);
    }
    return res.text();
  };

  // Fetch directory structure from GitHub REST API
  const handleConnectGitHub = async () => {
    if (!repoName.includes('/')) {
      setSyncMessage({ text: "Неверный формат репозитория. Должно быть 'владелец/репозиторий' (например, Andrey4OO/Arknights)", type: 'error' });
      return;
    }

    setIsSyncing(true);
    setSyncMessage({ text: "Синхронизация с базой GitHub API (рекурсивно)...", type: 'info' });

    // Store settings in localStorage
    localStorage.setItem('ak-gh-repo', repoName.trim());
    localStorage.setItem('ak-gh-branch', branch.trim());
    localStorage.setItem('ak-gh-folder', subfolder.trim());
    localStorage.setItem('ak-gh-token', token.trim());

    try {
      const cleanRepo = repoName.trim();
      const cleanBranch = branch.trim() || 'main';
      const cleanFolder = subfolder.trim().replace(/^\/|\/$/g, '');

      // Git Trees API to get ALL files recursively!
      const apiUrl = `https://api.github.com/repos/${cleanRepo}/git/trees/${cleanBranch}?recursive=true`;
      
      const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3+json',
      };
      if (token.trim()) {
        headers['Authorization'] = `token ${token.trim()}`;
      }

      const response = await fetch(apiUrl, { headers });
      
      if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
          throw new Error("Доступ заблокирован или превышен лимит запросов GitHub. Попробуйте указать Personal Access Token.");
        }
        throw new Error(`Ошибка подключения (${response.status}): ${response.statusText}`);
      }

      const data = await response.json();
      if (!data || !Array.isArray(data.tree)) {
        throw new Error("Не удалось получить дерево файлов репозитория.");
      }

      const items = data.tree;

      // Filter only files with .md and .canvas extensions
      const eligibleItems = items.filter((item: any) => 
        item.type === 'blob' && (item.path.endsWith('.md') || item.path.endsWith('.canvas'))
      );

      // Filter by subfolder if specified
      const cleanFolderLower = cleanFolder.toLowerCase();
      const filteredItems = eligibleItems.filter((item: any) => {
        if (!cleanFolder) return true;
        return item.path.toLowerCase().startsWith(cleanFolderLower + '/');
      });

      setFiles(prev => {
        const merged = [...prev];
        filteredItems.forEach((item: any) => {
          const pathLower = item.path.toLowerCase();
          const existingIdx = merged.findIndex(f => f.name.toLowerCase() === pathLower);
          
          const downloadUrl = `https://raw.githubusercontent.com/${cleanRepo}/${cleanBranch}/${item.path}`;
          
          if (existingIdx !== -1) {
            merged[existingIdx] = {
              ...merged[existingIdx],
              source: 'github',
              githubPath: item.path,
              downloadUrl: downloadUrl
            };
          } else {
            merged.push({
              name: item.path, // Store the full path in name
              type: item.path.endsWith('.canvas') ? 'canvas' : 'md',
              content: '',
              source: 'github',
              githubPath: item.path,
              syncStatus: 'remote',
              downloadUrl: downloadUrl,
              importedAt: Date.now()
            });
          }
        });

        localStorage.setItem('ak-imported-obsidian-files', JSON.stringify(merged));
        return merged;
      });

      setSyncMessage({ 
        text: `Успешно подключено к репозиторию! Обнаружено файлов: ${filteredItems.length}. Нажмите на файл в списке для моментальной загрузки.`, 
        type: 'success' 
      });
      
      // Auto-select the first canvas file if none selected or if it's currently demo
      const canvasFile = filteredItems.find((item: any) => item.path.endsWith('.canvas'));
      if (canvasFile) {
        setSelectedFileName(canvasFile.path);
      } else if (filteredItems.length > 0) {
        setSelectedFileName(filteredItems[0].path);
      }

    } catch (e: any) {
      console.error(e);
      setSyncMessage({ text: e.message || "Не удалось загрузить данные с GitHub.", type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Pull individual file from GitHub to local cache
  const handleSyncFile = async (file: ImportedFile) => {
    if (!file.githubPath && file.source !== 'github') return;
    
    // Set status to syncing
    setFiles(prev => {
      const copy = [...prev];
      const idx = copy.findIndex(f => f.name === file.name);
      if (idx !== -1) {
        copy[idx].syncStatus = 'syncing';
      }
      return copy;
    });

    try {
      const path = file.githubPath || file.name;
      const content = await fetchRawGitHubFile(path);
      
      setFiles(prev => {
        const copy = [...prev];
        const idx = copy.findIndex(f => f.name === file.name);
        if (idx !== -1) {
          copy[idx] = {
            ...copy[idx],
            content,
            syncStatus: 'synced'
          };
        }
        localStorage.setItem('ak-imported-obsidian-files', JSON.stringify(copy));
        return copy;
      });

      // Show temporary notification
      setSyncMessage({ text: `Синхронизирован файл ${file.name}`, type: 'success' });
    } catch (e) {
      console.error(e);
      setFiles(prev => {
        const copy = [...prev];
        const idx = copy.findIndex(f => f.name === file.name);
        if (idx !== -1) {
          copy[idx].syncStatus = 'error';
        }
        return copy;
      });
      setSyncMessage({ text: `Не удалось загрузить файл ${file.name}`, type: 'error' });
    }
  };

  // Sync / Download ALL remote placeholder files
  const handleSyncAllFiles = async () => {
    const remoteFiles = files.filter(f => f.source === 'github' && f.syncStatus === 'remote');
    if (remoteFiles.length === 0) {
      setSyncMessage({ text: "Все файлы уже синхронизированы с вашим браузером!", type: 'info' });
      return;
    }

    setIsSyncing(true);
    setSyncMessage({ text: `Синхронизация ${remoteFiles.length} файлов...`, type: 'info' });

    let successCount = 0;
    const updatedFiles = [...files];

    for (const file of remoteFiles) {
      try {
        const path = file.githubPath || file.name;
        const content = await fetchRawGitHubFile(path);
        const idx = updatedFiles.findIndex(f => f.name === file.name);
        if (idx !== -1) {
          updatedFiles[idx] = {
            ...updatedFiles[idx],
            content,
            syncStatus: 'synced'
          };
        }
        successCount++;
      } catch (e) {
        console.error(`Error syncing ${file.name}:`, e);
        const idx = updatedFiles.findIndex(f => f.name === file.name);
        if (idx !== -1) {
          updatedFiles[idx].syncStatus = 'error';
        }
      }
    }

    saveFiles(updatedFiles);
    setIsSyncing(false);
    setSyncMessage({ text: `Успешно синхронизировано файлов: ${successCount} из ${remoteFiles.length}`, type: 'success' });
  };

  // Compute lookup of other markdown dossiers/files to show inside canvas file nodes
  const filesMap = React.useMemo(() => {
    const map: Record<string, ImportedFile> = {};
    files.forEach(f => {
      // 1. Map by full path (e.g. "storylines/races/древние.md")
      const fullPathLower = f.name.toLowerCase();
      map[fullPathLower] = f;
      
      // 2. Map by path with "arknights/" prefix (e.g. "arknights/storylines/races/древние.md")
      map["arknights/" + fullPathLower] = f;
      
      // 3. Map by base name (e.g. "древние.md")
      const baseName = f.name.split('/').pop();
      if (baseName) {
        map[baseName.toLowerCase()] = f;
      }
    });
    return map;
  }, [files]);

  // Lazy-loader helper inside Canvas view: Auto-fetches missing markdown files from GitHub
  const autoFetchMissingFile = async (fileName: string) => {
    const key = fileName.toLowerCase();
    // Return if already fetched, or if already currently fetching/attempted
    if (loadingFilesMap[key] || attemptedFetchesRef.current[key]) return;

    // Resolve file metadata via our filesMap (which supports Arknights/ prefix stripping and base name lookups!)
    const fileMetadata = filesMap[key];

    if (fileMetadata) {
      if (fileMetadata.syncStatus === 'remote') {
        // We have the file, but it's not downloaded yet. Pull it!
        setLoadingFilesMap(prev => ({ ...prev, [key]: true }));
        attemptedFetchesRef.current[key] = true;
        try {
          const path = fileMetadata.githubPath || fileMetadata.name;
          console.log(`Auto-downloading remote file ${fileName} from known path ${path}...`);
          const content = await fetchRawGitHubFile(path);
          
          setFiles(prev => {
            const copy = [...prev];
            const idx = copy.findIndex(f => f.name.toLowerCase() === fileMetadata.name.toLowerCase());
            if (idx !== -1) {
              copy[idx] = {
                ...copy[idx],
                content,
                syncStatus: 'synced'
              };
            }
            localStorage.setItem('ak-imported-obsidian-files', JSON.stringify(copy));
            return copy;
          });
        } catch (err) {
          console.warn(`Failed automatic sync for ${fileName}:`, err);
        } finally {
          setLoadingFilesMap(prev => ({ ...prev, [key]: false }));
        }
      }
    } else {
      // Speculative fetch for unknown file
      // Strip "Arknights/" prefix if present to find the actual GitHub path
      const cleanPath = fileName.replace(/^Arknights\//i, '');
      setLoadingFilesMap(prev => ({ ...prev, [key]: true }));
      attemptedFetchesRef.current[key] = true;
      try {
        console.log(`Auto-fetching missing file ${fileName} from speculative path ${cleanPath}...`);
        const content = await fetchRawGitHubFile(cleanPath);
        
        const newFile: ImportedFile = {
          name: cleanPath,
          type: cleanPath.endsWith('.canvas') ? 'canvas' : 'md',
          content,
          source: 'github',
          githubPath: cleanPath,
          syncStatus: 'synced',
          importedAt: Date.now()
        };

        setFiles(prev => {
          const next = [...prev, newFile];
          localStorage.setItem('ak-imported-obsidian-files', JSON.stringify(next));
          return next;
        });
      } catch (err) {
        console.warn(`Failed speculative fetch for ${fileName}:`, err);
      } finally {
        setLoadingFilesMap(prev => ({ ...prev, [key]: false }));
      }
    }
  };

  const findFileByLinkTarget = (target: string): ImportedFile | undefined => {
    if (!target) return undefined;
    
    // 1. Try decoding in case the link is percent-encoded (e.g., %20 for spaces)
    let decodedTarget = target;
    try {
      decodedTarget = decodeURIComponent(target);
    } catch (e) {
      // ignore decoding error
    }
    
    // 2. Normalize backslashes to forward slashes and trim
    const normalizedTarget = decodedTarget.trim().replace(/\\/g, '/');
    const cleanTargetLower = normalizedTarget.toLowerCase().replace(/\.md$/i, '').replace(/\.canvas$/i, '');
    const targetBaseNameLower = cleanTargetLower.split('/').pop() || '';
    
    // First, try quick map lookup for speed
    let match = filesMap[cleanTargetLower] || 
                filesMap[cleanTargetLower + '.md'] || 
                filesMap[cleanTargetLower + '.canvas'] ||
                filesMap['arknights/' + cleanTargetLower] || 
                filesMap['arknights/' + cleanTargetLower + '.md'] ||
                filesMap['arknights/' + cleanTargetLower + '.canvas'] ||
                filesMap[targetBaseNameLower] ||
                filesMap[targetBaseNameLower + '.md'] ||
                filesMap[targetBaseNameLower + '.canvas'];
                
    if (match) return match;
    
    // If not found in map, do a smart iteration over all files for maximum flexibility
    const found = files.find(f => {
      const filePathLower = f.name.toLowerCase();
      const cleanFileLower = filePathLower.replace(/\.md$/i, '').replace(/\.canvas$/i, '');
      const fileBaseNameLower = cleanFileLower.split('/').pop() || '';
      
      // Match 1: clean file path matches clean target path
      if (cleanFileLower === cleanTargetLower) return true;
      if (cleanFileLower.replace(/^arknights\//, '') === cleanTargetLower.replace(/^arknights\//, '')) return true;
      
      // Match 2: file ends with the clean target path (e.g., file: "story/races/drevnie.md" ends with target: "races/drevnie")
      if (cleanFileLower.endsWith('/' + cleanTargetLower)) return true;
      
      // Match 3: target ends with the clean file path
      if (cleanTargetLower.endsWith('/' + cleanFileLower)) return true;
      
      // Match 4: base names match (e.g. "древние" === "древние")
      if (fileBaseNameLower && targetBaseNameLower && fileBaseNameLower === targetBaseNameLower) return true;
      
      return false;
    });
    
    return found;
  };

  const handleLinkClick = (target: string) => {
    const cleanTarget = target.trim();
    const matched = findFileByLinkTarget(cleanTarget);
    if (matched) {
      handleSelectFile(matched);
    } else {
      // Speculatively fetch and open the new file path
      let decoded = cleanTarget;
      try {
        decoded = decodeURIComponent(cleanTarget);
      } catch (e) {}
      const normalized = decoded.replace(/\\/g, '/');
      const pathWithExt = normalized.toLowerCase().endsWith('.canvas') || normalized.toLowerCase().endsWith('.md')
        ? normalized
        : `${normalized}.md`;
      
      setSelectedFileName(pathWithExt);
      autoFetchMissingFile(pathWithExt);
    }
  };

  // Custom markdown simple parser with Obsidian link support, checklist support, codeblock fences
  const renderSimpleMarkdown = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    
    let inCodeBlock = false;
    let codeBlockLines: string[] = [];
    let codeLanguage = '';

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];

      // Code blocks fence
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          // Close the block
          const codeText = codeBlockLines.join('\n');
          elements.push(
            <div key={`code-${idx}`} className="my-3 bg-black/60 border border-white/10 rounded p-3 font-mono text-[10px] text-blue-300 overflow-x-auto">
              {codeLanguage && (
                <div className="text-[8px] text-white/30 uppercase tracking-widest border-b border-white/5 pb-1 mb-2 font-sans font-bold">
                  {codeLanguage}
                </div>
              )}
              <pre className="whitespace-pre-wrap">{codeText}</pre>
            </div>
          );
          inCodeBlock = false;
          codeBlockLines = [];
          codeLanguage = '';
        } else {
          // Open the block
          inCodeBlock = true;
          codeLanguage = line.trim().slice(3).trim();
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockLines.push(line);
        continue;
      }

      // Headers
      if (line.startsWith('# ')) {
        elements.push(<h1 key={idx} className="text-lg md:text-xl font-black border-b border-white/10 pb-1.5 mb-3 mt-4 text-white tracking-wider uppercase">{line.slice(2)}</h1>);
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(<h2 key={idx} className="text-sm md:text-base font-black mb-2 mt-3 text-white/90 tracking-wide border-b border-white/5 pb-1 uppercase">{line.slice(3)}</h2>);
        continue;
      }
      if (line.startsWith('### ')) {
        elements.push(<h3 key={idx} className="text-xs md:text-sm font-bold mb-2 mt-2 text-white/80">{line.slice(4)}</h3>);
        continue;
      }
      if (line.startsWith('#### ')) {
        elements.push(<h4 key={idx} className="text-xs font-bold mb-2 mt-2 text-white/70">{line.slice(5)}</h4>);
        continue;
      }

      // Blockquote
      if (line.startsWith('> ')) {
        elements.push(<blockquote key={idx} className="border-l-2 border-[#88c0d0] pl-3 italic my-2 text-white/60 bg-white/[0.02] py-1 text-[11px] md:text-xs">{line.slice(2)}</blockquote>);
        continue;
      }

      // List item or Checklist item
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const content = line.slice(2);
        if (content.startsWith('[ ] ')) {
          elements.push(
            <div key={idx} className="flex items-center gap-2 ml-2 my-1 text-[11px] md:text-xs text-white/70">
              <input type="checkbox" checked={false} readOnly className="rounded border-white/20 bg-white/5 text-amber-500 focus:ring-0 w-3.5 h-3.5 shrink-0" />
              <span>{parseInlineFormat(content.slice(4))}</span>
            </div>
          );
        } else if (content.startsWith('[x] ') || content.startsWith('[X] ')) {
          elements.push(
            <div key={idx} className="flex items-center gap-2 ml-2 my-1 text-[11px] md:text-xs text-white/50 line-through">
              <input type="checkbox" checked={true} readOnly className="rounded border-white/20 bg-white/10 text-amber-500/50 focus:ring-0 w-3.5 h-3.5 shrink-0" />
              <span>{parseInlineFormat(content.slice(4))}</span>
            </div>
          );
        } else {
          elements.push(<li key={idx} className="list-disc list-inside ml-2 my-1 text-[11px] md:text-xs text-white/70">{parseInlineFormat(content)}</li>);
        }
        continue;
      }

      // Horizontal rule
      if (line.trim() === '---') {
        elements.push(<hr key={idx} className="my-3 border-white/10" />);
        continue;
      }

      // Empty line
      if (line.trim() === '') {
        elements.push(<div key={idx} className="h-1" />);
        continue;
      }

      elements.push(<p key={idx} className="text-[11px] md:text-xs leading-relaxed mb-1.5 text-white/75">{parseInlineFormat(line)}</p>);
    }

    // Handle open code block if EOF reached without closing
    if (inCodeBlock && codeBlockLines.length > 0) {
      elements.push(
        <div key="code-eof" className="my-3 bg-black/60 border border-white/10 rounded p-3 font-mono text-[10px] text-blue-300 overflow-x-auto">
          <pre className="whitespace-pre-wrap">{codeBlockLines.join('\n')}</pre>
        </div>
      );
    }

    return elements;
  };

  const parseInlineFormat = (text: string) => {
    if (!text) return '';
    
    // Combined regex for all tokens we want to match
    const inlineRegex = /(!?\[\[[^\]]+\]\]|!?\[[^\]]*\]\([^)]+\)|==[^=]+==|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
    
    const parts = text.split(inlineRegex);
    if (parts.length === 1) return text;
    
    return parts.map((part, index) => {
      if (!part) return null;
      
      // 1. Obsidian Embed: ![[ImageName]]
      if (part.startsWith('![[') && part.endsWith(']]')) {
        const inner = part.slice(3, -2);
        const matchedFile = files.find(f => f.name.toLowerCase().endsWith(inner.toLowerCase()));
        const finalPath = matchedFile ? (matchedFile.githubPath || matchedFile.name) : inner;
        const src = `https://raw.githubusercontent.com/${repoName.trim()}/${branch.trim() || 'main'}/${finalPath.replace(/^Arknights\//, '')}`;
        return (
          <img 
            key={index}
            src={src} 
            alt={inner} 
            className="max-w-full my-3 rounded-xs border border-white/10 shadow-lg object-contain block"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        );
      }
      
      // 2. Obsidian Link: [[Target]] or [[Target|Label]]
      if (part.startsWith('[[') && part.endsWith(']]')) {
        const inner = part.slice(2, -2);
        const pipeIndex = inner.indexOf('|');
        const target = pipeIndex !== -1 ? inner.substring(0, pipeIndex) : inner;
        const label = pipeIndex !== -1 ? inner.substring(pipeIndex + 1) : inner;
        return (
          <span
            key={index}
            onClick={() => handleLinkClick(target)}
            className="text-amber-400 hover:text-amber-300 underline decoration-amber-400/30 cursor-pointer font-semibold transition-colors mx-0.5 inline"
          >
            {label}
          </span>
        );
      }
      
      // 3. Markdown Embed: ![Label](URL)
      if (part.startsWith('![') && part.endsWith(')')) {
        const match = part.match(/^!\[(.*?)\]\((.+?)\)$/);
        if (match) {
          const label = match[1];
          const url = match[2];
          let finalSrc = url;
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            const cleanUrl = url.replace(/^\.\//, '');
            const matchedFile = files.find(f => f.name.toLowerCase().endsWith(cleanUrl.toLowerCase()));
            const finalPath = matchedFile ? (matchedFile.githubPath || matchedFile.name) : cleanUrl;
            finalSrc = `https://raw.githubusercontent.com/${repoName.trim()}/${branch.trim() || 'main'}/${finalPath.replace(/^Arknights\//, '')}`;
          }
          return (
            <img 
              key={index}
              src={finalSrc} 
              alt={label || 'image'} 
              className="max-w-full my-3 rounded-xs border border-white/10 shadow-lg object-contain block"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          );
        }
      }
      
      // 4. Markdown Link: [Label](URL)
      if (part.startsWith('[') && part.endsWith(')')) {
        const match = part.match(/^\[(.*?)\]\((.+?)\)$/);
        if (match) {
          const label = match[1];
          const url = match[2];
          if (url.startsWith('http://') || url.startsWith('https://')) {
            return (
              <a
                key={index}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline transition-colors mx-0.5 font-medium inline"
              >
                {label || url}
              </a>
            );
          } else {
            return (
              <span
                key={index}
                onClick={() => handleLinkClick(url)}
                className="text-amber-400 hover:text-amber-300 underline decoration-amber-400/30 cursor-pointer font-semibold transition-colors mx-0.5 inline"
              >
                {label || url}
              </span>
            );
          }
        }
      }
      
      // 5. Obsidian Highlight: ==text==
      if (part.startsWith('==') && part.endsWith('==')) {
        return (
          <mark key={index} className="bg-amber-400/20 text-amber-200 px-1 py-0.5 rounded-xs border border-amber-400/10 font-medium">
            {part.slice(2, -2)}
          </mark>
        );
      }
      
      // 6. Bold: **text**
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-bold text-white bg-white/5 px-1 rounded-xs">
            {part.slice(2, -2)}
          </strong>
        );
      }
      
      // 7. Italic: *text*
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={index} className="italic text-white/90">
            {part.slice(1, -1)}
          </em>
        );
      }
      
      // 8. Inline Code: `text`
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={index} className="font-mono text-[10px] bg-white/10 px-1 py-0.5 rounded-xs text-blue-300">
            {part.slice(1, -1)}
          </code>
        );
      }
      
      return part;
    });
  };

  // Fetch file handler for clicking files in the list
  const handleSelectFile = async (file: ImportedFile) => {
    setSelectedFileName(file.name);
    if (file.source === 'github' && file.syncStatus === 'remote') {
      await handleSyncFile(file);
    }
  };

  // Filtered files according to search box
  const filteredFiles = React.useMemo(() => {
    return files.filter(f => f.name.toLowerCase().includes(filterQuery.toLowerCase()));
  }, [files, filterQuery]);

  // Read current file details
  const selectedFile = files.find(f => f.name === selectedFileName);

  // Auto-download selected file if it is remote placeholder
  useEffect(() => {
    if (selectedFile && selectedFile.source === 'github' && selectedFile.syncStatus === 'remote') {
      handleSyncFile(selectedFile);
    }
  }, [selectedFile]);

  // Parse Obsidian Canvas content if active
  const canvasData = React.useMemo(() => {
    if (selectedFile && selectedFile.type === 'canvas') {
      const content = selectedFile.content ? selectedFile.content.trim() : '';
      if (!content) {
        return null;
      }
      try {
        return JSON.parse(content);
      } catch (e) {
        console.warn("Failed to parse canvas JSON:", e);
        return null;
      }
    }
    return null;
  }, [selectedFile]);



  // Trigger missing file fetches when nodes change or render
  useEffect(() => {
    if (canvasData && canvasData.nodes) {
      canvasData.nodes.forEach((node: any) => {
        if (node.type === 'file' && node.file) {
          const existing = filesMap[node.file.toLowerCase()];
          if (!existing || existing.syncStatus === 'remote') {
            autoFetchMissingFile(node.file);
          }
        }
      });
    }
  }, [canvasData, filesMap]);

  // Helper to resolve connector side coordinates
  const getNodeSideCoords = (node: any, side: string) => {
    const x = node.x;
    const y = node.y;
    const w = node.width;
    const h = node.height;
    switch (side) {
      case 'top':
        return { x: x + w / 2, y: y };
      case 'bottom':
        return { x: x + w / 2, y: y + h };
      case 'left':
        return { x: x, y: y + h / 2 };
      case 'right':
        return { x: x + w, y: y + h / 2 };
      default:
        return { x: x + w / 2, y: y + h / 2 };
    }
  };

  // Render edge line
  const renderEdgeCurve = (edge: any) => {
    if (!canvasData) return null;
    const fromNode = canvasData.nodes?.find((n: any) => n.id === edge.fromNode);
    const toNode = canvasData.nodes?.find((n: any) => n.id === edge.toNode);

    if (!fromNode || !toNode) return null;

    const fromPt = getNodeSideCoords(fromNode, edge.fromSide || 'right');
    const toPt = getNodeSideCoords(toNode, edge.toSide || 'left');

    const dx = Math.abs(toPt.x - fromPt.x);
    const dy = Math.abs(toPt.y - fromPt.y);
    
    let cp1x = fromPt.x;
    let cp1y = fromPt.y;
    let cp2x = toPt.x;
    let cp2y = toPt.y;

    const offset = Math.min(100, Math.max(35, dx * 0.4, dy * 0.4));

    if (edge.fromSide === 'right') cp1x += offset;
    else if (edge.fromSide === 'left') cp1x -= offset;
    else if (edge.fromSide === 'bottom') cp1y += offset;
    else if (edge.fromSide === 'top') cp1y -= offset;

    if (edge.toSide === 'right') cp2x += offset;
    else if (edge.toSide === 'left') cp2x -= offset;
    else if (edge.toSide === 'bottom') cp2y += offset;
    else if (edge.toSide === 'top') cp2y -= offset;

    const pathD = `M ${fromPt.x} ${fromPt.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toPt.x} ${toPt.y}`;

    return (
      <g key={edge.id} className="group/edge">
        {/* Shadow hover path */}
        <path 
          d={pathD} 
          fill="none" 
          stroke="transparent" 
          strokeWidth="10" 
          className="cursor-pointer"
        />
        {/* Core vector line */}
        <path 
          d={pathD} 
          fill="none" 
          stroke="rgba(255,255,255,0.3)" 
          strokeWidth="2" 
          markerEnd="url(#arrowhead)"
          className="transition-all group-hover/edge:stroke-white/80 group-hover/edge:stroke-3"
        />
        {/* Edge label */}
        {edge.label && (
          <foreignObject
            x={(fromPt.x + toPt.x) / 2 - 60}
            y={(fromPt.y + toPt.y) / 2 - 10}
            width="120"
            height="24"
            className="pointer-events-none"
          >
            <div className="flex justify-center items-center h-full">
              <span className="text-[6.5px] font-black tracking-widest text-white/50 bg-black/90 border border-white/10 px-1.5 py-0.5 uppercase whitespace-nowrap rounded-xs shadow-md">
                {edge.label}
              </span>
            </div>
          </foreignObject>
        )}
      </g>
    );
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row text-white overflow-hidden bg-black/75">
      
      {/* File management sidebar */}
      {isSettingsOpen && (
        <div className="w-full md:w-80 shrink-0 border-b md:border-b-0 md:border-r border-white/10 bg-[#09090b] flex flex-col h-[50%] md:h-full overflow-hidden z-30 shadow-2xl">
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40 shrink-0">
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              <span className="text-[10px] font-black tracking-[0.2em] uppercase text-white">БАЗА ДАННЫХ</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 hover:bg-white/5 border border-white/10 text-white/40 hover:text-white rounded-xs transition-all cursor-pointer"
                title="Закрыть панель базы данных"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Sync Status Overlay Message */}
          {syncMessage && (
            <div className={`p-3.5 text-[9px] font-bold uppercase tracking-wider flex items-center justify-between shrink-0 ${
              syncMessage.type === 'success' ? 'bg-green-500/10 border-b border-green-500/20 text-green-400' :
              syncMessage.type === 'error' ? 'bg-red-500/10 border-b border-red-500/20 text-red-400' :
              'bg-blue-500/10 border-b border-blue-500/20 text-blue-400'
            }`}>
              <div className="flex items-center gap-2 overflow-hidden mr-3">
                {syncMessage.type === 'error' ? <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> : <Info className="w-3.5 h-3.5 shrink-0" />}
                <span className="truncate">{syncMessage.text}</span>
              </div>
              <button onClick={() => setSyncMessage(null)} className="text-white/40 hover:text-white shrink-0">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Search Box */}
          <div className="p-3 border-b border-white/5 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-white/30" />
              <input 
                type="text"
                placeholder="ПОИСК В БАЗЕ..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full bg-white/[0.02] hover:bg-white/[0.05] focus:bg-black/80 border border-white/15 focus:border-white/40 text-[9px] font-bold tracking-widest text-white placeholder-white/35 pl-8 pr-3 py-2 uppercase transition-all rounded-xs outline-none"
              />
            </div>
          </div>

          {/* Files List organized into Database Map (Canvas) and Documents (MD) */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
            {filteredFiles.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-center px-4">
                <FileText className="w-8 h-8 text-white/15 mb-2" />
                <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider">
                  {filterQuery ? "НЕТ СОВПАДЕНИЙ" : "ФАЙЛЫ НЕ НАЙДЕНЫ"}
                </p>
                <p className="text-[7.5px] text-white/20 uppercase tracking-widest mt-1">
                  Нажмите кнопку «ОБНОВИТЬ» выше, чтобы загрузить файлы репозитория!
                </p>
              </div>
            ) : (
              <>
                {/* 1. CANVAS DATABASES SECTION */}
                {filteredFiles.filter(f => f.type === 'canvas').length > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="text-[8px] font-black text-blue-400 uppercase tracking-[0.2em] px-1 select-none flex items-center gap-1.5">
                      <Layers className="w-3 h-3 text-blue-400 animate-pulse" />
                      <span>КАРТЫ СВЯЗЕЙ (БАЗЫ)</span>
                    </div>
                    <div className="space-y-1.5">
                      {filteredFiles.filter(f => f.type === 'canvas').map(file => {
                        const isSelected = file.name === selectedFileName;
                        const displayName = file.name.replace(/\.canvas$/i, '').split('/').pop() || file.name;
                        return (
                          <div 
                            key={file.name}
                            className={`p-2.5 border rounded-xs transition-all relative flex flex-col gap-2 ${
                              isSelected 
                                ? 'border-blue-500 bg-blue-500/5 text-white shadow-[0_0_10px_rgba(59,130,246,0.15)]' 
                                : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04] text-white/70'
                            }`}
                          >
                            <div className="flex items-start gap-2 overflow-hidden">
                              <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                              <div className="flex flex-col min-w-0">
                                <span className="text-[9.5px] font-black truncate uppercase tracking-widest leading-normal">
                                  {displayName}
                                </span>
                                <span className="text-[6.5px] font-semibold text-white/30 truncate select-all">
                                  {file.name}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-white/5">
                              <span className="text-[6.5px] font-bold opacity-60">
                                {file.syncStatus === 'synced' ? (
                                  <span className="text-green-400 flex items-center gap-1">🟢 ЗАГРУЖЕН</span>
                                ) : (
                                  <span className="text-amber-400 flex items-center gap-1">☁️ НА GITHUB</span>
                                )}
                              </span>
                              <button
                                onClick={() => handleSelectFile(file)}
                                className={`px-2.5 py-1 text-[7.5px] font-black tracking-widest uppercase rounded-xs transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-blue-500 text-white shadow-md'
                                    : 'bg-white/10 hover:bg-white/20 text-white'
                                }`}
                              >
                                ОТКРЫТЬ КАРТУ →
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. MARKDOWN DOCUMENTS SECTION */}
                {filteredFiles.filter(f => f.type === 'md').length > 0 && (
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="text-[8px] font-black text-amber-500 uppercase tracking-[0.2em] px-1 select-none flex items-center gap-1.5">
                      <FileText className="w-3 h-3 text-amber-500" />
                      <span>ДОКУМЕНТЫ БАЗЫ ДАННЫХ</span>
                    </div>
                    <div className="space-y-1.5">
                      {filteredFiles.filter(f => f.type === 'md').map(file => {
                        const isSelected = file.name === selectedFileName;
                        const displayName = file.name.replace(/\.md$/i, '').split('/').pop()?.replace(/_/g, ' ') || file.name;
                        return (
                          <div 
                            key={file.name}
                            className={`p-2 border rounded-xs transition-all flex flex-col gap-1.5 ${
                              isSelected 
                                ? 'border-amber-500 bg-amber-500/5 text-white shadow-[0_0_10px_rgba(245,158,11,0.15)]' 
                                : 'border-white/5 bg-white/[0.01] hover:bg-white/[0.03] text-white/60'
                            }`}
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FileText className="w-3 h-3 text-amber-500 shrink-0" />
                              <span className="text-[9px] font-black truncate uppercase tracking-widest leading-none">
                                {displayName}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[6.5px] font-bold text-white/30">
                              <span className="truncate max-w-[120px] select-all">
                                {file.name}
                              </span>
                              <button
                                onClick={() => handleSelectFile(file)}
                                className={`px-2.5 py-1 text-[7px] font-black tracking-widest uppercase rounded-xs transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-amber-500 text-black font-black'
                                    : 'bg-white/5 hover:bg-white/15 text-white/70'
                                }`}
                              >
                                ЧИТАТЬ →
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ADVANCED REPOSITORY CONNECTION PANEL (COLLAPSED BY DEFAULT) */}
          <div className="p-3 border-t border-white/10 bg-black/40 shrink-0 flex flex-col gap-1.5">
            <button
              onClick={() => setShowConnectionSettings(!showConnectionSettings)}
              className="w-full py-1.5 border border-white/5 hover:border-white/20 bg-white/[0.01] hover:bg-white/[0.03] rounded-xs text-[7px] text-white/45 font-black tracking-widest uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Settings className="w-3 h-3 text-white/30" />
              <span>{showConnectionSettings ? 'СКРЫТЬ НАСТРОЙКИ GH' : 'ПОКАЗАТЬ НАСТРОЙКИ GH'}</span>
            </button>
            
            {showConnectionSettings && (
              <div className="flex flex-col gap-2 p-2 border border-white/5 bg-black/50 rounded-xs text-[8px] animate-fade-in">
                <div className="flex flex-col gap-1">
                  <span className="text-white/40 font-bold uppercase tracking-wider text-[7px]">Репозиторий GitHub</span>
                  <input 
                    type="text" 
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    placeholder="Andrey4OO/Arknights"
                    className="w-full bg-white/[0.02] border border-white/15 px-2 py-1 text-[8px] text-white rounded-xs outline-none focus:border-blue-500/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-white/40 font-bold uppercase tracking-wider text-[7px]">Ветка</span>
                    <input 
                      type="text" 
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/15 px-2 py-1 text-[8px] text-white rounded-xs outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-white/40 font-bold uppercase tracking-wider text-[7px]">Папка</span>
                    <input 
                      type="text" 
                      value={subfolder}
                      onChange={(e) => setSubfolder(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/15 px-2 py-1 text-[8px] text-white rounded-xs outline-none focus:border-blue-500/50"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col gap-1 pt-1 border-t border-white/5 mt-1">
                  <button 
                    onClick={() => {
                      localStorage.setItem('ak-gh-repo', repoName);
                      localStorage.setItem('ak-gh-branch', branch);
                      localStorage.setItem('ak-gh-folder', subfolder);
                      silentConnectGitHub(repoName, true);
                    }}
                    className="w-full py-1.5 bg-blue-500/20 hover:bg-blue-500/40 border border-blue-500/30 hover:border-blue-500/60 text-blue-400 font-bold text-[8px] uppercase rounded-xs transition-all cursor-pointer"
                  >
                    ПРИМЕНИТЬ И ОБНОВИТЬ
                  </button>
                  <button 
                    onClick={handleResetToWiki}
                    className="w-full py-1 border border-white/10 hover:bg-white/5 text-[7.5px] font-bold text-white/50 uppercase rounded-xs transition-all cursor-pointer"
                  >
                    СБРОС К ZOOT-WIKI
                  </button>
                  <button 
                    onClick={handleClearCache}
                    className="w-full py-1 border border-red-500/20 hover:bg-red-500/5 text-[7.5px] font-bold text-red-400/70 uppercase rounded-xs transition-all cursor-pointer"
                  >
                    ОЧИСТИТЬ КЭШ ФАЙЛОВ
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Main viewer zone */}
      <div className="flex-1 bg-[#101010] flex flex-col overflow-hidden relative h-[60%] md:h-full">
        {isSyncing && files.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-4" />
            <h3 className="text-sm font-black tracking-widest text-white uppercase mb-2">
              ПОДКЛЮЧЕНИЕ К БАЗЕ ДАННЫХ
            </h3>
            <p className="text-[10px] text-white/40 uppercase tracking-widest max-w-md leading-relaxed">
              Загрузка структуры и материалов из {repoName}...
            </p>
          </div>
        ) : selectedFile ? (
          <>
            {/* Header with metadata and buttons */}
            <div className="h-14 border-b border-white/10 px-4 md:px-6 shrink-0 flex items-center justify-between bg-black/40 z-20">
              <div className="flex items-center gap-3 overflow-hidden">
                <button
                  onClick={() => navigate('/')}
                  className="p-1 hover:bg-white/5 border border-white/10 rounded-xs transition-all flex items-center justify-center text-white/60 hover:text-white cursor-pointer shrink-0"
                  title="Вернуться на главную"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-black tracking-[0.22em] text-white uppercase select-none shrink-0">
                  АРХИВ / {selectedFile.type === 'canvas' ? 'КАРТА' : 'ДОКУМЕНТ'}
                </span>

                {/* Separate Quick-Switch buttons for each Database (Canvas file) in the header! */}
                <div className="hidden lg:flex items-center gap-2 border-l border-white/10 pl-4 ml-1">
                  <span className="text-[8px] font-black text-white/30 uppercase tracking-widest mr-1">БАЗЫ:</span>
                  {files.filter(f => f.type === 'canvas').map(canvasFile => {
                    const isActive = canvasFile.name === selectedFileName;
                    const displayName = canvasFile.name.replace(/\.canvas$/i, '').split('/').pop() || canvasFile.name;
                    return (
                      <button
                        key={canvasFile.name}
                        onClick={() => setSelectedFileName(canvasFile.name)}
                        className={`px-2.5 py-1.5 text-[8.5px] font-black tracking-widest uppercase border transition-all rounded-xs flex items-center gap-1.5 cursor-pointer ${
                          isActive
                            ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                            : 'border-white/10 bg-black/20 text-white/50 hover:text-white hover:border-white/30'
                        }`}
                        title={`Открыть интерактивную базу: ${displayName}`}
                      >
                        <Layers className="w-3 h-3" />
                        <span>{displayName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* View control actions */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 border transition-all text-[8.5px] font-black tracking-wider uppercase rounded-xs cursor-pointer ${
                    isSettingsOpen 
                      ? 'bg-blue-500/20 border-blue-500 text-blue-400' 
                      : 'border-white/10 hover:border-white/30 bg-black/40 text-white/60 hover:text-white'
                  }`}
                >
                  <Database className="w-3 h-3" />
                  <span>БАЗА ДАННЫХ</span>
                </button>

                {selectedFile.source === 'github' && (
                  <button 
                    onClick={async () => {
                      await silentConnectGitHub(repoName, true);
                      await handleSyncFile(selectedFile);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 border border-white/10 hover:border-white/30 bg-black/40 text-[8.5px] font-black tracking-wider uppercase rounded-xs transition-all cursor-pointer"
                    title="Принудительно обновить список файлов и текущий файл"
                  >
                    <RefreshCw className={`w-3 h-3 ${(selectedFile.syncStatus === 'syncing' || isSyncing) ? 'animate-spin' : ''}`} />
                    <span>ОБНОВИТЬ</span>
                  </button>
                )}

                {selectedFile.type === 'canvas' && (
                  <div className="flex items-center gap-1 bg-black/60 border border-white/10 p-1 rounded-xs">
                    <button 
                      onClick={handleZoomIn}
                      className="p-1 hover:bg-white/10 transition-colors text-white/60 hover:text-white rounded-xs cursor-pointer"
                      title="Приблизить"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={handleZoomOut}
                      className="p-1 hover:bg-white/10 transition-colors text-white/60 hover:text-white rounded-xs cursor-pointer"
                      title="Отдалить"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={handleResetView}
                      className="p-1 hover:bg-white/10 transition-colors text-white/60 hover:text-white rounded-xs cursor-pointer"
                      title="Центрировать карту"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[8px] font-black px-2 text-white/40 select-none uppercase tracking-widest hidden sm:inline-block">
                      {Math.round(zoom * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Main view container */}
            <div className="flex-1 overflow-hidden relative">
              {selectedFile.type === 'canvas' && canvasData ? (
                selectedCanvasNode ? (
                  /* STANDARD POLISHED CANVAS NODE READER (SEPARATE PAGE VIEW) */
                  <div className="w-full h-full overflow-y-auto p-4 md:p-10 custom-scrollbar bg-[#111112]">
                    <div className="max-w-3xl mx-auto flex flex-col gap-5">
                      <button
                        onClick={() => setSelectedCanvasNode(null)}
                        className="self-start flex items-center gap-2 px-3.5 py-2 border border-white/10 hover:border-white/30 hover:text-white bg-black/60 hover:bg-black/80 text-[9px] font-black tracking-widest text-blue-400 uppercase transition-all rounded-xs cursor-pointer shadow-lg mb-2"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Вернуться к карте</span>
                      </button>

                      {(() => {
                        const isImage = selectedCanvasNode.file && /\.(png|jpe?g|gif|svg|webp)$/i.test(selectedCanvasNode.file);
                        const fileKey = selectedCanvasNode.file?.toLowerCase() || '';
                        const matchingFile = filesMap[fileKey];
                        
                        let nodeTitle = 'ДОКУМЕНТ';
                        let nodeContent = '';
                        let isFileLoaded = true;

                        if (isImage) {
                          nodeTitle = selectedCanvasNode.file.split('/').pop() || 'ИЗОБРАЖЕНИЕ';
                        } else if (selectedCanvasNode.type === 'text') {
                          nodeTitle = 'ЗАМЕТКА';
                          nodeContent = selectedCanvasNode.text || '';
                        } else if (selectedCanvasNode.type === 'file') {
                          nodeTitle = selectedCanvasNode.file || 'ФАЙЛ';
                          if (matchingFile) {
                            if (matchingFile.syncStatus === 'remote' || matchingFile.syncStatus === 'syncing') {
                              isFileLoaded = false;
                              nodeContent = 'Загрузка содержимого...';
                              autoFetchMissingFile(selectedCanvasNode.file);
                            } else {
                              nodeContent = matchingFile.content;
                            }
                          } else {
                            isFileLoaded = false;
                            nodeContent = 'Загрузка содержимого...';
                            autoFetchMissingFile(selectedCanvasNode.file);
                          }
                        } else if (selectedCanvasNode.type === 'link') {
                          nodeTitle = 'ССЫЛКА';
                          nodeContent = `### 🔗 [${selectedCanvasNode.url}](${selectedCanvasNode.url})`;
                        }

                        const imageUrl = isImage 
                          ? `https://raw.githubusercontent.com/${repoName.trim()}/${branch.trim() || 'main'}/${selectedCanvasNode.file.replace(/^Arknights\//, '')}`
                          : '';

                        return (
                          <div className="border border-white/10 bg-black/40 p-6 md:p-10 rounded-xs shadow-xl relative min-h-[400px]">
                            <div className="absolute top-4 right-4">
                              {isImage ? (
                                <Eye className="w-12 h-12 text-white/5 opacity-40 animate-pulse" />
                              ) : (
                                <FileText className="w-12 h-12 text-white/5 opacity-40 animate-pulse" />
                              )}
                            </div>
                            <h1 className="text-xl md:text-2xl font-black border-b border-white/10 pb-4 mb-6 text-white tracking-widest uppercase">
                              {nodeTitle.replace(/\.md$/, '').replace(/_/g, ' ')}
                            </h1>

                            {isImage ? (
                              <div className="w-full flex flex-col items-center gap-4 bg-black/20 rounded border border-white/5 p-4">
                                <img 
                                  src={imageUrl} 
                                  alt={selectedCanvasNode.file}
                                  className="max-w-full max-h-[70vh] object-contain rounded-xs shadow-xl border border-white/10"
                                  referrerPolicy="no-referrer"
                                />
                                <a 
                                  href={imageUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-4 py-2 bg-white/[0.03] hover:bg-white/10 border border-white/10 text-[10px] font-black tracking-widest uppercase transition-all rounded-xs flex items-center gap-1.5"
                                >
                                  <Maximize2 className="w-4 h-4" />
                                  <span>ОТКРЫТЬ В ОРИГИНАЛЕ</span>
                                </a>
                              </div>
                            ) : !isFileLoaded ? (
                              <div className="flex flex-col items-center justify-center py-20 text-white/40 uppercase tracking-widest text-[10px] font-black gap-3">
                                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                <span>Загрузка материала...</span>
                              </div>
                            ) : (
                              <div className="max-w-3xl mx-auto text-white/80 select-text">
                                {renderSimpleMarkdown(nodeContent)}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  /* ZOOMABLE PANNING CANVAS ENGINE */
                  <div 
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={handleWheel}
                    className="w-full h-full relative select-none overflow-hidden bg-[#121214] cursor-grab active:cursor-grabbing"
                  >
                  {/* Grid overlay */}
                  <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
                    backgroundImage: `
                      radial-gradient(circle, #fff 1.5px, transparent 1.5px)
                    `,
                    backgroundSize: '24px 24px',
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: '0 0'
                  }} />

                  {/* Inner dynamic content wrapper */}
                  <div 
                    className="absolute inset-0 transform-gpu"
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                      transformOrigin: '0 0'
                    }}
                  >
                    {/* SVG Connections Edges Renderer */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10">
                      <defs>
                        <marker
                          id="arrowhead"
                          viewBox="0 0 10 10"
                          refX="6"
                          refY="5"
                          markerWidth="6"
                          markerHeight="6"
                          orient="auto-start-reverse"
                        >
                          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="rgba(255,255,255,0.4)" />
                        </marker>
                      </defs>
                      {canvasData.edges?.map((edge: any) => renderEdgeCurve(edge))}
                    </svg>

                    {/* Nodes Loop */}
                    {canvasData.nodes?.map((node: any) => {
                      const colorScheme = CANVAS_COLORS[node.color || 'default'] || CANVAS_COLORS.default;
                      
                      // Render different node types
                      if (node.type === 'group') {
                        return (
                          <div
                            key={node.id}
                            className={`absolute pointer-events-none border-2 border-dashed ${colorScheme.border} ${colorScheme.bg} transition-colors`}
                            style={{
                              left: node.x,
                              top: node.y,
                              width: node.width,
                              height: node.height,
                              zIndex: 1
                            }}
                          >
                            <div className="absolute -top-6 left-2 px-2 py-0.5 bg-black/80 border border-white/10 rounded-xs">
                              <span className="text-[7.5px] font-black tracking-widest text-white/60 uppercase">
                                {node.label || 'ГРУППА'}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      // Else it's a file, text or link card
                      let cardTitle = '';
                      let cardContentText = '';
                      let isFile = false;
                      let fileStatus: 'loading' | 'missing' | 'ready' = 'ready';
                      
                      const isImage = node.file && /\.(png|jpe?g|gif|svg|webp)$/i.test(node.file);
                      const isCanvas = node.file && /\.canvas$/i.test(node.file);
                      const fileKey = node.file?.toLowerCase() || '';
                      const matchingFile = filesMap[fileKey];

                      if (isImage) {
                        cardTitle = node.file.split('/').pop() || 'IMAGE';
                        isFile = true;
                        fileStatus = 'ready';
                      } else if (node.type === 'text') {
                        cardTitle = 'NOTE';
                        cardContentText = node.text || '';
                      } else if (node.type === 'file') {
                        cardTitle = node.file || 'FILE';
                        isFile = true;
                        
                        if (matchingFile) {
                          if (matchingFile.syncStatus === 'remote' || matchingFile.syncStatus === 'syncing') {
                            fileStatus = 'loading';
                            cardContentText = 'Загрузка тактических данных с GitHub...';
                          } else {
                            cardContentText = matchingFile.content;
                          }
                        } else if (loadingFilesMap[fileKey]) {
                          fileStatus = 'loading';
                          cardContentText = 'Автоматическая подгрузка материалов из репозитория...';
                        } else {
                          fileStatus = 'missing';
                          cardContentText = `*Файл "${node.file}" не найден в локальном кэше вашей базы.*\n\nМы пытаемся найти его в репозитории GitHub. Если файл не загрузился автоматически, проверьте его наличие в вашем репозитории.`;
                        }
                      } else if (node.type === 'link') {
                        cardTitle = 'EXTERNAL LINK';
                        cardContentText = `### 🔗 [${node.url}](${node.url})`;
                      }

                      return (
                        <div
                          key={node.id}
                          onClick={() => {
                            if (isCanvas) {
                              const targetFile = matchingFile || files.find(f => f.name.toLowerCase() === node.file.toLowerCase() || f.name.toLowerCase().endsWith(node.file.toLowerCase()));
                              if (targetFile) {
                                handleSelectFile(targetFile);
                              } else {
                                const cleanPath = node.file.replace(/^Arknights\//i, '');
                                setSelectedFileName(cleanPath);
                                autoFetchMissingFile(node.file);
                              }
                              setSelectedCanvasNode(null);
                            } else {
                              setSelectedCanvasNode(node);
                            }
                          }}
                          className={`absolute flex flex-col border rounded-xs shadow-[0_10px_25px_rgba(0,0,0,0.5)] overflow-hidden bg-black/95 no-drag z-20 hover:scale-[1.015] transition-all cursor-pointer border-white/10 hover:border-amber-400/60`}
                          style={{
                            left: node.x,
                            top: node.y,
                            width: node.width,
                            height: node.height,
                          }}
                        >
                          {/* Mini card header */}
                          <div className={`px-3 py-1.5 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/[0.02]`}>
                            <div className="flex items-center gap-1.5 overflow-hidden">
                              {isFile ? (
                                isCanvas ? (
                                  <Layers className="w-2.5 h-2.5 text-blue-400" />
                                ) : (
                                  <FileText className={`w-2.5 h-2.5 ${fileStatus === 'loading' ? 'text-blue-400 animate-spin' : 'text-amber-400'}`} />
                                )
                              ) : node.type === 'link' ? (
                                <LinkIcon className="w-2.5 h-2.5 text-blue-400" />
                              ) : (
                                <Eye className="w-2.5 h-2.5 text-white/50" />
                              )}
                              <span className="text-[7.5px] font-black uppercase tracking-widest text-white/40 truncate max-w-[170px]">
                                {cardTitle}
                              </span>
                            </div>
                            
                            {/* Actions or Color indicator */}
                            <div className="flex items-center gap-1.5">
                              {node.type === 'file' && matchingFile && !isImage && (
                                isCanvas ? (
                                  <span className="text-[7px] font-black text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded-xs tracking-widest hover:bg-blue-400 hover:text-black transition-all">
                                    ОТКРЫТЬ КАРТУ →
                                  </span>
                                ) : (
                                  <span className="text-[7px] font-black text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-xs tracking-widest hover:bg-amber-400 hover:text-black transition-all">
                                    ЧИТАТЬ →
                                  </span>
                                )
                              )}
                              {node.color && node.color !== 'default' && (
                                <div className={`w-1.5 h-1.5 rounded-full ${colorScheme.accent.replace('border-', 'bg-')}`} />
                              )}
                            </div>
                          </div>

                          {/* Card body content with markdown formatting or image */}
                          <div className={`flex-1 overflow-y-auto p-3.5 custom-scrollbar bg-[#161618] ${isImage ? 'flex items-center justify-center' : ''}`}>
                            {isImage ? (
                              <img 
                                src={`https://raw.githubusercontent.com/${repoName.trim()}/${branch.trim() || 'main'}/${node.file.replace(/^Arknights\//, '')}`}
                                alt={node.file}
                                className="max-w-full max-h-full object-contain pointer-events-none rounded-xs"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : fileStatus === 'loading' ? (
                              <div className="h-full flex flex-col items-center justify-center text-center p-2 text-white/30 text-[9px] uppercase tracking-widest font-black gap-2">
                                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                                {cardContentText}
                              </div>
                            ) : (
                              renderSimpleMarkdown(cardContentText)
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Infinite canvas instruction helper */}
                  <div className="absolute bottom-4 right-4 pointer-events-none bg-black/90 border border-white/10 px-4 py-3 text-[8.5px] font-bold uppercase tracking-widest text-white/60 flex flex-col gap-2 rounded-xs shadow-2xl max-w-sm">
                    <span className="flex items-center gap-2 text-white/80">🖱️ <strong>ЛКМ</strong> за пределами карточек — перемещение</span>
                    <span className="flex items-center gap-2 text-white/80">🎡 <strong>Колёсико мыши</strong> — масштабирование</span>
                    <span className="flex items-center gap-2 text-amber-400 border-t border-white/5 pt-1.5 mt-0.5">
                      📂 Чтобы посмотреть всю базу данных (полный список файлов), нажмите кнопку «БАЗА ДАННЫХ»
                    </span>
                  </div>
                </div>
                )
              ) : (
                /* STANDARD POLISHED MARKDOWN FILE READER */
                <div className="w-full h-full overflow-y-auto p-4 md:p-10 custom-scrollbar bg-[#111112]">
                  <div className="max-w-3xl mx-auto flex flex-col gap-5">
                    {files.find(f => f.type === 'canvas') && (
                      <button
                        onClick={() => {
                          const canvasFile = files.find(f => f.type === 'canvas');
                          if (canvasFile) {
                            setSelectedFileName(canvasFile.name);
                          }
                        }}
                        className="self-start flex items-center gap-2 px-3.5 py-2 border border-white/10 hover:border-white/30 hover:text-white bg-black/60 hover:bg-black/80 text-[9px] font-black tracking-widest text-blue-400 uppercase transition-all rounded-xs cursor-pointer shadow-lg mb-2"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Вернуться к карте</span>
                      </button>
                    )}
                    <div className="border border-white/10 bg-black/40 p-6 md:p-10 rounded-xs shadow-xl relative min-h-[400px]">
                      <div className="absolute top-4 right-4">
                        <FileText className="w-12 h-12 text-white/5 opacity-40 animate-pulse" />
                      </div>
                      <h1 className="text-xl md:text-2xl font-black border-b border-white/10 pb-4 mb-6 text-white tracking-widest uppercase">
                        {selectedFile.name.replace(/\.md$/, '').replace(/_/g, ' ')}
                      </h1>
                      {renderSimpleMarkdown(selectedFile.content)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* EMPTY STATE SCREEN */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 relative">
            <button
              onClick={() => navigate('/')}
              className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm transition-all text-[9px] font-black tracking-widest text-white/60 hover:text-white uppercase cursor-pointer z-50"
              title="Вернуться на главную"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{localStorage.getItem('ak-active-lang') === 'en_US' ? 'Home' : 'Главная'}</span>
            </button>
            <Layers className="w-16 h-16 text-white/10 mb-4 animate-pulse" />
            <h3 className="text-sm font-black tracking-widest text-white uppercase mb-2">
              ИНТЕРАКТИВНЫЙ ТАКТИЧЕСКИЙ АРХИВ
            </h3>
            <p className="text-[10px] text-white/40 uppercase tracking-widest max-w-md leading-relaxed mb-6">
              Загрузите файлы связей (.canvas) и архивные документы (.md) или подключите репозиторий GitHub для автоматической синхронизации!
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setSidebarTab('github');
                  setIsSettingsOpen(true);
                }}
                className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-xs font-black tracking-[0.2em] uppercase transition-all rounded-xs shadow-lg cursor-pointer"
              >
                ПОДКЛЮЧИТЬ GITHUB
              </button>
              <button
                onClick={handleResetToWiki}
                className="px-6 py-2.5 border border-white/20 hover:border-white hover:bg-white/5 text-xs font-black tracking-[0.2em] uppercase transition-all rounded-xs cursor-pointer flex items-center justify-center gap-2 text-blue-400 border-blue-500/20 hover:border-blue-500/50"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                СИНХРОНИЗИРОВАТЬ ZOOT-WIKI
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

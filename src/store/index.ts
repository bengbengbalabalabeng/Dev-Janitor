import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============ Types ============

export type Theme = 'light' | 'dark' | 'system';
export type NavView = 'tools' | 'packages' | 'cache' | 'ai_cleanup' | 'services' | 'config' | 'ai_cli' | 'settings';

export interface ToolInfo {
    id: string;
    name: string;
    versions: ToolVersion[];
    path: string;
    status: 'installed' | 'not_in_path' | 'multiple_versions';
}

export interface ToolVersion {
    version: string;
    path: string;
    isActive: boolean;
}

export interface PackageInfo {
    name: string;
    version: string;
    latest?: string;
    manager: string;
    isOutdated: boolean;
}

export interface CacheInfo {
    manager: string;
    path: string;
    size: number;
}

export interface JunkFile {
    path: string;
    name: string;
    size: number;
    reason: string;
}

export interface PortInfo {
    port: number;
    pid: number;
    process: string;
}

export interface AiCliTool {
    id: string;
    name: string;
    installed: boolean;
    version?: string;
}

// ============ App Store ============

export interface AiJunkFileStore {
    id: string;
    name: string;
    path: string;
    size: number;
    size_display: string;
    junk_type: string;
    reason: string;
}

interface AppState {
    // Navigation
    currentView: NavView;
    setCurrentView: (view: NavView) => void;

    // Theme
    theme: Theme;
    setTheme: (theme: Theme) => void;

    // Settings
    aiEndpoint: string;
    setAiEndpoint: (endpoint: string) => void;

    // Loading states
    isScanning: boolean;
    setIsScanning: (scanning: boolean) => void;

    // Tools data
    tools: ToolInfo[];
    setTools: (tools: ToolInfo[]) => void;

    // Packages data
    packages: PackageInfo[];
    setPackages: (packages: PackageInfo[]) => void;

    // Caches data
    caches: CacheInfo[];
    setCaches: (caches: CacheInfo[]) => void;

    // AI Junk files
    junkFiles: JunkFile[];
    setJunkFiles: (files: JunkFile[]) => void;

    // Services
    ports: PortInfo[];
    setPorts: (ports: PortInfo[]) => void;

    // AI CLI Tools
    aiCliTools: AiCliTool[];
    setAiCliTools: (tools: AiCliTool[]) => void;

    // AI Cleanup View State (persisted across page switches)
    aiCleanupJunkFiles: AiJunkFileStore[];
    setAiCleanupJunkFiles: (files: AiJunkFileStore[]) => void;
    aiCleanupSelectedFiles: string[];
    setAiCleanupSelectedFiles: (files: string[]) => void;
    aiCleanupScanPath: string;
    setAiCleanupScanPath: (path: string) => void;
    aiCleanupScanDepth: number;
    setAiCleanupScanDepth: (depth: number) => void;
    aiCleanupFilterType: string;
    setAiCleanupFilterType: (type: string) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            // Navigation
            currentView: 'tools',
            setCurrentView: (view) => set({ currentView: view }),

            // Theme
            theme: 'system',
            setTheme: (theme) => {
                set({ theme });
                applyTheme(theme);
            },

            // Settings
            aiEndpoint: '',
            setAiEndpoint: (endpoint) => set({ aiEndpoint: endpoint }),

            // Loading
            isScanning: false,
            setIsScanning: (scanning) => set({ isScanning: scanning }),

            // Data
            tools: [],
            setTools: (tools) => set({ tools }),
            packages: [],
            setPackages: (packages) => set({ packages }),
            caches: [],
            setCaches: (caches) => set({ caches }),
            junkFiles: [],
            setJunkFiles: (files) => set({ junkFiles: files }),
            ports: [],
            setPorts: (ports) => set({ ports }),
            aiCliTools: [],
            setAiCliTools: (tools) => set({ aiCliTools: tools }),

            // AI Cleanup View State
            aiCleanupJunkFiles: [],
            setAiCleanupJunkFiles: (files) => set({ aiCleanupJunkFiles: files }),
            aiCleanupSelectedFiles: [],
            setAiCleanupSelectedFiles: (files) => set({ aiCleanupSelectedFiles: files }),
            aiCleanupScanPath: '',
            setAiCleanupScanPath: (path) => set({ aiCleanupScanPath: path }),
            aiCleanupScanDepth: 5,
            setAiCleanupScanDepth: (depth) => set({ aiCleanupScanDepth: depth }),
            aiCleanupFilterType: 'all',
            setAiCleanupFilterType: (type) => set({ aiCleanupFilterType: type }),
        }),
        {
            name: 'dev-janitor-storage',
            partialize: (state) => ({
                theme: state.theme,
                aiEndpoint: state.aiEndpoint,
            }),
        }
    )
);

// ============ Theme Helper ============

export const applyTheme = (theme: Theme) => {
    const root = document.documentElement;

    if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
        root.setAttribute('data-theme', theme);
    }
};

// Initialize theme on load
const savedTheme = localStorage.getItem('dev-janitor-storage');
if (savedTheme) {
    try {
        const parsed = JSON.parse(savedTheme);
        if (parsed.state?.theme) {
            applyTheme(parsed.state.theme);
        }
    } catch {
        applyTheme('system');
    }
} else {
    applyTheme('system');
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const state = useAppStore.getState();
    if (state.theme === 'system') {
        applyTheme('system');
    }
});

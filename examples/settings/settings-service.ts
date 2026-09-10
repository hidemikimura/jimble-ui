/*
 * 設定の読み込み・保存・初期化。
 * デモ実装のためサーバは無く、モジュール内のメモリだけで完結する（非同期 API として提供する）。
 */

export interface NotifyTypes {
	error: boolean;
	warning: boolean;
	daily: boolean;
}

export interface Settings {
	siteName: string;
	adminEmail: string;
	pageSize: string;
	notifyEnabled: boolean;
	notifyEmail: string;
	notifyTypes: NotifyTypes;
}

export interface HistoryEntry {
	savedAt: string;
	changedBy: string;
}

function defaultSettings (): Settings {
	return {
		siteName: 'サンプルサイト',
		adminEmail: 'admin@example.com',
		pageSize: '20',
		notifyEnabled: false,
		notifyEmail: '',
		notifyTypes: { error: true, warning: true, daily: false }
	};
}

let currentSettings: Settings = defaultSettings();
let history: HistoryEntry[] = [];

function clone<T> (value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

function delay (ms = 150): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function loadSettings (): Promise<Settings> {
	await delay();
	return clone(currentSettings);
}

export async function saveSettings (settings: Settings, changedBy: string): Promise<void> {
	await delay();
	currentSettings = clone(settings);
	history = [{ savedAt: new Date().toISOString(), changedBy }, ...history];
}

export async function resetSettings (changedBy: string): Promise<Settings> {
	await delay();
	currentSettings = defaultSettings();
	history = [{ savedAt: new Date().toISOString(), changedBy }, ...history];
	return clone(currentSettings);
}

export async function fetchHistory (): Promise<HistoryEntry[]> {
	await delay();
	return history.map((entry) => ({ ...entry }));
}

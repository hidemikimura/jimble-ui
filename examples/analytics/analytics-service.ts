/*
 * デモ用のデータ提供モジュール。
 * 実際の API の代わりに、メモリ上で疑似データを非同期に生成する。
 */

export interface AnalyticsSummary {
	pv: number;
	pvDelta: number;
	sessions: number;
	sessionsDelta: number;
	bounceRate: number;
	bounceRateDelta: number;
	avgDuration: number;
	avgDurationDelta: number;
}

export interface ChartPoint {
	label: string;
	value: number;
}

export interface AnalyticsReport {
	summary: AnalyticsSummary;
	dailyPv: ChartPoint[];
	bySource: ChartPoint[];
}

export interface ParsedCsv {
	name: string;
	size: number;
	rows: number;
}

const SOURCES = ['検索', 'SNS', '広告', 'リンク', '直接'];

/** 指定した期間の解析データを取得する（デモではメモリ上で生成する）。 */
export async function fetchAnalytics (from: string, to: string): Promise<AnalyticsReport> {
	await wait(250);

	const days = daysBetween(from, to);
	const seed = hashText(from) + hashText(to);
	const random = seededRandom(seed);

	const dailyPv: ChartPoint[] = [];
	let pvTotal = 0;
	const start = new Date(from + 'T00:00:00');
	for (let i = 0; i < days; i++) {
		const date = new Date(start);
		date.setDate(date.getDate() + i);
		const value = Math.round(800 + random() * 600);
		pvTotal += value;
		dailyPv.push({ label: formatShortDate(date), value });
	}

	const sessions = Math.round(pvTotal * (0.5 + random() * 0.15));
	const bounceRate = 28 + random() * 30;
	const avgDuration = 80 + random() * 160;

	const bySource: ChartPoint[] = SOURCES.map((label) => ({
		label,
		value: Math.round(sessions * (0.08 + random() * 0.3))
	}));

	const previous = seededRandom(seed + 97);
	const pvDelta = (previous() - 0.45) * 30;
	const sessionsDelta = (previous() - 0.45) * 30;
	const bounceRateDelta = (previous() - 0.5) * 20;
	const avgDurationDelta = (previous() - 0.45) * 25;

	return {
		summary: {
			pv: pvTotal,
			pvDelta,
			sessions,
			sessionsDelta,
			bounceRate,
			bounceRateDelta,
			avgDuration,
			avgDurationDelta
		},
		dailyPv,
		bySource
	};
}

/** 添付された CSV ファイルを読み、名前・サイズ・行数を取り出す。 */
export async function parseCsvFile (file: File): Promise<ParsedCsv> {
	const text = await file.text();
	const lines = text.split(/\r\n|\n|\r/).filter((line) => line.trim().length > 0);
	return {
		name: file.name,
		size: file.size,
		rows: Math.max(0, lines.length - 1)
	};
}

function wait (ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function daysBetween (from: string, to: string): number {
	const start = new Date(from + 'T00:00:00').getTime();
	const end = new Date(to + 'T00:00:00').getTime();
	return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
}

function seededRandom (seed: number): () => number {
	let value = (seed % 2147483647 + 2147483647) % 2147483647 || 1;
	return () => {
		value = (value * 48271) % 2147483647;
		return value / 2147483647;
	};
}

function hashText (value: string): number {
	let hash = 0;
	for (let i = 0; i < value.length; i++) {
		hash = (hash * 31 + value.charCodeAt(i)) % 1000000;
	}
	return hash;
}

function formatShortDate (date: Date): string {
	return String(date.getMonth() + 1) + '/' + String(date.getDate());
}

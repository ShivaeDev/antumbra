import type { FeatureShape } from "@antumbra/platform-feature/feature.ts";

export interface Entry {
	readonly seq: number;
	readonly at: number;
	readonly name: string;
	readonly requestId: string;
}

export interface Reading {
	readonly tallies: ReadonlyMap<string, number>;
	readonly total: number;
	readonly highest: number;
	readonly recent: readonly Entry[];
}

interface Tally {
	readonly name: string;
	readonly count: number;
}

interface Group {
	readonly feature: string;
	readonly facts: readonly Tally[];
}

const grouped = (features: readonly FeatureShape[], tallies: ReadonlyMap<string, number>): readonly Group[] => {
	const groups: Group[] = [];
	for (const feature of features) {
		const facts: Tally[] = [];
		for (const declared of feature.facts) {
			const count = tallies.get(declared.name);
			if (count !== undefined) facts.push({ count, name: declared.name });
		}
		if (facts.length > 0) groups.push({ facts, feature: feature.name });
	}
	return groups;
};

const groupLines = (groups: readonly Group[]): readonly string[] => {
	let names = 0;
	let counts = 0;
	for (const group of groups) {
		for (const fact of group.facts) {
			names = Math.max(names, fact.name.length);
			counts = Math.max(counts, String(fact.count).length);
		}
	}
	const lines: string[] = [];
	for (const group of groups) {
		lines.push(group.feature);
		for (const fact of group.facts) lines.push(`  ${fact.name.padEnd(names)}  ${String(fact.count).padStart(counts)}`);
	}
	return lines;
};

const tailLines = (entries: readonly Entry[]): readonly string[] => {
	let seqs = 0;
	let names = 0;
	for (const entry of entries) {
		seqs = Math.max(seqs, String(entry.seq).length);
		names = Math.max(names, entry.name.length);
	}
	const lines: string[] = [];
	for (const entry of entries) {
		const at = new Date(entry.at).toISOString();
		lines.push(`${String(entry.seq).padStart(seqs)}  ${at}  ${entry.name.padEnd(names)}  ${entry.requestId}`);
	}
	return lines;
};

const spaced = (sections: readonly (readonly string[])[]): readonly string[] => {
	const lines: string[] = [];
	for (const section of sections) {
		if (section.length === 0) continue;
		if (lines.length > 0) lines.push("");
		lines.push(...section);
	}
	return lines;
};

export const reportLines = (features: readonly FeatureShape[], reading: Reading, tail: boolean): readonly string[] =>
	spaced([
		groupLines(grouped(features, reading.tallies)),
		[`${reading.total} facts, highest seq ${reading.highest}`],
		tail ? tailLines(reading.recent) : [],
	]);

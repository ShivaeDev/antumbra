import { keyOf, sourceFrom, type Target, type Until } from "#pr/command.ts";
import type { Failing } from "#pr/failing.ts";
import { type Memory, recall, remember } from "#pr/memory.ts";
import type { Page } from "#pr/pages.ts";
import { initial, type Watch } from "#pr/program.ts";

export type Watched = { readonly exit: number | undefined; readonly explicit: boolean; readonly target: Target; readonly watch: Watch };

export type Fleet = {
	readonly etags: ReadonlyMap<string, readonly Page[]>;
	readonly pulls: ReadonlyMap<string, Watched>;
	readonly repos: ReadonlyMap<string, Failing | undefined>;
	readonly rounds: number;
	readonly until: Until;
};

const restored = (key: string): Target | undefined => {
	const source = sourceFrom(key);
	return source?.kind === "pull" && source.repo !== undefined ? { number: source.number, repo: source.repo } : undefined;
};

export const fleetFrom = (targets: readonly Target[], repos: readonly string[], until: Until, memory: Memory): Fleet => {
	const explicit = new Set(targets.map(keyOf));
	const pulls = new Map<string, Watched>();
	for (const [key, remembered] of Object.entries(memory.pulls)) {
		const target = restored(key);
		if (target === undefined || !(explicit.has(key) || repos.includes(target.repo))) continue;
		pulls.set(key, { exit: undefined, explicit: explicit.has(key), target, watch: recall(remembered) });
	}
	for (const target of targets) {
		if (!pulls.has(keyOf(target))) pulls.set(keyOf(target), { exit: undefined, explicit: true, target, watch: initial });
	}
	return { etags: new Map(Object.entries(memory.etags)), pulls, repos: new Map(repos.map((repo) => [repo, undefined])), rounds: 0, until };
};

export const memoryOf = (fleet: Fleet): Memory => ({
	etags: Object.fromEntries(fleet.etags),
	pulls: Object.fromEntries(
		[...fleet.pulls].filter(([, watched]) => watched.explicit || watched.exit === undefined).map(([key, watched]) => [key, remember(watched.watch)]),
	),
});

export const admit = (fleet: Fleet, repo: string, numbers: readonly number[]): ReadonlyMap<string, Watched> => {
	const pulls = new Map(fleet.pulls);
	for (const number of numbers) {
		const target = { number, repo };
		const known = pulls.get(keyOf(target));
		if (known !== undefined && known.exit === undefined) continue;
		const watch = known?.watch ?? { ...initial, backlog: fleet.rounds === 0 };
		pulls.set(keyOf(target), { exit: undefined, explicit: known?.explicit ?? false, target, watch });
	}
	return pulls;
};

import type { archivable } from "@antumbra/domain-changes/queries/archivable.ts";
export const ARCHIVE_AFTER_MILLIS = 7 * 24 * 60 * 60 * 1000;
export const nextArchive = (settled: typeof archivable.output.Type, now: number): number | undefined => {
	let next: number | undefined;
	for (const held of settled) {
		const at = Date.parse(held.landedAt) + ARCHIVE_AFTER_MILLIS;
		if (at <= now) continue;
		if (next === undefined || at < next) next = at;
	}
	return next;
};

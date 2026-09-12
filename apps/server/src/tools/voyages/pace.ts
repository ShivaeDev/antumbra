import { frontier } from "@antumbra/domain-rulings/queries/frontier.ts";
import { COUNTS } from "@antumbra/domain-settings/ids.ts";
import { counts } from "@antumbra/domain-settings/queries/counts.ts";
import type { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { progress } from "@antumbra/domain-voyages/queries/progress.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect } from "effect";

export const plural = (count: number): string => (count === 1 ? "" : "s");

export const pace = Effect.fn("VoyageTools.pace")(function* (id: VoyageId) {
	const live = yield* Live;
	const current = yield* live.read(progress, { id });
	const settings = yield* live.read(counts, {});
	return {
		limit: settings.find((setting) => setting.key === "maxParallelSessions")?.count ?? COUNTS.maxParallelSessions.fallback,
		running: current?.counts.active ?? 0,
		waiting: current?.counts.ready ?? 0,
		unlaunched: current?.counts.held ?? 0,
	};
});

type Pace = Effect.Success<ReturnType<typeof pace>>;

export const paceWords = (pace: Pace): string =>
	`this voyage has ${pace.running} piece${plural(pace.running)} running and ${pace.waiting} waiting for capacity; the fleet runs at most ${pace.limit} agent${plural(pace.limit)} at once`;

export const notice = Effect.fn("VoyageTools.notice")(function* (voyageId: VoyageId) {
	const live = yield* Live;
	const blocking = (yield* live.read(frontier, { voyageId })).filter((ruling) => ruling.urgency === "blocking").map((ruling) => ruling.id);
	const current = yield* pace(voyageId);
	return [
		...(blocking.length === 0
			? []
			: [`this voyage has ${blocking.length} open blocking question${plural(blocking.length)}: ruling ${blocking.join(", ruling ")}`]),
		...(current.unlaunched === 0
			? []
			: [`this voyage has ${current.unlaunched} other chartered piece${plural(current.unlaunched)} not yet launched`]),
		...(current.running + current.waiting === 0 ? [] : [paceWords(current)]),
	];
});

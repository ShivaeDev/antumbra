import { COUNTS } from "@antumbra/domain-settings/queries/counts.ts";
import type { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Rulings } from "@antumbra/server-rulings/service.ts";
import { Settings } from "@antumbra/server-settings/service.ts";
import { Voyages } from "@antumbra/server-voyages/service.ts";
import { Effect } from "effect";

export const plural = (count: number): string => (count === 1 ? "" : "s");

export const pace = Effect.fn("VoyageTools.pace")(function* (id: VoyageId) {
	const voyagesService = yield* Voyages;
	const settingsService = yield* Settings;

	const current = yield* voyagesService.progress({ id }).pipe(Effect.orDie);
	const settings = yield* settingsService.counts({}).pipe(Effect.orDie);
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
	const rulingsService = yield* Rulings;

	const blocking = (yield* rulingsService.frontier({ voyageId }).pipe(Effect.orDie))
		.filter((ruling) => ruling.urgency === "blocking")
		.map((ruling) => ruling.id);
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

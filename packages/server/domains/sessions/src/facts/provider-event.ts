import { fact } from "@antumbra/platform-feature/fact.ts";
import { migration } from "@antumbra/platform-feature/migration.ts";
import { Origin } from "@antumbra/platform-vocabulary/session-events/origin.ts";
import { listPrice } from "@antumbra/platform-vocabulary/session-events/prices.ts";
import { Effect, Option, Schema } from "effect";
import { sessionEvent } from "#rows/session-event.ts";
import { UsageEvidence } from "#rows/usage-evidence.ts";

export const providerEvent = fact("SessionProviderEvent", {
	sessionId: sessionEvent.fields.rootSessionId,
	logId: sessionEvent.fields.logId,
	cursor: sessionEvent.fields.cursor,
	observedAt: sessionEvent.fields.observedAt,
	origin: Schema.NullOr(Origin),
	usage: Schema.NullOr(UsageEvidence),
});

const decodeUsage = Schema.decodeUnknownOption(UsageEvidence);

type ModelSpent = UsageEvidence["byModel"][number];

const listPriced = (usage: UsageEvidence): UsageEvidence | undefined => {
	if (usage.costUsd !== undefined) {
		return undefined;
	}
	const byModel: ModelSpent[] = [];
	let total = 0;
	let priced = false;
	let whole = true;
	for (const spent of usage.byModel) {
		if (spent.costUsd !== undefined) {
			byModel.push(spent);
			total += spent.costUsd;
			continue;
		}
		const listed = listPrice(spent.model, spent);
		if (listed === undefined) {
			byModel.push(spent);
			whole = false;
			continue;
		}
		byModel.push({ ...spent, costUsd: listed });
		total += listed;
		priced = true;
	}
	if (!priced) {
		return undefined;
	}
	return { ...usage, byModel, ...(whole ? { costUsd: total } : {}) };
};

export const pricedTurns = migration(1, {
	fact: providerEvent.name,
	rewrite: (stored) =>
		Effect.succeed(
			Option.match(decodeUsage(stored.payload.usage), {
				onNone: () => stored,
				onSome: (usage) => {
					const priced = listPriced(usage);
					return priced === undefined ? stored : { ...stored, payload: { ...stored.payload, usage: priced } };
				},
			}),
		),
});

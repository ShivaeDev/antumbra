import type { RawPayload } from "@antumbra/vocabulary/session-events";
import {
	Clock,
	Effect,
	MutableRef,
	Option,
	PubSub,
	Schema,
	type Scope,
	Stream,
} from "effect";

export const BackendCapacityReason = Schema.Literal("usage-limit");
export type BackendCapacityReason = typeof BackendCapacityReason.Type;

const AvailableCapacity = Schema.Struct({
	observedAt: Schema.Number,
	status: Schema.Literal("available"),
});

const LimitedCapacity = Schema.Struct({
	detail: Schema.String,
	observedAt: Schema.Number,
	reason: BackendCapacityReason,
	resetsAt: Schema.optional(Schema.Number),
	status: Schema.Literals(["blocked", "warning"]),
	utilization: Schema.optional(Schema.Number),
});

// why: backend capacity is simultaneously true with Session activity. A live
// Session can be idle while its provider account is exhausted, so this is a
// backend-level observation rather than another Session state or lifecycle.
export const BackendCapacityObservation = Schema.Union([
	AvailableCapacity,
	LimitedCapacity,
]);
export type BackendCapacityObservation = typeof BackendCapacityObservation.Type;

type WithoutEvidence<Reading> = Reading extends BackendCapacityObservation
	? Omit<Reading, "observedAt">
	: never;

export type BackendCapacityClassification =
	WithoutEvidence<BackendCapacityObservation>;

export interface BackendCapacitySource {
	// why: a deliberate retry is the only release for a hard provider refusal.
	// Its timestamp orders the clear after frames the provider callback already
	// observed, even if a durable subscriber has not handled them yet.
	readonly clear: Effect.Effect<number>;
	readonly changes: Stream.Stream<BackendCapacityObservation>;
	readonly classify: (
		raw: RawPayload,
	) => Option.Option<BackendCapacityClassification>;
	readonly current: Effect.Effect<Option.Option<BackendCapacityObservation>>;
}

export interface BackendCapacityController {
	readonly observe: (raw: RawPayload, observedAt?: number) => void;
	readonly source: BackendCapacitySource;
}

// why: native callbacks are synchronous. The current reading therefore lives
// in a synchronous ref and publication uses the PubSub's synchronous offer;
// consumers still read and subscribe through Effect values owned by the
// plugin scope. A late consumer can recover the latest reading from `current`
// even though the change ring deliberately carries no history.
export const makeBackendCapacityController = (
	classify: BackendCapacitySource["classify"],
): Effect.Effect<BackendCapacityController, never, Scope.Scope> =>
	Effect.gen(function* () {
		const clock = yield* Clock.Clock;
		const changes = yield* PubSub.unbounded<BackendCapacityObservation>();
		const current = MutableRef.make<Option.Option<BackendCapacityObservation>>(
			Option.none(),
		);
		let lastObservedAt = 0;
		const observe = (
			raw: RawPayload,
			observedAt = clock.currentTimeMillisUnsafe(),
		): void => {
			const classified = classify(raw);
			if (Option.isNone(classified)) {
				return;
			}
			lastObservedAt = Math.max(observedAt, lastObservedAt + 1);
			const candidate = {
				...classified.value,
				observedAt: lastObservedAt,
			} satisfies BackendCapacityObservation;
			const prior = MutableRef.get(current);
			if (
				Option.isSome(prior) &&
				prior.value.status === "blocked" &&
				candidate.status !== "blocked"
			) {
				return;
			}
			MutableRef.set(current, Option.some(candidate));
			PubSub.publishUnsafe(changes, candidate);
		};
		return {
			observe,
			source: {
				clear: Effect.sync(() => {
					lastObservedAt = Math.max(
						clock.currentTimeMillisUnsafe(),
						lastObservedAt + 1,
					);
					MutableRef.set(current, Option.none());
					return lastObservedAt;
				}),
				changes: Stream.fromPubSub(changes),
				classify,
				current: Effect.sync(() => MutableRef.get(current)),
			},
		};
	});

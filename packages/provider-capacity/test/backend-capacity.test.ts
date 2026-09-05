import { type AgentBackend, makeBackendCapacityController } from "@antumbra/plugin-api";
import { makeScriptedBackend } from "@antumbra/testing-runtime";
import { it } from "@antumbra/testing-runtime/domain";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { expect } from "@effect/vitest";
import { Clock, Context, Effect, Layer, Option } from "effect";
import { BackendCapacities, BackendCapacitiesLive } from "#index.ts";

const quotaRaw = {
	kind: "quota/rejected",
	payload: JSON.stringify({ status: "rejected" }),
	source: "scripted",
} as const;

const quotaEvent: AgentEvent = { raw: quotaRaw, type: "raw" };

it.effectApp("recovers a provider-wide hold from durable session evidence", function* ({ db }) {
	yield* Effect.scoped(
		Effect.gen(function* () {
			const scripted = yield* makeScriptedBackend;
			const capacity = yield* makeBackendCapacityController((raw) => {
				switch (raw.kind) {
					case "quota/allowed":
						return Option.some({ status: "available" as const });
					case "quota/warning":
						return Option.some({
							detail: "scripted quota nearly exhausted",
							reason: "usage-limit" as const,
							status: "warning" as const,
						});
					case "quota/rejected":
						return Option.some({
							detail: "scripted quota exhausted",
							reason: "usage-limit" as const,
							status: "blocked" as const,
						});
					default:
						return Option.none();
				}
			});
			const backend: AgentBackend = {
				...scripted.backend,
				capacity: capacity.source,
			};
			yield* db.AgentSession.create({
				agentId: "agent-1",
				backend: "scripted",
				charterDeliveredAt: null,
				completeness: "recording",
				cwd: "/tmp/scripted",
				executionStatus: "idle",
				id: "session-1",
				kind: null,
				label: null,
				nativeRef: "native-1",
				outcome: null,
				parentSessionId: null,
				rootSessionId: "session-1",
				status: "open",
			});
			yield* db.AgentSession.create({
				agentId: "agent-2",
				backend: "scripted",
				charterDeliveredAt: null,
				completeness: "recording",
				cwd: "/tmp/scripted-2",
				executionStatus: "idle",
				id: "session-2",
				kind: null,
				label: null,
				nativeRef: "native-2",
				outcome: null,
				parentSessionId: null,
				rootSessionId: "session-2",
				status: "open",
			});
			yield* db.SessionEvent.create({
				at: new Date(42),
				kind: quotaEvent.type,
				payload: JSON.stringify(quotaEvent),
				seq: 0,
				sessionId: "session-1",
			});
			yield* db.SessionEvent.create({
				at: new Date(42),
				kind: "raw",
				payload: JSON.stringify({
					raw: {
						kind: "quota/warning",
						payload: "{}",
						source: "scripted",
					},
					type: "raw",
				} satisfies AgentEvent),
				seq: 0,
				sessionId: "session-2",
			});

			const capacities = Context.get(yield* Layer.build(BackendCapacitiesLive(new Map([[backend.tag, backend]]))), BackendCapacities);
			expect(yield* capacities.current("scripted")).toMatchObject({
				observedAt: new Date(42),
				reason: "usage-limit",
				status: "blocked",
			});
			capacity.observe(
				{
					kind: "quota/allowed",
					payload: "{}",
					source: "scripted",
				},
				43,
			);
			yield* Effect.yieldNow;
			expect(yield* capacities.current("scripted")).toMatchObject({
				status: "blocked",
			});

			yield* capacities.clear("scripted");
			expect(yield* capacities.current("scripted")).toMatchObject({
				status: "available",
			});
			capacity.observe(quotaRaw, 43);
			yield* capacities.clear("scripted");
			yield* Effect.yieldNow;
			expect(Option.getOrThrow(yield* db.BackendCapacity.where({ backend: "scripted" }).first()).status).toBe("available");
			const afterClear = (yield* Clock.currentTimeMillis) + 1;
			yield* db.SessionEvent.create({
				at: new Date(afterClear),
				kind: quotaEvent.type,
				payload: JSON.stringify(quotaEvent),
				seq: 1,
				sessionId: "session-1",
			});
			const recoveredAgain = Context.get(yield* Layer.build(BackendCapacitiesLive(new Map([[backend.tag, backend]]))), BackendCapacities);
			expect(yield* recoveredAgain.current("scripted")).toMatchObject({
				status: "available",
			});
		}),
	);
});

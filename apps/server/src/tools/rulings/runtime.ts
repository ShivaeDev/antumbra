import type { RulingId } from "@antumbra/domain-rulings/ids.ts";
import { authority } from "@antumbra/domain-rulings/queries/authority.ts";
import { byId } from "@antumbra/domain-rulings/queries/by-id.ts";
import type { Ruling } from "@antumbra/domain-rulings/rows/ruling.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import type { ToolContext } from "@antumbra/platform-tool-schemas/context.ts";
import { AgentId } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Rulings } from "@antumbra/server-rulings/service.ts";
import { Effect, Option, Stream } from "effect";
import { stream } from "effect/reactivity/Reactivity";
import { keysOf } from "#keys.ts";

export const subjectFor = (context: ToolContext, tags: readonly string[] = []): Ruling["subjects"] => [
	{ kind: "agent", id: context.agentId },
	...(context.pieceId === undefined ? [] : [{ kind: "piece" as const, id: context.pieceId }]),
	...(context.voyageId === undefined ? [] : [{ kind: "voyage" as const, id: context.voyageId }]),
	...tags.map((tag) => ({ kind: "tag" as const, tag })),
];
export const readRuling = Effect.fn("rulings.readRuling")(function* (id: RulingId) {
	const rulingsService = yield* Rulings;

	const found = Option.flatten(
		yield* Stream.runHead(stream(keysOf(byId.reads, byId.scope?.({ id })))(rulingsService.byId({ id }).pipe(Effect.orDie))),
	);
	if (Option.isNone(found)) return yield* Effect.fail({ _tag: "Unknown", rulingId: id });
	return found.value;
});
export const authorityFor = Effect.fn("rulings.authorityFor")(function* (context: ToolContext) {
	const rulingsService = yield* Rulings;

	return Option.getOrThrow(
		yield* Stream.runHead(
			stream(
				keysOf(
					authority.reads,
					authority.scope?.({
						agentId: AgentId.make(context.agentId),
						voyageId: context.voyageId === undefined ? null : VoyageId.make(context.voyageId),
						pieceId: context.pieceId ?? null,
					}),
				),
			)(
				rulingsService
					.authority({
						agentId: AgentId.make(context.agentId),
						voyageId: context.voyageId === undefined ? null : VoyageId.make(context.voyageId),
						pieceId: context.pieceId ?? null,
					})
					.pipe(Effect.orDie),
			),
		),
	);
});
export const replayed = <A, E, R>(act: Effect.Effect<A, E, R>) =>
	act.pipe(
		Effect.catchIf(
			(error): error is E & { _tag: "AlreadyDone" } => typeof error === "object" && error !== null && "_tag" in error && error._tag === "AlreadyDone",
			() => Effect.void,
		),
	);

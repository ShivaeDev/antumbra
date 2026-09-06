import { bind, readVoyageSpec } from "@antumbra/agent-tools";
import { Effect, Option } from "effect";
import { VoyageNotFound } from "#errors.ts";
import { ExecutionSource } from "#execution/service.ts";
import { answered, onVoyage } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";
import { VoyageDetails } from "#voyage/detail/service.ts";
import { readVoyageView } from "#voyage-read.ts";
import { renderVoyage } from "#voyage-render.ts";

export const compileVoyageReadingTools = Effect.fn("AgentToolCompiler.compileVoyageReadingTools")(function* (identity: SessionIdentity) {
	const details = yield* VoyageDetails;
	const execution = yield* ExecutionSource;
	const seen = Effect.fnUntraced(function* (voyageId: string) {
		const view = yield* readVoyageView(voyageId).pipe(
			Effect.flatMap(
				Option.match({
					onNone: () => new VoyageNotFound({ voyageId }),
					onSome: Effect.succeed,
				}),
			),
			Effect.provideService(VoyageDetails, details),
		);
		return { pace: yield* execution.voyagePace(voyageId), view };
	});
	const read = (identity: SessionIdentity, voyageId: string) =>
		answered(identity, readVoyageSpec.name, seen(voyageId), ({ pace, view }) => renderVoyage(view, pace));
	return [
		bind(readVoyageSpec, (input) =>
			input.voyageId === undefined ? onVoyage(identity, (voyageId) => read(identity, voyageId)) : read(identity, input.voyageId),
		),
	];
});

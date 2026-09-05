import { bind, readVoyageSpec } from "@antumbra/agent-tools";
import type { DirectTool } from "@antumbra/plugin-api";
import { Effect, Option } from "effect";
import { VoyageNotFound } from "#errors.ts";
import { answered, onVoyage } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";
import { VoyageDetails } from "#voyage/detail/service.ts";
import { readVoyageView } from "#voyage-read.ts";
import { renderVoyage } from "#voyage-render.ts";

export const makeVoyageReadingToolCompiler = Effect.fnUntraced(function* () {
	const details = yield* VoyageDetails;
	const read = (identity: SessionIdentity, voyageId: string) =>
		answered(
			identity,
			readVoyageSpec.name,
			readVoyageView(voyageId).pipe(
				Effect.flatMap(
					Option.match({
						onNone: () => new VoyageNotFound({ voyageId }),
						onSome: Effect.succeed,
					}),
				),
				Effect.provideService(VoyageDetails, details),
			),
			renderVoyage,
		);
	return (identity: SessionIdentity): ReadonlyArray<DirectTool> => [
		bind(readVoyageSpec, (input) =>
			input.voyageId === undefined ? onVoyage(identity, (voyageId) => read(identity, voyageId)) : read(identity, input.voyageId),
		),
	];
})();

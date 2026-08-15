import { bind, charterPieceSpec, readVoyageSpec } from "@antumbra/agent-tools";
import type { DirectTool } from "@antumbra/plugin-api";
import { Effect, Option } from "effect";
import { boardTools } from "#board-tools.ts";
import { onOwnDeps } from "#captain-membership.ts";
import { pieceVerbTools } from "#captain-pieces.ts";
import type { AgentDeps } from "#deps.ts";
import { VoyageNotFound } from "#errors.ts";
import { charterPiece } from "#pieces.ts";
import { standDownTool } from "#stand-down.ts";
import { answered, onVoyage } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";
import { readVoyageView } from "#voyage-read.ts";
import { renderVoyage } from "#voyage-render.ts";

const voyageOrGone = (deps: AgentDeps, voyageId: string) =>
	readVoyageView(deps, voyageId).pipe(
		Effect.flatMap((view) =>
			Option.match(view, {
				onNone: () => new VoyageNotFound({ voyageId }),
				onSome: (found) => Effect.succeed(found),
			}),
		),
	);

// why: the captain's set is its authority — it charters and positions work and
// reads where the voyage stands, but it lands no outcomes: workers report,
// captains charter, and the rule is the set rather than a request to behave.
export const captainTools = (
	deps: AgentDeps,
	identity: SessionIdentity,
): ReadonlyArray<DirectTool> => [
	bind(charterPieceSpec, (input) =>
		onOwnDeps(deps, identity, input.dependsOn, (voyageId) =>
			answered(
				identity,
				charterPieceSpec.name,
				charterPiece(deps, {
					charter: input.charter,
					dependsOn: input.dependsOn,
					expectation: input.expectation,
					role: input.role,
					title: input.title,
					voyageId,
				}),
				(piece) => `chartered ${piece.id}`,
			),
		),
	),
	...pieceVerbTools(deps, identity),
	bind(readVoyageSpec, () =>
		onVoyage(identity, (voyageId) =>
			answered(
				identity,
				readVoyageSpec.name,
				voyageOrGone(deps, voyageId),
				renderVoyage,
			),
		),
	),
	...boardTools(deps, identity),
	standDownTool(deps, identity),
];

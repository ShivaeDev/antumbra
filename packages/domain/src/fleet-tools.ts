import {
	bind,
	charterVoyagePieceSpec,
	hailCaptainSpec,
	openVoyageSpec,
	proclaimRulingSpec,
	readFleetSpec,
	readVoyageSpec,
} from "@antumbra/agent-tools";
import { Pieces } from "@antumbra/pieces";
import type { DirectTool } from "@antumbra/plugin-api";
import {
	type Ruling,
	type RulingProclamation,
	Rulings,
} from "@antumbra/rulings";
import { AGENT_BACKEND_TAGS } from "@antumbra/vocabulary/agent-backend";
import { Effect, Option } from "effect";
import { makeCaptainToolCompiler } from "#captain-tools.ts";
import { VoyageNotFound } from "#errors.ts";
import { renderFleet } from "#fleet-render.ts";
import { widenedBy } from "#fleet-widening.ts";
import type { HailedCaptain } from "#hail.ts";
import { tagSubjects } from "#ruling-inputs.ts";
import { answered, onVoyage } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";
import { VoyageProcedureService } from "#voyage-procedures.ts";
import { renderVoyage } from "#voyage-render.ts";

// why: an opened voyage points at the first backend this app ships, the way a
// window draft that names none falls back to the first one offered. The
// admiral switches it afterwards like any other voyage's, so the tool asks a
// model for nothing it would only be guessing at.
const [FIRST_BACKEND] = AGENT_BACKEND_TAGS;

type Proclaimed = (typeof proclaimRulingSpec)["input"]["Type"];

// why: the radius belongs to the tool rather than to the caller — the flagship
// captain is the fleet's authority, and proclaiming below fleet radius is not
// among the acts the guide gives it. It stands on the flagship while it writes
// a fleet rule, so free tags are the whole of the scope it may name.
const proclamationOf = (input: Proclaimed): RulingProclamation => ({
	answer: input.answer,
	by: "flagship",
	choices: [],
	context: input.context,
	question: input.question,
	radius: "fleet",
	subjects: tagSubjects(input.tags),
	urgency: input.urgency,
});

const hailed = (voyageId: string) => (captain: HailedCaptain) =>
	`hailed captain ${captain.agentId} of voyage ${voyageId} — intent ${captain.intentId}`;

const proclaimed = (ruling: Ruling): string =>
	`ruling ${ruling.id} proclaimed by the flagship — it binds the whole fleet until the admiral supersedes it`;

// why: the fleet set is the captain set plus what only the flagship's captain
// may do. It keeps every captain tool because the flagship is a voyage like
// any other and still has to be conned — ruling on what climbs to it among
// them; the additions are the acts the admiral's own agent carries out on the
// fleet rather than on one ship.
export const makeFleetToolCompiler = Effect.gen(function* () {
	const compileCaptainTools = yield* makeCaptainToolCompiler;
	const pieces = yield* Pieces;
	const rulings = yield* Rulings;
	const voyages = yield* VoyageProcedureService;
	const readsVoyage = (identity: SessionIdentity, voyageId: string) =>
		answered(
			identity,
			readVoyageSpec.name,
			voyages.read(voyageId).pipe(
				Effect.flatMap((view) =>
					Option.match(view, {
						onNone: () => new VoyageNotFound({ voyageId }),
						onSome: (found) => Effect.succeed(found),
					}),
				),
			),
			renderVoyage,
		);
	const fleetActs = (identity: SessionIdentity): ReadonlyArray<DirectTool> => [
		bind(readVoyageSpec, (input) =>
			input.voyageId === undefined
				? onVoyage(identity, (own) => readsVoyage(identity, own))
				: readsVoyage(identity, input.voyageId),
		),
		bind(readFleetSpec, () =>
			answered(identity, readFleetSpec.name, voyages.list, renderFleet),
		),
		bind(openVoyageSpec, (input) =>
			answered(
				identity,
				openVoyageSpec.name,
				voyages.open({
					backend: FIRST_BACKEND,
					context: input.context,
					name: input.name,
					northStar: input.northStar,
				}),
				(voyage) => `opened voyage ${voyage.id}`,
			),
		),
		bind(charterVoyagePieceSpec, (input) =>
			answered(
				identity,
				charterVoyagePieceSpec.name,
				pieces.charter({
					charter: input.charter,
					dependsOn: [],
					expectation: input.expectation,
					role: input.role,
					title: input.title,
					voyageId: input.voyageId,
				}),
				(piece) => `chartered ${piece.id} on voyage ${input.voyageId}`,
			),
		),
		bind(hailCaptainSpec, (input) =>
			answered(
				identity,
				hailCaptainSpec.name,
				voyages.hail(input.voyageId),
				hailed(input.voyageId),
			),
		),
		bind(proclaimRulingSpec, (input) =>
			answered(
				identity,
				proclaimRulingSpec.name,
				rulings.proclaim(proclamationOf(input)),
				proclaimed,
			),
		),
	];
	return (identity: SessionIdentity): ReadonlyArray<DirectTool> =>
		widenedBy(compileCaptainTools(identity), fleetActs(identity));
});

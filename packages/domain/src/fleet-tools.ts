import { bind, charterVoyagePieceSpec, hailCaptainSpec, openVoyageSpec, proclaimRulingSpec, readFleetSpec } from "@antumbra/agent-tools";
import type { DirectTool } from "@antumbra/plugin-api";
import { type Ruling, type RulingProclamation, Rulings } from "@antumbra/rulings";
import { AGENT_BACKEND_TAGS } from "@antumbra/vocabulary/agent-backend";
import { Voyages } from "@antumbra/voyages";
import { Effect } from "effect";
import { makeCaptainToolCompiler } from "#captain-tools.ts";
import { makeReportingCharter, withNotice } from "#charter-notice.ts";
import { renderFleet } from "#fleet-render.ts";
import type { HailedCaptain } from "#hail.ts";
import { tagSubjects } from "#ruling-inputs.ts";
import { answered } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";
import { VoyageProcedureService } from "#voyages/service.ts";

const [FIRST_BACKEND] = AGENT_BACKEND_TAGS;

type Proclaimed = (typeof proclaimRulingSpec)["input"]["Type"];

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

export const makeFleetToolCompiler = Effect.gen(function* () {
	const compileCaptainTools = yield* makeCaptainToolCompiler;
	const charter = yield* makeReportingCharter;
	const rulings = yield* Rulings;
	const procedures = yield* VoyageProcedureService;
	const voyages = yield* Voyages;
	const fleetActs = (identity: SessionIdentity): ReadonlyArray<DirectTool> => [
		bind(readFleetSpec, () => answered(identity, readFleetSpec.name, procedures.list(), renderFleet)),
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
				charter({
					charter: input.charter,
					dependsOn: [],
					expectation: input.expectation,
					role: input.role,
					title: input.title,
					voyageId: input.voyageId,
				}),
				(chartered) => withNotice(chartered, `chartered ${chartered.piece.id} on voyage ${input.voyageId}`),
			),
		),
		bind(hailCaptainSpec, (input) => answered(identity, hailCaptainSpec.name, procedures.hail(input.voyageId), hailed(input.voyageId))),
		bind(proclaimRulingSpec, (input) => answered(identity, proclaimRulingSpec.name, rulings.proclaim(proclamationOf(input)), proclaimed)),
	];
	return (identity: SessionIdentity): ReadonlyArray<DirectTool> => [...compileCaptainTools(identity), ...fleetActs(identity)];
});

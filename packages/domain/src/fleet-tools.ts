import {
	bind,
	charterVoyagePieceSpec,
	hailCaptainSpec,
	openVoyageSpec,
	proclaimRulingSpec,
	readFleetSpec,
	registerRepoSpec,
} from "@antumbra/agent-tools";
import type { AgentBackend, DirectTool } from "@antumbra/plugin-api";
import { type RegisteredRepo, Repos } from "@antumbra/repos";
import { type Ruling, type RulingProclamation, Rulings } from "@antumbra/rulings";
import { AGENT_BACKEND_TAGS, AgentBackendTagSchema } from "@antumbra/vocabulary/agent-backend";
import { Voyages } from "@antumbra/voyages";
import { Effect, Schema } from "effect";
import { makeBackendModels } from "#backend-models.ts";
import { makeCaptainToolCompiler } from "#captain-tools.ts";
import { makeReportingCharter, withNotice } from "#charter-notice.ts";
import { renderFleet, rolePart } from "#fleet-render.ts";
import type { HailedCaptain } from "#hail.ts";
import { tagSubjects } from "#ruling-inputs.ts";
import { answered, refused } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";
import { VoyageProcedureService } from "#voyages/service.ts";

const [FIRST_BACKEND] = AGENT_BACKEND_TAGS;

type VoyageAsked = (typeof openVoyageSpec)["input"]["Type"];

type Registration = (typeof registerRepoSpec)["input"]["Type"];

const isBackendTag = Schema.is(AgentBackendTagSchema);

const unknownBackend = (input: VoyageAsked): string | undefined =>
	[input.captainBackend, input.crewBackend].find((tag) => tag !== undefined && !isBackendTag(tag));

const openRequest = (input: VoyageAsked) => ({
	backend: FIRST_BACKEND,
	captainBackend: input.captainBackend,
	captainEffort: input.captainEffort,
	captainModel: input.captainModel,
	context: input.context,
	crewBackend: input.crewBackend,
	crewEffort: input.crewEffort,
	crewModel: input.crewModel,
	name: input.name,
	northStar: input.northStar,
});

const backendUnnamed = (tag: string): string =>
	`${openVoyageSpec.name}: the fleet has no backend named ${tag} — it names ${AGENT_BACKEND_TAGS.join(", ")}`;

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

interface OpenedVoyage {
	readonly captainBackend: string;
	readonly captainEffort: string | null;
	readonly captainModel: string | null;
	readonly crewBackend: string;
	readonly crewEffort: string | null;
	readonly crewModel: string | null;
	readonly id: string;
}

const opened = (voyage: OpenedVoyage): string =>
	[
		`opened voyage ${voyage.id}`,
		rolePart("captain", voyage.captainBackend, voyage.captainModel, voyage.captainEffort),
		rolePart("crew", voyage.crewBackend, voyage.crewModel, voyage.crewEffort),
	].join(" · ");

const registered = (known: boolean, repo: RegisteredRepo): string =>
	`${known ? "already registered" : "registered"} repo ${repo.id} ${repo.name} · ${repo.source} · default ref ${repo.defaultRef}`;

export const makeFleetToolCompiler = (backends: ReadonlyMap<string, AgentBackend>) =>
	Effect.gen(function* () {
		const compileCaptainTools = yield* makeCaptainToolCompiler;
		const charter = yield* makeReportingCharter();
		const repos = yield* Repos;
		const rulings = yield* Rulings;
		const procedures = yield* VoyageProcedureService;
		const voyages = yield* Voyages;
		const listModels = makeBackendModels(backends);
		const readFleet = Effect.all({
			backends: Effect.forEach([...backends.keys()], (tag) => Effect.map(listModels(tag), (models) => ({ models, tag }))),
			repos: repos.registered(),
			voyages: procedures.list(),
		});
		const registerRepo = (registration: Registration) =>
			Effect.gen(function* () {
				const known = (yield* repos.registered()).some((row) => row.source === registration.source);
				return { known, repo: yield* repos.register(registration) };
			});
		const openVoyage = (identity: SessionIdentity, input: VoyageAsked) => {
			const unknown = unknownBackend(input);
			return unknown === undefined
				? answered(identity, openVoyageSpec.name, voyages.open(openRequest(input)), opened)
				: Effect.succeed(refused(backendUnnamed(unknown)));
		};
		const fleetActs = (identity: SessionIdentity): ReadonlyArray<DirectTool> => [
			bind(readFleetSpec, () => answered(identity, readFleetSpec.name, readFleet, renderFleet)),
			bind(registerRepoSpec, (input) => answered(identity, registerRepoSpec.name, registerRepo(input), ({ known, repo }) => registered(known, repo))),
			bind(openVoyageSpec, (input) => openVoyage(identity, input)),
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

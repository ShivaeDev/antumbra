import {
	bind,
	charterVoyagePieceSpec,
	hailCaptainSpec,
	openVoyageSpec,
	proclaimRulingSpec,
	readFleetSpec,
	registerRepoSpec,
} from "@antumbra/agent-tools";
import type { DirectTool } from "@antumbra/plugin-api";
import { type RegisteredRepo, Repos } from "@antumbra/repos";
import { type Ruling, type RulingProclamation, Rulings } from "@antumbra/rulings";
import { type ResolvedAgentSettings, RoleSettings } from "@antumbra/settings";
import { AGENT_BACKEND_TAGS, AgentBackendTagSchema } from "@antumbra/vocabulary/agent-backend";
import { Effect, Schema } from "effect";
import { BackendCatalog } from "#backend-catalog/service.ts";
import { makeCaptainToolCompiler } from "#captain-tools.ts";
import { makeReportingCharter, withNotice } from "#charter-notice.ts";
import { renderFleet, rolePart } from "#fleet-render.ts";
import type { HailedCaptain } from "#hail.ts";
import { tagSubjects } from "#ruling-inputs.ts";
import { answered, refused } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";
import { VoyageProcedureService } from "#voyages/service.ts";

type VoyageAsked = (typeof openVoyageSpec)["input"]["Type"];

type Registration = (typeof registerRepoSpec)["input"]["Type"];

const isBackendTag = Schema.is(AgentBackendTagSchema);

const unknownBackend = (input: VoyageAsked): string | undefined =>
	[input.captainBackend, input.crewBackend].find((tag) => tag !== undefined && !isBackendTag(tag));

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
	readonly captain: ResolvedAgentSettings;
	readonly crew: ResolvedAgentSettings;
	readonly id: string;
}

const sailing = (settings: ResolvedAgentSettings) => ({
	backend: settings.backend,
	effort: settings.effort ?? null,
	model: settings.model ?? null,
});

const opened = (voyage: OpenedVoyage): string =>
	[`opened voyage ${voyage.id}`, rolePart("captain", sailing(voyage.captain), "unnamed"), rolePart("crew", sailing(voyage.crew), "unnamed")].join(
		" · ",
	);

const registered = (known: boolean, repo: RegisteredRepo): string =>
	`${known ? "already registered" : "registered"} repo ${repo.id} ${repo.name} · ${repo.source} · default ref ${repo.defaultRef}`;

export const makeFleetToolCompiler = Effect.gen(function* () {
	const compileCaptainTools = yield* makeCaptainToolCompiler;
	const charter = yield* makeReportingCharter();
	const repos = yield* Repos;
	const rulings = yield* Rulings;
	const procedures = yield* VoyageProcedureService;
	const roles = yield* RoleSettings;
	const catalog = yield* BackendCatalog;
	const { backends } = yield* catalog.snapshot();
	const readFleet = Effect.all({
		backends: Effect.forEach(backends, (tag) => Effect.map(catalog.listModels(tag), (models) => ({ models, tag }))),
		repos: repos.registered(),
		roles: roles.defaults(),
		voyages: procedures.list(),
	});
	const registerRepo = (registration: Registration) =>
		Effect.gen(function* () {
			const known = (yield* repos.registered()).some((row) => row.source === registration.source);
			return { known, repo: yield* repos.register(registration) };
		});
	const sailingAs = (voyageId: string) =>
		Effect.all({ captain: roles.resolve(voyageId, "captain"), crew: roles.resolve(voyageId, "crew") }).pipe(
			Effect.map((settings) => ({ ...settings, id: voyageId })),
		);
	const openAsked = (input: VoyageAsked) => Effect.flatMap(procedures.open(input), (voyage) => sailingAs(voyage.id));
	const openTool = (identity: SessionIdentity, input: VoyageAsked) => {
		const unknown = unknownBackend(input);
		return unknown === undefined
			? answered(identity, openVoyageSpec.name, openAsked(input), opened)
			: Effect.succeed(refused(backendUnnamed(unknown)));
	};
	const fleetActs = (identity: SessionIdentity): ReadonlyArray<DirectTool> => [
		bind(readFleetSpec, () => answered(identity, readFleetSpec.name, readFleet, renderFleet)),
		bind(registerRepoSpec, (input) => answered(identity, registerRepoSpec.name, registerRepo(input), ({ known, repo }) => registered(known, repo))),
		bind(openVoyageSpec, (input) => openTool(identity, input)),
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

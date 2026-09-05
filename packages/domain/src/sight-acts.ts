import type {
	ModelChoice,
	RepoRegistration,
	RepoSummary,
	SessionImage,
	SessionImageRequest,
	SessionInputReceipt,
	SessionInputRequest,
	SightFailure,
	SituationDraft,
	SpawnReceipt,
	SpawnRequest,
} from "@antumbra/contract";
import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { admiralWords } from "@antumbra/prompts";
import { Repos } from "@antumbra/repos";
import { SessionInputs } from "@antumbra/session-inputs";
import { Effect } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";
import { makeRetryBackendCapacity } from "#backend-capacity-retry.ts";
import { SessionMessageEmpty } from "#errors.ts";
import { retirePieceCrew } from "#retire-crew.ts";
import { toFailure } from "#sight-failure.ts";
import { makeSituationDraft } from "#situation/draft.ts";

interface SightActs {
	readonly backendModels: (backend: string) => Effect.Effect<ReadonlyArray<ModelChoice>, SightFailure>;
	readonly forgetRepo: (repoId: string) => Effect.Effect<void, SightFailure>;
	readonly interrupt: (sessionId: string) => Effect.Effect<void, SightFailure>;
	readonly registerRepo: (registration: RepoRegistration) => Effect.Effect<RepoSummary, SightFailure>;
	readonly retryBackend: (backend: string) => Effect.Effect<void, SightFailure>;
	readonly retire: (agentId: string) => Effect.Effect<void, SightFailure>;
	readonly retireCrew: (pieceId: string) => Effect.Effect<void, SightFailure>;
	readonly send: (sessionId: string, text: string) => Effect.Effect<void, SightFailure>;
	readonly sendInput: (request: SessionInputRequest) => Effect.Effect<SessionInputReceipt, SightFailure>;
	readonly sessionImage: (request: SessionImageRequest) => Effect.Effect<SessionImage, SightFailure>;
	readonly situationDraft: (draft: SituationDraft) => Effect.Effect<string, SightFailure>;
	readonly sleep: (sessionId: string) => Effect.Effect<void, SightFailure>;
	readonly spawn: (request: SpawnRequest) => Effect.Effect<SpawnReceipt, SightFailure>;
}

export const makeSightActs = Effect.gen(function* () {
	const db = yield* Database;
	const repos = yield* Repos;
	const domain = yield* AgentDomain;
	const kernel = yield* Kernel;
	const inputs = yield* SessionInputs;
	const draft = yield* makeSituationDraft();
	const retryBackend = yield* makeRetryBackendCapacity;

	return {
		backendModels: (backend) => domain.listModels(backend).pipe(Effect.mapError(toFailure)),
		forgetRepo: (repoId) => repos.forget(repoId).pipe(Effect.mapError(toFailure)),
		interrupt: (sessionId) => domain.interruptSession(sessionId).pipe(Effect.mapError(toFailure)),
		registerRepo: (registration) => repos.register(registration).pipe(Effect.mapError(toFailure)),
		retryBackend: (backend) => retryBackend(backend).pipe(Effect.mapError(toFailure)),
		retire: (agentId) => kernel.submit(domain.retire, { agentId }).pipe(Effect.asVoid, Effect.mapError(toFailure)),
		retireCrew: (pieceId) =>
			retirePieceCrew(domain.retire, pieceId).pipe(
				Effect.provideService(Database, db),
				Effect.provideService(Kernel, kernel),
				Effect.mapError(toFailure),
			),
		send: (sessionId, text) =>
			Effect.gen(function* () {
				if (text.trim().length === 0) {
					return yield* new SessionMessageEmpty({ sessionId });
				}
				yield* domain.sendToSession(sessionId, admiralWords({ words: text }));
			}).pipe(Effect.mapError(toFailure)),
		sendInput: (request) =>
			domain.sendSessionInput(request).pipe(
				Effect.map((status) => ({ id: request.id, status })),
				Effect.mapError(toFailure),
			),
		sessionImage: (request) => inputs.image(request).pipe(Effect.mapError(toFailure)),
		situationDraft: (request) => draft(request).pipe(Effect.mapError(toFailure)),
		sleep: (sessionId) => kernel.submit(domain.siesta, { sessionId }).pipe(Effect.asVoid, Effect.mapError(toFailure)),
		spawn: (request) =>
			Effect.gen(function* () {
				const agentId = crypto.randomUUID();
				const sessionId = crypto.randomUUID();
				yield* kernel.submit(domain.spawn, {
					agentId,
					backend: request.backend,
					charter: request.charter,
					role: request.role,
					runner: "local",
					sessionId,
				});
				return { agentId, sessionId };
			}).pipe(Effect.mapError(toFailure)),
	} satisfies SightActs;
});

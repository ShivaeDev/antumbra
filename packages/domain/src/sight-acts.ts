import type {
	RepoRegistration,
	RepoSummary,
	SightFailure,
	SituationDraft,
	SpawnReceipt,
	SpawnRequest,
} from "@antumbra/contract";
import { Kernel } from "@antumbra/kernel";
import { admiralWords } from "@antumbra/prompts";
import { Effect } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";
import { SessionMessageEmpty } from "#errors.ts";
import { writeProvider } from "#sight-executors.ts";
import { toFailure } from "#sight-failure.ts";
import { makeSituationDraft } from "#situation-draft.ts";

export interface SightActs {
	readonly forgetRepo: (repoId: string) => Effect.Effect<void, SightFailure>;
	readonly interrupt: (sessionId: string) => Effect.Effect<void, SightFailure>;
	readonly registerRepo: (
		registration: RepoRegistration,
	) => Effect.Effect<RepoSummary, SightFailure>;
	readonly retire: (agentId: string) => Effect.Effect<void, SightFailure>;
	readonly send: (
		sessionId: string,
		text: string,
	) => Effect.Effect<void, SightFailure>;
	readonly situationDraft: (
		draft: SituationDraft,
	) => Effect.Effect<string, SightFailure>;
	readonly sleep: (sessionId: string) => Effect.Effect<void, SightFailure>;
	readonly spawn: (
		request: SpawnRequest,
	) => Effect.Effect<SpawnReceipt, SightFailure>;
}

export const makeSightActs = Effect.gen(function* () {
	const domain = yield* AgentDomain;
	const kernel = yield* Kernel;
	const provide = yield* writeProvider;
	const draft = yield* makeSituationDraft;

	return {
		forgetRepo: (repoId) =>
			domain.repos.forget(repoId).pipe(Effect.mapError(toFailure)),
		interrupt: (sessionId) =>
			domain.interruptSession(sessionId).pipe(Effect.mapError(toFailure)),
		registerRepo: (registration) =>
			domain.repos.register(registration).pipe(Effect.mapError(toFailure)),
		retire: (agentId) =>
			provide(kernel.submit(domain.retire, { agentId })).pipe(
				Effect.asVoid,
				Effect.mapError(toFailure),
			),
		// why: the admiral speaks to a Session that is live right now; a Session
		// with no attachment refuses rather than holding the words for later.
		send: (sessionId, text) =>
			Effect.gen(function* () {
				if (text.trim().length === 0) {
					return yield* new SessionMessageEmpty({ sessionId });
				}
				// why: this is where free-typed words enter the system, so it is
				// where they enter the catalog — through the one template that
				// exists to carry them, rather than by a seam relaxing its type.
				yield* domain.sendToSession(sessionId, admiralWords({ words: text }));
			}).pipe(Effect.mapError(toFailure)),
		situationDraft: (request) =>
			draft(request).pipe(Effect.mapError(toFailure)),
		// why: the admiral's request and the clock's own are the same act, so both
		// submit the same Intent and meet the same guard inside it. Nothing is
		// checked here: a capability read from the last snapshot is a statement
		// about a moment that has already passed, and the Intent is where the
		// question gets asked of the present.
		sleep: (sessionId) =>
			provide(kernel.submit(domain.siesta, { sessionId })).pipe(
				Effect.asVoid,
				Effect.mapError(toFailure),
			),
		spawn: (request) =>
			Effect.gen(function* () {
				const agentId = crypto.randomUUID();
				const sessionId = crypto.randomUUID();
				yield* provide(
					kernel.submit(domain.spawn, {
						agentId,
						backend: request.backend,
						charter: request.charter,
						role: request.role,
						// why: the sole runner in v1 — the field joins the contract when
						// a second runner exists to choose between.
						runner: "local",
						sessionId,
					}),
				);
				return { agentId, sessionId };
			}).pipe(Effect.mapError(toFailure)),
	} satisfies SightActs;
});

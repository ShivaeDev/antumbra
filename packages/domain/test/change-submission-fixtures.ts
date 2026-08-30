import { Effect } from "effect";
import { AgentDomain } from "#domain.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, changeHostsOf, makeScriptedBackend, passiveRunner } from "#test/harness.ts";
import { makeScriptedHost, type ScriptedHost } from "#test/scripted-host.ts";

export const CREW = "agent-crew";

export const HEAD = `work/${CREW}/berth-0`;

export const withHost = <A, E, R>(body: (scripted: ScriptedHost) => Effect.Effect<A, E, R>) =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const backend = yield* makeScriptedBackend;
		const host = yield* makeScriptedHost();
		yield* body(host).pipe(Effect.provide(domainKernelLayer(temporary, backend.backend, {}, passiveRunner, changeHostsOf(host.host))));
	});

export const openedChange = (pieceId: string, repoName: string) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		return yield* domain.changes.open({
			agentId: CREW,
			base: null,
			body: "sounded three fathoms",
			draft: false,
			pieceId,
			repoName,
			sessionId: "session-crew",
			title: "chart the eastern spit",
		});
	});

export const submittedChange = (pieceId: string, repoName: string) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		return yield* domain.changes.submit({
			agentId: CREW,
			pieceId,
			repoName,
			sessionId: "session-crew",
		});
	});

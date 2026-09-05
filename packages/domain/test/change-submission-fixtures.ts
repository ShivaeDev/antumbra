import { Changes } from "@antumbra/changes";
import { Effect } from "effect";
import { makeScriptedHost } from "#test/scripted-host.ts";

export const CREW = "agent-crew";

export const HEAD = `work/${CREW}/berth-0`;

export const scriptedChangeHost = Effect.gen(function* () {
	const host = yield* makeScriptedHost();
	return { providers: { changeHosts: new Map([[host.host.tag, host.host]]) }, state: host };
});

export const openedChange = (pieceId: string, repoName: string) =>
	Effect.gen(function* () {
		const changes = yield* Changes;
		return yield* changes.open({
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
		const changes = yield* Changes;
		return yield* changes.submit({
			agentId: CREW,
			pieceId,
			repoName,
			sessionId: "session-crew",
		});
	});

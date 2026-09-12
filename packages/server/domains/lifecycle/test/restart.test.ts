import { it } from "@antumbra/app-testing/entry.ts";
import { observed } from "@antumbra/domain-sessions/facts/observed.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { expect } from "vitest";
import { clear } from "#commands/clear.ts";
import { record } from "#commands/record.ts";
import { pending } from "#queries/pending.ts";

it.app("records only running roots on connected runners and clears the requested wake list", function* () {
	const commit = yield* Commit;
	const live = yield* Live;
	let cursor = 0;
	for (const name of ["active", "idle", "detached", "disconnected"]) {
		const identity = { sessionId: SessionId.make(name), nodeRef: null, origin: null, operationId: `start-${name}` };
		const source = { logId: "lifecycle-proof", at: 100, requestId: Request.make(`start-${name}`) };
		yield* commit.observe(observed, {
			...source,
			cursor: cursor++,
			payload: {
				...identity,
				evidence: {
					type: "started",
					agentId: name,
					backend: "scripted",
					cwd: "/berth",
					nativeRef: name,
					runnerId: name === "disconnected" ? "gone" : "runner",
					toolSetVersion: "v1",
				},
			},
		});
		if (name !== "idle")
			yield* commit.observe(observed, { ...source, cursor: cursor++, payload: { ...identity, evidence: { type: "activity", state: "active" } } });
		if (name === "detached")
			yield* commit.observe(observed, {
				...source,
				cursor: cursor++,
				payload: { ...identity, evidence: { type: "detached", reason: "runner left" } },
			});
	}
	yield* commit.commit(record, { requestId: Request.make("record"), runnerIds: ["runner"] });
	expect(yield* live.read(pending, {})).toEqual(["active"]);
	yield* commit.commit(clear, { requestId: Request.make("consume") });
	expect(yield* live.read(pending, {})).toBeNull();
});

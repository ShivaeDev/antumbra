import { fill, labelled, press, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { inputApi } from "@antumbra/app-testing/inputs.ts";
import { connectRunner } from "@antumbra/app-testing/runner.ts";
import { Effect, SubscriptionRef } from "effect";
import { expect } from "vitest";
import type { DraftSnapshot, Drafts } from "#drafts.ts";
import { SessionMessage } from "#session-message.tsx";

it.glass("clears the sent shell revision after acceptance while keeping later edits through remount", function* ({ render, run }) {
	const runner = yield* run(connectRunner({ runnerId: "runner:composer", logId: "log:composer", backends: ["claude"], imageInputBackends: [] }));
	yield* run(
		runner.append([
			{
				logId: "log:composer",
				cursor: 1,
				at: 0,
				event: {
					type: "SessionStarted",
					requestId: "start:composer",
					sessionId: "session:composer",
					agentId: "agent:composer",
					backend: "claude",
					nativeRef: "native:composer",
					cwd: "/composer",
					toolSetVersion: "1",
					runnerId: "runner:composer",
				},
			},
		]),
	);
	const inputs = yield* run(inputApi);
	const shell = yield* SubscriptionRef.make<DraftSnapshot>({ text: "", revision: "initial" });
	let revision = 0;
	const clearRequests: string[] = [];
	const drafts: Drafts = {
		watch: () => SubscriptionRef.changes(shell),
		write: (_ref, text) => {
			const snapshot = { text, revision: `shell:${++revision}` };
			return SubscriptionRef.set(shell, snapshot).pipe(Effect.as(snapshot));
		},
		clear: (_ref, sentRevision) => Effect.sync(() => void clearRequests.push(sentRevision)),
	};
	const screen = (
		<SessionMessage
			api={inputs.client}
			backend="claude"
			canAttachImages={false}
			canSend
			drafts={drafts}
			onError={(message) => Effect.runSync(Effect.die(message))}
			sessionId="session:composer"
		/>
	);
	let container = yield* render(screen);
	yield* fill(container, "Message this session", "First instruction");
	yield* press(container, "Send");
	const operation = yield* run(runner.next);
	if (operation.type !== "Deliver") return yield* Effect.die(new Error(`Expected Deliver, got ${operation.type}`));
	const sent = yield* SubscriptionRef.get(shell);
	yield* fill(container, "Message this session", "Later unsent instruction");
	yield* until(() => labelled<HTMLTextAreaElement>(container, "Message this session").value === "Later unsent instruction", "later edit");
	yield* run(
		runner.append([
			{
				logId: "log:composer",
				cursor: 2,
				at: 1,
				event: { type: "InputAccepted", requestId: operation.requestId, sessionId: "session:composer", inputId: operation.input.id },
			},
		]),
	);
	yield* run(runner.reply(operation.requestId, { type: "Accepted" }));
	yield* until(() => clearRequests.length === 1, "conditional shell clear after acceptance");
	expect(clearRequests).toEqual([sent.revision]);
	expect((yield* SubscriptionRef.get(shell)).revision).not.toBe(sent.revision);
	yield* render(null);
	container = yield* render(screen);
	yield* until(() => labelled<HTMLTextAreaElement>(container, "Message this session").value === "Later unsent instruction", "persisted later edit");
});

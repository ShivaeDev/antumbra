import { until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { inputApi } from "@antumbra/app-testing/inputs.ts";
import { identity } from "@antumbra/domain-agents/ids.ts";
import type { TranscriptReading } from "@antumbra/domain-sessions/queries/transcript-rpc.ts";
import type { DraftSnapshot, Drafts } from "@antumbra/glass-inputs/drafts.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect, SubscriptionRef } from "effect";
import { expect } from "vitest";
import { SessionComposer } from "#session-composer.tsx";
import { SessionHeader } from "#session-header.tsx";

const CREW = Request.make("agent:soundings");

const model = (model: string, costUsd: number) => ({
	cacheReadTokens: 138_093,
	cacheWriteTokens: 6_087,
	costPartial: false,
	costUsd,
	inputTokens: 130,
	model,
	outputTokens: 1_925,
});

const snapshot: typeof TranscriptReading.Type = {
	activity: { live: true, words: "Bash" },
	items: [],
	standing: {
		models: [model("opus-5", 0.74)],
		open: [{ name: "Bash" }],
		spend: { costPartial: false, costUsd: 0.74 },
		tokens: { cacheReadTokens: 138_093, cacheWriteTokens: 6_087, inputTokens: 130, outputTokens: 1_925 },
		turn: { costPartial: false, costUsd: 0.2538 },
	},
	unavailable: [],
};

const appears = (container: HTMLElement, words: string): number => container.textContent?.split(words).length ?? 0;

it.glass("the header names the session once and carries what it has spent", function* ({ api, render }) {
	yield* api.agents.spawn({ requestId: CREW, role: "hand", backend: "claude", model: null, effort: null });
	const sessionId = identity(CREW).sessionId;
	const container = yield* render(<SessionHeader api={api} nodeId={sessionId} sessionId={sessionId} snapshot={snapshot} />);
	yield* until(() => container.textContent?.includes("hand") === true, "the agent to reach the header");
	expect(container.querySelectorAll("header")).toHaveLength(1);
	expect(container.textContent).toContain(sessionId);
	expect(container.textContent).toContain("Bash");
	expect(container.textContent).toContain("turn $0.25 · session $0.74");
	expect(appears(container, "preparing")).toBe(2);
	expect(container.textContent).not.toContain("no state reported yet");
});

it.glass("a transcript no agent answers for is read only", function* ({ api, render, run }) {
	const inputs = yield* run(inputApi);
	const shell = yield* SubscriptionRef.make<DraftSnapshot>({ text: "", revision: "initial" });
	const drafts: Drafts = {
		watch: () => SubscriptionRef.changes(shell),
		write: (_ref, text) => SubscriptionRef.set(shell, { text, revision: "shell" }).pipe(Effect.as({ text, revision: "shell" })),
		clear: () => Effect.void,
	};
	const container = yield* render(
		<SessionComposer api={api} drafts={drafts} inputs={inputs.client} onError={() => undefined} sessionId="session:forgotten" />,
	);
	yield* until(() => container.textContent?.includes("read only") === true, "the composer to say the transcript is read only");
	expect(container.textContent).toContain("This transcript is read only.");
	expect(container.querySelector("textarea")).toBeNull();
});

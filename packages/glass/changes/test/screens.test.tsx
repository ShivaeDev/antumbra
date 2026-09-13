import { answered, eventually } from "@antumbra/app-testing/answers.ts";
import { fill, labelled, press, renderedForm, submit, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { inputApi } from "@antumbra/app-testing/inputs.ts";
import { connectRunner } from "@antumbra/app-testing/runner.ts";
import { identity } from "@antumbra/domain-agents/ids.ts";
import type { DraftSnapshot, Drafts } from "@antumbra/glass-inputs/drafts.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "@effect/vitest";
import { Effect, SubscriptionRef } from "effect";
import { ChangeOutcomes } from "#change-outcomes.tsx";
import { QuayPanel } from "#quay-panel.tsx";
import { SessionSituations } from "#session-situations.tsx";
import { changeId, observed, pieceId, ready, recorded, repoId, words } from "#test/kit.ts";

const repositoryOptions = (container: HTMLElement): readonly string[] =>
	[...labelled<HTMLSelectElement>(container, "Repository").options].map((option) => option.textContent ?? "");

const headed = (container: HTMLElement, title: string): boolean => [...container.querySelectorAll("h2")].some((node) => node.textContent === title);

const stamps = (container: HTMLElement): readonly string[] => [...container.querySelectorAll("time")].map((node) => node.textContent ?? "");

it.glass("filters the live Quay while retaining the selected detail and piece change link", function* ({ api, render }) {
	yield* ready(api);
	const container = yield* render(
		<>
			<QuayPanel api={api} selectedId={changeId} onSelect={() => undefined} onOpenSession={() => undefined} />
			<ChangeOutcomes api={api} pieceId={pieceId} />
		</>,
	);
	yield* until(() => container.textContent?.includes("1 of 1 pull requests") === true, "the Quay to show its change");
	expect(container.textContent).toContain("checks failed");
	expect(container.textContent).toContain("work/reef");
	expect(container.textContent).toContain("#41 Soundings");
	yield* fill(container, "Search pull requests", "absent");
	yield* until(() => container.textContent?.includes("0 of 1 pull requests") === true, "the server filter to update");
	expect(container.textContent).toContain("No pull requests match these filters.");
	expect(container.textContent).toContain("Open pull request");
	yield* press(container, "Clear filters");
	yield* until(() => container.textContent?.includes("1 of 1 pull requests") === true, "cleared filters to show the change");
});

it.glass("offers adoption and keeps a host refusal editable for retry", function* ({ api, render }) {
	yield* ready(api);
	const container = yield* render(<QuayPanel api={api} onSelect={() => undefined} onOpenSession={() => undefined} />);
	yield* until(() => container.textContent?.includes("1 of 1 pull requests") === true, "the adoption control to arrive");
	yield* press(container, "Adopt a pull request");
	const form = yield* renderedForm(document.body, "Adopt change");
	yield* fill(form, "Adopt change Piece", pieceId);
	yield* fill(form, "Adopt change Repository", repoId);
	yield* fill(form, "Adopt change Pull request URL", "https://github.com/example/reef/pull/99");
	yield* submit(document.body, "Adopt change");
	const retry = yield* renderedForm(container, "Retry adoption");
	expect(container.textContent).toContain("ChangeHostRefused: no change at this URL");
	const refused = (yield* answered(api.changes.adoptions({})))[0];
	expect(refused).toBeDefined();
	if (refused === undefined) return;
	expect(refused.url).toBe("https://github.com/example/reef/pull/99");
	yield* fill(retry, "Retry adoption Pull request URL", "https://github.com/example/reef/pull/100");
	yield* submit(container, "Retry adoption");
	const corrected = yield* eventually(api.changes.adoptions({}), (rows) => rows[0]?.url === "https://github.com/example/reef/pull/100");
	expect(corrected[0]).toMatchObject({ id: refused.id });
	expect((yield* answered(api.changes.quay({}))).length).toBe(1);
});

it.glass("keeps a merged change under Landed and offers every registered repository", function* ({ api, render }) {
	yield* ready(api);
	const container = yield* render(<QuayPanel api={api} onSelect={() => undefined} onOpenSession={() => undefined} />);
	yield* until(() => container.textContent?.includes("1 of 1 pull requests") === true, "the Quay to show its change");
	expect(repositoryOptions(container)).toEqual(["All repositories", "reef"]);

	yield* api.changes.observe({
		host: "github",
		observation: { ...observed, activityAt: 3000, checks: "green", raw: { state: "merged" }, stage: "landed" },
		attachment: { _tag: "Observed" },
		observedAt: yield* recorded(0),
	});
	yield* until(() => headed(container, "Landed"), "the Landed section to appear");
	expect(container.textContent).toContain("merged");
	expect(container.textContent).toContain("0 of 0 pull requests");

	yield* api.repos.register({ source: "https://github.com/example/shoal.git", defaultRef: "main" });
	yield* until(() => repositoryOptions(container).includes("shoal"), "the newly registered repository to reach the filter");
	expect(repositoryOptions(container)).toEqual(["All repositories", "reef", "shoal"]);
});

it.glass("moves a change landed seven days ago out of the quay and into the Archived filter", function* ({ api, render }) {
	yield* ready(api);
	const container = yield* render(<QuayPanel api={api} selectedId={changeId} onSelect={() => undefined} onOpenSession={() => undefined} />);
	yield* until(() => container.textContent?.includes("1 of 1 pull requests") === true, "the Quay to show its change");
	expect(container.textContent).toContain("Latest host activity");

	yield* api.changes.observe({
		host: "github",
		observation: { ...observed, activityAt: 3000, checks: "green", raw: { state: "merged" }, stage: "landed" },
		attachment: { _tag: "Observed" },
		observedAt: yield* recorded(7),
	});
	yield* until(() => container.textContent?.includes("Everything at the quay is archived.") === true, "the quay to report its work archived");
	expect(headed(container, "Landed")).toBe(false);
	expect(container.textContent).not.toContain("Latest host activity");
	expect(stamps(container)).toEqual([(yield* recorded(0)).slice(0, 10)]);

	yield* fill(container, "Status", "archived");
	yield* until(() => headed(container, "Archived"), "the Archived section to appear");
	expect(container.textContent).toContain("merged");
	expect(container.textContent).toMatch(/Archived \d{4}-\d{2}-\d{2}/);
});

it.glass("reads the waiting comments on the button and hands the session's draft every one of them", function* ({ api, render, run }) {
	yield* ready(api);
	const requestId = Request.make("agent:feedback");
	const { agentId, sessionId } = identity(requestId);
	yield* api.agents.workNow({ requestId, pieceId });
	const runner = yield* run(connectRunner({ runnerId: "runner", logId: "feedback-runner", backends: ["claude"], imageInputBackends: [] }));
	yield* run(
		runner.append([
			{
				at: 100,
				cursor: 0,
				event: {
					type: "SessionStarted",
					agentId,
					backend: "claude",
					cwd: "/reef",
					nativeRef: "native",
					requestId: "feedback:start",
					runnerId: "runner",
					sessionId,
					toolSetVersion: "v1",
				},
				logId: "feedback-runner",
			},
		]),
	);
	yield* api.changes.observe({
		host: "github",
		observation: { ...observed, activityAt: 3000, feedback: words },
		attachment: { _tag: "Observed" },
		observedAt: yield* recorded(0),
	});
	const inputs = yield* run(inputApi);
	const shell = yield* SubscriptionRef.make<DraftSnapshot>({ text: "", revision: "initial" });
	const drafts: Drafts = {
		watch: () => SubscriptionRef.changes(shell),
		write: (_ref, text) => {
			const snapshot = { text, revision: "written" };
			return SubscriptionRef.set(shell, snapshot).pipe(Effect.as(snapshot));
		},
		clear: () => Effect.void,
	};
	const container = yield* render(
		<SessionSituations
			api={api}
			drafts={drafts}
			inputs={inputs.client}
			onError={(message) => Effect.runSync(Effect.die(message))}
			sessionId={sessionId}
		/>,
	);
	yield* until(() => container.textContent?.includes("2 comments on #41") === true, "the waiting comments to reach the button");
	yield* press(container, "2 comments on #41");
	yield* until(() => labelled<HTMLTextAreaElement>(document.body, "Words to send").value !== "", "the draft to carry the comments");
	const draft = labelled<HTMLTextAreaElement>(document.body, "Words to send").value;
	expect(draft).toContain("Change #41 in reef has 2 new comments on branch work/reef, quoted below.");
	expect(draft).toContain("octocat reviewed\n> The empty reef needs a test before this lands.");
	expect(draft).toContain("octocat commented on src/reef.ts:42\n> This reads the first tide before one is recorded.");
	expect(draft).toContain("https://github.com/example/reef/pull/41#discussion_c1");
	yield* press(document.body, "Send");
	let delivery = yield* run(runner.next);
	while (delivery.type !== "Deliver") delivery = yield* run(runner.next);
	yield* run(
		runner.append([
			{
				at: 200,
				cursor: 1,
				event: { type: "InputAccepted", requestId: delivery.requestId, sessionId, inputId: delivery.input.id },
				logId: "feedback-runner",
			},
		]),
	);
	yield* run(runner.reply(delivery.requestId, { type: "Accepted" }));
	yield* until(() => container.textContent?.includes("comments on #41") === false, "the situation to clear once the words are forwarded");
});

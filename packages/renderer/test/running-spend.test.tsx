import type { CostsView } from "@antumbra/contract";
import { costs } from "@antumbra/contract/fixtures";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, vi } from "vitest";
import { sessionActivity } from "#transcript/activity.ts";
import { sessionStanding } from "#transcript/standing.ts";
import { SessionStandingBar } from "#views/session-standing.tsx";
import { VoyageSpend } from "#views/voyage-spend.tsx";

const { opened, watchCosts } = vi.hoisted(() => {
	const told: Array<(view: CostsView) => void> = [];
	return {
		opened: told,
		watchCosts: vi.fn((onCosts: (view: CostsView) => void) => {
			told.push(onCosts);
			return vi.fn();
		}),
	};
});

vi.mock("#adapters/trpc-costs.ts", () => ({ watchCosts }));

const settle = (change: () => void): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			change();
			return Promise.resolve();
		}),
	);

const opening = (node: ReactNode, view: CostsView = costs) =>
	Effect.gen(function* () {
		const container = document.createElement("div");
		const root = createRoot(container);
		yield* Effect.addFinalizer(() => settle(() => root.unmount()));
		yield* settle(() => root.render(node));
		yield* settle(() => opened.at(-1)?.(view));
		return container;
	});

const standingBar = (agentId: string) => {
	const standing = sessionStanding([]);
	return <SessionStandingBar activity={sessionActivity(standing, undefined, undefined)} agentId={agentId} standing={standing} />;
};

beforeEach(() => {
	opened.length = 0;
	watchCosts.mockClear();
});

it.effect(
	"puts the agent's running total at the end of its standing bar",
	Effect.fnUntraced(function* () {
		const container = yield* opening(standingBar("agent-1"));

		expect(container.textContent).toContain("agent");
		expect(container.textContent).toContain("1.61M tokens");
		expect(container.textContent).toContain("≥ $5.76");
	}),
);

it.effect(
	"says an agent has no turns yet rather than claiming it spent nothing",
	Effect.fnUntraced(function* () {
		const container = yield* opening(standingBar("agent-fresh"));

		expect(container.textContent).toContain("no turns yet");
		expect(container.textContent).not.toContain("$");
	}),
);

it.effect(
	"gives every token count and every turn to the tooltip the running total carries",
	Effect.fnUntraced(function* () {
		const container = yield* opening(standingBar("agent-1"));
		const titles = [...container.querySelectorAll("span[title]")].map((span) => span.getAttribute("title"));

		expect(titles).toContain("96 turns · input 180,000 · cache read 1,320,000 · cache write 72,000 · output 36,000");
	}),
);

it.effect(
	"shows a voyage what it has spent so far",
	Effect.fnUntraced(function* () {
		const container = yield* opening(<VoyageSpend voyageId="voyage-1" />);

		expect(container.textContent).toContain("1.61M tokens");
		expect(container.textContent).toContain("≥ $5.76");
	}),
);

it.effect(
	"leaves the voyage line alone until one of its agents takes a turn",
	Effect.fnUntraced(function* () {
		const container = yield* opening(<VoyageSpend voyageId="voyage-untouched" />);

		expect(container.textContent).toBe("");
	}),
);

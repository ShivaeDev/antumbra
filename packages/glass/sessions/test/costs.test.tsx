import { it } from "@antumbra/app-testing/glass/entry.tsx";
import type { SessionModelSpend, SessionStanding } from "@antumbra/domain-sessions/rows/transcript-standing.ts";
import type { UsageTotal } from "@antumbra/domain-sessions/rows/usage.ts";
import { expect } from "vitest";
import { SpendTable } from "#views/costs-table.tsx";
import { modelWords, SessionCosts } from "#views/session-costs.tsx";
import { SpendInline } from "#views/spend-inline.tsx";

const unpriced: UsageTotal = {
	cacheReadTokens: 1000,
	cacheWriteTokens: 0,
	inputTokens: 2000,
	outputTokens: 500,
	turns: 2,
	costUsd: null,
	costPartial: false,
};

it.glass("unpriced usage stays visible without inventing a price", function* ({ render }) {
	const container = yield* render(<SpendInline total={unpriced} />);
	expect(container.textContent).toContain("3.5K tokens");
	expect(container.textContent).toContain("cost not reported");
	expect(container.textContent).not.toContain("$0");
});

it.glass("partially priced model spend remains a floor with its explanation", function* ({ render }) {
	const container = yield* render(
		<SpendTable
			heading="By model"
			lead="Model"
			span="all time"
			rows={[{ key: "model", name: "model", tone: "mono", total: { ...unpriced, costUsd: 1.2, costPartial: true } }]}
		/>,
	);
	expect(container.textContent).toContain("≥ $1.20");
	expect(container.querySelector('[title="Some turns reported no cost, so the real total is higher."]')).not.toBeNull();
});

const nothing = { cacheReadTokens: 0, cacheWriteTokens: 0, inputTokens: 0, outputTokens: 0 };

const standing = (models: SessionStanding["models"], spend: SessionStanding["spend"]): SessionStanding => ({
	models,
	open: [],
	spend,
	tokens: { cacheReadTokens: 96_000, cacheWriteTokens: 2_000, inputTokens: 2_000, outputTokens: 500 },
	turn: spend,
});

const spent = (model: string, costUsd: number | null): SessionModelSpend => ({
	...nothing,
	costPartial: false,
	costUsd,
	inputTokens: 130,
	model,
	outputTokens: 1925,
});

it.glass("a session says what this turn and the whole session have cost, and what each model ran on", function* ({ render }) {
	const models = [spent("opus", 0.62), spent("haiku", null)];
	const container = yield* render(<SessionCosts standing={standing(models, { costPartial: false, costUsd: 0.62 })} />);
	expect(container.textContent).toContain("turn $0.62 · session $0.62");
	expect(models.map(modelWords)).toEqual(["opus · in 130 · out 1,925 · $0.62", "haiku · in 130 · out 1,925"]);
});

it.glass("a session whose models did not all price their turns reads as a floor", function* ({ render }) {
	const container = yield* render(
		<SessionCosts standing={standing([spent("opus", 0.62), spent("haiku", null)], { costPartial: true, costUsd: 0.62 })} />,
	);
	expect(container.textContent).toContain("session ≥ $0.62");
});

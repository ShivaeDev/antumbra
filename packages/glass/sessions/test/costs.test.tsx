import { it } from "@antumbra/app-testing/glass/entry.tsx";
import type { SessionStanding } from "@antumbra/domain-sessions/rows/transcript-standing.ts";
import type { UsageTotal } from "@antumbra/domain-sessions/rows/usage.ts";
import { expect } from "vitest";
import { SessionStandingBar } from "#session-standing.tsx";
import { SpendTable } from "#views/costs-table.tsx";
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

const standing = (models: SessionStanding["models"]): SessionStanding => ({
	background: [],
	models,
	open: [],
	state: "idle",
	usage: { byModel: models.map((spent) => ({ inputTokens: 1, model: spent.model, outputTokens: 1 })), inputTokens: 2, outputTokens: 2 },
});

it.glass("a session that ran one model says so without a tally to read", function* ({ render }) {
	const container = yield* render(<SessionStandingBar activity={{ live: true }} standing={standing([{ costUsd: 0.62, model: "opus" }])} />);
	expect(container.textContent).toContain("opus");
	expect(container.querySelector("[title]")).toBeNull();
});

it.glass("a session that ran two models says what each of them cost", function* ({ render }) {
	const container = yield* render(
		<SessionStandingBar
			activity={{ live: true }}
			standing={standing([
				{ costUsd: 0.62, model: "opus" },
				{ costUsd: 0.03, model: "haiku" },
			])}
		/>,
	);
	expect(container.querySelector('[title="opus $0.6200 · haiku $0.0300"]')).not.toBeNull();
});

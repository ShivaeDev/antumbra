import { it } from "@antumbra/app-testing/glass/entry.tsx";
import type { SessionModelSpend, SessionStanding } from "@antumbra/domain-sessions/rows/transcript-standing.ts";
import type { UsageTotal } from "@antumbra/domain-sessions/rows/usage.ts";
import { expect } from "vitest";
import { tokensOf } from "#costs/format.ts";
import { SessionStandingBar } from "#session-standing.tsx";
import { usageLabel } from "#transcript/usage-label.ts";
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

const standing = (models: SessionStanding["models"], spend: SessionStanding["spend"]): SessionStanding => ({
	background: [],
	models,
	open: [],
	spend,
	state: "idle",
	usage: { byModel: models.map((spent) => ({ inputTokens: 1, model: spent.model, outputTokens: 1 })), inputTokens: 2, outputTokens: 2 },
});

const spent = (model: string, costUsd: number | null): SessionModelSpend => ({ costPartial: false, costUsd, model });

it.glass("a session that ran one model says so without a tally to read", function* ({ render }) {
	const container = yield* render(
		<SessionStandingBar activity={{ live: true }} standing={standing([spent("opus", 0.62)], { costPartial: false, costUsd: 0.62 })} />,
	);
	expect(container.textContent).toContain("opus");
	expect(container.textContent).toContain("session $0.6200");
	expect(container.querySelector("[title]")).toBeNull();
});

it.glass("a session that ran two models says what each of them cost, and what they cost together", function* ({ render }) {
	const container = yield* render(
		<SessionStandingBar
			activity={{ live: true }}
			standing={standing([spent("opus", 0.62), spent("haiku", 0.03)], { costPartial: false, costUsd: 0.65 })}
		/>,
	);
	expect(container.querySelector('[title="opus $0.6200 · haiku $0.0300"]')).not.toBeNull();
	expect(container.textContent).toContain("session $0.6500");
});

it.glass("a session whose models did not all price their turns reads as a floor", function* ({ render }) {
	const container = yield* render(
		<SessionStandingBar
			activity={{ live: true }}
			standing={standing([spent("opus", 0.62), spent("haiku", null)], { costPartial: true, costUsd: 0.62 })}
		/>,
	);
	expect(container.textContent).toContain("session ≥ $0.6200");
	expect(container.querySelector('[title="opus $0.6200 · haiku cost not reported"]')).not.toBeNull();
});

it.glass("normalized Codex usage shows its cache share and counts each token once", function* ({ render }) {
	const usage = { inputTokens: 2731, cacheReadTokens: 99712, cacheWriteTokens: 0, outputTokens: 487, byModel: [] };
	const container = yield* render(<SpendInline total={{ ...unpriced, ...usage }} />);
	expect(container.textContent).toContain("103K tokens");
	expect(usageLabel(usage)).toContain("97% cache");
	expect(tokensOf({ ...unpriced, ...usage })).toBe(102930);
});

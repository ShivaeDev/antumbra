import { it } from "@antumbra/app-testing/glass/entry.tsx";
import type { UsageTotal } from "@antumbra/domain-sessions/rows/usage.ts";
import { expect } from "vitest";
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

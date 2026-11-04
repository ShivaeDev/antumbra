import { answered } from "@antumbra/app-testing/answers.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { provider, raw, started } from "@antumbra/app-testing/test-support/execution-data.ts";
import { expect } from "vitest";

const log = "cost-story";
const usage = (model: string, costUsd?: number) => ({
	type: "usage" as const,
	byModel: [{ model, inputTokens: 10, outputTokens: 20, ...(costUsd === undefined ? {} : { costUsd }) }],
	inputTokens: 10,
	outputTokens: 20,
	...(costUsd === undefined ? {} : { costUsd }),
	raw,
});
const entries = [
	started(log, 0, "root", "hand"),
	provider(log, 1, "root", usage("reported", 0.1)),
	provider(log, 2, "root", { ...usage("unreported"), origin: { node: "child", spawnedBy: "spawn" } }),
];
postgresApp.it(
	"replays delegated spend without inventing missing prices",
	[],
	function* ({ journal, replayJournal, api, appendRunner, holdWrite, rollback, clearPublished, published, rebuild }) {
		const legacy = yield* journal();
		const runner = yield* legacy.runner({ runnerId: "runner", logId: log, backends: [], imageInputBackends: [] });
		yield* runner.append(entries);
		yield* replayJournal(legacy);
		expect(yield* api["costs.reading"]({ today: "1970-01-01" })).toEqual(
			yield* answered(legacy.api.costs.reading({ today: "1970-01-01" }), "journal spend"),
		);
		const previous = yield* api["costs.forAgent"]({ agentId: "hand" });
		expect(previous).toMatchObject({ turns: 2, inputTokens: 20, outputTokens: 40, costUsd: 0.1, costPartial: true });
		yield* clearPublished();
		const next = [provider(log, 3, "root", usage("reported", 0.2))];
		const held = yield* holdWrite(appendRunner(log, next));
		expect(yield* api["costs.forAgent"]({ agentId: "hand" })).toEqual(previous);
		expect(yield* published()).toEqual([]);
		yield* held.commit();
		const total = yield* api["costs.forAgent"]({ agentId: "hand" });
		expect(total).toMatchObject({ turns: 3, costPartial: true });
		expect(total.costUsd).toBeCloseTo(0.3);
		expect(yield* published()).toEqual(expect.arrayContaining(["sessionUsage", "sessionUsage:hand"]));
		yield* clearPublished();
		yield* rollback(appendRunner(log, [provider(log, 4, "root", usage("reported", 0.4))]));
		expect(yield* api["costs.forAgent"]({ agentId: "hand" })).toEqual(total);
		expect(yield* published()).toEqual([]);
		yield* rebuild();
		expect(yield* api["costs.forAgent"]({ agentId: "hand" })).toEqual(total);
	},
);

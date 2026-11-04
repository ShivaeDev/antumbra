import { answered } from "@antumbra/app-testing/answers.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { entry, started } from "@antumbra/app-testing/test-support/execution-data.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import { expect } from "vitest";

const log = "restart-story";
const entries = [
	started(log, 0, "active"),
	entry(log, 1, { type: "InputAccepted", sessionId: "active", requestId: "start:active", inputId: "charter" }),
	started(log, 2, "idle"),
	started(log, 3, "detached"),
	entry(log, 4, { type: "InputAccepted", sessionId: "detached", requestId: "start:detached", inputId: "charter" }),
	entry(log, 5, { type: "SessionDetached", sessionId: "detached" }),
];
postgresApp.it(
	"keeps requested restart explicit through replay, commit and rollback",
	[],
	function* ({ journal, replayJournal, api, rebuild, holdWrite, rollback, published, clearPublished, executionHistory }) {
		const legacy = yield* journal();
		yield* legacy.api.settings.setFlag({ key: "wakeAfterRestart", on: false });
		const runner = yield* legacy.runner({ runnerId: "runner", logId: log, backends: [], imageInputBackends: [] });
		yield* runner.append(entries);
		yield* legacy.api.lifecycle.record({ requestId: Request.make("restart"), runnerIds: ["runner"] });
		yield* replayJournal(legacy);
		expect(yield* api["lifecycle.pending"]({})).toEqual(["active"]);
		expect(yield* api["lifecycle.pending"]({})).toEqual(yield* answered(legacy.api.lifecycle.pending({}), "journal restart"));
		yield* rebuild();
		expect(yield* api["lifecycle.pending"]({})).toEqual(["active"]);
		expect(yield* api["sessions.operations"]({ sessionId: SessionId.make("active") })).toEqual([]);
		yield* clearPublished();
		const held = yield* holdWrite(api["lifecycle.clear"]({ requestId: Request.make("clear") }));
		expect(yield* api["lifecycle.pending"]({})).toEqual(["active"]);
		expect(yield* published()).toEqual([]);
		yield* held.commit();
		expect(yield* api["lifecycle.pending"]({})).toBeNull();
		expect(yield* published()).toEqual(expect.arrayContaining(["restart"]));
		const history = yield* executionHistory.read();
		expect(yield* Effect.flip(api["lifecycle.clear"]({ requestId: Request.make("clear") }))).toMatchObject({ _tag: "AlreadyDone" });
		expect(yield* executionHistory.read()).toEqual(history);
		yield* clearPublished();
		yield* rollback(api["lifecycle.record"]({ requestId: Request.make("rollback"), runnerIds: ["runner"] }));
		expect(yield* api["lifecycle.pending"]({})).toBeNull();
		expect(yield* published()).toEqual([]);
	},
);

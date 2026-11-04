import { answered } from "@antumbra/app-testing/answers.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import { expect } from "vitest";

postgresApp.it(
	"replays stopped loops and resumes only by an explicit committed command",
	[],
	function* ({ journal, replayJournal, api, clock, holdWrite, rollback, clearPublished, published, rebuild }) {
		const legacy = yield* journal();
		yield* legacy.api.supervision.failLoop({ requestId: Request.make("failed"), loop: "mail", message: "delivery stopped", trace: "trace" });
		yield* replayJournal(legacy);
		expect(yield* api["supervision.stoppedLoops"]({})).toEqual(yield* answered(legacy.api.supervision.stoppedLoops({}), "journal stopped loops"));
		yield* clock.advance(1_000);
		yield* clearPublished();
		const held = yield* holdWrite(api["supervision.resumeLoop"]({ requestId: Request.make("resume"), loop: "mail" }));
		expect(yield* api["supervision.stoppedLoops"]({})).toMatchObject([{ state: "stopped" }]);
		expect(yield* published()).toEqual([]);
		yield* held.commit();
		expect(yield* api["supervision.stoppedLoops"]({})).toMatchObject([{ state: "resumed" }]);
		expect(yield* published()).toEqual(["stoppedLoop", "captainReading"]);
		expect(yield* Effect.flip(api["supervision.resumeLoop"]({ requestId: Request.make("resume"), loop: "mail" }))).toMatchObject({
			_tag: "AlreadyDone",
		});
		yield* clearPublished();
		yield* rollback(api["supervision.forgetLoop"]({ requestId: Request.make("forget"), loop: "mail" }));
		expect(yield* api["supervision.stoppedLoops"]({})).toMatchObject([{ state: "resumed" }]);
		expect(yield* published()).toEqual([]);
		yield* rebuild();
		expect(yield* api["supervision.stoppedLoops"]({})).toMatchObject([{ state: "resumed" }]);
	},
);

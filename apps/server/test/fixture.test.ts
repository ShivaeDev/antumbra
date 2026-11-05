import { capturedWorkingSession, fixtureApp } from "@antumbra/app-testing/fixture.ts";
import { expect } from "vitest";

fixtureApp.it("retains new local intent beside captured evidence after restarting the SQL viewer", [capturedWorkingSession], function* (fixture) {
	expect(yield* fixture.voyages()).toEqual([]);
	expect(yield* fixture.session()).toMatchObject({ attached: true, executionStatus: "active" });
	const transcript = yield* fixture.transcript();
	expect(transcript.unavailable).toEqual([]);
	expect(JSON.stringify(transcript.items)).toContain("Captured answer");
	expect(yield* fixture.send()).toMatchObject({ status: "queued_for_wake" });
	yield* fixture.request();
	expect(yield* fixture.checked()).toEqual({ sessions: 1, artifacts: 0, images: 1 });
	yield* fixture.restart;
	expect(yield* fixture.session()).toMatchObject({ attached: true, executionStatus: "active" });
	expect(yield* fixture.input()).toMatchObject({ status: "queued_for_wake", parts: [{ type: "image" }, { type: "text", text: "Local send" }] });
	expect(yield* fixture.pending()).toMatchObject([{ status: "requested", role: "Local agent" }]);
	expect(yield* fixture.operations()).toMatchObject([
		{ kind: "steer", status: "requested" },
		{ kind: "wake", status: "requested" },
	]);
});

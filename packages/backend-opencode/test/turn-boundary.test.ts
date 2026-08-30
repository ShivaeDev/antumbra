import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { expect, it } from "@effect/vitest";
import { Option } from "effect";
import { openSessionProjection } from "#projection.ts";
import { frameFor } from "#session-frames.ts";
import { aborted, frame, idled, SESSION, status } from "#test/frames.ts";

const project = (frames: ReadonlyArray<unknown>): AgentEvent[] => {
	const projection = openSessionProjection();
	return frames.flatMap((raw) =>
		Option.match(frameFor(SESSION, raw), {
			onNone: () => [],
			onSome: projection.events,
		}),
	);
};

const turns = (events: ReadonlyArray<AgentEvent>) => events.flatMap((event) => (event.type === "turn.completed" ? [event.status] : []));

it("reads opencode's own words for what a session is doing", () => {
	const states = project([status("busy"), status("retry"), status("idle")]).flatMap((event) => (event.type === "session.state" ? [event.state] : []));
	expect(states).toEqual(["running", "running", "idle"]);
});

it("ends the turn once, on the first idle after work started", () => {
	expect(turns(project([status("busy"), status("idle"), idled(), idled()]))).toEqual(["completed"]);
});

it("ends an aborted turn once, as interrupted", () => {
	expect(turns(project([status("busy"), aborted(), status("idle"), idled(), idled()]))).toEqual(["interrupted"]);
});

it("ends a broken turn as failed", () => {
	const broken = frame("session.error", {
		error: { name: "ProviderAuthError" },
		sessionID: SESSION,
	});
	expect(turns(project([status("busy"), broken, idled()]))).toEqual(["failed"]);
});

it("says nothing about a turn that never started", () => {
	expect(turns(project([idled()]))).toEqual([]);
});

it("ends each turn of a session that works twice", () => {
	expect(turns(project([status("busy"), idled(), status("busy"), aborted(), idled()]))).toEqual(["completed", "interrupted"]);
});

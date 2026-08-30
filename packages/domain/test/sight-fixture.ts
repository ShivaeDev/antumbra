import type { TemporaryPersistence } from "@antumbra/persistence/testing";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Layer, Schedule } from "effect";
import {
	domainKernelLayer,
	sightSourceTestLayer,
} from "#test/domain-layers.ts";
import { rawOf, type ScriptedBackend } from "#test/harness.ts";

export const eventually = <A, E, R>(check: Effect.Effect<A, E, R>) =>
	check.pipe(
		Effect.catchDefect((defect) => Effect.fail(defect)),
		Effect.retry(Schedule.spaced(10).pipe(Schedule.upTo({ duration: 2000 }))),
	);

export const sightLayer = (
	temporary: TemporaryPersistence,
	scripted: ScriptedBackend,
) =>
	sightSourceTestLayer.pipe(
		Layer.provideMerge(domainKernelLayer(temporary, scripted.backend)),
	);

export const spawnRequest = {
	backend: "scripted",
	charter: "chart the reef",
	role: "navigator",
};

export const note = (n: number): AgentEvent => ({
	raw: rawOf("assistant"),
	role: "agent",
	text: `note ${n}`,
	type: "message",
});

export const liveSession = (scripted: ScriptedBackend, sessionId: string) =>
	eventually(
		scripted
			.session(sessionId)
			.pipe(
				Effect.flatMap((live) =>
					live === undefined
						? Effect.fail("not live yet")
						: Effect.succeed(live),
				),
			),
	);

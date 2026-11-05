import { Inputs } from "@antumbra/server-inputs/service.ts";
import { Sessions } from "@antumbra/server-sessions/service.ts";
import { selection as artifactSelection } from "@antumbra/server-storage/records/artifact.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { selection as sessionInputSelection } from "@antumbra/server-storage/records/session-input.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect } from "effect";
import { readArtifact } from "#adapters/artifacts/acts/read.ts";
import { snapshot } from "#transcript/snapshot.ts";

export const checkFixture = Effect.gen(function* () {
	const rows = yield* Records;
	const sessions = yield* Sessions;
	const inputs = yield* Inputs;
	const held = {
		sessions: yield* rows.session
			.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
			.pipe(Effect.orDie),
		artifacts: yield* rows.artifact
			.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: artifactSelection })
			.pipe(Effect.orDie),
		inputs: yield* rows.sessionInput
			.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: sessionInputSelection })
			.pipe(Effect.orDie),
	};
	for (const target of held.sessions) {
		const reading = yield* snapshot(yield* sessions.transcriptSources({ id: target.id }), target.id);
		if (reading.unavailable.length > 0) return yield* Effect.fail(new Error(`Session ${target.id}: ${reading.unavailable.join(" ")}`));
	}
	for (const target of held.artifacts) yield* readArtifact(target.id);
	let images = 0;
	for (const input of held.inputs)
		for (const [position, part] of input.parts.entries()) {
			if (part.type !== "image") continue;
			yield* inputs.image({ sessionId: input.sessionId, inputId: input.id, position });
			images++;
		}
	return { sessions: held.sessions.length, artifacts: held.artifacts.length, images };
});

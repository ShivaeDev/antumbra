import { artifact } from "@antumbra/domain-artifacts/rows/artifact.ts";
import { sessionInput } from "@antumbra/domain-inputs/rows/input.ts";
import { transcriptSources } from "@antumbra/domain-sessions/queries/transcript.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect, Path, Schema } from "effect";
import { readArtifact } from "#adapters/artifacts/acts/read.ts";
import { handlers } from "#adapters/inputs/handlers.ts";
import { Files } from "#files.ts";
import { snapshot } from "#transcript/snapshot.ts";

const contents = query("fixtureContents", {
	input: {},
	output: Schema.Struct({ sessions: Schema.Array(session.Row), artifacts: Schema.Array(artifact.Row), inputs: Schema.Array(sessionInput.Row) }),
	reads: [session, artifact, sessionInput],
	run: Effect.fn("Fixture.contents")(function* (_input, rows) {
		return { sessions: yield* rows.session.where({}), artifacts: yield* rows.artifact.where({}), inputs: yield* rows.sessionInput.where({}) };
	}),
});

export const checkFixture = Effect.gen(function* () {
	const live = yield* Live;
	const files = yield* Files;
	const path = yield* Path.Path;
	const inputHandlers = yield* handlers(path.join(files.root, "session-inputs"));
	const held = yield* live.read(contents, {});
	for (const target of held.sessions) {
		const sources = yield* live.read(transcriptSources, { id: target.id });
		const reading = yield* snapshot(sources, target.id);
		if (reading.unavailable.length > 0) return yield* Effect.fail(new Error(`Session ${target.id}: ${reading.unavailable.join(" ")}`));
	}
	for (const target of held.artifacts) yield* readArtifact(target.id);
	let images = 0;
	for (const input of held.inputs) {
		for (const [position, part] of input.parts.entries()) {
			if (part.type !== "image") continue;
			yield* inputHandlers["inputs.image"]({ sessionId: input.sessionId, inputId: input.id, position });
			images++;
		}
	}
	return { sessions: held.sessions.length, artifacts: held.artifacts.length, images };
});

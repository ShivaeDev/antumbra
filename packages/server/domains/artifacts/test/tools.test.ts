import { answered, it } from "@antumbra/app-testing/entry.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { chartering, custody, opening, pieceId } from "#test/kit.ts";
import { landArtifactTool } from "#tools/land.ts";
import { removeArtifactSupersessionTool, supersedeArtifactTool } from "#tools/lineage.ts";

it.app("artifact tools bind authors and keep replacement corrections", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	const files = custody();
	const context = { agentId: "agent:cartographer", sessionId: "session:chart", callId: "artifact:old", pieceId };
	const first = { path: "old.md", title: "Old chart" };
	expect(yield* landArtifactTool.invoke(context, first).pipe(Effect.provide(files.layer))).toMatchObject({ ok: true });
	expect(
		yield* landArtifactTool.invoke({ ...context, callId: "artifact:new" }, { path: "new.md", title: "New chart" }).pipe(Effect.provide(files.layer)),
	).toMatchObject({ ok: true });
	const edge = { supersededArtifactId: "artifact:old", successorArtifactId: "artifact:new" };
	expect(yield* supersedeArtifactTool.invoke({ ...context, callId: "replace" }, edge)).toMatchObject({ ok: true });
	expect((yield* answered(app.api.artifacts.byPiece({ pieceId }))).history).toMatchObject([{ authorAgentId: context.agentId, id: "artifact:old" }]);
	expect(yield* removeArtifactSupersessionTool.invoke({ ...context, callId: "correct" }, edge)).toMatchObject({ ok: true });
	expect((yield* answered(app.api.artifacts.byPiece({ pieceId }))).current).toHaveLength(2);
});

it.app("a repeated landing can answer after its source is gone", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	const files = custody();
	const context = { agentId: "agent:cartographer", sessionId: "session:chart", callId: "artifact:chart", pieceId };
	const input = { path: "old.md", title: "Chart" };
	const first = yield* landArtifactTool.invoke(context, input).pipe(Effect.provide(files.layer));
	files.source.clear();
	expect(yield* landArtifactTool.invoke(context, input).pipe(Effect.provide(files.layer))).toEqual(first);
	expect((yield* answered(app.api.artifacts.byPiece({ pieceId }))).current).toHaveLength(1);
});

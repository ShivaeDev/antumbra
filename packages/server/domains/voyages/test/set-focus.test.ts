import { it } from "@antumbra/app-testing/entry.ts";
import { voyage as voyageRecordSchema } from "@antumbra/domain-voyages/rows/voyage.ts";
import { Effect, Schema } from "effect";
import { expect } from "vitest";
import { VoyageId } from "#ids.ts";
import { opening } from "#test/kit.ts";

it.app("sets and clears focus", function* (app) {
	yield* app.api.voyages.open(opening);
	const [opened] = yield* app.rows.voyage
		.findMany({
			where: {},
			orderBy: { field: "opened_order", direction: "asc" },
			select: ["id", "kind", "name", "northStar", "context", "focusedAt", "quietedAt", "openedAt"],
		})
		.pipe(Effect.orDie);
	const id = VoyageId.make(opened?.id ?? "");

	yield* app.api.voyages.setFocus({ focused: true, id });
	expect(
		(yield* app.rows.voyage.findById(id).pipe(Effect.flatMap(Schema.decodeUnknownEffect(voyageRecordSchema.Row)), Effect.orDie)).focusedAt,
	).not.toBeNull();

	yield* app.api.voyages.setFocus({ focused: false, id });
	expect(
		(yield* app.rows.voyage.findById(id).pipe(Effect.flatMap(Schema.decodeUnknownEffect(voyageRecordSchema.Row)), Effect.orDie)).focusedAt,
	).toBeNull();
});

it.app("rejects focus on an unknown voyage", function* (app) {
	const refused = yield* Effect.flip(app.api.voyages.setFocus({ focused: true, id: VoyageId.make("voyage-nowhere") }));

	expect(refused).toMatchObject({ _tag: "Unknown", id: "voyage-nowhere" });
});

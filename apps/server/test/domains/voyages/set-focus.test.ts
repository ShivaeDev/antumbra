import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { opening } from "#test/domains/voyages/kit.ts";
import { it } from "#testing/entry.ts";

it.app("sets and clears focus", function* (app) {
	yield* app.api.voyages.open(opening);
	const [opened] = yield* app.rows.voyage.where({});
	const id = VoyageId.make(opened?.id ?? "");

	yield* app.api.voyages.setFocus({ focused: true, id });
	expect((yield* app.rows.voyage.get(id)).focusedAt).not.toBeNull();

	yield* app.api.voyages.setFocus({ focused: false, id });
	expect((yield* app.rows.voyage.get(id)).focusedAt).toBeNull();
});

it.app("rejects focus on an unknown voyage", function* (app) {
	const refused = yield* Effect.flip(app.api.voyages.setFocus({ focused: true, id: VoyageId.make("voyage-nowhere") }));

	expect(refused).toMatchObject({ _tag: "Unknown", id: "voyage-nowhere" });
});

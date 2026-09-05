import { Changes } from "@antumbra/changes";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { Rulings } from "@antumbra/rulings";
import { defineService } from "@antumbra/service-definition";
import { Effect } from "effect";
import { dispatch } from "#execution/dispatch.ts";
import { heldPieceCount } from "#execution/held-piece-count.ts";
import { retirement } from "#execution/retirement.ts";

export const ExecutionSource = defineService({
	id: "@antumbra/domain/ExecutionSource",
	initialize: Effect.void,
	methods: () => ({ dispatch, heldPieceCount, retirement }),
	requires: [Changes, Database, Pieces, Rulings],
});

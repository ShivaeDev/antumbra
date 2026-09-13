import { fact } from "@antumbra/platform-feature/fact.ts";
import { migration } from "@antumbra/platform-feature/migration.ts";
import { Effect, Schema } from "effect";
import { FlagKey, type SwitchKey } from "#ids.ts";

export const flagSet = fact("FlagSet", { keys: Schema.Array(FlagKey), on: Schema.Boolean });

const FOLDED: Readonly<Record<string, readonly SwitchKey[]>> = {
	holdPieceDispatch: ["resumePieces", "spawnForPiece"],
	holdWakes: ["wakeOnFlashMail", "wakeOnPriorityMail", "wakeOnRoutineMail", "wakeOnHail"],
};

export const foldedHolds = migration(1, {
	fact: flagSet.name,
	rewrite: (stored) => {
		const held = stored.payload.on === true;
		const folded = FOLDED[String(stored.payload.key)];
		if (folded === undefined) return Effect.succeed({ ...stored, payload: { keys: [stored.payload.key], on: held } });
		return Effect.succeed({ ...stored, payload: { keys: folded, on: !held } });
	},
});

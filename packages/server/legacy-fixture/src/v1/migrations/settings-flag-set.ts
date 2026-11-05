import { fact } from "@antumbra/platform-feature/fact.ts";
import { FlagSetPayload } from "@antumbra/platform-vocabulary/settings-event.ts";
import type { SwitchKey } from "@antumbra/platform-vocabulary/settings-ids.ts";
import { Effect, Option, Schema } from "effect";
import { migration } from "#v1/migration.ts";

export const flagSet = fact("FlagSet", FlagSetPayload.fields);

const FOLDED: Readonly<Record<string, readonly SwitchKey[]>> = {
	holdPieceDispatch: ["resumePieces", "spawnForPiece"],
	holdWakes: ["wakeOnFlashMail", "wakeOnPriorityMail", "wakeOnRoutineMail", "wakeOnHail"],
};

const SIGNING = "signChanges";
const storedKeys = Schema.decodeUnknownOption(Schema.Array(Schema.String));

export const foldedHolds = migration(1, {
	fact: flagSet.name,
	rewrite: (stored) => {
		const held = stored.payload.on === true;
		const folded = FOLDED[String(stored.payload.key)];
		if (folded === undefined) return Effect.succeed({ ...stored, payload: { keys: [stored.payload.key], on: held } });
		return Effect.succeed({ ...stored, payload: { keys: folded, on: !held } });
	},
});

export const signingDropped = migration(2, {
	fact: flagSet.name,
	rewrite: (stored) => {
		const keys = storedKeys(stored.payload.keys);
		return Effect.succeed(Option.isSome(keys) && keys.value.includes(SIGNING) ? undefined : stored);
	},
});

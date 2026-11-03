import { row } from "@antumbra/platform-feature/row.ts";
import { Voyage } from "@antumbra/platform-vocabulary/voyage.ts";

export const voyage = row("voyage", Voyage.fields, { key: "id" });

export const quietIds = (voyages: ReadonlyArray<typeof voyage.Row.Type>): ReadonlySet<string> =>
	new Set(voyages.filter((sailing) => sailing.quietedAt !== null).map((sailing) => String(sailing.id)));

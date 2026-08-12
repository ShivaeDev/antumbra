import { Effect } from "effect";
import { appMeta, Database } from "./database.js";
import { Writer } from "./writer.js";

export const ensureInstallMarker = Effect.gen(function* () {
	const db = yield* Database;
	const writer = yield* Writer;
	return yield* writer.write(
		Effect.gen(function* () {
			const meta = yield* appMeta(db);
			const existing = yield* meta.where({ key: "install_id" }).all();
			const current = existing[0];
			if (current !== undefined) {
				return current.value;
			}
			const created = yield* meta.create({
				key: "install_id",
				value: crypto.randomUUID(),
			});
			return created.value;
		}),
	);
});

import { Effect, Option } from "effect";
import { Database } from "#database.ts";

export const ensureInstallMarker = Effect.gen(function* () {
	const db = yield* Database;
	const meta = db.AppMeta;
	const existing = yield* meta.where({ key: "install_id" }).first();
	if (Option.isSome(existing)) {
		return existing.value.value;
	}
	const value = crypto.randomUUID();
	return yield* meta.create({ key: "install_id", value }).pipe(
		Effect.as(value),
		Effect.catchTag("PrismaError", (failure) =>
			meta
				.where({ key: "install_id" })
				.first()
				.pipe(
					Effect.flatMap(
						Option.match({
							onNone: () => Effect.fail(failure),
							onSome: (row) => Effect.succeed(row.value),
						}),
					),
				),
		),
	);
});

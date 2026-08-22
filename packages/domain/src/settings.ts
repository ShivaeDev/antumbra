import {
	DEFAULT_MAX_PARALLEL_SESSIONS,
	Settings,
	SettingsSource,
	type UpdateSettings,
} from "@antumbra/contract";
import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import { Clock, Effect, Layer, Option, Schema } from "effect";

const KEY = "settings:max-parallel-sessions";

const decode = (value: string | undefined) =>
	value === undefined
		? Effect.succeed({ maxParallelSessions: DEFAULT_MAX_PARALLEL_SESSIONS })
		: Schema.decodeUnknownEffect(Settings)({
				maxParallelSessions: Number(value),
			});

const persist = (settings: UpdateSettings) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const writer = yield* Writer;
		const now = yield* Clock.currentTimeMillis;
		return yield* writer.write(
			Effect.gen(function* () {
				const exists = yield* db.AppMeta.where({ key: KEY }).exists();
				if (exists) {
					yield* db.AppMeta.where({ key: KEY }).update({
						updatedAt: new Date(now),
						value: String(settings.maxParallelSessions),
					});
				} else {
					yield* db.AppMeta.create({
						key: KEY,
						value: String(settings.maxParallelSessions),
					});
				}
				return settings;
			}),
		);
	});

export const SettingsSourceLive = Layer.effect(SettingsSource)(
	Effect.gen(function* () {
		const db = yield* Database;
		const writer = yield* Writer;
		const executors = yield* Effect.context<WriteExecutors>();
		const current = Effect.gen(function* () {
			const row = yield* db.AppMeta.where({ key: KEY }).first();
			return yield* decode(
				Option.match(row, {
					onNone: () => undefined,
					onSome: (found) => found.value,
				}),
			);
		}).pipe(Effect.provideContext(executors));
		const update = (settings: UpdateSettings) =>
			persist(settings).pipe(
				Effect.provideService(Database, db),
				Effect.provideService(Writer, writer),
				Effect.provideContext(executors),
			);
		return { current, update };
	}),
);

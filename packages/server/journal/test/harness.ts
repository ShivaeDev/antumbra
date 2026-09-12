import { it as test } from "@effect/vitest";
import { Effect, Latch, Layer, Queue, type Scope } from "effect";
import { app } from "#app.ts";
import { pieces } from "#example/feature.ts";
import { type Announcement, type Muster, Roster } from "#example/ports/roster.ts";
import * as Journal from "#journal.ts";
import { kit } from "#testing/kit.ts";
import type { TestKit } from "#testing/surface.ts";

export const definition = app([pieces]);

export interface ScriptedRoster {
	readonly announcements: Effect.Effect<readonly Announcement[]>;
	readonly hold: Effect.Effect<void>;
	readonly musters: Effect.Effect<readonly Muster[]>;
	readonly release: Effect.Effect<void>;
	readonly sail: (crew: readonly string[]) => Effect.Effect<void>;
	readonly untilAnnounced: (matches: (announcement: Announcement) => boolean) => Effect.Effect<Announcement>;
	readonly untilMustered: (matches: (counts: Muster) => boolean) => Effect.Effect<Muster>;
}

export type Example = TestKit<typeof definition.features> & { readonly roster: ScriptedRoster };

const until = <Value>(queue: Queue.Queue<Value>, matches: (value: Value) => boolean): Effect.Effect<Value> =>
	Effect.flatMap(Queue.take(queue), (value) => (matches(value) ? Effect.succeed(value) : until(queue, matches)));

const scripted = Effect.gen(function* () {
	const latch = yield* Latch.make(true);
	const announced = yield* Queue.make<Announcement>();
	const mustered = yield* Queue.make<Muster>();
	const announcements: Announcement[] = [];
	const musters: Muster[] = [];
	let crew: readonly string[] = [];
	const port: Roster["Service"] = {
		announce: (announcement) =>
			Effect.gen(function* () {
				announcements.push(announcement);
				yield* Queue.offer(announced, announcement);
				yield* latch.await;
			}),
		crew: Effect.sync(() => crew),
		muster: (counts) =>
			Effect.gen(function* () {
				musters.push(counts);
				yield* Queue.offer(mustered, counts);
			}),
	};
	const roster: ScriptedRoster = {
		announcements: Effect.sync(() => [...announcements]),
		hold: Effect.asVoid(latch.close),
		musters: Effect.sync(() => [...musters]),
		release: Effect.asVoid(latch.open),
		sail: (names) =>
			Effect.sync(() => {
				crew = names;
			}),
		untilAnnounced: (matches) => until(announced, matches),
		untilMustered: (matches) => until(mustered, matches),
	};
	return { port, roster };
});

const layerOf = (roster: Roster["Service"]) =>
	Layer.provideMerge(Journal.layer(definition), Layer.merge(Journal.memory(), Layer.succeed(Roster, roster)));

type Services = Layer.Success<ReturnType<typeof layerOf>>;

export const example = <Done>(
	name: string,
	body: (app: Example) => Generator<Effect.Effect<unknown, unknown, Services | Scope.Scope>, Done, never>,
): void =>
	test.effect(name, () =>
		Effect.gen(function* () {
			const double = yield* scripted;
			const services = yield* Layer.build(layerOf(double.port));
			return yield* Effect.gen(function* () {
				const parts = yield* kit(definition);
				return yield* Effect.gen(() => body({ ...parts, roster: double.roster }));
			}).pipe(Effect.provide(services));
		}).pipe(Effect.orDie),
	);

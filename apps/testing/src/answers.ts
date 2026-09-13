import { Effect, Option, Stream } from "effect";
import { deadline } from "#waiting.ts";

const shown = (value: unknown): string => {
	const visited = new WeakSet<object>();
	const written = JSON.stringify(value, (_key, part: unknown) => {
		if (typeof part === "bigint") return `${part}n`;
		if (typeof part !== "object" || part === null) return part;
		if (visited.has(part)) return "[circular]";
		visited.add(part);
		return part;
	});
	return written ?? String(value);
};

const lastSeen = (seen: Option.Option<unknown>): string => (Option.isNone(seen) ? "; nothing was seen" : `; last saw ${shown(seen.value)}`);

export const eventually = <Value, Failure, Requirements>(
	stream: Stream.Stream<Value, Failure, Requirements>,
	predicate: (value: Value) => boolean,
	description: string,
): Effect.Effect<Value, Failure, Requirements> => {
	let seen = Option.none<unknown>();
	const watched = Stream.tap(stream, (value) =>
		Effect.sync(() => {
			seen = Option.some(value);
		}),
	);
	const matching = Stream.runHead(Stream.filter(watched, predicate)).pipe(
		Effect.flatMap(
			Option.match({
				onNone: () => Effect.die(`The answers ended before ${description}${lastSeen(seen)}`),
				onSome: (value: Value) => Effect.succeed(value),
			}),
		),
	);
	return Effect.raceFirst(
		matching,
		deadline(description, () => lastSeen(seen)),
	);
};

export const answered = <Value, Failure, Requirements>(
	stream: Stream.Stream<Value, Failure, Requirements>,
	description: string,
): Effect.Effect<Value, Failure, Requirements> => eventually(stream, () => true, description);

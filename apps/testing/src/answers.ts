import { Effect, Option, Stream } from "effect";

export const answered = <Value, Failure, Requirements>(
	stream: Stream.Stream<Value, Failure, Requirements>,
): Effect.Effect<Value, Failure, Requirements> => Effect.map(Stream.runHead(stream), Option.getOrThrow);

export const eventually = <Value, Failure, Requirements>(
	stream: Stream.Stream<Value, Failure, Requirements>,
	predicate: (value: Value) => boolean,
): Effect.Effect<Value, Failure, Requirements> => answered(Stream.filter(stream, predicate));

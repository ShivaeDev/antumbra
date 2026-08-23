import { expect, it } from "@effect/vitest";
import { Effect, type Exit, Layer, Option, Schema, Tracer } from "effect";
import { defineIntent } from "#intent.ts";

const EMPTY = Schema.Struct({});

type NativeSpanOptions = ConstructorParameters<typeof Tracer.NativeSpan>[0];

// why: a span reaches the trace sink when it ends, and the sink builds its row
// from the name and attributes it finds there. Collecting ended spans is the
// same view of a run that the trace file would hold.
class CollectedSpan extends Tracer.NativeSpan {
	readonly #record: (span: Tracer.Span) => void;

	constructor(options: NativeSpanOptions, record: (span: Tracer.Span) => void) {
		super(options);
		this.#record = record;
	}

	override end(endTime: bigint, exit: Exit.Exit<unknown, unknown>): void {
		super.end(endTime, exit);
		this.#record(this);
	}
}

interface Collector {
	readonly layer: Layer.Layer<never>;
	readonly named: (name: string) => readonly Tracer.Span[];
}

const collecting = (): Collector => {
	const ended: Tracer.Span[] = [];
	const record = (span: Tracer.Span): void => {
		ended.push(span);
	};
	return {
		layer: Layer.succeed(Tracer.Tracer)(
			Tracer.make({ span: (options) => new CollectedSpan(options, record) }),
		),
		named: (name) => ended.filter((span) => span.name === name),
	};
};

// why: the ids a birth puts on its scope are annotated from inside the running
// intent, which is where the spawn seam sets them.
const provision = Effect.void.pipe(
	Effect.withSpan("moorage.provision"),
	Effect.annotateSpans({
		agentId: "agent-traced",
		sessionId: "session-traced",
	}),
);

const kind = defineIntent({
	execute: () => provision,
	payload: EMPTY,
	tag: "test/traced",
});

// why: the caller opens a span of its own so the rooting is observable — an
// intent admitted while something else was being traced still traces alone.
const runTracedIntent = (collector: Collector) =>
	Effect.gen(function* () {
		const payload = yield* kind.encode({});
		yield* kind.run("intent-traced", payload);
	}).pipe(Effect.withSpan("caller"), Effect.provide(collector.layer));

it.effect("opens one span named for the kind on every intent run", () =>
	Effect.gen(function* () {
		const collector = collecting();
		yield* runTracedIntent(collector);
		const opened = collector.named("intent test/traced");
		expect(opened.map((span) => span.attributes.get("intentId"))).toEqual([
			"intent-traced",
		]);
	}),
);

it.effect("gives the intent a trace of its own rather than the caller's", () =>
	Effect.gen(function* () {
		const collector = collecting();
		yield* runTracedIntent(collector);
		const opened = collector.named("intent test/traced");
		expect(opened.map((span) => Option.isNone(span.parent))).toEqual([true]);
		expect(opened.map((span) => span.traceId)).not.toEqual(
			collector.named("caller").map((span) => span.traceId),
		);
	}),
);

it.effect("carries the intent id down to every span the run opens", () =>
	Effect.gen(function* () {
		const collector = collecting();
		yield* runTracedIntent(collector);
		const beneath = collector.named("moorage.provision");
		expect(beneath.map((span) => span.attributes.get("intentId"))).toEqual([
			"intent-traced",
		]);
		expect(beneath.map((span) => span.traceId)).toEqual(
			collector.named("intent test/traced").map((span) => span.traceId),
		);
	}),
);

it.effect("keeps the ids annotated inside the run beside the intent id", () =>
	Effect.gen(function* () {
		const collector = collecting();
		yield* runTracedIntent(collector);
		const [beneath] = collector.named("moorage.provision");
		expect(beneath?.attributes.get("sessionId")).toBe("session-traced");
		expect(beneath?.attributes.get("agentId")).toBe("agent-traced");
		expect(beneath?.attributes.get("intentId")).toBe("intent-traced");
	}),
);

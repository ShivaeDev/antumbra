import { it as effectIt } from "@effect/vitest";
import { Effect } from "effect";
import type { ClockMode } from "#clock.ts";

// why: Layer.provide leaves TestClock and Scope in R, which it.effect
// closes. The wrapper cannot name that leftover without forging a cast.
type AnyEffect = Effect.Effect<any, any, any>;

export type EffectAppBody<Harness> = (
	harness: Harness,
) => Generator<AnyEffect, unknown>;

export interface EffectAppOptions {
	readonly clock?: "live";
}

export type Around<Harness> = (
	body: (harness: Harness) => AnyEffect,
	mode: ClockMode,
) => AnyEffect;

export interface EffectIt<Harness> {
	readonly effectApp: {
		(name: string, test: EffectAppBody<Harness>): void;
		(
			name: string,
			options: EffectAppOptions,
			test: EffectAppBody<Harness>,
		): void;
	};
}

const missingBody = function* () {
	yield* Effect.die("effectApp requires a test body");
};

const isBody = <Harness>(
	value: EffectAppOptions | EffectAppBody<Harness>,
): value is EffectAppBody<Harness> => typeof value === "function";

const modeOf = (options: EffectAppOptions): ClockMode =>
	options.clock === "live" ? "live" : "test";

const parse = <Harness>(
	optionsOrTest: EffectAppOptions | EffectAppBody<Harness>,
	maybeTest: EffectAppBody<Harness> | undefined,
): { readonly mode: ClockMode; readonly test: EffectAppBody<Harness> } => {
	if (isBody(optionsOrTest)) {
		return { mode: "test", test: optionsOrTest };
	}
	return { mode: modeOf(optionsOrTest), test: maybeTest ?? missingBody };
};

export const makeEffectIt = <Harness>(
	around: Around<Harness>,
): EffectIt<Harness> => {
	function effectApp(name: string, test: EffectAppBody<Harness>): void;
	function effectApp(
		name: string,
		options: EffectAppOptions,
		test: EffectAppBody<Harness>,
	): void;
	function effectApp(
		name: string,
		optionsOrTest: EffectAppOptions | EffectAppBody<Harness>,
		maybeTest?: EffectAppBody<Harness>,
	) {
		const { mode, test } = parse(optionsOrTest, maybeTest);
		const program = () =>
			around((harness) => Effect.gen(() => test(harness)), mode);
		if (mode === "live") {
			effectIt.live(name, program);
			return;
		}
		effectIt.effect(name, program);
	}
	return { effectApp };
};

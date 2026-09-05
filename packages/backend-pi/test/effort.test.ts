import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { thinkingLevel } from "#effort.ts";

it.effect("leaves the thinking level to pi when the voyage named no effort", () =>
	Effect.map(thinkingLevel(Option.none()), (level) => {
		expect(level).toBeUndefined();
	}),
);

it.effect("passes an effort pi knows straight through", () =>
	Effect.map(thinkingLevel(Option.some("xhigh")), (level) => {
		expect(level).toBe("xhigh");
	}),
);

it.effect("refuses an effort pi has no thinking level for", () =>
	Effect.map(Effect.exit(thinkingLevel(Option.some("max"))), (outcome) => {
		expect(outcome._tag).toBe("Failure");
	}),
);

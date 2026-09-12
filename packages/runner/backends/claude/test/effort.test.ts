import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { effortLevel } from "#effort.ts";

it.effect("an unset effort leaves Claude on its own", () =>
	Effect.map(effortLevel(Option.none()), (level) => {
		expect(level).toBeUndefined();
	}),
);

it.effect("a level Claude offers is handed through", () =>
	Effect.map(effortLevel(Option.some("xhigh")), (level) => {
		expect(level).toBe("xhigh");
	}),
);

it.effect("a level Claude does not offer is refused by name", () =>
	Effect.map(Effect.flip(effortLevel(Option.some("ultra"))), (failure) => {
		expect(failure.tag).toBe("claude");
		expect(failure.detail).toBe("effort ultra is not a level Claude offers; choose one of low, medium, high, xhigh, max");
	}),
);

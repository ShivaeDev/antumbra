import { BackendRegistry } from "@antumbra/runner-fabric/ports.ts";
import { BackendFailure } from "@antumbra/runner-ports/backend.ts";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { makePiBackend } from "#backends/pi/backend.ts";
import { listModels } from "#catalogue.ts";

it.effect("reads fresh provider choices for each model catalogue request", () => {
	let revision = 0;
	const backend = {
		...makePiBackend({ skills: "/skills" }),
		listModels: Effect.sync(() => [{ id: `model-${++revision}`, name: "Model", isDefault: true, efforts: ["high"] }]),
	};
	return Effect.gen(function* () {
		const first = yield* listModels({ type: "ListModels", requestId: "first", backend: "pi" });
		const second = yield* listModels({ type: "ListModels", requestId: "second", backend: "pi" });
		expect(first).toEqual({
			type: "ModelsListed",
			backend: "pi",
			models: [{ id: "model-1", name: "Model", isDefault: true, efforts: ["high"] }],
			failure: null,
		});
		expect(second).toEqual({
			type: "ModelsListed",
			backend: "pi",
			models: [{ id: "model-2", name: "Model", isDefault: true, efforts: ["high"] }],
			failure: null,
		});
	}).pipe(Effect.provideService(BackendRegistry, { backends: new Map([["pi", backend]]) }));
});

it.effect("returns provider catalogue failure as a reply", () => {
	const backend = {
		...makePiBackend({ skills: "/skills" }),
		listModels: Effect.fail(new BackendFailure({ tag: "pi", detail: "catalogue unavailable" })),
	};
	return Effect.gen(function* () {
		expect(yield* listModels({ type: "ListModels", requestId: "request", backend: "pi" })).toEqual({
			type: "ModelsListed",
			backend: "pi",
			models: [],
			failure: "pi: catalogue unavailable",
		});
	}).pipe(Effect.provideService(BackendRegistry, { backends: new Map([["pi", backend]]) }));
});

import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Layer, Schema } from "effect";
import * as Atom from "effect/unstable/reactivity/Atom";
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";
import * as Form from "#form.ts";

const Name = Schema.Struct({ name: Schema.Trim });
const runtime = Atom.runtime(Layer.empty);

it.live("a successful save establishes the submitted baseline", () =>
	Effect.gen(function* () {
		const registry = yield* AtomRegistry.AtomRegistry;
		const form = Form.make(Name, { initialValues: { name: "First" }, onSubmit: Effect.succeed, runtime });
		yield* AtomRegistry.mount(registry, form.dirty);
		form.change("name", "  Saved  ");
		registry.set(form.submit, undefined);
		expect(yield* AtomRegistry.getResult(registry, form.submit)).toEqual({ name: "Saved" });
		expect(form.values.value).toEqual({ name: "  Saved  " });
		expect(registry.get(form.dirty)).toBe(false);
		form.change("name", "First");
		expect(registry.get(form.dirty)).toBe(true);
	}).pipe(Effect.provide(AtomRegistry.layer)),
);

it.live("a rejected save keeps the draft dirty", () =>
	Effect.gen(function* () {
		const registry = yield* AtomRegistry.AtomRegistry;
		const form = Form.make(Name, {
			initialValues: { name: "First" },
			onSubmit: (_, submitter) => submitter.fail("name", "Already used"),
			runtime,
		});
		yield* AtomRegistry.mount(registry, form.dirty);
		form.change("name", "Taken");
		registry.set(form.submit, undefined);
		expect(yield* Effect.flip(AtomRegistry.getResult(registry, form.submit))).toMatchObject({ message: "Already used" });
		expect(form.values.value).toEqual({ name: "Taken" });
		expect(registry.get(form.dirty)).toBe(true);
	}).pipe(Effect.provide(AtomRegistry.layer)),
);

it.live("edits made during a save remain dirty after it succeeds", () =>
	Effect.gen(function* () {
		const registry = yield* AtomRegistry.AtomRegistry;
		const started = yield* Deferred.make<void>();
		const complete = yield* Deferred.make<void>();
		const form = Form.make(Name, {
			initialValues: { name: "First" },
			onSubmit: (value) => Deferred.succeed(started, undefined).pipe(Effect.andThen(Deferred.await(complete)), Effect.as(value)),
			runtime,
		});
		yield* AtomRegistry.mount(registry, form.dirty);
		form.change("name", "Submitted");
		registry.set(form.submit, undefined);
		yield* Deferred.await(started);
		form.change("name", "Still editing");
		yield* Deferred.succeed(complete, undefined);
		expect(yield* AtomRegistry.getResult(registry, form.submit, { suspendOnWaiting: true })).toEqual({ name: "Submitted" });
		expect(form.values.value).toEqual({ name: "Still editing" });
		expect(registry.get(form.dirty)).toBe(true);
		form.change("name", "Submitted");
		expect(registry.get(form.dirty)).toBe(false);
	}).pipe(Effect.provide(AtomRegistry.layer)),
);

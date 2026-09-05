import { expect, it } from "@effect/vitest";
import { Effect, Exit } from "effect";
import { useEffect } from "react";
import { mount, settle } from "#test/dom.ts";

it.effect("releases mounted effects and connected DOM when a test scope fails", () =>
	Effect.gen(function* () {
		let active = false;
		const Observer = () => {
			useEffect(() => {
				active = true;
				return () => {
					active = false;
				};
			}, []);
			return <span>Observed</span>;
		};
		const containers: HTMLElement[] = [];
		const result = yield* Effect.gen(function* () {
			const { container, root } = yield* mount();
			containers.push(container);
			yield* settle(() => root.render(<Observer />));
			expect(container.isConnected).toBe(true);
			expect(active).toBe(true);
			return yield* Effect.fail("test failed");
		}).pipe(Effect.scoped, Effect.exit);

		expect(Exit.isFailure(result)).toBe(true);
		expect(active).toBe(false);
		expect(containers[0]?.isConnected).toBe(false);
	}),
);

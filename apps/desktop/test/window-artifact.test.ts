import {
	RequestOrigin,
	type WindowPlace,
	WindowSource,
} from "@antumbra/contract";
import { describe, expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import {
	closeChildren,
	makeWindowRegistry,
} from "#adapters/windows/registry.ts";
import { WindowSourceLive } from "#adapters/windows/source.ts";
import { subjectOf } from "#adapters/windows/subject.ts";
import {
	artifactPlace,
	consolePlace,
	handleFor,
	ownWindow,
	transcriptPlace,
} from "#test/windows.ts";

const asWindow = <A, E>(
	source: Effect.Effect<A, E, RequestOrigin | WindowSource>,
	shell: Parameters<typeof WindowSourceLive>[0],
	windowId: string,
) =>
	source.pipe(
		Effect.provide(
			Layer.mergeAll(
				WindowSourceLive(shell),
				Layer.succeed(RequestOrigin, { windowId }),
			),
		),
	);

const windows = Effect.flatMap(WindowSource, (source) =>
	Effect.succeed(source),
);

const open = (place: WindowPlace) =>
	Effect.flatMap(windows, (source) => source.open(place));

describe("artifact windows", () => {
	// why: an artifact and a session can carry the same identifier without
	// being the same thing, so the subject a window is opened for is the role
	// and the identifier together, never the identifier alone.
	it("tells an artifact apart from a session wearing the same id", () => {
		expect(subjectOf(artifactPlace("x"))).not.toBe(
			subjectOf(transcriptPlace("x")),
		);
		expect(subjectOf(artifactPlace("x"))).toBe(subjectOf(artifactPlace("x")));
		expect(subjectOf(artifactPlace("x"))).not.toBe(
			subjectOf(artifactPlace("y")),
		);
	});

	it.effect("focuses the window an artifact already has", () =>
		Effect.gen(function* () {
			const registry = makeWindowRegistry();
			const shell = { document: "file:///app/console.html", registry };
			const calls: Array<string> = [];
			ownWindow(registry, "console", consolePlace);
			ownWindow(
				registry,
				"artifact",
				artifactPlace("artifact-1"),
				handleFor(calls, "artifact"),
			);

			yield* asWindow(open(artifactPlace("artifact-1")), shell, "console");

			expect(calls).toEqual(["show artifact", "focus artifact"]);
			expect(registry.children()).toHaveLength(1);
		}),
	);

	// why: an artifact window is a child like any other — it is opened from the
	// console and cannot become a second place the work is driven from.
	it.effect("lets no artifact window open another", () =>
		Effect.gen(function* () {
			const registry = makeWindowRegistry();
			const shell = { document: "file:///app/console.html", registry };
			ownWindow(registry, "console", consolePlace);
			ownWindow(registry, "artifact", artifactPlace("artifact-1"));

			const refusal = yield* Effect.flip(
				asWindow(open(artifactPlace("artifact-2")), shell, "artifact"),
			);
			expect(refusal.reason).toBe("not_the_console");

			const console_ = yield* Effect.flip(
				asWindow(open(consolePlace), shell, "console"),
			);
			expect(console_.reason).toBe("console_is_not_a_target");
		}),
	);

	// why: a role is minted once, at open. An artifact window that could call
	// itself a transcript could ask for a window it was never given.
	it.effect("never lets an artifact window rename its role", () =>
		Effect.gen(function* () {
			const registry = makeWindowRegistry();
			const shell = { document: "file:///app/console.html", registry };
			ownWindow(registry, "artifact", artifactPlace("artifact-1"));

			const refusal = yield* Effect.flip(
				asWindow(
					Effect.flatMap(windows, (source) =>
						source.remember(transcriptPlace("session-1")),
					),
					shell,
					"artifact",
				),
			);

			expect(refusal.reason).toBe("role_is_immutable");
			expect(registry.windowOf("artifact")?.place).toEqual(
				artifactPlace("artifact-1"),
			);
		}),
	);

	it("takes artifact windows down with the console", () => {
		const registry = makeWindowRegistry();
		const calls: Array<string> = [];
		ownWindow(registry, "console", consolePlace);
		ownWindow(
			registry,
			"artifact",
			artifactPlace("artifact-1"),
			handleFor(calls, "artifact"),
		);

		closeChildren(registry, consolePlace);
		expect(calls).toEqual(["close artifact"]);
	});
});

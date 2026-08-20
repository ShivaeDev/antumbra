import {
	RequestOrigin,
	type WindowPlace,
	WindowSource,
} from "@antumbra/contract";
import { describe, expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { makeWindowRegistry } from "#adapters/windows/registry.ts";
import { WindowSourceLive } from "#adapters/windows/source.ts";
import {
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

describe("window source", () => {
	it.effect("refuses a caller no window record answers for", () =>
		Effect.gen(function* () {
			const registry = makeWindowRegistry();
			const shell = { document: "file:///app/console.html", registry };
			const refusal = yield* Effect.flip(
				asWindow(
					Effect.flatMap(windows, (source) => source.place),
					shell,
					"nobody",
				),
			);
			expect(refusal.reason).toBe("unknown_window");
		}),
	);

	it.effect("tells each window where it is, across a reload", () =>
		Effect.gen(function* () {
			const registry = makeWindowRegistry();
			const shell = { document: "file:///app/console.html", registry };
			ownWindow(registry, "console", consolePlace);
			const child = ownWindow(registry, "child", transcriptPlace("session-1"));

			const place = Effect.flatMap(windows, (source) => source.place);
			expect(yield* asWindow(place, shell, "console")).toEqual(consolePlace);
			expect(yield* asWindow(place, shell, "child")).toEqual(
				transcriptPlace("session-1"),
			);

			// why: a reload keeps the same WebContents at the same document, so the
			// record still stands and the window comes back to its own subject.
			expect(
				registry.owner({
					sender: child.contents,
					senderFrame: child.contents.mainFrame,
				})?.place,
			).toEqual(transcriptPlace("session-1"));
		}),
	);

	it.effect(
		"lets only the console open windows, and never another console",
		() =>
			Effect.gen(function* () {
				const registry = makeWindowRegistry();
				const shell = { document: "file:///app/console.html", registry };
				ownWindow(registry, "console", consolePlace);
				ownWindow(registry, "child", transcriptPlace("session-1"));
				const open = (place: WindowPlace) =>
					Effect.flatMap(windows, (source) => source.open(place));

				expect(
					(yield* Effect.flip(
						asWindow(open(transcriptPlace("session-2")), shell, "child"),
					)).reason,
				).toBe("not_the_console");
				expect(
					(yield* Effect.flip(asWindow(open(consolePlace), shell, "console")))
						.reason,
				).toBe("console_is_not_a_target");
				expect(registry.children()).toHaveLength(1);
			}),
	);

	it.effect(
		"focuses the window a subject already has instead of minting one",
		() =>
			Effect.gen(function* () {
				const registry = makeWindowRegistry();
				const shell = { document: "file:///app/console.html", registry };
				const calls: Array<string> = [];
				ownWindow(registry, "console", consolePlace);
				ownWindow(
					registry,
					"child",
					transcriptPlace("session-1"),
					handleFor(calls, "child"),
				);

				yield* asWindow(
					Effect.flatMap(windows, (source) =>
						source.open(transcriptPlace("session-1")),
					),
					shell,
					"console",
				);
				expect(calls).toEqual(["show child", "focus child"]);
				expect(registry.children()).toHaveLength(1);
			}),
	);

	it.effect("lets a window move within its role but never rename it", () =>
		Effect.gen(function* () {
			const registry = makeWindowRegistry();
			const shell = { document: "file:///app/console.html", registry };
			ownWindow(registry, "console", consolePlace);
			const remember = (place: WindowPlace) =>
				Effect.flatMap(windows, (source) => source.remember(place));

			yield* asWindow(
				remember({ ...consolePlace, mode: "quay", voyageId: "voyage-1" }),
				shell,
				"console",
			);
			expect(registry.windowOf("console")?.place).toEqual({
				...consolePlace,
				mode: "quay",
				voyageId: "voyage-1",
			});

			expect(
				(yield* Effect.flip(
					asWindow(remember(transcriptPlace("session-1")), shell, "console"),
				)).reason,
			).toBe("role_is_immutable");
			expect(registry.windowOf("console")?.place.role).toBe("console");
		}),
	);
});

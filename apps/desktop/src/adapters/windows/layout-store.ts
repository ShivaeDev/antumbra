import { Effect, type FileSystem } from "effect";
import {
	readLayout,
	type WindowLayout,
	writeLayout,
} from "#adapters/windows/layout.ts";

export interface LayoutStore {
	readonly load: Effect.Effect<WindowLayout | undefined>;
	readonly save: (layout: WindowLayout) => Effect.Effect<void>;
}

const unreadable = Effect.as(
	Effect.logWarning(
		"bridge: window layout unreadable; opening a default console",
	),
	undefined,
);

// why: where the windows were is the one thing in the data directory the app
// can lose without losing anything — so both sides swallow their failures. A
// boot that cannot read it opens the way a first run does, and a save that
// cannot write it leaves the caller none the wiser.
export const fileLayoutStore = (
	fs: FileSystem.FileSystem,
	path: string,
): LayoutStore => ({
	load: fs.readFileString(path).pipe(
		Effect.flatMap((text): Effect.Effect<WindowLayout | undefined> => {
			const layout = readLayout(text);
			return layout === undefined ? unreadable : Effect.succeed(layout);
		}),
		Effect.catchCause(() => Effect.succeed(undefined)),
	),
	save: (layout) =>
		fs
			.writeFileString(path, writeLayout(layout))
			.pipe(
				Effect.catchCause((cause) =>
					Effect.logWarning("bridge: window layout not saved", cause),
				),
			),
});

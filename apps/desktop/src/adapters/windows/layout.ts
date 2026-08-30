import { type ConsolePlace, WindowPlace } from "@antumbra/contract";
import { Result, Schema } from "effect";
import { subjectOf } from "#adapters/windows/subject.ts";

const RememberedWindow = Schema.Struct({
	id: Schema.String,
	place: WindowPlace,
});
export type RememberedWindow = typeof RememberedWindow.Type;

// why: the version literal gives a file this build did not write exactly one
// defined behaviour — it fails to decode, and the app opens the way it does on
// a first run — rather than a half-understood layout reopening windows onto
// guesses about what its fields once meant.
export const WindowLayout = Schema.Struct({
	focused: Schema.NullOr(Schema.String),
	version: Schema.Literal(3),
	windows: Schema.Array(RememberedWindow),
});
export type WindowLayout = typeof WindowLayout.Type;

const decodeLayout = Schema.decodeUnknownResult(
	Schema.fromJsonString(WindowLayout),
);

// why: the console opens on the flagship because the fleet's highest-level
// agent is somewhere to talk, not somewhere to navigate to — a first run lands
// in the captain's conversation rather than on a dashboard about the fleet.
export const defaultConsole = {
	changeId: null,
	mode: "flagship",
	pieceId: null,
	role: "console",
	sessionId: null,
	voyageId: null,
} as const satisfies ConsolePlace;

export const layoutOf = (
	windows: ReadonlyArray<RememberedWindow>,
	focused: string | null,
): WindowLayout => ({ focused, version: 3, windows });

// why: window layout is glass, not truth. A file that cannot be read is a
// layout we do not have, which is a state the app already knows how to be in —
// so unreadable text, unparseable JSON, and a shape from another build all
// arrive at the same answer rather than at three failure paths.
export const readLayout = (raw: string): WindowLayout | undefined => {
	const decoded = decodeLayout(raw);
	return Result.isFailure(decoded) ? undefined : decoded.success;
};

// why: reading is where trust matters, so the schema guards that side. What is
// written is a value this process just built and already holds to the type.
export const writeLayout = (layout: WindowLayout): string =>
	JSON.stringify(layout, null, 2);

export interface RestorePlan {
	readonly children: ReadonlyArray<RememberedWindow>;
	readonly consoleWindow: RememberedWindow;
	readonly focused: string | null;
}

// why: a file naming the same subject twice is that window written down twice,
// not two windows to open — the same rule the registry refuses a second window
// by, asked of a file instead of a caller.
const firstPerSubject = (
	windows: ReadonlyArray<RememberedWindow>,
): ReadonlyArray<RememberedWindow> => {
	const seen = new Set<string>();
	return windows.filter((window) => {
		const key = subjectOf(window.place);
		if (seen.has(key)) {
			return false;
		}
		seen.add(key);
		return true;
	});
};

// why: the app is one console, so restoring reads at most one out of the file
// however many it names, and mints a default one when it names none. A layout
// can only ever say where the console was, never how many there are.
export const restorePlan = (layout: WindowLayout | undefined): RestorePlan => {
	const windows = layout?.windows ?? [];
	const remembered = windows.find((window) => window.place.role === "console");
	return {
		children: firstPerSubject(
			windows.filter((window) => window.place.role !== "console"),
		),
		consoleWindow: remembered ?? { id: "console", place: defaultConsole },
		focused: layout?.focused ?? null,
	};
};

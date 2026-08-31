import { type ConsolePlace, WindowPlace } from "@antumbra/contract";
import { Result, Schema } from "effect";
import { subjectOf } from "#adapters/windows/subject.ts";

const RememberedWindow = Schema.Struct({
	id: Schema.String,
	place: WindowPlace,
});
export type RememberedWindow = typeof RememberedWindow.Type;

export const WindowLayout = Schema.Struct({
	focused: Schema.NullOr(Schema.String),
	version: Schema.Literal(2),
	windows: Schema.Array(RememberedWindow),
});
export type WindowLayout = typeof WindowLayout.Type;

const decodeLayout = Schema.decodeUnknownResult(Schema.fromJsonString(WindowLayout));

export const defaultConsole = {
	changeId: null,
	mode: "flagship",
	pieceId: null,
	role: "console",
	sessionId: null,
	voyageId: null,
} as const satisfies ConsolePlace;

export const layoutOf = (windows: ReadonlyArray<RememberedWindow>, focused: string | null): WindowLayout => ({ focused, version: 2, windows });

export const readLayout = (raw: string): WindowLayout | undefined => {
	const decoded = decodeLayout(raw);
	return Result.isFailure(decoded) ? undefined : decoded.success;
};

export const writeLayout = (layout: WindowLayout): string => JSON.stringify(layout, null, 2);

interface RestorePlan {
	readonly children: ReadonlyArray<RememberedWindow>;
	readonly consoleWindow: RememberedWindow;
	readonly focused: string | null;
}

const firstPerSubject = (windows: ReadonlyArray<RememberedWindow>): ReadonlyArray<RememberedWindow> => {
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

export const restorePlan = (layout: WindowLayout | undefined): RestorePlan => {
	const windows = layout?.windows ?? [];
	const remembered = windows.find((window) => window.place.role === "console");
	return {
		children: firstPerSubject(windows.filter((window) => window.place.role !== "console")),
		consoleWindow: remembered ?? { id: "console", place: defaultConsole },
		focused: layout?.focused ?? null,
	};
};

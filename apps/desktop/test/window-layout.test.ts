import { describe, expect, it } from "@effect/vitest";
import {
	defaultConsole,
	layoutOf,
	readLayout,
	restorePlan,
	writeLayout,
} from "#adapters/windows/layout.ts";
import { artifactPlace, transcriptPlace } from "#test/windows.ts";

const voyaging = {
	mode: "voyages",
	role: "console",
	sessionId: null,
	voyageId: "voyage-7",
} as const;

describe("window layout", () => {
	// why: a layout is the one thing in the data directory the app can lose
	// without losing anything, so every way of failing to read it lands on the
	// same first-run console rather than on three different recoveries.
	it("opens one default console for anything it cannot read", () => {
		const unreadable = [
			"",
			"not json at all",
			"[]",
			'{"version":2,"focused":null,"windows":[]}',
			'{"version":1,"focused":null}',
			'{"version":1,"focused":null,"windows":[{"id":"a","place":{"role":"wat"}}]}',
		];

		for (const raw of unreadable) {
			expect(readLayout(raw)).toBeUndefined();
		}
		const plan = restorePlan(undefined);
		expect(plan.consoleWindow.place).toEqual(defaultConsole);
		expect(plan.children).toEqual([]);
		expect(plan.focused).toBeNull();
	});

	// why: the app is one console. A file naming several is a file to read one
	// console out of, never a licence to open a second place to work from.
	it("restores exactly one console however many the file names", () => {
		const layout = readLayout(
			writeLayout(
				layoutOf(
					[
						{ id: "first", place: voyaging },
						{ id: "second", place: defaultConsole },
						{ id: "third", place: defaultConsole },
					],
					null,
				),
			),
		);

		const plan = restorePlan(layout);
		expect(plan.consoleWindow.id).toBe("first");
		expect(plan.consoleWindow.place).toEqual(voyaging);
		expect(plan.children).toEqual([]);
	});

	// why: a window is opened for one subject, so a file naming a subject twice
	// is that window written down twice, not two windows to open.
	it("reopens one window per subject and keeps the rest", () => {
		const layout = layoutOf(
			[
				{ id: "console", place: defaultConsole },
				{ id: "a", place: transcriptPlace("session-1") },
				{ id: "b", place: transcriptPlace("session-1") },
				{ id: "c", place: transcriptPlace("session-2") },
			],
			"c",
		);

		const plan = restorePlan(readLayout(writeLayout(layout)));
		expect(plan.children.map((child) => child.id)).toEqual(["a", "c"]);
		expect(plan.focused).toBe("c");
	});

	// why: the layout writes down whatever a place is, so a role added to the
	// union is remembered without the file learning anything about it — and an
	// Artifact and a session wearing one id stay two windows, not one.
	it("remembers an artifact window and keeps it apart from a session", () => {
		const layout = layoutOf(
			[
				{ id: "console", place: defaultConsole },
				{ id: "artifact", place: artifactPlace("subject-1") },
				{ id: "twin", place: artifactPlace("subject-1") },
				{ id: "session", place: transcriptPlace("subject-1") },
			],
			"artifact",
		);

		const plan = restorePlan(readLayout(writeLayout(layout)));
		expect(plan.children.map((child) => child.id)).toEqual([
			"artifact",
			"session",
		]);
		expect(plan.children[0]?.place).toEqual(artifactPlace("subject-1"));
	});

	// why: a restart is meant to land where the work was left, so the mode and
	// the selection survive the round trip through the file, not just the role.
	it("carries a console's mode and selection through the file", () => {
		const written = writeLayout(
			layoutOf([{ id: "console", place: voyaging }], "console"),
		);

		expect(restorePlan(readLayout(written)).consoleWindow.place).toEqual(
			voyaging,
		);
	});
});

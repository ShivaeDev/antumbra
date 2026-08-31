import { describe, expect, it } from "@effect/vitest";
import { defaultConsole, layoutOf, readLayout, restorePlan, writeLayout } from "#adapters/windows/layout.ts";
import { artifactPlace, transcriptPlace } from "#test/windows.ts";

const voyaging = {
	changeId: "change-7",
	mode: "voyages",
	pieceId: "piece-7",
	role: "console",
	sessionId: null,
	voyageId: "voyage-7",
} as const;

describe("window layout", () => {
	it("opens one default console for anything it cannot read", () => {
		const unreadable = ["not json at all", '{"version":3,"focused":null,"windows":[]}'];

		for (const raw of unreadable) {
			expect(readLayout(raw)).toBeUndefined();
		}
		const plan = restorePlan(undefined);
		expect(plan.consoleWindow.place).toEqual(defaultConsole);
		expect(plan.children).toEqual([]);
		expect(plan.focused).toBeNull();
	});

	it("keeps a version 2 console that predates piece focus", () => {
		const layout = readLayout(
			'{"version":2,"focused":null,"windows":[{"id":"console","place":{"changeId":null,"mode":"voyages","role":"console","sessionId":null,"voyageId":"voyage-7"}}]}',
		);

		expect(restorePlan(layout).consoleWindow.place).toMatchObject({ mode: "voyages", voyageId: "voyage-7" });
	});

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
		expect(plan.children.map((child) => child.id)).toEqual(["artifact", "session"]);
		expect(plan.children[0]?.place).toEqual(artifactPlace("subject-1"));
	});

	it("opens a first run on the flagship", () => {
		expect(restorePlan(undefined).consoleWindow.place).toEqual({
			changeId: null,
			mode: "flagship",
			pieceId: null,
			role: "console",
			sessionId: null,
			voyageId: null,
		});
	});

	it("carries a console's mode and selection through the file", () => {
		const written = writeLayout(layoutOf([{ id: "console", place: voyaging }], "console"));

		expect(restorePlan(readLayout(written)).consoleWindow.place).toEqual(voyaging);
	});
});

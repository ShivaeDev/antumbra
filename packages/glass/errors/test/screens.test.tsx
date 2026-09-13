import { eventually } from "@antumbra/app-testing/answers.ts";
import { press, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { expect } from "@effect/vitest";
import { ErrorsPanel } from "#errors.tsx";

const TRACE = "Error: the chart went blank\n    at charting (chart.ts:12:3)";

it.glass("lists a stopped loop with its trace and resumes it", function* ({ api, render }) {
	yield* api.supervision.failLoop({ loop: "charting", message: "the chart went blank", trace: TRACE });
	const container = yield* render(<ErrorsPanel api={api} />);
	yield* until(() => container.textContent?.includes("charting") === true, "the stopped loop");
	expect(container.textContent).toContain("the chart went blank");
	expect(container.textContent).toContain("stopped");
	expect(container.textContent).not.toContain("chart.ts:12:3");
	yield* press(container, "Stack trace");
	expect(container.querySelector("pre")?.textContent).toBe(TRACE);
	yield* press(container, "Resume");
	const settled = yield* eventually(api.supervision.stoppedLoops({}), (rows) => rows.every((row) => row.state === "resumed"));
	expect(settled.map((row) => row.loop)).toEqual(["charting"]);
	yield* until(() => container.textContent?.includes("resumed") === true, "the resumed badge");
});

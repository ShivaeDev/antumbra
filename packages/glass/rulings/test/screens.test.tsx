import { answered, eventually } from "@antumbra/app-testing/answers.ts";
import { fill, renderedForm, submit, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { expect } from "@effect/vitest";
import { RulingsPanel } from "#rulings.tsx";

it.glass("answers a live request and keeps its question beside the standing answer", function* ({ api, render }) {
	yield* api.rulings.request({
		requester: { kind: "authority", by: "admiral" },
		rung: "admiral",
		context: "The **north** channel is deeper",
		question: "Which passage?",
		radius: "piece",
		urgency: "pressing",
		choices: [{ label: "North" }, { label: "South" }],
		recommendation: { choice: "North", reasoning: "More clearance" },
		subjects: [],
		gates: [],
	});
	const container = yield* render(<RulingsPanel api={api} />);
	const ruling = yield* renderedForm(container, "Rule");
	expect(container.querySelector("strong")?.textContent).toBe("north");
	expect(container.textContent).toContain("Recommended: North");
	yield* fill(ruling, "Rule Your answer", "Take the northern passage");
	yield* submit(container, "Rule");
	const standing = yield* eventually(api.rulings.standing({ subjects: [] }), (rows) => rows.length === 1);
	expect(standing[0]?.answer?.text).toBe("Take the northern passage");
	yield* until(() => container.textContent?.includes("Take the northern passage") === true, "the standing answer to arrive");
	expect(container.textContent).toContain("Which passage?");
	expect(yield* answered(api.rulings.open({}))).toEqual([]);
});

it.glass("proclaims and withdraws a tagged standing ruling through its forms", function* ({ api, render }) {
	const container = yield* render(<RulingsPanel api={api} />);
	const proclaim = yield* renderedForm(container, "Proclaim");
	yield* fill(proclaim, "Proclaim Question", "When do we sail?");
	yield* fill(proclaim, "Proclaim Context", "The tide is turning");
	yield* fill(proclaim, "Proclaim Your answer", "At dawn");
	yield* fill(proclaim, "Proclaim Tags", "tide, passage");
	yield* submit(container, "Proclaim");
	const records = yield* eventually(api.rulings.standing({ subjects: [] }), (rows) => rows.length === 1);
	expect(records[0]?.subjects).toEqual([
		{ kind: "tag", tag: "tide" },
		{ kind: "tag", tag: "passage" },
	]);
	const withdraw = yield* renderedForm(container, "Withdraw");
	yield* fill(withdraw, "Withdraw Why", "The weather changed");
	yield* submit(container, "Withdraw");
	expect(yield* eventually(api.rulings.standing({ subjects: [] }), (rows) => rows.length === 0)).toEqual([]);
});

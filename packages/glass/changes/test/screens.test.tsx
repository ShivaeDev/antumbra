import { answered, eventually } from "@antumbra/app-testing/answers.ts";
import { fill, press, renderedForm, submit, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { expect } from "@effect/vitest";
import { ChangeOutcomes } from "#change-outcomes.tsx";
import { QuayPanel } from "#quay-panel.tsx";
import { changeId, pieceId, ready, repoId } from "#test/kit.ts";

it.glass("filters the live Quay while retaining the selected detail and piece change link", function* ({ api, render }) {
	yield* ready(api);
	const container = yield* render(
		<>
			<QuayPanel api={api} selectedId={changeId} onSelect={() => undefined} onOpenSession={() => undefined} />
			<ChangeOutcomes api={api} pieceId={pieceId} />
		</>,
	);
	yield* until(() => container.textContent?.includes("1 of 1 pull requests") === true, "the Quay to show its change");
	expect(container.textContent).toContain("checks failed");
	expect(container.textContent).toContain("work/reef");
	expect(container.textContent).toContain("#41 Soundings");
	yield* fill(container, "Search pull requests", "absent");
	yield* until(() => container.textContent?.includes("0 of 1 pull requests") === true, "the server filter to update");
	expect(container.textContent).toContain("No pull requests match these filters.");
	expect(container.textContent).toContain("Open pull request");
	yield* press(container, "Clear filters");
	yield* until(() => container.textContent?.includes("1 of 1 pull requests") === true, "cleared filters to show the change");
});

it.glass("offers adoption and keeps a host refusal editable for retry", function* ({ api, render }) {
	yield* ready(api);
	const container = yield* render(<QuayPanel api={api} onSelect={() => undefined} onOpenSession={() => undefined} />);
	yield* until(() => container.textContent?.includes("1 of 1 pull requests") === true, "the adoption control to arrive");
	yield* press(container, "Adopt a pull request");
	const form = yield* renderedForm(document.body, "Adopt change");
	yield* fill(form, "Adopt change Piece", pieceId);
	yield* fill(form, "Adopt change Repository", repoId);
	yield* fill(form, "Adopt change Pull request URL", "https://github.com/example/reef/pull/99");
	yield* submit(document.body, "Adopt change");
	const requested = yield* eventually(api.changes.adoptions({}), (rows) => rows.length === 1);
	const pending = requested[0];
	expect(pending).toBeDefined();
	if (pending === undefined) return;
	yield* api.changes.failAdoption({ id: pending.id, url: pending.url, message: "No such pull request" });
	const retry = yield* renderedForm(container, "Retry adoption");
	expect(container.textContent).toContain("No such pull request");
	yield* fill(retry, "Retry adoption Pull request URL", "https://github.com/example/reef/pull/100");
	yield* submit(container, "Retry adoption");
	const corrected = yield* eventually(api.changes.adoptions({}), (rows) => rows[0]?.error === null);
	expect(corrected[0]).toMatchObject({ id: pending.id, url: "https://github.com/example/reef/pull/100" });
	expect((yield* answered(api.changes.quay({}))).length).toBe(1);
});

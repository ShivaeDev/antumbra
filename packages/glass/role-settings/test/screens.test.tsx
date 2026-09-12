import { eventually } from "@antumbra/app-testing/answers.ts";
import { fill, labelled, named, renderedForm, submit } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { expect } from "@effect/vitest";
import { RoleDefaults } from "#defaults.tsx";
import { VoyageRoleSettings } from "#voyage.tsx";

const VOYAGE = "voyage-1";

it.glass("renders fleet roles", function* ({ api, render }) {
	const container = yield* render(<RoleDefaults api={api} />);
	yield* renderedForm(container, "Flagship");
	expect([...container.querySelectorAll("form")].map(named)).toEqual(["Flagship", "Captain", "Crew", "Smoother"]);
});

it.glass("saves a fleet choice", function* ({ api, render }) {
	const container = yield* render(<RoleDefaults api={api} />);
	const flagship = yield* renderedForm(container, "Flagship");
	yield* fill(flagship, "Flagship Model", "opus");
	yield* submit(container, "Flagship");
	const saved = yield* eventually(api.roleSettings.defaults({}), (rows) => rows.some((row) => row.role === "flagship" && row.model === "opus"));
	expect(saved.find((row) => row.role === "flagship")).toMatchObject({
		backend: null,
		effort: null,
		model: "opus",
		role: "flagship",
		scope: "fleet",
	});
});

it.glass("inherits fleet choices and saves a voyage choice", function* ({ api, render }) {
	yield* api.roleSettings.choose({ backend: "codex", effort: null, model: "gpt", role: "captain", scope: "fleet" });
	const container = yield* render(<VoyageRoleSettings api={api} voyageId={VOYAGE} />);
	const captain = yield* renderedForm(container, "Captain");
	const crew = yield* renderedForm(container, "Crew");
	expect(labelled<HTMLInputElement>(captain, "Captain Model").placeholder).toBe("gpt");
	expect([...labelled<HTMLSelectElement>(captain, "Captain Backend").options].map((option) => option.text)).toContain("Fleet default (codex)");
	yield* fill(crew, "Crew Backend", "claude");
	yield* submit(container, "Crew");
	const saved = yield* eventually(api.roleSettings.forVoyage({ voyageId: VOYAGE }), (rows) =>
		rows.some((row) => row.role === "crew" && row.backend === "claude"),
	);
	expect(saved.find((row) => row.role === "crew")).toMatchObject({
		backend: "claude",
		effort: null,
		model: null,
		role: "crew",
		scope: VOYAGE,
	});
});

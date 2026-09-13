import { eventually } from "@antumbra/app-testing/answers.ts";
import { fill, labelled, named, pick, renderedForm, submit, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { expect } from "@effect/vitest";
import { RoleDefaults } from "#defaults.tsx";
import { VoyageRoleSettings } from "#voyage.tsx";

const VOYAGE = "voyage-1";

const OPUS = { defaultEffort: "high", efforts: ["low", "high"], isDefault: true, model: "opus", name: "Opus" };

it.glass("renders fleet roles", function* ({ api, render }) {
	const container = yield* render(<RoleDefaults api={api} />);
	yield* renderedForm(container, "Flagship");
	expect([...container.querySelectorAll("form")].map(named)).toEqual(["Flagship", "Captain", "Crew", "Smoother"]);
	expect(container.textContent).toContain("Backend");
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

it.glass("leaves the backend to decide while it has listed no models", function* ({ api, render }) {
	const container = yield* render(<RoleDefaults api={api} />);
	const crew = yield* renderedForm(container, "Crew");
	expect(labelled<HTMLInputElement>(crew, "Crew Model").placeholder).toBe("backend default");
});

it.glass("shows the model a role resolves to and where it comes from", function* ({ api, render }) {
	yield* api.backends.listModels({ backend: "claude", failure: null, models: [OPUS] });
	const container = yield* render(<RoleDefaults api={api} />);
	const crew = yield* renderedForm(container, "Crew");
	yield* until(() => labelled<HTMLInputElement>(crew, "Crew Model").placeholder === "opus · backend default", "the model Claude declares to resolve");
	expect(labelled<HTMLInputElement>(crew, "Crew Effort").placeholder).toBe("high · backend default");
	expect(labelled(crew, "Crew Backend").textContent).toBe("claude · backend default");
});

it.glass("inherits fleet choices and saves a voyage choice", function* ({ api, render }) {
	yield* api.roleSettings.choose({ backend: "codex", effort: null, model: "gpt", role: "captain", scope: "fleet" });
	const container = yield* render(<VoyageRoleSettings api={api} voyageId={VOYAGE} />);
	const captain = yield* renderedForm(container, "Captain");
	const crew = yield* renderedForm(container, "Crew");
	yield* until(() => labelled<HTMLInputElement>(captain, "Captain Model").placeholder === "gpt · fleet default", "the fleet's model to be inherited");
	expect(labelled(captain, "Captain Backend").textContent).toBe("codex · fleet default");
	yield* pick(crew, "Crew Backend", "claude");
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

it.glass("names the backend a role falls back to once it has chosen its own", function* ({ api, render }) {
	yield* api.roleSettings.choose({ backend: "codex", effort: null, model: null, role: "crew", scope: "fleet" });
	yield* api.roleSettings.choose({ backend: "claude", effort: null, model: null, role: "crew", scope: VOYAGE });
	const container = yield* render(<VoyageRoleSettings api={api} voyageId={VOYAGE} />);
	const crew = yield* renderedForm(container, "Crew");
	yield* until(() => labelled(crew, "Crew Backend").textContent === "claude", "the backend the role chose for itself");
	yield* pick(crew, "Crew Backend", "codex · fleet default");
	yield* submit(container, "Crew");
	const saved = yield* eventually(api.roleSettings.forVoyage({ voyageId: VOYAGE }), (rows) =>
		rows.some((row) => row.role === "crew" && row.backend === null),
	);
	expect(saved.find((row) => row.role === "crew")?.backend).toBe(null);
});

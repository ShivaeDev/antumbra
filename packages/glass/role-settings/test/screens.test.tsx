import { labelled, named, settle, submit, until, write } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { expect } from "@effect/vitest";
import { Option, Stream } from "effect";
import { RoleDefaults } from "#defaults.tsx";
import { VoyageRoleSettings } from "#voyage.tsx";

const VOYAGE = "voyage-1";

it.glass("renders fleet roles", function* ({ api, render }) {
	const container = yield* render(<RoleDefaults api={api} />);
	yield* until(() => container.querySelectorAll("form").length === 4);
	expect([...container.querySelectorAll("form")].map(named)).toEqual(["Flagship", "Captain", "Crew", "Smoother"]);
});

it.glass("saves a fleet choice", function* ({ api, render }) {
	const container = yield* render(<RoleDefaults api={api} />);
	yield* until(() => container.querySelectorAll("form").length === 4);
	yield* settle(() => write(labelled<HTMLInputElement>(container, "Flagship Model"), "opus"));
	yield* submit(container, 0);
	const saved = yield* api.roleSettings.defaults({}).pipe(
		Stream.filter((rows) => rows.some((row) => row.role === "flagship" && row.model === "opus")),
		Stream.runHead,
	);
	expect(Option.getOrThrow(saved).find((row) => row.role === "flagship")).toMatchObject({
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
	yield* until(() => container.querySelectorAll("form").length === 2);
	expect(labelled<HTMLInputElement>(container, "Captain Model").placeholder).toBe("gpt");
	expect([...labelled<HTMLSelectElement>(container, "Captain Backend").options].map((option) => option.text)).toContain("Fleet default (codex)");
	yield* settle(() => write(labelled<HTMLSelectElement>(container, "Crew Backend"), "claude"));
	yield* submit(container, 1);
	const saved = yield* api.roleSettings.forVoyage({ voyageId: VOYAGE }).pipe(
		Stream.filter((rows) => rows.some((row) => row.role === "crew" && row.backend === "claude")),
		Stream.runHead,
	);
	expect(Option.getOrThrow(saved).find((row) => row.role === "crew")).toMatchObject({
		backend: "claude",
		effort: null,
		model: null,
		role: "crew",
		scope: VOYAGE,
	});
});

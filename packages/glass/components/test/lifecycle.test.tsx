import { answered, eventually } from "@antumbra/app-testing/answers.ts";
import { fill, labelled, renderedForm, submit, until } from "@antumbra/app-testing/glass/dom.ts";
import { type Api, it } from "@antumbra/app-testing/glass/entry.tsx";
import { Live } from "@antumbra/glass-client/live.tsx";
import { expect } from "@effect/vitest";
import { Deferred, Effect } from "effect";
import { CommandForm } from "#form.tsx";

const FIXED = ["role"] as const;

it.glass("submits to the newly selected target", function* ({ api, render }) {
	const rows = yield* answered(api.roleSettings.defaults({}));
	const captain = yield* Effect.fromNullishOr(rows.find((row) => row.role === "captain"));
	const crew = yield* Effect.fromNullishOr(rows.find((row) => row.role === "crew"));
	const container = yield* render(<CommandForm command={api.roleSettings.choose} fixed={FIXED} row={captain} />);
	yield* renderedForm(container, "Captain");
	yield* fill(container, "Captain Model", "captain-draft");
	yield* render(<CommandForm command={api.roleSettings.choose} fixed={FIXED} row={crew} />);
	yield* renderedForm(container, "Crew");
	expect(labelled<HTMLInputElement>(container, "Crew Model").value).toBe("");
	yield* fill(container, "Crew Model", "new-model");
	yield* submit(container, "Crew");
	const saved = yield* eventually(api.roleSettings.defaults({}), (settings) => settings.some((row) => row.model === "new-model"));
	expect(saved.find((row) => row.role === "crew")?.model).toBe("new-model");
	expect(saved.find((row) => row.role === "captain")?.model).toBeNull();
});

it.glass("uses the current completion callback", function* ({ api, render }) {
	const rows = yield* answered(api.roleSettings.defaults({}));
	const crew = yield* Effect.fromNullishOr(rows.find((row) => row.role === "crew"));
	const completion = yield* Deferred.make<string>();
	const container = yield* render(
		<CommandForm command={api.roleSettings.choose} fixed={FIXED} row={crew} sent={() => Effect.runSync(Deferred.succeed(completion, "previous"))} />,
	);
	yield* renderedForm(container, "Crew");
	yield* fill(container, "Crew Model", "new-model");
	yield* render(
		<CommandForm command={api.roleSettings.choose} fixed={FIXED} row={crew} sent={() => Effect.runSync(Deferred.succeed(completion, "current"))} />,
	);
	yield* submit(container, "Crew");
	const saved = yield* eventually(api.roleSettings.defaults({}), (settings) =>
		settings.some((row) => row.role === "crew" && row.model === "new-model"),
	);
	expect(saved.find((row) => row.role === "crew")?.model).toBe("new-model");
	expect(yield* Deferred.await(completion)).toBe("current");
	yield* render(<CommandForm command={api.roleSettings.choose} fixed={FIXED} label="Crew choice" row={crew} sent={() => undefined} />);
	expect(labelled<HTMLInputElement>(container, "Crew choice Model").value).toBe("new-model");
});

const LiveCrew = (props: { readonly api: Api }) => (
	<Live input={{}} query={props.api.roleSettings.defaults}>
		{(rows) =>
			rows
				.filter((row) => row.role === "crew")
				.map((row) => (
					<div key={row.id}>
						<output>{row.model ?? ""}</output>
						<CommandForm command={props.api.roleSettings.choose} fixed={FIXED} row={row} />
					</div>
				))
		}
	</Live>
);

it.glass("refreshes clean values and preserves an edited draft", function* ({ api, render }) {
	const container = yield* render(<LiveCrew api={api} />);
	yield* renderedForm(container, "Crew");
	const choice = { backend: "codex", effort: null, role: "crew", scope: "fleet" } as const;
	yield* api.roleSettings.choose({ ...choice, model: "saved-model" });
	yield* until(() => labelled<HTMLInputElement>(container, "Crew Model").value === "saved-model", "the clean form to show the saved model");
	yield* fill(container, "Crew Model", "draft-model");
	yield* api.roleSettings.choose({ ...choice, model: "updated-model" });
	yield* until(() => container.querySelector("output")?.textContent === "updated-model", "the updated row to reach the mounted form");
	expect(labelled<HTMLInputElement>(container, "Crew Model").value).toBe("draft-model");
	yield* submit(container, "Crew");
	const saved = yield* eventually(api.roleSettings.defaults({}), (rows) => rows.some((row) => row.role === "crew" && row.model === "draft-model"));
	expect(saved.find((row) => row.role === "crew")).toMatchObject({ backend: "codex", model: "draft-model" });
});

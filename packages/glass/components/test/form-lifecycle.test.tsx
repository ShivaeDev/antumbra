import { eventually } from "@antumbra/app-testing/answers.ts";
import { fill, labelled, press, settle, until } from "@antumbra/app-testing/glass/dom.ts";
import { type Api, it } from "@antumbra/app-testing/glass/entry.tsx";
import { Live } from "@antumbra/glass-client/live.tsx";
import { useAtomRef } from "@effect/atom-react";
import { expect } from "@effect/vitest";
import { useSubmit } from "@shivaedev/form/adapters/react.ts";
import { Deferred, Effect } from "effect";
import { Control } from "#controls.tsx";
import { editablesOf, type Held, identityOf, valuesOf } from "#fields.ts";
import { changing, type Sending, sending, useGenerated } from "#generated.ts";
import { SaveAction } from "#save-action.tsx";

const FIXED = ["scope", "role"] as const;
const KEPT = () => undefined;

const Editor = (props: { readonly api: Api; readonly row: Held; readonly send: Sending }) => {
	const command = props.api.roleSettings.choose.command;
	const editables = editablesOf(command, FIXED);
	const form = useGenerated(editables, identityOf(command, props.row, editables), valuesOf(editables, props.row), props.send, KEPT);
	const values = useAtomRef(form.values);
	const submit = useSubmit(form);
	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				submit.run();
			}}
		>
			{editables.map((editable) => (
				<Control
					change={changing(form, editables)}
					editable={editable}
					form={form}
					key={editable.name}
					label=""
					placeholder={undefined}
					titles={false}
					values={values}
				/>
			))}
			<SaveAction form={form} />
			<button onClick={form.revert} type="button">
				Revert
			</button>
		</form>
	);
};

it.glass("merges untouched fields from a refresh and reverts to that refresh", function* ({ api, render }) {
	yield* api.roleSettings.choose({ backend: "codex", effort: "low", model: "first", role: "crew", scope: "fleet" });
	const send = sending(api.roleSettings.choose);
	const container = yield* render(
		<Live input={{}} query={api.roleSettings.defaults}>
			{(rows) => rows.filter((row) => row.role === "crew").map((row) => <Editor api={api} key={row.id} row={row} send={send} />)}
		</Live>,
	);
	yield* until(() => container.querySelector<HTMLInputElement>('[aria-label="Effort"]')?.value === "low", "the saved effort to render");
	yield* fill(container, "Effort", "high");
	yield* api.roleSettings.choose({ backend: "codex", effort: "medium", model: "refreshed", role: "crew", scope: "fleet" });
	yield* until(() => labelled<HTMLInputElement>(container, "Model").value === "refreshed", "the untouched model to refresh");
	expect(labelled<HTMLInputElement>(container, "Effort").value).toBe("high");
	yield* press(container, "Revert");
	expect(labelled<HTMLInputElement>(container, "Effort").value).toBe("medium");
	expect(labelled<HTMLInputElement>(container, "Model").value).toBe("refreshed");
	expect(container.querySelector('button[type="submit"]')).toHaveProperty("disabled", true);
});

it.glass("keeps edits made while saving available for the next save", function* ({ api, render }) {
	const started = yield* Deferred.make<void>();
	const complete = yield* Deferred.make<void>();
	const command = Object.assign(
		(input: Parameters<Api["roleSettings"]["choose"]>[0]) =>
			Effect.gen(function* () {
				yield* Deferred.succeed(started, undefined);
				yield* Deferred.await(complete);
				return yield* api.roleSettings.choose(input);
			}),
		{ command: api.roleSettings.choose.command },
	);
	const container = yield* render(
		<Editor api={api} row={{ backend: "codex", effort: "low", model: "first", role: "crew", scope: "fleet" }} send={sending(command)} />,
	);
	yield* fill(container, "Effort", "medium");
	yield* press(container, "Save");
	yield* Deferred.await(started);
	expect(container.querySelector('button[type="submit"]')).toHaveProperty("disabled", true);
	yield* fill(container, "Effort", "high");
	yield* settle(() => {
		Effect.runSync(Deferred.succeed(complete, undefined));
	});
	const saved = yield* eventually(
		api.roleSettings.defaults({}),
		(rows) => rows.some((row) => row.role === "crew" && row.effort === "medium"),
		"the submitted effort to save",
	);
	expect(saved.find((row) => row.role === "crew")?.effort).toBe("medium");
	yield* until(() => container.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled === false, "the later edit to remain saveable");
	expect(labelled<HTMLInputElement>(container, "Effort").value).toBe("high");
	yield* press(container, "Save");
	expect(
		(yield* eventually(
			api.roleSettings.defaults({}),
			(rows) => rows.some((row) => row.role === "crew" && row.effort === "high"),
			"the later effort to save",
		)).find((row) => row.role === "crew")?.effort,
	).toBe("high");
});

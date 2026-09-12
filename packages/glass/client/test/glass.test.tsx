import { answered } from "@antumbra/app-testing/answers.ts";
import { until } from "@antumbra/app-testing/glass/dom.ts";
import { type Api, it } from "@antumbra/app-testing/glass/entry.tsx";
import { expect } from "@effect/vitest";
import { Deferred, Effect, Option } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useLive, useSend } from "#hooks.ts";

type Choose = Api["roleSettings"]["choose"];
type SendChoice = (input: Parameters<Choose>[0]) => ReturnType<Choose>;

const Defaults = (props: { readonly api: Api }) => {
	const rows = useLive(props.api.roleSettings.defaults, {});
	return (
		<span>
			{Option.match(AsyncResult.value(rows), {
				onNone: () => "",
				onSome: (settings) => settings.map((setting) => `${setting.role}:${setting.backend ?? "-"}`).join(" "),
			})}
		</span>
	);
};

const Sender = (props: { readonly api: Api; readonly ready: (send: SendChoice) => void }) => {
	props.ready(useSend(props.api.roleSettings.choose));
	return null;
};

it.glass("refreshes a live query after a committed choice", function* ({ api, render }) {
	yield* api.roleSettings.choose({ backend: "claude", effort: null, model: null, role: "flagship", scope: "fleet" });
	const container = yield* render(<Defaults api={api} />);
	yield* until(() => container.textContent?.includes("flagship:claude") === true, "the flagship backend to show claude");
	expect(container.textContent).toContain("crew:-");
	yield* api.roleSettings.choose({ backend: "codex", effort: null, model: null, role: "crew", scope: "fleet" });
	yield* until(() => container.textContent?.includes("crew:codex") === true, "the crew backend to show codex");
	expect(container.textContent).toContain("flagship:claude");
});

it.glass("returns committed sequences from the command hook", function* ({ api, render }) {
	const sender = yield* Deferred.make<SendChoice>();
	yield* render(<Sender api={api} ready={(send) => Effect.runSync(Deferred.succeed(sender, send))} />);
	const send = yield* Deferred.await(sender);
	const choice = { backend: "codex", effort: "high", model: "gpt", role: "captain", scope: "fleet" } as const;
	const first = yield* send(choice);
	const second = yield* send({ ...choice, backend: "claude" });
	expect(second).toBeGreaterThan(first);
	const saved = yield* answered(api.roleSettings.defaults({}));
	expect(saved.find((row) => row.role === "captain")).toMatchObject({ backend: "claude", model: "gpt", effort: "high" });
});

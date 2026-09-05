import type { CharterPieceRequest } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Schema } from "effect";
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, vi } from "vitest";
import { useRequestForm } from "#adapters/form.ts";
import { RendererRequestError } from "#adapters/request-error.ts";
import { RequestForm } from "#forms/view.tsx";
import { AdoptChangeForm } from "#views/adopt-change-form.tsx";
import { CharterPieceForm } from "#views/piece-form.tsx";

const { charterPiece, adoptChange } = vi.hoisted(() => ({ charterPiece: vi.fn(), adoptChange: vi.fn() }));
vi.mock("#adapters/trpc-quay.ts", () => ({ adoptChange }));
vi.mock("#adapters/trpc-voyages.ts", () => ({ charterPiece }));
beforeEach(() => {
	charterPiece.mockReset();
	adoptChange.mockReset();
});

const input = (label: string): HTMLInputElement | HTMLTextAreaElement => {
	const id = [...document.querySelectorAll("label")].find((element) => element.textContent === label)?.htmlFor;
	const element = id === undefined ? null : document.getElementById(id);
	if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) return Effect.runSync(Effect.die(`Missing field ${label}`));
	return element;
};
const change = (label: string, value: string) => {
	const element = input(label);
	const prototype = element instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
	Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(element, value);
	element.dispatchEvent(new Event("input", { bubbles: true }));
};
const button = (label: string): HTMLButtonElement => {
	const element = [...(document.querySelector("form") ?? document).querySelectorAll("button")].find((entry) => entry.textContent === label);
	if (element === undefined) return Effect.runSync(Effect.die(`Missing button ${label}`));
	return element;
};
const settle = (action: () => void) =>
	Effect.promise(() =>
		act(() => {
			action();
			return Promise.resolve();
		}),
	);

it.effect(
	"preserves a failed charter draft and waits for a successful retry before closing",
	Effect.fnUntraced(function* () {
		const first = yield* Deferred.make<void, RendererRequestError>();
		const second = yield* Deferred.make<void, RendererRequestError>();
		const requested = yield* Deferred.make<CharterPieceRequest>();
		const retried = yield* Deferred.make<void>();
		charterPiece.mockImplementationOnce((value: CharterPieceRequest) =>
			Deferred.succeed(requested, value).pipe(Effect.andThen(Deferred.await(first))),
		);
		charterPiece.mockImplementationOnce(() => Deferred.succeed(retried, undefined).pipe(Effect.andThen(Deferred.await(second))));
		const container = document.createElement("div");
		document.body.append(container);
		const root = createRoot(container);
		yield* Effect.addFinalizer(() =>
			settle(() => {
				root.unmount();
				container.remove();
			}),
		);
		yield* settle(() => root.render(<CharterPieceForm pieces={[]} voyageId="voyage" />));
		yield* settle(() => button("Charter piece").click());
		yield* settle(() => {
			change("Title", "Sound the channel");
			change("Charter", "Find the safe passage");
			change("Role", "navigator");
		});
		yield* settle(() => root.render(<CharterPieceForm pieces={[]} voyageId="current-voyage" />));
		yield* settle(() => document.querySelector("form")?.requestSubmit());
		expect(yield* Deferred.await(requested)).toEqual({
			title: "Sound the channel",
			charter: "Find the safe passage",
			role: "navigator",
			expectation: "",
			dependsOn: [],
			voyageId: "current-voyage",
		});
		expect(button("Chartering…").disabled).toBe(true);
		expect(input("Title").closest("fieldset")?.disabled).toBe(true);
		yield* settle(() => {
			Effect.runSync(Deferred.fail(first, new RendererRequestError({ message: "Repository unavailable" })));
		});
		expect(document.querySelector('[role="alert"]')?.textContent).toContain("Repository unavailable");
		expect(input("Title").value).toBe("Sound the channel");
		expect(button("Charter piece").disabled).toBe(false);
		yield* settle(() => button("Charter piece").click());
		yield* Deferred.await(retried);
		yield* settle(() => {
			Effect.runSync(Deferred.succeed(second, undefined));
		});
		expect(document.querySelector("form")).toBeNull();
		yield* settle(() => button("Charter piece").click());
		expect(input("Title").value).toBe("");
	}),
);

it.effect(
	"keeps the selected piece and repository after adopting and clears only the address",
	Effect.fnUntraced(function* () {
		const adopted = yield* Deferred.make<{ readonly pieceId: string; readonly repoName: string; readonly url: string }>();
		adoptChange.mockImplementation((value: { readonly pieceId: string; readonly repoName: string; readonly url: string }) =>
			Deferred.succeed(adopted, value),
		);
		const container = document.createElement("div");
		document.body.append(container);
		const root = createRoot(container);
		yield* Effect.addFinalizer(() =>
			settle(() => {
				root.unmount();
				container.remove();
			}),
		);
		yield* settle(() =>
			root.render(<AdoptChangeForm onAdopted={() => undefined} pieces={[{ id: "piece", title: "Soundings", voyageName: "Reef" }]} />),
		);
		yield* settle(() => {
			document.querySelector<HTMLButtonElement>('[role="combobox"]')?.click();
		});
		yield* settle(() => {
			document.querySelector<HTMLElement>('[role="option"]')?.click();
		});
		yield* settle(() => {
			change("Repository", "shoals");
			change("Address", "https://github.test/pull/1");
		});
		yield* settle(() => button("Adopt").click());
		expect(yield* Deferred.await(adopted)).toEqual({ pieceId: "piece", repoName: "shoals", url: "https://github.test/pull/1" });
		expect(input("Address").value).toBe("");
		expect(input("Repository").value).toBe("shoals");
		expect(document.querySelector('[role="combobox"]')?.textContent).toContain("Soundings");
	}),
);

const quantitySchema = Schema.Struct({ quantity: Schema.NumberFromString.check(Schema.isFinite()) });
const QuantityForm = ({ request }: { readonly request: (value: { readonly quantity: number }) => Effect.Effect<number> }) => {
	const [saved, setSaved] = useState<number>();
	const form = useRequestForm({
		defaultValues: { quantity: "" },
		schema: quantitySchema,
		request,
		resetAfterSuccess: () => ({ quantity: "" }),
		onSuccess: setSaved,
	});
	return (
		<>
			<RequestForm form={form}>
				<form.AppField name="quantity">{(field) => <field.TextField label="Quantity" />}</form.AppField>
				<form.Submit pending="Saving…">Save</form.Submit>
			</RequestForm>
			<output>{saved}</output>
		</>
	);
};

it.effect(
	"validates drafts and submits decoded values while retaining an in-flight request across rerenders",
	Effect.fnUntraced(function* () {
		const started = yield* Deferred.make<number>();
		const release = yield* Deferred.make<void>();
		const container = document.createElement("div");
		document.body.append(container);
		const root = createRoot(container);
		yield* Effect.addFinalizer(() =>
			settle(() => {
				root.unmount();
				container.remove();
			}),
		);
		const render = () =>
			root.render(
				<QuantityForm
					request={({ quantity }) => Deferred.succeed(started, quantity).pipe(Effect.andThen(Deferred.await(release)), Effect.as(quantity))}
				/>,
			);
		yield* settle(render);
		yield* settle(() => change("Quantity", "not a number"));
		yield* settle(() => document.querySelector("form")?.requestSubmit());
		expect(document.getElementById(`${input("Quantity").id}-error`)?.textContent).not.toContain("[object Object]");
		expect(input("Quantity").getAttribute("aria-invalid")).toBe("true");
		yield* settle(() => change("Quantity", "12"));
		yield* settle(() => button("Save").click());
		expect(yield* Deferred.await(started)).toBe(12);
		yield* settle(render);
		expect(button("Saving…").disabled).toBe(true);
		yield* settle(() => {
			Effect.runSync(Deferred.succeed(release, undefined));
		});
		expect(container.querySelector("output")?.textContent).toBe("12");
		expect(input("Quantity").value).toBe("");
	}),
);

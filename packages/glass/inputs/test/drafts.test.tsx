import { memoryDrafts } from "@antumbra/app-testing/drafts.ts";
import { fill, labelled, press, settle, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { RegistryContext } from "@effect/atom-react";
import { Deferred, Effect } from "effect";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { type ReactNode, useEffect, useState } from "react";
import { expect } from "vitest";
import type { Drafts } from "#drafts.ts";
import { useDraft } from "#use-draft.ts";

const Window = ({ children }: { readonly children: ReactNode }) => {
	const [registry] = useState(() => AtomRegistry.make());
	useEffect(() => () => registry.dispose(), [registry]);
	return <RegistryContext.Provider value={registry}>{children}</RegistryContext.Provider>;
};

const Editor = (props: {
	readonly label: string;
	readonly drafts: Drafts;
	readonly sessionId: string;
	readonly slot?: string;
	readonly initial?: string;
	readonly send?: (text: string) => Effect.Effect<void>;
}) => {
	const draft = useDraft({ ...props, send: props.send ?? (() => Effect.void) });
	return (
		<>
			<textarea aria-label={props.label} value={draft.text} onChange={(event) => draft.change(event.target.value)} />
			<button type="button" disabled={draft.sending} onClick={draft.send}>
				{props.label} send
			</button>
		</>
	);
};

const text = (container: HTMLElement, label: string) => labelled<HTMLTextAreaElement>(container, label).value;

it.glass("another window observes the stored draft and reload restores it", function* ({ render }) {
	const drafts = memoryDrafts();
	const screen = (
		<>
			<Window>
				<Editor label="First" drafts={drafts} sessionId="session" />
			</Window>
			<Window>
				<Editor label="Second" drafts={drafts} sessionId="session" />
			</Window>
		</>
	);
	let container = yield* render(screen);
	yield* fill(container, "First", "Shared words");
	yield* until(() => text(container, "Second") === "Shared words", "the other window to receive the draft");
	yield* render(null);
	container = yield* render(screen);
	yield* until(
		() => text(container, "First") === "Shared words" && text(container, "Second") === "Shared words",
		"both windows to restore the draft",
	);
});

for (const laterLocalEdit of [false, true]) {
	it.glass(`an older send keeps another window's newer draft${laterLocalEdit ? " after a local edit" : ""}`, function* ({ render }) {
		const drafts = memoryDrafts();
		const started = yield* Deferred.make<string>();
		const finish = yield* Deferred.make<void>();
		const send = (words: string) => Deferred.succeed(started, words).pipe(Effect.andThen(Deferred.await(finish)));
		const screen = (
			<>
				<Window>
					<Editor label="First" drafts={drafts} sessionId="session" send={send} />
				</Window>
				<Window>
					<Editor label="Second" drafts={drafts} sessionId="session" />
				</Window>
			</>
		);
		let container = yield* render(screen);
		yield* fill(container, "First", "Revision A");
		yield* press(container, "First send");
		expect(yield* Deferred.await(started)).toBe("Revision A");
		if (laterLocalEdit) yield* fill(container, "First", "Later local words");
		yield* fill(container, "Second", "Revision B");
		yield* settle(() => {
			Effect.runSync(Deferred.succeed(finish, undefined));
		});
		yield* until(() => !container.querySelector("button")?.disabled, "the older send to finish");
		expect(text(container, "Second")).toBe("Revision B");
		yield* render(null);
		container = yield* render(screen);
		yield* until(() => text(container, "First") === "Revision B", "the newer draft to survive reload");
	});
}

it.glass("switching session or record restores only that owner's draft", function* ({ render }) {
	const drafts = memoryDrafts();
	const screen = (sessionId: string, slot = "message", initial = "") => (
		<Editor label="Words" drafts={drafts} sessionId={sessionId} slot={slot} initial={initial} />
	);
	let container = yield* render(screen("first"));
	yield* fill(container, "Words", "First session");
	container = yield* render(screen("second"));
	expect(text(container, "Words")).toBe("");
	yield* fill(container, "Words", "Second session");
	container = yield* render(screen("second", "situation:one", "First suggestion"));
	expect(text(container, "Words")).toBe("First suggestion");
	yield* fill(container, "Words", "First record edit");
	container = yield* render(screen("second", "situation:two", "Second suggestion"));
	expect(text(container, "Words")).toBe("Second suggestion");
	container = yield* render(screen("second", "situation:one", "First suggestion"));
	yield* until(() => text(container, "Words") === "First record edit", "the first record's draft to restore");
	container = yield* render(screen("first"));
	yield* until(() => text(container, "Words") === "First session", "the first session's draft to restore");
	container = yield* render(screen("second"));
	yield* until(() => text(container, "Words") === "Second session", "the second session's draft to restore");
});

it.glass("a send completed after a session change clears only its original draft", function* ({ render }) {
	const drafts = memoryDrafts();
	const started = yield* Deferred.make<void>();
	const finish = yield* Deferred.make<void>();
	const send = () => Deferred.succeed(started, undefined).pipe(Effect.andThen(Deferred.await(finish)));
	const screen = (sessionId: string) => <Editor label="Words" drafts={drafts} sessionId={sessionId} send={send} />;
	let container = yield* render(screen("first"));
	yield* fill(container, "Words", "Sent from first");
	yield* press(container, "Words send");
	yield* Deferred.await(started);
	container = yield* render(screen("second"));
	yield* fill(container, "Words", "Unsent from second");
	yield* settle(() => {
		Effect.runSync(Deferred.succeed(finish, undefined));
	});
	expect(text(container, "Words")).toBe("Unsent from second");
	yield* render(null);
	container = yield* render(screen("second"));
	yield* until(() => text(container, "Words") === "Unsent from second", "the second owner's draft to survive reload");
	container = yield* render(screen("first"));
	expect(text(container, "Words")).toBe("");
});

import { ComposerDraft } from "@antumbra/platform-vocabulary/composer-draft.ts";
import { useField } from "@shivaedev/form/adapters/react.ts";
import { useEditor } from "@shivaedev/react/client/editor.ts";
import { Effect, Layer, Schema } from "effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";
import { useMemo } from "react";
import type { Drafts } from "#drafts.ts";

const runtime = Atom.runtime(Layer.empty);
const values = (row: typeof ComposerDraft.Type) => row;

export const useDraft = <A, E>(config: {
	readonly drafts: Drafts;
	readonly sessionId: string;
	readonly slot?: string;
	readonly initial?: string;
	readonly send: (text: string) => Effect.Effect<A, E>;
}) => {
	const { drafts, sessionId, slot = "message", initial = "" } = config;
	const owner = useMemo(
		() => ({
			fields: Schema.Struct(ComposerDraft.fields),
			query: Atom.make(AsyncResult.success({ text: initial })),
			storage: drafts({ sessionId, slot }),
		}),
		[drafts, sessionId, slot, initial],
	);
	const editor = useEditor({
		fields: owner.fields,
		query: owner.query,
		loaded: { text: initial },
		values,
		save: ({ text }) => config.send(text).pipe(Effect.as({ text: "" })),
		rejectField: () => undefined,
		runtime,
		persistedDraft: {
			key: `${encodeURIComponent(sessionId)}/${encodeURIComponent(slot)}`,
			now: Date.now,
			maxAgeMs: Number.MAX_SAFE_INTEGER,
			maxBytes: Number.MAX_SAFE_INTEGER,
			storage: () => owner.storage,
		},
	});
	const text = useField(editor.form, "text");
	return { text: text.value, change: text.onChange, send: editor.save, sending: editor.saving };
};

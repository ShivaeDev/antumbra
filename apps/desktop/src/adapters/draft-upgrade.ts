import { ComposerDraft } from "@antumbra/platform-vocabulary/composer-draft.ts";
import { draftCodec } from "@shivaedev/form/adapters/draftCodec.ts";
import { Schema } from "effect";

export const LegacyDraft = Schema.Struct({ text: Schema.String, revision: Schema.String });

export const upgradeDraft = (snapshot: typeof LegacyDraft.Type): string | null => {
	if (snapshot.text === "") return null;
	return draftCodec(ComposerDraft, {
		key: "legacy",
		now: Date.now,
		maxBytes: Number.MAX_SAFE_INTEGER,
		storage: () => ({ getItem: () => null, removeItem: () => {}, setItem: () => {} }),
	}).write({ text: "" }, { text: snapshot.text }, ["text"]);
};

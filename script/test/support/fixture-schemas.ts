import { Schema } from "effect";

const SeedFile = Schema.Struct({
	content: Schema.String,
	path: Schema.String,
});

const NamedSource = Schema.Struct({
	content: Schema.String,
	name: Schema.String,
	path: Schema.String,
});

const FlaggedGritSource = Schema.Struct({
	content: Schema.String,
	message: Schema.String,
	name: Schema.String,
	path: Schema.String,
});

export const decodeGritCases = Schema.decodeUnknownSync(
	Schema.Struct({
		allowed: Schema.Array(NamedSource),
		flagged: Schema.Array(FlaggedGritSource),
	}),
);

export const decodeCommentCases = Schema.decodeUnknownSync(
	Schema.Struct({
		allowed: Schema.Array(NamedSource),
		flagged: Schema.Array(
			Schema.Struct({
				content: Schema.String,
				line: Schema.Number,
				name: Schema.String,
				path: Schema.optional(Schema.String),
				rule: Schema.String,
			}),
		),
	}),
);

export const decodeLintTrees = Schema.decodeUnknownSync(
	Schema.Struct({
		clean: Schema.Array(SeedFile),
		dirty: Schema.Array(SeedFile),
	}),
);

export const decodeGitignoreTree = Schema.decodeUnknownSync(
	Schema.Struct({
		gitignores: Schema.Array(SeedFile),
		ignoredPaths: Schema.Array(Schema.String),
		keptPaths: Schema.Array(Schema.String),
	}),
);

export const decodePragmaFixture = Schema.decodeUnknownSync(
	Schema.Struct({
		pragma: Schema.String,
		source: SeedFile,
	}),
);

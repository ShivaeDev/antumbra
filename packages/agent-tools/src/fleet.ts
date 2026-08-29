import { RulingUrgencySchema } from "@antumbra/vocabulary/ruling";
import { Schema } from "effect";
import { defineTool } from "#define.ts";

// why: the fleet-level acts, and only what the guide names: opening work,
// chartering it on a voyage that is not the caller's, and settling a question
// for the whole fleet. Nothing here is a verb the admiral could not perform.
export const openVoyageSpec = defineTool({
	description:
		"Open a voyage: a ship under sail for an objective, with its own north star, board, and chartered work. Opening it charters no work and spawns nobody — its captain is hailed when it is time to sail. It sails on the fleet's default agent backend, which the admiral switches like any other voyage's.",
	input: Schema.Struct({
		context: Schema.String.annotate({
			description:
				"What surrounds the work: what is already true, and what the voyage is sailing into.",
		}),
		name: Schema.String.annotate({
			description: "One line naming the voyage.",
		}),
		northStar: Schema.String.annotate({
			description:
				"The fixed star the voyage steers by and never reaches. Not a milestone.",
		}),
	}),
	name: "open_voyage",
});

export const charterVoyagePieceSpec = defineTool({
	description:
		"Charter a piece on a voyage you name: a bounded unit of work with a stated outcome. It is chartered where you put it and nothing else — what it waits on, and when it is released into the pool, belong to that voyage's own captain.",
	input: Schema.Struct({
		charter: Schema.String.annotate({
			description:
				"What the agent working this piece is to do, written for it to read.",
		}),
		expectation: Schema.String.annotate({
			description:
				"The outcome you expect this piece to land. An estimate the voyage's captain may revise, not a contract.",
		}),
		role: Schema.String.annotate({
			description: "The role the agent working this piece takes on.",
		}),
		title: Schema.String.annotate({
			description: "One line naming the piece.",
		}),
		voyageId: Schema.String.annotate({
			description: "The id of the voyage the piece is chartered on.",
		}),
	}),
	name: "charter_piece_on_voyage",
});

export const proclaimRulingSpec = defineTool({
	description:
		"Proclaim a ruling for the whole fleet: a decision you make in the admiral's stead, written with the context and question that give the answer its meaning. It stands the moment it is proclaimed and binds every voyage until the admiral supersedes it, so proclaim only what applies fleet-wide — anything narrower belongs to the voyage it is about, and anything the admiral alone may settle goes to the admiral.",
	input: Schema.Struct({
		answer: Schema.String.annotate({
			description: "The decision itself, in the words every voyage will read.",
		}),
		context: Schema.String.annotate({
			description:
				"The situation behind the rule: why it is being settled now and how the fleet arrived here. It binds widely, so this must be rich — it will be read long after you.",
		}),
		question: Schema.String.annotate({
			description:
				"The question this rule answers. A broad answer to a narrow question binds narrowly, so say exactly what was asked.",
		}),
		tags: Schema.optional(
			Schema.Array(Schema.String).annotate({
				description:
					"Free tags naming the concepts this rule is about, so later askers find it. A fleet ruling binds everyone whether or not it names anything.",
			}),
		),
		urgency: RulingUrgencySchema.annotate({
			description:
				"How badly the fleet needed this settled: `blocking` means work was held for it, `pressing` means work waits on it, `eventual` means nothing waited.",
		}),
	}),
	name: "proclaim_ruling",
});

// why: the one reading the fleet acts stand on. A piece is chartered onto a
// voyage by id, and nothing else the flagship holds says which ids exist —
// `read_voyage` shows the ship it is on and no other.
export const readFleetSpec = defineTool({
	description:
		"Read the fleet: every voyage under sail, with its id, kind, backend, state, piece counts, captain, and when it last stirred. Call it to learn which voyages exist — the id `charter_piece_on_voyage` takes is the one shown here.",
	input: Schema.Struct({}),
	name: "read_fleet",
});

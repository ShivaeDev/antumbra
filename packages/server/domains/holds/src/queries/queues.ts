import { agent } from "@antumbra/domain-agents/rows/agent.ts";
import { voyageAgent } from "@antumbra/domain-agents/rows/voyage-agent.ts";
import { DueWake, dueWakes } from "@antumbra/domain-mail/queries/due-wakes.ts";
import { ready } from "@antumbra/domain-pieces/queries/ready.ts";
import { FLAGS, FLEET, FlagKey } from "@antumbra/domain-settings/ids.ts";
import { flag } from "@antumbra/domain-settings/rows/flag.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Clock, Effect, Schema } from "effect";
export const Waiting = Schema.Struct({
	id: Schema.String,
	title: Schema.String,
	voyage: Schema.NullOr(Schema.String),
	mail: Schema.NullOr(DueWake.fields.batch),
	waitedMillis: Schema.Number,
});
export const HoldQueue = Schema.Struct({
	kind: Schema.Literals(["dispatch", "wake"]),
	setting: FlagKey,
	title: Schema.String,
	description: Schema.String,
	quiet: Schema.String,
	own: Schema.Boolean,
	held: Schema.Boolean,
	waiting: Schema.Array(Waiting),
});
export const queues = query("queues", {
	input: {},
	output: Schema.Struct({ everything: Schema.Boolean, queues: Schema.Array(HoldQueue) }),
	reads: [...ready.reads, ...dueWakes.reads, agent, voyageAgent, voyage, flag],
	run: Effect.fn("holds.queues")(function* (_input, rows) {
		const flags = yield* rows.flag.where({ scope: FLEET });
		const held = (key: "holdEverything" | "holdPieceDispatch" | "holdWakes") => flags.find((flag) => flag.key === key)?.on ?? FLAGS[key].fallback;
		const everything = held("holdEverything");
		const now = yield* Clock.currentTimeMillis;
		const dispatch = (yield* ready.run({}, rows)).map(({ piece, voyage }) => ({
			id: piece.id,
			title: piece.title,
			voyage: voyage.name,
			mail: null,
			waitedMillis: now - Date.parse(piece.launchedAt ?? new Date(now).toISOString()),
		}));
		const agents = yield* rows.agent.where({});
		const crews = yield* rows.voyageAgent.where({});
		const voyages = yield* rows.voyage.where({});
		const names = new Map(
			crews.flatMap((crew) => {
				const name = voyages.find((voyage) => voyage.id === crew.voyageId)?.name;
				return name === undefined ? [] : [[String(crew.agentId), name] as const];
			}),
		);
		const wakes = [...(yield* dueWakes.run({}, rows))]
			.sort((a, b) => b.waitedMillis - a.waitedMillis)
			.map((wake) => ({
				id: wake.sessionId,
				title: agents.find((agent) => agent.id === wake.agentId)?.role ?? wake.agentId,
				voyage: names.get(wake.agentId) ?? null,
				mail: wake.batch,
				waitedMillis: wake.waitedMillis,
			}));
		return {
			everything,
			queues: [
				{
					kind: "dispatch",
					setting: "holdPieceDispatch",
					title: "Piece dispatch",
					description: "Pieces that are launched and ready, waiting for an agent to be spawned on them.",
					quiet: "No launched piece is waiting for an agent.",
					own: held("holdPieceDispatch"),
					held: everything || held("holdPieceDispatch"),
					waiting: dispatch,
				},
				{
					kind: "wake",
					setting: "holdWakes",
					title: "Wakes",
					description: "Agents at rest with mail due, waiting for the wake that carries it.",
					quiet: "No resting agent has mail due.",
					own: held("holdWakes"),
					held: everything || held("holdWakes"),
					waiting: wakes,
				},
			],
		};
	}),
});

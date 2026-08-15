import {
	bind,
	landArtifactSpec,
	landReportSpec,
	standDownSpec,
} from "@antumbra/agent-tools";
import type { DirectTool, DirectToolOutcome } from "@antumbra/plugin-api";
import { Deferred, Effect, Option } from "effect";
import type { AgentDeps } from "#deps.ts";
import { landArtifact, landReport } from "#outcomes.ts";

// why: who is calling is decided when the tools are built, at spawn, so the
// handler never has to trust anything the model says about itself.
export interface CrewIdentity {
	readonly agentId: string;
	readonly pieceId: Option.Option<string>;
	readonly sessionId: string;
}

const refused = (text: string): DirectToolOutcome => ({ ok: false, text });

// why: crew hailed by hand answer to no piece, so an outcome has nothing to
// land against — the tool says so rather than inventing one.
const onPiece = (
	identity: CrewIdentity,
	land: (pieceId: string) => Effect.Effect<DirectToolOutcome>,
) =>
	Option.match(identity.pieceId, {
		onNone: () => Effect.succeed(refused("you are not on a piece")),
		onSome: land,
	});

// why: the harness already logs every call as a tool item, so the transcript
// needs nothing from here — debug is for the times the two disagree.
const called = (identity: CrewIdentity, name: string) =>
	Effect.logDebug("crew tool called", {
		agentId: identity.agentId,
		name,
		sessionId: identity.sessionId,
	});

const answered = (
	identity: CrewIdentity,
	name: string,
	act: Effect.Effect<unknown, unknown>,
	text: string,
): Effect.Effect<DirectToolOutcome> =>
	called(identity, name).pipe(
		Effect.andThen(act),
		Effect.matchEffect({
			// why: an expected failure is the agent's business — a missing piece
			// is something it can read and act on — while a defect is ours, so it
			// goes to the log and the agent hears only that the tool did not serve.
			onFailure: (error) => Effect.succeed(refused(`${name}: ${error}`)),
			onSuccess: () => Effect.succeed({ ok: true, text }),
		}),
		Effect.catchCause((cause) =>
			Effect.logWarning("crew tool died", { name }, cause).pipe(
				Effect.as(refused(`${name} could not be served`)),
			),
		),
	);

// why: the retire is queued and never awaited — the act that ends this session
// cannot be one this session waits on.
const standDown = (deps: AgentDeps, identity: CrewIdentity) =>
	called(identity, standDownSpec.name).pipe(
		Effect.andThen(
			Deferred.await(deps.retireQueue).pipe(
				Effect.flatMap((queue) => queue(identity.agentId)),
				Effect.forkDetach,
			),
		),
		Effect.as({ ok: true, text: "standing down" }),
	);

export const crewTools = (
	deps: AgentDeps,
	identity: CrewIdentity,
): ReadonlyArray<DirectTool> => [
	bind(landReportSpec, (input) =>
		onPiece(identity, (pieceId) =>
			answered(
				identity,
				landReportSpec.name,
				landReport(deps, {
					authorAgentId: identity.agentId,
					body: input.body,
					pieceId,
					title: input.title,
				}),
				"report landed",
			),
		),
	),
	bind(landArtifactSpec, (input) =>
		onPiece(identity, (pieceId) =>
			answered(
				identity,
				landArtifactSpec.name,
				landArtifact(deps, {
					authorAgentId: identity.agentId,
					pieceId,
					title: input.title,
					uri: input.uri,
				}),
				"artifact landed",
			),
		),
	),
	bind(standDownSpec, () => standDown(deps, identity)),
];

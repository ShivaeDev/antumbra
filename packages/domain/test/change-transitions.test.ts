import { Database } from "@antumbra/persistence";
import type { ChangeObservation } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import type { ChangeRow } from "#change-rows.ts";
import { AgentDomain } from "#domain.ts";
import { berthed, reefWithPiece } from "#test/change-fixtures.ts";
import {
	acquireTemporaryPersistence,
	changeHostsOf,
	domainKernelLayer,
	makeScriptedBackend,
	passiveRunner,
} from "#test/harness.ts";
import {
	makeScriptedHost,
	type ScriptedHost,
	scriptedObservation,
} from "#test/scripted-host.ts";

const CREW = "agent-crew";

const withHost = <A, E, R>(
	body: (scripted: ScriptedHost) => Effect.Effect<A, E, R>,
) =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const backend = yield* makeScriptedBackend;
		const scripted = yield* makeScriptedHost();
		yield* body(scripted).pipe(
			Effect.provide(
				domainKernelLayer(
					temporary,
					backend.backend,
					{},
					passiveRunner,
					changeHostsOf(scripted.host),
				),
			),
		);
	});

const openChange = (pieceId: string, repoName: string) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		return yield* domain.changes.open({
			agentId: CREW,
			base: null,
			body: "sounded three fathoms",
			draft: false,
			pieceId,
			repoName,
			title: "chart the eastern spit",
		});
	});

const observed = (
	row: ChangeRow,
	repoId: string,
	activityOffset: number,
	patch: Partial<ChangeObservation>,
): ChangeObservation => ({
	...scriptedObservation("scripted", row.externalId ?? "", {
		baseRef: row.baseRef,
		headRef: row.headRef,
		repoId,
		title: row.title,
	}),
	activityAt: row.activityAt.getTime() + activityOffset,
	...patch,
});

const storedChange = (id: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		return Option.getOrThrow(yield* db.Change.where({ id }).first());
	});

it.live("freshness wins when one batch carries newer then stale news", () =>
	withHost(() =>
		Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const { piece, repo } = yield* reefWithPiece;
			yield* berthed(CREW);
			const row = yield* openChange(piece.id, repo.name);

			yield* domain.changes.observed("scripted", [
				observed(row, repo.id, 2, { stage: "landed" }),
				observed(row, repo.id, 1, { stage: "open", title: "stale" }),
			]);

			expect((yield* storedChange(row.id)).stage).toBe("landed");
		}),
	),
);

it.live("freshness wins across concurrent observation calls", () =>
	withHost(() =>
		Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const { piece, repo } = yield* reefWithPiece;
			yield* berthed(CREW);
			const row = yield* openChange(piece.id, repo.name);
			const pair = [
				observed(row, repo.id, 2, { stage: "landed" }),
				observed(row, repo.id, 1, { stage: "open", title: "stale" }),
			];

			yield* Effect.all(
				pair.map((one) => domain.changes.observed("scripted", [one])),
				{ concurrency: "unbounded" },
			);

			expect((yield* storedChange(row.id)).stage).toBe("landed");
		}),
	),
);

it.live("a newer reopen advances the same durable change", () =>
	withHost(() =>
		Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const { piece, repo } = yield* reefWithPiece;
			yield* berthed(CREW);
			const row = yield* openChange(piece.id, repo.name);

			yield* domain.changes.observed("scripted", [
				observed(row, repo.id, 1, { stage: "withdrawn" }),
			]);
			const [reopened] = yield* domain.changes.observed("scripted", [
				observed(row, repo.id, 2, { stage: "open" }),
			]);

			expect(reopened?.id).toBe(row.id);
			expect(reopened?.stage).toBe("open");
			expect(yield* db.Change.all()).toHaveLength(1);
			const transitions = yield* db.ChangeTransition.where({
				changeId: row.id,
			}).all();
			expect(
				transitions
					.toSorted(
						(left, right) =>
							left.activityAt.getTime() - right.activityAt.getTime(),
					)
					.map((transition) => [transition.fromStage, transition.toStage]),
			).toEqual([
				["open", "withdrawn"],
				["withdrawn", "open"],
			]);
		}),
	),
);

it.live("landed is irreversible even when a newer observation says open", () =>
	withHost(() =>
		Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const { piece, repo } = yield* reefWithPiece;
			yield* berthed(CREW);
			const row = yield* openChange(piece.id, repo.name);

			yield* domain.changes.observed("scripted", [
				observed(row, repo.id, 1, { stage: "landed" }),
			]);
			yield* domain.changes.observed("scripted", [
				observed(row, repo.id, 2, { stage: "open" }),
			]);

			expect((yield* storedChange(row.id)).stage).toBe("landed");
		}),
	),
);

it.live("replaying one transition keeps one stable event identity", () =>
	withHost(() =>
		Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const { piece, repo } = yield* reefWithPiece;
			yield* berthed(CREW);
			const row = yield* openChange(piece.id, repo.name);
			const withdrawn = observed(row, repo.id, 1, { stage: "withdrawn" });

			yield* domain.changes.observed("scripted", [withdrawn]);
			yield* domain.changes.observed("scripted", [withdrawn]);

			const transitions = yield* db.ChangeTransition.where({
				changeId: row.id,
			}).all();
			expect(transitions).toHaveLength(1);
			expect(transitions[0]?.id).toBe(
				`${row.id}:${withdrawn.activityAt}:withdrawn`,
			);
		}),
	),
);

it.live("a withdrawn change remains pollable so reopening is reconciled", () =>
	withHost((scripted) =>
		Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const { piece, repo } = yield* reefWithPiece;
			yield* berthed(CREW);
			const row = yield* openChange(piece.id, repo.name);

			yield* scripted.drive.transition(repo.id, "1", {
				stage: "withdrawn",
			});
			expect((yield* domain.changes.refresh("scripted"))[0]?.stage).toBe(
				"withdrawn",
			);
			yield* scripted.drive.transition(repo.id, "1", { stage: "open" });
			yield* domain.changes.refresh("scripted");

			expect((yield* storedChange(row.id)).stage).toBe("open");
		}),
	),
);

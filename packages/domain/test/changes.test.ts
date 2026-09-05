import { Changes } from "@antumbra/changes";
import { SettingsSource } from "@antumbra/contract";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect, Option, Stream } from "effect";
import { berthed, reefWithPiece } from "#test/change-fixtures.ts";
import { CREW, HEAD, openedChange, scriptedChangeHost } from "#test/change-submission-fixtures.ts";
import { claimsNothingHost, scriptedObservation } from "#test/scripted-host.ts";
import { stateOf } from "#test/voyage-fixtures.ts";
import { VoyageProcedureService } from "#voyages/service.ts";

it.effectApp.withProviders("a change opened by crew is written with the link to its piece", scriptedChangeHost, function* (_, scripted) {
	const settings = yield* SettingsSource;
	yield* settings.change({ key: "holdPieceDispatch", value: true });
	const db = yield* Database;
	const { piece, repo, voyage } = yield* reefWithPiece;
	yield* berthed(CREW);

	const row = yield* openedChange(piece.id, repo.name);
	expect(row.stage).toBe("open");
	expect(row.openedByAgentId).toBe(CREW);
	expect(row.originSessionId).toBe("session-crew");
	expect(row.url).toBe("https://scripted.test/changes/1");
	expect(row.headRef).toBe(HEAD);
	expect(row.baseRef).toBe("main");
	expect(row.raw).toBe('{"number":"1","source":"scripted"}');

	expect(yield* db.PieceChange.all()).toEqual([{ changeId: row.id, pieceId: piece.id, purpose: "produces" }]);
	expect((yield* scripted.drive.opened).length).toBe(1);
	expect(yield* stateOf(voyage.id, piece.id)).toBe("landing");
});

it.effectApp.withProviders("a change the record cannot place is refused before any host runs", scriptedChangeHost, function* (_, scripted) {
	const settings = yield* SettingsSource;
	yield* settings.change({ key: "holdPieceDispatch", value: true });
	const db = yield* Database;
	const changes = yield* Changes;
	const { piece, repo } = yield* reefWithPiece;

	const noPiece = yield* Effect.flip(openedChange("no-such-piece", repo.name));
	expect(noPiece).toMatchObject({
		_tag: "PieceNotFound",
		pieceId: "no-such-piece",
	});
	const noPieceAdoption = yield* Effect.flip(
		changes.adopt({
			agentId: CREW,
			pieceId: "no-such-piece",
			repoName: repo.name,
			url: "https://scripted.test/changes/77",
		}),
	);
	expect(noPieceAdoption).toMatchObject({
		_tag: "PieceNotFound",
		pieceId: "no-such-piece",
	});

	const noRepo = yield* Effect.flip(openedChange(piece.id, "shoals"));
	expect(noRepo._tag).toBe("RepoNotFound");
	expect(noRepo.message).toContain("shoals");

	yield* db.Agent.create({
		charter: "chart the reef",
		id: CREW,
		role: "crew",
		status: "alive",
	});
	const noBerth = yield* Effect.flip(openedChange(piece.id, repo.name));
	expect(noBerth._tag).toBe("BerthNotFound");
	expect(noBerth.message).toContain("reef");

	expect(yield* scripted.drive.adopted).toEqual([]);
	expect(yield* scripted.drive.opened).toEqual([]);
	expect(yield* db.Change.all()).toEqual([]);
});

it.effectApp.withProviders(
	"a repo no host claims is named in the refusal",
	Effect.succeed({ providers: { changeHosts: new Map([["indifferent", claimsNothingHost("indifferent")]]) }, state: undefined }),
	function* () {
		const settings = yield* SettingsSource;
		yield* settings.change({ key: "holdPieceDispatch", value: true });
		const { piece, repo } = yield* reefWithPiece;
		yield* berthed(CREW);
		const refused = yield* Effect.flip(openedChange(piece.id, repo.name));
		expect(refused._tag).toBe("NoChangeHost");
		expect(refused.message).toBe("no change host claims reef");
	},
);

it.effectApp.withProviders("adopting the same change twice is one row and one link per piece", scriptedChangeHost, function* () {
	const settings = yield* SettingsSource;
	yield* settings.change({ key: "holdPieceDispatch", value: true });
	const pieces = yield* Pieces;
	const db = yield* Database;
	const changes = yield* Changes;
	const { piece, repo, voyage } = yield* reefWithPiece;
	yield* db.Agent.create({
		charter: "chart the reef",
		id: CREW,
		role: "crew",
		status: "alive",
	});
	const second = yield* pieces.charter({
		charter: "draw the chart",
		dependsOn: [],
		expectation: "the chart is landed",
		role: "cartographer",
		title: "bravo",
		voyageId: voyage.id,
	});
	const url = "https://scripted.test/changes/77";
	const adopt = (pieceId: string) =>
		changes.adopt({
			agentId: CREW,
			pieceId,
			repoName: repo.name,
			url,
		});

	const first = yield* adopt(piece.id);
	expect(yield* adopt(piece.id)).toMatchObject(first);
	const shared = yield* adopt(second.id);
	expect(shared.id).toBe(first.id);

	expect((yield* db.Change.all()).length).toBe(1);
	expect((yield* db.PieceChange.all()).length).toBe(2);
	expect(first.externalId).toBe("77");
	expect(first.body).toBe("");
});

it.effectApp.withProviders("a landed change flips its piece done and wakes the voyage feed", scriptedChangeHost, function* (_, scripted) {
	const settings = yield* SettingsSource;
	yield* settings.change({ key: "holdPieceDispatch", value: true });
	const procedures = yield* VoyageProcedureService;
	const changes = yield* Changes;
	const feeds = yield* DomainFeeds;
	const { piece, repo, voyage } = yield* reefWithPiece;
	yield* berthed(CREW);
	const row = yield* openedChange(piece.id, repo.name);

	yield* scripted.drive.transition(repo.id, "1", {
		checks: "green",
		mergeable: "clean",
		review: "approved",
		stage: "landed",
	});
	// Host observations may include unrelated changes; drift ignores ids
	// without a known row.
	yield* scripted.drive.announce(
		scriptedObservation("scripted", "stranger", {
			baseRef: "main",
			headRef: "work/somebody-else",
			repoId: repo.id,
			title: "not ours",
		}),
	);

	const heard = yield* Effect.scoped(
		Effect.gen(function* () {
			const subscription = yield* feeds.subscribeVoyageRefresh();
			yield* changes.refresh("scripted");
			return yield* Stream.fromSubscription(subscription).pipe(Stream.take(1), Stream.runCollect);
		}),
	);
	expect(heard).toHaveLength(1);

	const view = Option.getOrThrow(yield* procedures.read(voyage.id));
	const seen = view.pieces.find((row) => row.id === piece.id);
	expect(seen?.state).toBe("done");
	expect(seen?.changes).toHaveLength(1);
	expect(seen?.changes.at(0)).toMatchObject({
		checks: "green",
		externalId: "1",
		host: "scripted",
		id: row.id,
		isDraft: false,
		mergeable: "clean",
		repoId: repo.id,
		repoName: repo.name,
		review: "approved",
		stage: "landed",
		title: "chart the eastern spit",
		url: "https://scripted.test/changes/1",
	});
	expect(yield* stateOf(voyage.id, piece.id)).toBe("done");
});

it.effectApp.withProviders("a change that has landed never goes back to open", scriptedChangeHost, function* (_, scripted) {
	const settings = yield* SettingsSource;
	yield* settings.change({ key: "holdPieceDispatch", value: true });
	const changes = yield* Changes;
	const { piece, repo, voyage } = yield* reefWithPiece;
	yield* berthed(CREW);
	yield* openedChange(piece.id, repo.name);
	yield* scripted.drive.transition(repo.id, "1", { stage: "landed" });
	const landed = (yield* changes.refresh("scripted"))[0];
	expect(landed?.stage).toBe("landed");

	const stood = (yield* changes.observed("scripted", [
		scriptedObservation("scripted", "1", {
			baseRef: "main",
			headRef: HEAD,
			repoId: repo.id,
			title: "chart the eastern spit",
		}),
	]))[0];
	expect(stood?.stage).toBe("landed");
	expect(stood?.landedAt).toEqual(landed?.landedAt);
	expect(yield* stateOf(voyage.id, piece.id)).toBe("done");
});

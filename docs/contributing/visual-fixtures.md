# Visual fixtures

A visual fixture holds the application's own journal, transcript logs, images, artifacts and drafts. It opens as a disposable local copy for UI
development and migration checks. It contains no provider sessions to resume, and it is never restored into the running application.

## Capture and select

`pnpm run fixture capture <label>` captures the development application's data. Add `--source prod` to capture the packaged application's data. The
command resolves the application's data location; development honors `ANTUMBRA_DEV_USER_DATA`. A label is required.

Capture takes consistent SQLite copies and preserves their existing schemas. It does not run migrations against the source. Archives live under
`~/.antumbra/fixtures/`; `pnpm run fixture list` lists their stable numbers, labels and capture dates. Use either a number or a label to select one.

## Open and experiment

`pnpm run fixture open <number-or-label>` extracts a fresh copy, starts the viewer and prints its URL. Open that URL in your chosen browser. Agents
use the integrated browser explicitly. Each checkout owns one viewer in its gitignored `.fixtures/open/` directory. Opening another fixture replaces
only that checkout's viewer. Ports are allocated independently of the live app.

Settings and other local edits work. Execution requests record intent, but no background reconciler, provider, Git operation or GitHub observer runs.
The fixture banner identifies the capture and the absence of execution. Transcripts come from captured Antumbra logs, without a connected runner.
Time-dependent views use the real clock.

`pnpm run fixture stop` stops the viewer and preserves its working copy. `pnpm run fixture start` starts that copy again or reuses its running viewer
and prints its URL. Neither `open` nor `start` launches a browser. Glass hot reload and server code restarts preserve experimental edits. Opening the
original fixture again discards those edits and starts fresh.

## Check an upgrade

`pnpm run fixture check <number-or-label>` extracts a fresh copy under `.fixtures/check/`, runs normal storage startup and validates its reads, then
exits. It leaves an interactive viewer and its experiments alone. Each check starts from the archive, so an earlier successful migration cannot hide a
problem in a later attempt.

Opening and checking use the same storage upgrade paths as production. Neither forces projection replay beyond what normal startup requires. A
migration change should also carry a focused assertion that its older data produces the intended reading; successful boot alone does not prove its
meaning.

Add `--target postgres` to `fixture check` to also start an app-owned PostgreSQL instance, prepare the current migrations with `test-sql`, and check
an isolated database cloned from that migrated template. `fixture capture <label> --target postgres` captures the same journal archive and immediately
runs that check. The PostgreSQL database, templates, instance and socket are released when the check ends.

The PostgreSQL composition currently establishes only the storage namespace. Domain data still belongs to the journal; the check validates captured
domain reads there and PostgreSQL schema readiness separately. Domain storage changes must add their fixture mappings and readout comparisons as they
move to PostgreSQL. A successful schema check does not prove that archived domain data has moved.

These checks and `pnpm test:app` require PostgreSQL server and client binaries. Set `ANTUMBRA_POSTGRES_BIN_DIRECTORY` to their directory when they are
outside `PATH` and the directory reported by `pg_config --bindir`. Missing binaries fail the tests; PostgreSQL stories never skip. Application time in
those stories uses a controlled clock. The desktop dev app continues to use its existing journal.

## Rebuild explicitly

Settings includes a Debug action to rebuild projections from the journal. It is available in the normal application and fixture viewer. It takes the
existing pre-rebuild snapshot, preserves journal facts and runner cursors, and refreshes live queries after replay. Commands use the same serialized
writer while the rebuild runs. The action does not restart agents or discard local fixture edits.

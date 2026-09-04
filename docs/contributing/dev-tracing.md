# Dev tracing

A dev run records its spans and log entries into `traces.db` in the dev data directory — `Antumbra-Dev` under the platform application-support path,
or whatever `ANTUMBRA_DEV_USER_DATA` names. A packaged run installs no tracer, adds no second logger, and writes no trace database.

Open the file with any SQLite client. It holds three tables: `runs`, `spans`, and `logs`. Startup keeps the five most recent runs and deletes the
rest, so the file stays small and old runs are gone rather than stale.

## What is not recorded

Spans named `prisma.*` are dropped at the sink rather than written. The ORM opens one per query, which outnumbers the spans of a run's actual work by
three orders of magnitude, and the file it produced was mostly index. Ask the database what a query cost; ask the trace what the workspace did.

## What is in a span

Every `Effect.fn` and `Effect.withSpan` in the workspace produces a row without further work. Four ids are lifted out of the span attributes into
indexed columns — `session_id`, `agent_id`, `intent_id`, `piece_id` — so looking up what happened to one object is an index seek rather than a scan.
Everything else the span carried stays in the `attributes` JSON document.

Annotate a new seam with `Effect.annotateSpans`, not `Effect.annotateCurrentSpan`: the first puts the id on every span opened beneath it, which is
what makes the descendants findable by the object they belong to.

```ts
dispatchPiece(port, candidate, plan).pipe(
	Effect.annotateSpans({ pieceId: candidate.piece.id }),
);
```

## Three queries to start from

The latest run's spans for one Session, in the order they started:

```sql
SELECT spans.name, spans.status, spans.duration_nanos / 1000000.0 AS millis
FROM spans
JOIN runs ON runs.run_id = spans.run_id
WHERE spans.session_id = :session_id
  AND runs.started_at_millis = (SELECT MAX(started_at_millis) FROM runs)
ORDER BY spans.started_at_millis;
```

The slowest spans of the latest run:

```sql
SELECT name, duration_nanos / 1000000.0 AS millis, status, session_id
FROM spans
WHERE run_id = (SELECT run_id FROM runs ORDER BY started_at_millis DESC LIMIT 1)
ORDER BY duration_nanos DESC
LIMIT 20;
```

Everything logged inside one span:

```sql
SELECT at_millis, level, message
FROM logs
WHERE span_id = :span_id
ORDER BY at_millis;
```

## What it will not do

The sink never fails a run. Spans are buffered and written in batches off the hot path; a database that cannot be opened, a write that is refused, or
a buffer that overflows costs one logged warning, after which the sink stands down for the rest of the run and the app carries on untraced. Nothing is
exported over a network, and nothing about production behaviour changes.

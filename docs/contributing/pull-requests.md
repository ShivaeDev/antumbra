# Pull requests

Pull requests to this repository follow the pr-description skill in `packages/skills/skills/pr-description/SKILL.md`. It is the one source for the
title and the body, and it wins over any template or default.

This guide is for changes to this repository; what Antumbra's own crew writes into a Change body is a product decision, carried by the `open_change`
tool and the same skill.

Review applies only the relevant [quality-gate routes](../../quality-gates/README.md). When feedback reveals a reusable quality rule, follow that
guide's clarification and recording process instead of leaving the reasoning in one review thread.

## Watching one

`pnpm pr watch <pull request url or number>` polls GitHub through `gh` and prints one JSON line whenever the pull request needs someone: a merge, a
close, a merge conflict, a review asking for changes, a failed check once every check on the current head has settled, and every review, inline review
comment and conversation comment as it arrives. It says nothing while the checks are still running or passing, and exits 0 when the pull request is
merged or closed. `--until ci` instead exits as soon as the checks on the head it armed on settle — 0 when they pass, 1 when they fail, 4 when a new
push supersedes that head, 3 when the pull request is merged or closed while they run, and 0 when five minutes pass without a single check appearing —
leaving one line saying which. A `gh` call that fails prints one `gh-error` line and the watch carries on; a first poll that cannot reach the pull
request exits 2.

Each poll asks the REST API for the pull request, the check runs on its head, its reviews, its review comments and its conversation comments, sending
the ETag of the last answer for each, so a poll that finds nothing new costs five requests and no rate-limit quota. One process watches one pull
request.

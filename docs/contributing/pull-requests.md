# Pull requests

Pull requests to this repository follow the pr-description skill in `packages/platform/skills/skills/pr-description/SKILL.md`. It is the one source
for the title and the body, and it wins over any template or default. The body is written to a file under `.local/`, which the formatter ignores, so
its paragraphs reach the pull request as written.

This guide is for changes to this repository; what Antumbra's own crew writes into a Change body is a product decision, carried by the `open_change`
tool and the same skill.

Review applies only the relevant [quality-gate routes](../../quality-gates/README.md). When feedback reveals a reusable quality rule, follow that
guide's clarification and recording process instead of leaving the reasoning in one review thread.

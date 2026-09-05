# Pull requests

Use an impact-focused title.

The body has four sections and is written for a reviewer who was not there while the work happened. `### Why?` and `### How?` are the valuable ones
and are never held to a sentence count; each gets the length the difficulty of the work and the explanation it needs. A capped Why and How leave a
tiny story under two pages of bullets, which is the wrong way round.

Why is the product side: the problem that started the work, the goal, and why anyone cared. How is the approach at a high level for a technical
reader, product as well as code. Write each as short paragraphs with line breaks between them, telling the story in order rather than in one flowing
blob.

`### Decisions` lists the major trade-offs, one bullet each; ten bullets means the list has gone well past the major ones. `### Callouts` lists the
spots a reviewer should look at closely, one bullet each. Leave either section out when there is none.

The body stands on its own. A pull request travels without our records and without the machine the work ran on, so a body that points at a report, a
note or a path says nothing to the person reading it: put the thing in the body. Do not add file lists, test plans, or diff narration.

This guide is for changes to this repository; what Antumbra's own crew writes into a Change body is a product decision, carried by the `open_change`
tool and the crew charter.

Review applies only the relevant [quality-gate routes](../../quality-gates/README.md). When feedback reveals a reusable quality rule, follow that
guide's clarification and recording process instead of leaving the reasoning in one review thread.

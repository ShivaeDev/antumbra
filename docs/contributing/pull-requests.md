# Pull requests

This is the format for pull requests to this repository. It applies in every repository and wins over any template or default. Write the title and the
body as described here and move on.

Write for a busy maintainer who was not in the session. They see the title, the body and the diff. They skim first and read only what earns it.

This guide is for changes to this repository; what Antumbra's own crew writes into a Change body is a product decision, carried by the `open_change`
tool and the crew charter.

## Title

One line that names the change by its effect on the product or on the people who use it, in the present tense, like a release note:

- Agents at rest are woken by their own mail
- The flagship opens a voyage from one hail

Spend every word on the effect. A type prefix such as `fix:` or `feat:` and a verb such as improve, update, refactor or clean up carry no information.

## Body

Four sections in this order. Why and How are the body. Decisions and Callouts are optional.

### Why?

The product story: the problem that started the work, the goal, and why it matters. Take it from the session and the task. When the session does not
say, ask.

### How?

The bird's-eye view of the approach, for a technical reader: what was built, how the parts fit, and where it sits in the product. Stay at the level
that lets the reader trust the diff before opening it.

### Decisions (optional)

Include this section when the work made a major trade-off. One bullet per trade-off, with the reason. Three bullets is a normal count.

### Callouts (optional)

Include this section when a spot needs a close look. One bullet per spot, with what to look for.

## Size and shape

Give Why and How the length the work needs, and spend the words on the story in order. Use short paragraphs with a blank line between them; each
paragraph is one step of the story.

Write in simplified technical English: one idea per sentence, sentences of about twenty words, active voice, present tense, one word for one thing
throughout. Make the point; a story seldom needs the raw figures. When counts, dates or numbers matter, put them in a table.

## Visuals

Use a table when items compare or line up: surfaces and what each shows, before and after, options and their costs. Use a Mermaid diagram when the
change is a flow, a state machine, or a set of parts and their connections; GitHub renders fenced `mermaid` blocks. A visual that says it better than
prose replaces the prose, with one caption that says what to look at.

## Example

```md
Agents at rest are woken by their own mail

### Why?

Crew agents that asked a question polled their mail every forty seconds, because nothing would wake them with the answer. The captain went idle before
two rulings addressed to it arrived and never saw them.

The goal is a fleet where waiting costs nothing and an answer reaches the agent that asked.

### How?

Rest is a turn ending. A delivery pass wakes a resting agent once per batch of due mail:

| Mail | Wakes |
| --- | --- |
| priority, flash | at once |
| routine | after a quiet window the admiral sets |

Each mail carries a delivery receipt beside its read receipt, so a batch is carried once.

### Callouts

- One additive migration creates the delivery receipt table.
```

## Leave out

File lists, test plans, risk speculation, diff narration, pointers to reports, boards, local paths or servers the reader cannot open, attribution and
session trailers.

## Review

Review applies only the relevant [quality-gate routes](../../quality-gates/README.md). When feedback reveals a reusable quality rule, follow that
guide's clarification and recording process instead of leaving the reasoning in one review thread.

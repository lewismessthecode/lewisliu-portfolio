---
title: "TIL: Rust Ownership"
tags: ["rust", "til"]
date: 2024-03-08
type: "note"
---

Today's Rust learning: ownership isn't just about memory management,
it's a way of thinking about data flow.

The key insight: if a function takes ownership of a value, it's
making a statement about responsibility. The caller is saying
"I'm done with this, it's your problem now."

This maps beautifully to real-world patterns like event sourcing
and message passing.

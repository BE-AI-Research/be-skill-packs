Turn notes into task documents: $ARGS

If $ARGS is empty, use the notes from this conversation.

1. Fetch `pack assist/triage` before writing anything. The task engine's
   format is exact and a document in the wrong shape is one nothing reads.
2. Read `.be-code/tasks/` first, so the next id is read rather than guessed
   and you do not duplicate a document that already exists.
3. Write the documents. The directory is `.be-code/tasks/` — not `.becode`,
   which is where packs and commands live and where nothing would read them.
4. Never invent a step the person did not describe. A note that is not a task
   stays a note.
5. Say which notes you did **not** turn into tasks, and why. That list is as
   useful as the documents.

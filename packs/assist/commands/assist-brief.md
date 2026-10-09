Give the morning brief. $ARGS

1. Run the scan and read all of it: `node {pack}/tools/scan --project .`
   Everything you say about this workspace comes from that output. If the
   `notes` line says something could not be read, say so — do not fill the
   gap from memory.
2. Read `.be-code/assist/brief-log.md` if it exists. Anything you have
   already raised twice becomes a question this time, not a third mention.
   Fetch `pack assist/escalation` if you are unsure what counts as the same
   item, or if the log is missing and you need to say so correctly.
3. Decide what is worth raising. **At most five items, and fewer is the
   normal case.** If nothing is worth raising, say "nothing worth raising"
   and stop — that is a complete and good answer, not a failure to find
   something. Fetch `pack assist/brief` for how to order and shape items.
4. Each item: what it is, why it matters now, and what you would do. An item
   with no next action is not an item.
5. Append what you raised to `.be-code/assist/brief-log.md`, one line each
   with the date and a stable key, so tomorrow knows what today said.
6. Never merge, push, publish, release or delete anything. Say what is ready
   and leave the decision where it belongs.

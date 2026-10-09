What is outstanding, and what has already been said? $ARGS

1. Run the scan: `node "{pack}/tools/scan" --project .`
2. Read `.be-code/assist/brief-log.md`. If it does not exist, say so — a
   missing log and a fortnight with nothing raised look identical otherwise,
   and only one of them means the escalation rule is working.
3. Fetch `pack assist/escalation`.
4. Report what was raised before and has not moved. Anything raised twice
   becomes a question — name it, say it has come up twice, and ask whether it
   matters or is blocked — rather than a third mention.
5. Anything the scan no longer shows has resolved itself: say so once and drop
   it from the log.
6. Never merge, push, publish, release or delete anything.

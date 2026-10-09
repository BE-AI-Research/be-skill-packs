Say whether a release is ready, and what remains. $ARGS

1. Run the scan: `node {pack}/tools/scan --project .` The changelog, version
   and tag facts come from its `change` line and nowhere else.
2. Fetch `pack assist/release`.
3. Report the state exactly as the scan gives it. If it says
   `version=unknown`, say the version could not be determined — do not infer
   one from the latest tag.
4. If `matches=no`, raise that immediately rather than holding it: a version
   and tag that disagree mislead anybody who looks at the repository.
5. Say what remains before a release, as a list the person can act on.
6. Stop there. Never tag, never push, never publish, never run a release
   script, however complete it looks.

// Six accessibility defects, chosen from WebAIM Million 2026's most common.
// Four produce captured diagnostics; two are here to prove they do NOT, and
// that is a finding the pack's core guidance has to carry instead of a
// playbook entry:
//
//   - the unlabelled <input> (51% of real pages) — no jsx-a11y rule in any
//     standard config catches it: control-has-associated-label is off in
//     recommended and its defaults ignore input/textarea anyway.
//   - the empty <button> (28%) — same gap.
export function Broken() {
  return (
    <div>
      <img src="logo.png" />
      <input type="text" />
      <label>Email</label>
      <button></button>
      <a href="/next"></a>
      <div onClick={() => {}}>Save</div>
    </div>
  );
}

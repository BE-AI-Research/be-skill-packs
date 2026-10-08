// A nullable value, as distinct from an optional one. TypeScript reports null
// and undefined under different codes, and a playbook entry may only list the
// ones that appear in a captured file.
export function Broken({ name }: { name: string | null }) {
  return <p>{name.length}</p>;
}

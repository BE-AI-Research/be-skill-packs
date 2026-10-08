// One missing required prop, which TypeScript reports under a different code
// from two or more missing (see missingprop.tsx). The commoner case of the two,
// so the playbook entry needs both codes captured.
type Props = { label: string };
function Button({ label }: Props) {
  return <button>{label}</button>;
}
export function Use() {
  return <Button />;
}

// A required prop not passed at all, which is a different diagnostic from
// passing one of the wrong type (see props.tsx).
type Props = { label: string; onClick: () => void };
function Button({ label }: Props) {
  return <button>{label}</button>;
}
export function Use() {
  return <Button />;
}

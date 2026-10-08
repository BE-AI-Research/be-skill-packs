type Props = { label: string; onClick: () => void };
function Button({ label }: Props) {
  return <button>{label}</button>;
}
export function Use() {
  return <Button label={42} />;
}

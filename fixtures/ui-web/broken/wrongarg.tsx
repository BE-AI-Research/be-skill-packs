// A wrong argument type, which TypeScript reports under its own code rather
// than the one it uses for a mismatched JSX attribute.
function greet(name: string) {
  return `hello ${name}`;
}
export function Broken() {
  return <p>{greet(42)}</p>;
}

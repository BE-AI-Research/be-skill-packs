// Two hook defects. Only the first produces a captured diagnostic:
// rules-of-hooks is an error in the plugin's recommended config, while
// exhaustive-deps — the missing `id` dependency below — is a *warning* there
// and in Next.js's config, and tools/lint drops warnings so they cannot fail
// a check. Nothing the harness never sees may become a playbook entry, so
// stale dependencies are core guidance only.
import { useEffect, useState } from "react";

export function Broken({ flag, id }: { flag: boolean; id: string }) {
  if (flag) {
    const [a] = useState(0);
    void a;
  }
  const [name, setName] = useState("");
  useEffect(() => {
    setName(id);
  }, []);
  return <p>{name}</p>;
}

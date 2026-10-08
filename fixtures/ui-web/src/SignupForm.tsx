import { useState } from "react";

export function SignupForm({ onSubmit }: { onSubmit: (email: string) => void }) {
  const [email, setEmail] = useState("");
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(email);
      }}
    >
      <label htmlFor="email">Email address</label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
          setEmail(event.target.value)
        }
      />
      <button type="submit">Sign up</button>
    </form>
  );
}

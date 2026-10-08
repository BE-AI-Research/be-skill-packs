// @vitest-environment jsdom
import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./Button";

test("the button is reachable by its accessible name", () => {
  render(<Button label="Save" onClick={() => {}} />);
  expect(screen.getByRole("button", { name: "Save" })).toBeDefined();
});

import { expect, test } from "@playwright/test";
import { liveInputPreview } from "../app/features/lms/lib/live-transcript";

test("interim hypotheses replace the previous words without duplicating final text", () => {
  expect(liveInputPreview("", "Jelas")).toBe("Jelas");
  expect(liveInputPreview("", "Jelaskan domain")).toBe("Jelaskan domain");
  expect(liveInputPreview("Jelaskan", "Jelaskan domain")).toBe("Jelaskan domain");
  expect(liveInputPreview("Jelaskan", "domain")).toBe("Jelaskan domain");
  expect(liveInputPreview("Jelaskan domain", "domain")).toBe("Jelaskan domain");
});

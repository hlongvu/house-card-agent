import { describe, expect, it, vi } from "vitest";
import { webSearch } from "@/lib/llm/tools/webSearch";

describe("webSearch", () => {
  it("returns empty array when no provider configured", async () => {
    const results = await webSearch("construction steel price Vietnam");
    expect(results).toEqual([]);
  });

  it("does not call external API when no key is set", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const results = await webSearch("test query");
    expect(results).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

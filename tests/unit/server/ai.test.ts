import { describe, expect, it } from "vitest";
import {
  buildDescriptionEnhancerPrompt,
  buildDescriptionEnhancerSystemPrompt,
  streamEnhancedDescription,
} from "@/server/ai";
import { MockAiAdapter } from "../../mocks/ai-adapter";

describe("server ai helpers", () => {
  it("shapes the description-enhancer prompt from listing fields and tone only", () => {
    const prompt = buildDescriptionEnhancerPrompt({
      title: "Collector Camera",
      category: "electronics",
      condition: "good",
      description: "Camera body with strap and case.",
      tone: "sarcastic",
    });

    expect(prompt).toContain("Tone: sarcastic");
    expect(prompt).toContain("Title: Collector Camera");
    expect(prompt).toContain("Category: electronics");
    expect(prompt).toContain("Condition: good");
    expect(prompt).toContain("Camera body with strap and case.");
    expect(prompt).not.toContain("seller profile");
  });

  it("builds a tone-specific system prompt", () => {
    expect(buildDescriptionEnhancerSystemPrompt("friendly")).toContain(
      "Sound warm, conversational, and helpful",
    );
    expect(buildDescriptionEnhancerSystemPrompt("friendly")).toContain(
      "Write 50 to 200 words.",
    );
  });

  it("falls back to the secondary model before streaming starts", async () => {
    const deltas: string[] = [];
    const adapter = new MockAiAdapter({});
    let callCount = 0;

    adapter.streamText = async function* ({ modelId }) {
      callCount += 1;

      if (callCount === 1) {
        throw new Error(`failed on ${modelId}`);
      }

      yield "Friendly";
      yield " rewrite";
    };

    const result = await streamEnhancedDescription(
      {
        title: "Collector Camera",
        category: "electronics",
        condition: "good",
        description: "Camera body with strap and case.",
        tone: "friendly",
      },
      {
        adapter,
        onTextDelta(delta) {
          deltas.push(delta);
        },
      },
    );

    expect(result.text).toBe("Friendly rewrite");
    expect(result.modelId).toBe("openai/gpt-4o-mini");
    expect(deltas).toEqual(["Friendly", " rewrite"]);
  });
});

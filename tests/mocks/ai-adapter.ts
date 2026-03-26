import type { infer as ZodInfer, ZodType } from "zod";
import type { AiAdapter, GenerateStructuredObjectOptions } from "@/server/ai";

export class MockAiAdapter implements AiAdapter {
  calls: GenerateStructuredObjectOptions<ZodType>[] = [];

  constructor(private readonly result: unknown) {}

  async generateStructuredObject<TSchema extends ZodType>(
    options: GenerateStructuredObjectOptions<TSchema>,
  ): Promise<ZodInfer<TSchema>> {
    this.calls.push(options as GenerateStructuredObjectOptions<ZodType>);

    return this.result as ZodInfer<TSchema>;
  }
}

import type { AiAdapter, GenerateStructuredObjectOptions } from "@/server/ai";

export class MockAiAdapter implements AiAdapter {
  calls: GenerateStructuredObjectOptions[] = [];

  constructor(private readonly result: unknown) {}

  async generateStructuredObject<T>(
    options: GenerateStructuredObjectOptions,
  ): Promise<T> {
    this.calls.push(options);

    return this.result as T;
  }
}

import type { infer as ZodInfer, ZodType } from "zod";
import type {
  AiAdapter,
  GenerateStructuredObjectOptions,
  GenerateTextOptions,
} from "@/server/ai";

export class MockAiAdapter implements AiAdapter {
  calls: GenerateStructuredObjectOptions<ZodType>[] = [];
  streamTextCalls: GenerateTextOptions[] = [];

  constructor(private readonly result: unknown) {}

  async generateStructuredObject<TSchema extends ZodType>(
    options: GenerateStructuredObjectOptions<TSchema>,
  ): Promise<ZodInfer<TSchema>> {
    this.calls.push(options as GenerateStructuredObjectOptions<ZodType>);

    return this.result as ZodInfer<TSchema>;
  }

  streamText(options: GenerateTextOptions): AsyncIterable<string> {
    this.streamTextCalls.push(options);

    return (async function* () {})();
  }
}

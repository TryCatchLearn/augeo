export type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GenerateStructuredObjectOptions = {
  schemaName: string;
  prompt: string;
  messages?: AiMessage[];
};

export interface AiAdapter {
  generateStructuredObject<T>(
    options: GenerateStructuredObjectOptions,
  ): Promise<T>;
}

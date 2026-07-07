import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "sk-no-key",
  baseURL: process.env.OPENAI_BASE_URL || undefined,
});

export async function callLLM(prompt: string, tools?: OpenAI.Chat.Completions.ChatCompletionTool[]) {
  return openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.1,
    messages: [{ role: "user", content: prompt }],
    tools,
    tool_choice: tools && tools.length > 0 ? "auto" : undefined,
  });
}

export async function callLLMWithVision(
  prompt: string,
  imageBase64: string,
  mimeType: string = "image/jpeg"
) {
  return openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.1,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        ],
      },
    ],
  });
}

export async function callLLMStructured<T>(
  systemPrompt: string,
  userPrompt: string,
  jsonSchema: Record<string, unknown>
): Promise<T> {
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.1,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "result",
        strict: true,
        schema: jsonSchema,
      },
    },
  });

  const raw = response.choices[0]?.message?.content || "{}";
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    throw new Error(
      `LLM returned invalid JSON: ${raw.slice(0, 200)} (${(err as Error).message})`
    );
  }
}

import OpenAI from "openai";

type Provider = "openai" | "deepseek";

function getProvider(): Provider {
  const p = (process.env.LLM_PROVIDER || "openai").toLowerCase();
  return p as Provider;
}

function getModel(): string {
  if (getProvider() === "deepseek") {
    return process.env.LLM_MODEL || "deepseek-chat";
  }
  return process.env.LLM_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
}

function getApiKey(): string {
  if (getProvider() === "deepseek") {
    return process.env.DEEPSEEK_API_KEY || process.env.LLM_API_KEY || "sk-no-key";
  }
  return process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || "sk-no-key";
}

function getBaseURL(): string | undefined {
  if (getProvider() === "deepseek") {
    return process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1";
  }
  return process.env.OPENAI_BASE_URL || undefined;
}

const client = new OpenAI({
  apiKey: getApiKey(),
  baseURL: getBaseURL(),
});

export async function callLLM(
  prompt: string,
  tools?: OpenAI.Chat.Completions.ChatCompletionTool[]
) {
  return client.chat.completions.create({
    model: getModel(),
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
  const provider = getProvider();

  if (provider === "deepseek") {
    throw new Error(
      "DeepSeek does not support vision/image input. Set LLM_PROVIDER=openai with a vision-capable model (e.g. gpt-4o) to parse image files."
    );
  }

  return client.chat.completions.create({
    model: getModel(),
    temperature: 0.1,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${imageBase64}` },
          },
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
  const provider = getProvider();
  const model = getModel();

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  if (provider === "deepseek") {
    // DeepSeek doesn't support json_schema strict mode.
    // Use json_object mode and embed the schema in the prompt.
    const schemaHint = `\n\nYou MUST respond with a valid JSON object that strictly follows this JSON schema:\n\n${JSON.stringify(jsonSchema, null, 2)}\n\nReturn ONLY the JSON object, no markdown, no explanation.`;

    messages[1] = {
      role: "user",
      content: userPrompt + schemaHint,
    };

    const response = await client.chat.completions.create({
      model,
      temperature: 0.1,
      messages,
      response_format: { type: "json_object" },
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

  // OpenAI / compatible providers with json_schema support
  const response = await client.chat.completions.create({
    model,
    temperature: 0.1,
    messages,
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

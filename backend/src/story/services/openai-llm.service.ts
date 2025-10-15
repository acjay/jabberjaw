import { Injectable } from "@danet/core";
import {
  LLMService,
  LLMResponse,
  StorySeedsResponse,
  StorySeed,
} from "./llm.service.ts";
import { OpenAIClient } from "../../shared/index.ts";
import { ConfigurationService } from "../../configuration/index.ts";
import {
  ContentRequest,
  ContentStyle,
  type ContentStyleType,
} from "../../shared/schemas/index.ts";

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

@Injectable()
export class OpenAILLMService extends LLMService {
  private apiKey: string | undefined;
  private model: string | undefined;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  constructor(
    private readonly openaiClient: OpenAIClient,
    private readonly configService: ConfigurationService
  ) {
    super();
  }

  private async ensureInitialized(): Promise<void> {
    if (this.apiKey === undefined) {
      try {
        this.apiKey = await this.configService.getOpenAIApiKey();
        this.model = await this.configService.getOpenAIModel();
      } catch (_error) {
        console.warn(
          "OPENAI_API_KEY not found in environment variables. OpenAI service will not work."
        );
        this.apiKey = "";
        this.model = "gpt-4o-mini";
      }
    }
  }

  async generateFullStory(request: ContentRequest): Promise<LLMResponse> {
    await this.ensureInitialized();

    if (!this.apiKey) {
      throw new Error(
        "OpenAI API key not configured. Please set OPENAI_API_KEY environment variable."
      );
    }

    const prompt = this.generatePrompt(request.input, request.contentStyle!);

    try {
      const content = await this.callOpenAI(prompt);

      return {
        content,
        estimatedDuration: this.estimateDuration(content),
        sources: ["OpenAI", this.model!],
      };
    } catch (error) {
      console.error("OpenAI API error:", error);
      throw new Error(
        `Failed to generate content: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async generateStorySeedsForPOI(
    poiDescription: string
  ): Promise<StorySeedsResponse> {
    await this.ensureInitialized();

    if (!this.apiKey) {
      throw new Error(
        "OpenAI API key not configured. Please set OPENAI_API_KEY environment variable."
      );
    }

    const prompt = this.generateStorySeedsPrompt(poiDescription);

    try {
      const content = await this.callOpenAI(prompt);
      const seeds = this.parseStorySeedsResponse(content);

      return {
        seeds,
        sources: ["OpenAI", this.model!],
      };
    } catch (error) {
      console.error("OpenAI API error:", error);
      throw new Error(
        `Failed to generate story seeds: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private generateStorySeedsPrompt(poiDescription: string): string {
    return `Please generate segments of content for narrating points of interest during a road trip in real time. I want you to start by generating a list potential stories, given a list of nearby points of interest. Later, I will select a story to be elaborated into a 3-minute segment.

I want up to 20 summaries of potential stories. Each summary should be a paragraph, followed by a title of less than 10 words, which will be used to identify the story. The summaries should be factual, rather than entertaining. The title should be descriptive, not artistic, because we want it to serve as an identifier.

Examples of story topics include:
- Surprising facts
- Events of historical significance
- Recent events
- Associations with well-known people
- Origin stories of the place or piece of infrastructure

These are just example topics, you can go beyond this set.

The stories should be distinct. They can be on different facets of the same topic. I just don't want stories that are basically duplicates. You can give me less than 20 summaries if you run out of interesting story ideas. If you have no information at all to create a good story idea, please respond "no story ideas".

Please format your response as follows for each story:
SUMMARY: [paragraph summary]
TITLE: [descriptive title under 10 words]

The point of interest is: ${poiDescription}`;
  }

  private parseStorySeedsResponse(content: string): StorySeed[] {
    if (content.toLowerCase().includes("no story ideas")) {
      return [];
    }

    const seeds: StorySeed[] = [];
    const sections = content.split(/(?=SUMMARY:)/i);

    for (const section of sections) {
      const summaryMatch = section.match(/SUMMARY:\s*(.+?)(?=TITLE:|$)/is);
      const titleMatch = section.match(/TITLE:\s*(.+?)$/im);

      if (summaryMatch && titleMatch) {
        const summary = summaryMatch[1].trim();
        const title = titleMatch[1].trim();

        if (summary && title) {
          seeds.push({ summary, title });
        }
      }
    }

    return seeds;
  }

  generatePrompt(
    input: ContentRequest["input"],
    style: ContentStyleType
  ): string {
    const basePrompt = `Create an engaging 3-minute podcast-style narration about `;

    let subject: string;
    let context = "";

    if (input.type === "TextPOIDescription") {
      subject = input.description;
    } else {
      subject = `${input.name}, a ${input.poiType}${
        input.locationDescription ? ` in ${input.locationDescription}` : ""
      }`;
      if (input.description) {
        context = `Additional context: ${input.description}. `;
      }
      context += `Located at coordinates ${input.location.latitude}, ${input.location.longitude}. `;
    }

    const styleInstructions = this.getStyleInstructions(style);

    return `${basePrompt}${subject}. ${context}${styleInstructions}

The narration should be:
- Approximately 3 minutes when spoken (around 450-500 words)
- Engaging and conversational, suitable for a road trip audience
- Educational but entertaining
- Include interesting facts, stories, or historical context
- Written in a warm, friendly tone as if speaking to passengers in a car
- Avoid using phrases like "Welcome to" or "Thank you for listening" - jump straight into the content
- Use present tense and make it feel immediate and relevant

Focus on making the content memorable and engaging for travelers passing through or near this location. Include specific details that make this place unique and interesting.`;
  }

  private async callOpenAI(prompt: string): Promise<string> {
    await this.ensureInitialized();

    const messages: OpenAIMessage[] = [
      {
        role: "system",
        content:
          "You are an expert travel narrator who creates engaging, informative content about locations for road trip travelers. Your narrations are conversational, educational, and entertaining.",
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    const requestBody = {
      model: this.model!,
      messages,
      max_tokens: 800, // Roughly 600 words
      temperature: 0.7, // Creative but not too random
      top_p: 0.9,
      frequency_penalty: 0.1, // Slight penalty for repetition
      presence_penalty: 0.1, // Encourage diverse content
    };

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const data: OpenAIResponse = await this.openaiClient.chatCompletion(
          {
            model: this.model!,
            messages: requestBody.messages,
            temperature: requestBody.temperature,
            max_tokens: requestBody.max_tokens,
          },
          this.apiKey!
        );

        if (!data.choices || data.choices.length === 0) {
          throw new Error("No content generated by OpenAI");
        }

        const content = data.choices[0].message.content.trim();

        if (!content) {
          throw new Error("Empty content generated by OpenAI");
        }

        // Log usage for monitoring
        if (data.usage) {
          console.log(
            `OpenAI usage - Prompt: ${data.usage.prompt_tokens}, Completion: ${data.usage.completion_tokens}, Total: ${data.usage.total_tokens} tokens`
          );
        }

        return content;
      } catch (error) {
        console.error(`OpenAI API attempt ${attempt} failed:`, error);

        if (attempt === this.maxRetries) {
          throw error;
        }

        // Exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error("All OpenAI API attempts failed");
  }

  private getStyleInstructions(style: ContentStyleType): string {
    switch (style) {
      case ContentStyle.HISTORICAL:
        return "Focus on historical events, founding stories, significant moments in time, and the people who shaped this place. Include dates, historical context, and how past events connect to the present. ";
      case ContentStyle.CULTURAL:
        return "Emphasize cultural significance, notable people, arts, local traditions, festivals, and what makes the local community unique. Include stories about local customs and cultural contributions. ";
      case ContentStyle.GEOGRAPHICAL:
        return "Highlight geographical features, natural phenomena, environmental aspects, geology, climate, and how the landscape was formed. Explain what makes this location geographically special. ";
      case ContentStyle.MIXED:
      default:
        return "Include a balanced mix of historical facts, cultural significance, and geographical information. Weave together the human stories, natural features, and historical context that make this place special. ";
    }
  }

  private estimateDuration(content: string): number {
    // More accurate estimation: average speaking rate is about 150-160 words per minute
    // Account for punctuation and natural pauses
    const words = content.split(/\s+/).length;
    const sentences = content.split(/[.!?]+/).length;
    const wordsPerMinute = 155;

    // Add time for natural pauses (roughly 0.5 seconds per sentence)
    const pauseTime = sentences * 0.5;
    const speakingTime = (words / wordsPerMinute) * 60;

    return Math.round(speakingTime + pauseTime);
  }
}

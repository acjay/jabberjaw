import { Injectable } from "@danet/core";
import { LLMService, LLMResponse } from "./llm.service.ts";
import {
  ContentRequestDto,
  TextPOIDescriptionDto,
  StructuredPOIDto,
  ContentStyle,
} from "../dto/index.ts";
import { OpenAIClient } from "../../shared/index.ts";
import { ConfigurationService } from "../../configuration/index.ts";

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

  async generateContent(request: ContentRequestDto): Promise<LLMResponse> {
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

  generatePrompt(
    input: TextPOIDescriptionDto | StructuredPOIDto,
    style: ContentStyle
  ): string {
    const basePrompt = `Create an engaging 3-minute podcast-style narration about `;

    let subject: string;
    let context = "";

    if (input instanceof TextPOIDescriptionDto) {
      subject = input.description;
    } else {
      subject = `${input.name}, a ${input.type} in ${
        input.location.city || input.location.state || input.location.country
      }`;
      if (input.description) {
        context = `Additional context: ${input.description}. `;
      }
      if (input.context) {
        context += `${input.context}. `;
      }
      if (input.location.coordinates) {
        context += `Located at coordinates ${input.location.coordinates.latitude}, ${input.location.coordinates.longitude}. `;
      }
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

  private getStyleInstructions(style: ContentStyle): string {
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

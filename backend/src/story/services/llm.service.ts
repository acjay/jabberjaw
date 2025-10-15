import { Injectable } from "@danet/core";
import {
  ContentRequest,
  ContentStyle,
  type ContentStyleType,
} from "../../shared/schemas/index.ts";

export interface LLMResponse {
  content: string;
  estimatedDuration: number;
  sources?: string[];
}

export interface StorySeed {
  title: string;
  summary: string;
}

export interface StorySeedsResponse {
  seeds: StorySeed[];
  sources?: string[];
}

@Injectable()
export abstract class LLMService {
  abstract generateFullStory(request: ContentRequest): Promise<LLMResponse>;
  abstract generateStorySeedsForPOI(
    poiDescription: string
  ): Promise<StorySeedsResponse>;
  abstract generatePrompt(
    input: ContentRequest["input"],
    style: ContentStyleType
  ): string;
}

@Injectable()
export class MockLLMService extends LLMService {
  private prompts = new Map<string, string>();

  async generateFullStory(request: ContentRequest): Promise<LLMResponse> {
    const prompt = this.generatePrompt(request.input, request.contentStyle!);

    // Store the prompt for analysis
    const promptId = crypto.randomUUID();
    this.prompts.set(promptId, prompt);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    const content = this.generateMockContent(
      request.input,
      request.contentStyle!
    );

    return {
      content,
      estimatedDuration: this.estimateDuration(content),
      sources: ["Mock LLM Service", "Generated Content"],
    };
  }

  async generateStorySeedsForPOI(
    _poiDescription: string
  ): Promise<StorySeedsResponse> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Generate mock story seeds
    const seeds: StorySeed[] = [
      {
        title: "Historic Founding Story",
        summary: `This location has a fascinating founding story that dates back to the early settlement period. The area was established by pioneers who recognized its strategic importance and unique characteristics. The original settlers faced numerous challenges but persevered to create what we see today.`,
      },
      {
        title: "Notable Historical Figure Connection",
        summary: `A famous historical figure once visited or lived in this area, leaving behind stories and legends that locals still tell today. Their presence here influenced the development of the community and left a lasting impact on the local culture and identity.`,
      },
      {
        title: "Architectural Significance",
        summary: `The buildings and structures in this area represent a unique architectural style or period that tells the story of the region's development. The design choices reflect both practical needs and aesthetic preferences of the time when they were constructed.`,
      },
    ];

    return {
      seeds,
      sources: ["Mock LLM Service", "Generated Story Seeds"],
    };
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
    }

    const styleInstructions = this.getStyleInstructions(style);

    return `${basePrompt}${subject}. ${context}${styleInstructions}

The narration should be:
- Approximately 3 minutes when spoken (around 450-500 words)
- Engaging and conversational, suitable for a road trip audience
- Educational but entertaining
- Include interesting facts, stories, or historical context
- Written in a warm, friendly tone as if speaking to passengers in a car

Focus on making the content memorable and engaging for travelers passing through or near this location.`;
  }

  private getStyleInstructions(style: ContentStyleType): string {
    switch (style) {
      case ContentStyle.HISTORICAL:
        return "Focus on historical events, founding stories, and significant moments in time. ";
      case ContentStyle.CULTURAL:
        return "Emphasize cultural significance, notable people, arts, and local traditions. ";
      case ContentStyle.GEOGRAPHICAL:
        return "Highlight geographical features, natural phenomena, and environmental aspects. ";
      case ContentStyle.MIXED:
      default:
        return "Include a mix of historical facts, cultural significance, and geographical information. ";
    }
  }

  private generateMockContent(
    input: ContentRequest["input"],
    style: ContentStyleType
  ): string {
    let subject: string;
    let location = "";

    if (input.type === "TextPOIDescription") {
      subject = input.description;
    } else {
      subject = input.name;
      location = input.locationDescription
        ? ` in ${input.locationDescription}`
        : "";
    }

    const styleContext = this.getStyleContext(style);

    return `Welcome to our journey past ${subject}${location}! 

${styleContext}

This fascinating location has captured the attention of travelers for generations. The area is known for its unique character and the stories that have unfolded here over the years. 

What makes this place particularly interesting is how it represents the broader tapestry of American history and culture. From its early days to the present, this location has witnessed countless stories of human endeavor, natural beauty, and cultural significance.

As we continue our journey, take a moment to appreciate how places like this contribute to the rich mosaic of experiences that make road trips so memorable. Each location we pass has its own story to tell, its own contribution to the larger narrative of the places we call home.

The landscape around us continues to evolve, shaped by both natural forces and human activity. It's these layers of history, culture, and geography that make every mile of our journey worth savoring.

Thank you for taking this brief journey with us through the story of ${subject}. Safe travels, and keep your eyes open for the next interesting landmark on our route!`;
  }

  private getStyleContext(style: ContentStyleType): string {
    switch (style) {
      case ContentStyle.HISTORICAL:
        return "The historical significance of this area dates back several generations, with events that shaped the local community and contributed to the broader historical narrative of the region.";
      case ContentStyle.CULTURAL:
        return "This location holds special cultural meaning, representing the artistic, social, and community values that define this area and its people.";
      case ContentStyle.GEOGRAPHICAL:
        return "The geographical features of this area tell a story of natural processes, climate patterns, and the unique environmental characteristics that make this location distinctive.";
      case ContentStyle.MIXED:
      default:
        return "This remarkable place combines historical significance, cultural importance, and unique geographical features that make it a noteworthy stop on any journey.";
    }
  }

  private estimateDuration(content: string): number {
    // Rough estimation: average speaking rate is about 150-160 words per minute
    const words = content.split(/\s+/).length;
    const wordsPerMinute = 155;
    return Math.round((words / wordsPerMinute) * 60); // Return duration in seconds
  }

  getStoredPrompt(promptId: string): string | undefined {
    return this.prompts.get(promptId);
  }
}

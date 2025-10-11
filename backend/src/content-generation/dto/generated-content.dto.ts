export class GeneratedContentDto {
  id!: string;
  content!: string;
  estimatedDuration!: number;
  prompt?: string;
  generatedAt?: Date;
  sources?: string[];
  contentStyle?: string;

  constructor(data: Partial<GeneratedContentDto>) {
    Object.assign(this, data);

    if (!this.id) {
      throw new Error('ID is required');
    }

    if (!this.content || typeof this.content !== 'string') {
      throw new Error('Content is required and must be a string');
    }

    if (typeof this.estimatedDuration !== 'number' || this.estimatedDuration <= 0) {
      throw new Error('Estimated duration must be a positive number');
    }

    // Set defaults
    this.generatedAt = this.generatedAt || new Date();
    this.sources = this.sources || [];
  }
}

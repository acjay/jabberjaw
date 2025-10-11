export class SegmentResponseDto {
  id!: string;
  content!: string;
  audioUrl!: string;
  duration!: number;
  status: 'ready' | 'generating' | 'error' = 'ready';
  location?: {
    latitude: number;
    longitude: number;
  };
  generatedAt?: Date;

  constructor(data: Partial<SegmentResponseDto>) {
    Object.assign(this, data);

    if (!this.id) {
      throw new Error('id is required');
    }

    if (!this.content) {
      throw new Error('content is required');
    }

    if (!this.audioUrl) {
      throw new Error('audioUrl is required');
    }

    if (typeof this.duration !== 'number' || this.duration <= 0) {
      throw new Error('duration must be a positive number');
    }
  }
}

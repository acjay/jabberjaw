export class LocationResponseDto {
  segmentId!: string;
  audioUrl!: string;
  status: 'generating' | 'ready' | 'error' = 'generating';
  estimatedDuration?: number;
  message?: string;

  constructor(data: Partial<LocationResponseDto>) {
    Object.assign(this, data);

    if (!this.segmentId) {
      throw new Error('segmentId is required');
    }

    if (!this.audioUrl) {
      throw new Error('audioUrl is required');
    }
  }
}

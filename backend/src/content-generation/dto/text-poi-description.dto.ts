export class TextPOIDescriptionDto {
  description!: string;

  constructor(data: Partial<TextPOIDescriptionDto>) {
    Object.assign(this, data);

    if (!this.description || typeof this.description !== 'string') {
      throw new Error('Description is required and must be a string');
    }

    if (this.description.trim().length === 0) {
      throw new Error('Description cannot be empty');
    }

    if (this.description.length > 500) {
      throw new Error('Description must be 500 characters or less');
    }
  }
}

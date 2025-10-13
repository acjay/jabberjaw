export class LocationRequestDto {
  latitude!: number;
  longitude!: number;
  timestamp?: Date;
  accuracy?: number;

  constructor(data: Partial<LocationRequestDto>) {
    Object.assign(this, data);

    // Validate required fields
    if (typeof this.latitude !== 'number' || typeof this.longitude !== 'number') {
      throw new Error('Latitude and longitude are required and must be numbers');
    }

    // Validate latitude range
    if (this.latitude < -90 || this.latitude > 90) {
      throw new Error('Latitude must be between -90 and 90 degrees');
    }

    // Validate longitude range
    if (this.longitude < -180 || this.longitude > 180) {
      throw new Error('Longitude must be between -180 and 180 degrees');
    }

    // Set defaults
    this.timestamp = this.timestamp || new Date();
    this.accuracy = this.accuracy || 0;
  }
}

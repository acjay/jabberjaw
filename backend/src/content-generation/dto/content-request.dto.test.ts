import { assertEquals, assertThrows } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import {
  ContentRequestDto,
  ContentStyle,
  POIType,
  StructuredPOIDto,
  TextPOIDescriptionDto,
} from './index.ts';

describe('ContentRequestDto', () => {
  describe('with TextPOIDescription input', () => {
    it('should create valid request with text description', () => {
      const request = new ContentRequestDto({
        input: { description: 'The town of Metuchen, NJ, USA' },
      });

      assertEquals(request.targetDuration, 180);
      assertEquals(request.contentStyle, ContentStyle.MIXED);
      assertEquals(
        (request.input as TextPOIDescriptionDto).description,
        'The town of Metuchen, NJ, USA',
      );
    });

    it('should accept custom duration and style', () => {
      const request = new ContentRequestDto({
        input: { description: 'Morton Arboretum in Lisle, IL, USA' },
        targetDuration: 240,
        contentStyle: ContentStyle.HISTORICAL,
      });

      assertEquals(request.targetDuration, 240);
      assertEquals(request.contentStyle, ContentStyle.HISTORICAL);
    });
  });

  describe('with StructuredPOI input', () => {
    it('should create valid request with structured POI', () => {
      const request = new ContentRequestDto({
        input: {
          name: 'Morton Arboretum',
          type: POIType.ARBORETUM,
          location: {
            country: 'USA',
            state: 'Illinois',
            city: 'Lisle',
          },
        },
      });

      assertEquals(request.targetDuration, 180);
      assertEquals(request.contentStyle, ContentStyle.MIXED);
      assertEquals((request.input as StructuredPOIDto).name, 'Morton Arboretum');
    });

    it('should validate structured POI data', () => {
      assertThrows(() => {
        new ContentRequestDto({
          input: {
            name: 'Test',
            type: 'invalid_type' as POIType,
            location: { country: 'USA' },
          },
        });
      });
    });
  });

  describe('validation', () => {
    it('should throw error for missing input', () => {
      assertThrows(
        () => {
          new ContentRequestDto({});
        },
        Error,
        'Input is required',
      );
    });

    it('should throw error for invalid duration', () => {
      assertThrows(
        () => {
          new ContentRequestDto({
            input: { description: 'Test location' },
            targetDuration: 10, // Too short
          });
        },
        Error,
        'Target duration must be between 30 and 600 seconds',
      );
    });

    it('should throw error for invalid content style', () => {
      assertThrows(
        () => {
          new ContentRequestDto({
            input: { description: 'Test location' },
            contentStyle: 'invalid' as ContentStyle,
          });
        },
        Error,
        'Content style must be a valid ContentStyle',
      );
    });
  });
});

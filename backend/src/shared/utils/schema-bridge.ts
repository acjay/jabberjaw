import {
  ContentRequest,
  StructuredPOI,
  TextPOIDescription,
} from "../schemas/index.ts";
import {
  ContentRequestDto,
  StructuredPOIDto,
  TextPOIDescriptionDto,
  POIType,
  ContentStyle,
} from "../../story/dto/index.ts";

/**
 * Converts Zod ContentRequest to legacy ContentRequestDto
 */
export function convertContentRequestToDto(
  request: ContentRequest
): ContentRequestDto {
  let inputDto: StructuredPOIDto | TextPOIDescriptionDto;

  if ("description" in request.input) {
    // TextPOIDescription
    inputDto = new TextPOIDescriptionDto(request.input);
  } else {
    // StructuredPOI - need to map type string to POIType enum
    const structuredInput = request.input as StructuredPOI;
    const poiType = mapStringToPOIType(structuredInput.type);

    inputDto = new StructuredPOIDto({
      name: structuredInput.name,
      type: poiType,
      location: {
        country: "United States", // Default
        coordinates: {
          latitude: structuredInput.location.latitude,
          longitude: structuredInput.location.longitude,
        },
      },
      context: structuredInput.description || "",
    });
  }

  return new ContentRequestDto({
    input: inputDto,
    targetDuration: request.targetDuration,
    contentStyle: mapStringToContentStyle(request.contentStyle),
  });
}

/**
 * Maps string to ContentStyle enum
 */
function mapStringToContentStyle(style: string): ContentStyle {
  const styleMap: Record<string, ContentStyle> = {
    historical: ContentStyle.HISTORICAL,
    cultural: ContentStyle.CULTURAL,
    geographical: ContentStyle.GEOGRAPHICAL,
    mixed: ContentStyle.MIXED,
  };

  return styleMap[style] || ContentStyle.MIXED;
}

/**
 * Maps string type to POIType enum
 */
function mapStringToPOIType(type: string): POIType {
  const typeMap: Record<string, POIType> = {
    town: POIType.TOWN,
    city: POIType.CITY,
    landmark: POIType.LANDMARK,
    park: POIType.PARK,
    museum: POIType.MUSEUM,
    arboretum: POIType.ARBORETUM,
    historical_site: POIType.HISTORICAL_SITE,
    natural_feature: POIType.NATURAL_FEATURE,
    institution: POIType.INSTITUTION,
    waterway: POIType.WATERWAY,
    bridge: POIType.BRIDGE,
    mountain: POIType.MOUNTAIN,
    valley: POIType.VALLEY,
    airport: POIType.AIRPORT,
    train_station: POIType.TRAIN_STATION,
    cultural_center: POIType.CULTURAL_CENTER,
    theater: POIType.THEATER,
    religious_site: POIType.RELIGIOUS_SITE,
    military_site: POIType.MILITARY_SITE,
    agricultural_site: POIType.AGRICULTURAL_SITE,
  };

  return typeMap[type] || POIType.LANDMARK;
}

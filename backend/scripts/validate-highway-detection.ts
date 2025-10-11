#!/usr/bin/env -S deno run --allow-net

/**
 * Highway Detection Validation Script
 *
 * Tests the highway detection API against known highway locations
 * to validate accuracy of different detection methods.
 */

interface TestPoint {
  expectedLabel: string;
  latitude: number;
  longitude: number;
}

interface HighwayResult {
  name: string;
  type: string;
  distance: number;
  confidence: number;
}

interface MethodResult {
  highways: HighwayResult[];
  processingTime: number;
  method: string;
  error?: string;
}

interface ComparisonResult {
  location: {
    latitude: number;
    longitude: number;
  };
  methods: {
    current: MethodResult;
    pointToLine: MethodResult;
    googleRoads: MethodResult;
    enhancedOverpass: MethodResult;
  };
  timestamp: Date;
}

// Test points with expected highway labels
const testPoints: TestPoint[] = [
  {
    expectedLabel: 'I-287',
    latitude: 40.52943228341181,
    longitude: -74.34495891605017,
  },
  {
    expectedLabel: 'NJ-440',
    latitude: 40.524921147286975,
    longitude: -74.31615595472667,
  },
  {
    expectedLabel: 'Garden State Parkway',
    latitude: 40.47879224504152,
    longitude: -74.30035895999205,
  },
  {
    expectedLabel: 'NY-440',
    latitude: 40.61269752101653,
    longitude: -74.17999321794989,
  },
  {
    expectedLabel: 'I-278',
    latitude: 40.620379806327264,
    longitude: -74.16681784286119,
  },
  {
    expectedLabel: 'US-22',
    latitude: 40.63733279123272,
    longitude: -74.4229519685372,
  },
  {
    expectedLabel: 'I-80 / I-94',
    latitude: 41.56962446352117,
    longitude: -87.37956526634636,
  },
  {
    expectedLabel: 'IL-83',
    latitude: 41.82836927638599,
    longitude: -87.95372250493732,
  },
];

const API_BASE_URL = 'http://localhost:3000';

async function testHighwayDetection(point: TestPoint): Promise<ComparisonResult | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/highway/detection-comparison`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude: point.latitude,
        longitude: point.longitude,
      }),
    });

    if (!response.ok) {
      console.error(
        `❌ API Error for ${point.expectedLabel}: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ Network Error for ${point.expectedLabel}:`, error.message);
    return null;
  }
}

function formatHighwayName(highway: HighwayResult): string {
  const distance = `${highway.distance.toFixed(0)}m`;
  const confidence = `${(highway.confidence * 100).toFixed(0)}%`;
  const roadType = (highway as any).roadType || 'unknown';

  // Show both name and ref if available
  if ((highway as any).ref && (highway as any).displayName) {
    return `${(highway as any).ref} - ${
      (highway as any).displayName
    } [${roadType}] (${distance}, ${confidence})`;
  }

  // Show displayName if available, otherwise fall back to name
  const displayName = (highway as any).displayName || highway.name;
  return `${displayName} [${roadType}] (${distance}, ${confidence})`;
}

function getClosestHighway(method: MethodResult): { name: string; distance: number } | null {
  if (method.error || method.highways.length === 0) {
    return null;
  }

  const closest = method.highways[0]; // Already sorted by distance
  return {
    name: closest.name,
    distance: closest.distance,
  };
}

function getTopHighways(method: MethodResult, count: number = 3): string {
  if (method.error) {
    return `❌ Error: ${method.error}`;
  }

  if (method.highways.length === 0) {
    return '❌ No highways found';
  }

  return method.highways.slice(0, count).map(formatHighwayName).join(', ');
}

function checkAccuracy(expectedLabel: string, method: MethodResult): boolean {
  if (method.error || method.highways.length === 0) {
    return false;
  }

  // Check if any of the top 3 results match the expected label
  const topHighways = method.highways.slice(0, 3);
  return topHighways.some(highway => {
    const name = highway.name.toLowerCase();
    const expected = expectedLabel.toLowerCase();

    // Handle various highway naming conventions
    if (expected.includes('i-')) {
      const expectedNum = expected.replace('i-', '').replace(' / i-', '/').replace('i-', '');
      return (
        name.includes('interstate ' + expectedNum) ||
        name.includes('i ' + expectedNum) ||
        name.includes('i-' + expectedNum) ||
        (name.includes('expressway') &&
          (expectedNum.includes('278') || expectedNum.includes('287'))) || // Staten Island/I-287
        (name.includes('borman') && expectedNum.includes('80'))
      ); // Borman Expressway = I-80/I-94
    }

    if (expected.includes('us-')) {
      const expectedNum = expected.replace('us-', '');
      return (
        name.includes('us highway ' + expectedNum) ||
        name.includes('us ' + expectedNum) ||
        name.includes('us-' + expectedNum)
      );
    }

    if (expected.includes('nj-')) {
      const expectedNum = expected.replace('nj-', '');
      return (
        name.includes('new jersey ' + expectedNum) ||
        name.includes('nj ' + expectedNum) ||
        name.includes('route ' + expectedNum)
      );
    }

    if (expected.includes('ny-')) {
      const expectedNum = expected.replace('ny-', '');
      return (
        name.includes('new york ' + expectedNum) ||
        name.includes('ny ' + expectedNum) ||
        name.includes('route ' + expectedNum) ||
        (name.includes('west shore') && expectedNum === '440')
      ); // West Shore Expressway = NY-440
    }

    if (expected.includes('il-')) {
      const expectedNum = expected.replace('il-', '');
      return (
        name.includes('illinois ' + expectedNum) ||
        name.includes('il ' + expectedNum) ||
        name.includes('route ' + expectedNum) ||
        (name.includes('kingery') && expectedNum === '83')
      ); // Kingery Highway = IL-83
    }

    // Handle special cases
    if (expected.includes('garden state parkway')) {
      return name.includes('garden state parkway');
    }

    // Direct name matching
    return name.includes(expected) || expected.includes(name);
  });
}

async function runValidation() {
  console.log('🚗 Highway Detection Validation Script');
  console.log('=====================================\n');

  const results: Array<{
    point: TestPoint;
    result: ComparisonResult | null;
    accuracy: {
      current: boolean;
      pointToLine: boolean;
      googleRoads: boolean;
      enhancedOverpass: boolean;
    };
  }> = [];

  for (const point of testPoints) {
    console.log(`📍 Testing: ${point.expectedLabel} (${point.latitude}, ${point.longitude})`);

    const result = await testHighwayDetection(point);

    if (!result) {
      console.log('   ❌ Failed to get results\n');
      results.push({
        point,
        result: null,
        accuracy: {
          current: false,
          pointToLine: false,
          googleRoads: false,
          enhancedOverpass: false,
        },
      });
      continue;
    }

    const accuracy = {
      current: checkAccuracy(point.expectedLabel, result.methods.current),
      pointToLine: checkAccuracy(point.expectedLabel, result.methods.pointToLine),
      googleRoads: checkAccuracy(point.expectedLabel, result.methods.googleRoads),
      enhancedOverpass: checkAccuracy(point.expectedLabel, result.methods.enhancedOverpass),
    };

    console.log(
      `   Current Method:        ${accuracy.current ? '✅' : '❌'} ${getTopHighways(
        result.methods.current,
      )}`,
    );
    console.log(
      `   Point-to-Line:         ${accuracy.pointToLine ? '✅' : '❌'} ${getTopHighways(
        result.methods.pointToLine,
      )}`,
    );
    console.log(
      `   Google Roads:          ${accuracy.googleRoads ? '✅' : '❌'} ${getTopHighways(
        result.methods.googleRoads,
      )}`,
    );
    console.log(
      `   Enhanced Overpass:     ${accuracy.enhancedOverpass ? '✅' : '❌'} ${getTopHighways(
        result.methods.enhancedOverpass,
      )}`,
    );

    // Show closest distances for road travel analysis
    const distances = {
      current: getClosestHighway(result.methods.current),
      pointToLine: getClosestHighway(result.methods.pointToLine),
      googleRoads: getClosestHighway(result.methods.googleRoads),
      enhancedOverpass: getClosestHighway(result.methods.enhancedOverpass),
    };

    console.log(`   📏 Closest Distances:`);
    console.log(
      `      Current: ${distances.current ? distances.current.distance.toFixed(0) + 'm' : 'N/A'}`,
    );
    console.log(
      `      Point-to-Line: ${
        distances.pointToLine ? distances.pointToLine.distance.toFixed(0) + 'm' : 'N/A'
      }`,
    );
    console.log(
      `      Google Roads: ${
        distances.googleRoads ? distances.googleRoads.distance.toFixed(0) + 'm' : 'N/A'
      }`,
    );
    console.log(
      `      Enhanced Overpass: ${
        distances.enhancedOverpass ? distances.enhancedOverpass.distance.toFixed(0) + 'm' : 'N/A'
      }`,
    );
    console.log('');

    results.push({ point, result, accuracy });

    // Add a small delay to be respectful to APIs
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary statistics
  console.log('\n📊 Summary Statistics');
  console.log('====================');

  const totalTests = results.length;
  const successfulTests = results.filter(r => r.result !== null).length;
  const validResults = results.filter(r => r.result !== null);

  console.log(`Total test points: ${totalTests}`);
  console.log(`Successful API calls: ${successfulTests}/${totalTests}\n`);

  if (successfulTests > 0) {
    const methodStats = {
      current: results.filter(r => r.accuracy.current).length,
      pointToLine: results.filter(r => r.accuracy.pointToLine).length,
      googleRoads: results.filter(r => r.accuracy.googleRoads).length,
      enhancedOverpass: results.filter(r => r.accuracy.enhancedOverpass).length,
    };

    console.log('Method Accuracy:');
    console.log(
      `  Current Method:        ${methodStats.current}/${successfulTests} (${(
        (methodStats.current / successfulTests) *
        100
      ).toFixed(1)}%)`,
    );
    console.log(
      `  Point-to-Line:         ${methodStats.pointToLine}/${successfulTests} (${(
        (methodStats.pointToLine / successfulTests) *
        100
      ).toFixed(1)}%)`,
    );
    console.log(
      `  Google Roads:          ${methodStats.googleRoads}/${successfulTests} (${(
        (methodStats.googleRoads / successfulTests) *
        100
      ).toFixed(1)}%)`,
    );
    console.log(
      `  Enhanced Overpass:     ${methodStats.enhancedOverpass}/${successfulTests} (${(
        (methodStats.enhancedOverpass / successfulTests) *
        100
      ).toFixed(1)}%)`,
    );

    // Road Travel Detection Analysis
    console.log('\n🛣️  Road Travel Detection Analysis');
    console.log('===================================');

    const distanceThresholds = [10, 25, 50, 100]; // meters

    for (const threshold of distanceThresholds) {
      console.log(`\nPoints within ${threshold}m of detected road:`);

      const withinThreshold = {
        current: 0,
        pointToLine: 0,
        googleRoads: 0,
        enhancedOverpass: 0,
      };

      for (const result of validResults) {
        const distances = {
          current: getClosestHighway(result.result!.methods.current),
          pointToLine: getClosestHighway(result.result!.methods.pointToLine),
          googleRoads: getClosestHighway(result.result!.methods.googleRoads),
          enhancedOverpass: getClosestHighway(result.result!.methods.enhancedOverpass),
        };

        if (distances.current && distances.current.distance <= threshold) withinThreshold.current++;
        if (distances.pointToLine && distances.pointToLine.distance <= threshold)
          withinThreshold.pointToLine++;
        if (distances.googleRoads && distances.googleRoads.distance <= threshold)
          withinThreshold.googleRoads++;
        if (distances.enhancedOverpass && distances.enhancedOverpass.distance <= threshold)
          withinThreshold.enhancedOverpass++;
      }

      console.log(
        `  Current Method:        ${withinThreshold.current}/${validResults.length} (${(
          (withinThreshold.current / validResults.length) *
          100
        ).toFixed(1)}%)`,
      );
      console.log(
        `  Point-to-Line:         ${withinThreshold.pointToLine}/${validResults.length} (${(
          (withinThreshold.pointToLine / validResults.length) *
          100
        ).toFixed(1)}%)`,
      );
      console.log(
        `  Google Roads:          ${withinThreshold.googleRoads}/${validResults.length} (${(
          (withinThreshold.googleRoads / validResults.length) *
          100
        ).toFixed(1)}%)`,
      );
      console.log(
        `  Enhanced Overpass:     ${withinThreshold.enhancedOverpass}/${validResults.length} (${(
          (withinThreshold.enhancedOverpass / validResults.length) *
          100
        ).toFixed(1)}%)`,
      );
    }

    // Average distances
    console.log('\nAverage Distance to Closest Road:');
    const avgDistances = {
      current: 0,
      pointToLine: 0,
      googleRoads: 0,
      enhancedOverpass: 0,
    };

    let validCounts = { current: 0, pointToLine: 0, googleRoads: 0, enhancedOverpass: 0 };

    for (const result of validResults) {
      const distances = {
        current: getClosestHighway(result.result!.methods.current),
        pointToLine: getClosestHighway(result.result!.methods.pointToLine),
        googleRoads: getClosestHighway(result.result!.methods.googleRoads),
        enhancedOverpass: getClosestHighway(result.result!.methods.enhancedOverpass),
      };

      if (distances.current) {
        avgDistances.current += distances.current.distance;
        validCounts.current++;
      }
      if (distances.pointToLine) {
        avgDistances.pointToLine += distances.pointToLine.distance;
        validCounts.pointToLine++;
      }
      if (distances.googleRoads) {
        avgDistances.googleRoads += distances.googleRoads.distance;
        validCounts.googleRoads++;
      }
      if (distances.enhancedOverpass) {
        avgDistances.enhancedOverpass += distances.enhancedOverpass.distance;
        validCounts.enhancedOverpass++;
      }
    }

    console.log(
      `  Current Method:        ${
        validCounts.current > 0
          ? (avgDistances.current / validCounts.current).toFixed(1) + 'm'
          : 'N/A'
      }`,
    );
    console.log(
      `  Point-to-Line:         ${
        validCounts.pointToLine > 0
          ? (avgDistances.pointToLine / validCounts.pointToLine).toFixed(1) + 'm'
          : 'N/A'
      }`,
    );
    console.log(
      `  Google Roads:          ${
        validCounts.googleRoads > 0
          ? (avgDistances.googleRoads / validCounts.googleRoads).toFixed(1) + 'm'
          : 'N/A'
      }`,
    );
    console.log(
      `  Enhanced Overpass:     ${
        validCounts.enhancedOverpass > 0
          ? (avgDistances.enhancedOverpass / validCounts.enhancedOverpass).toFixed(1) + 'm'
          : 'N/A'
      }`,
    );

    // Road Type Analysis
    console.log('\n🏗️  Road Type Classification Analysis');
    console.log('=====================================');

    const roadTypeStats: Record<
      string,
      { current: number; pointToLine: number; googleRoads: number; enhancedOverpass: number }
    > = {};

    for (const result of validResults) {
      const methods = ['current', 'pointToLine', 'googleRoads', 'enhancedOverpass'] as const;

      for (const method of methods) {
        const methodResult = result.result!.methods[method];
        if (methodResult.highways.length > 0) {
          const closestHighway = methodResult.highways[0];
          const roadType = (closestHighway as any).roadType || 'unknown';

          if (!roadTypeStats[roadType]) {
            roadTypeStats[roadType] = {
              current: 0,
              pointToLine: 0,
              googleRoads: 0,
              enhancedOverpass: 0,
            };
          }
          roadTypeStats[roadType][method]++;
        }
      }
    }

    console.log('Road types detected by each method:');
    for (const [roadType, stats] of Object.entries(roadTypeStats)) {
      console.log(`  ${roadType}:`);
      console.log(`    Current Method:        ${stats.current}`);
      console.log(`    Point-to-Line:         ${stats.pointToLine}`);
      console.log(`    Google Roads:          ${stats.googleRoads}`);
      console.log(`    Enhanced Overpass:     ${stats.enhancedOverpass}`);
    }

    // Performance statistics
    const avgTimes = {
      current: 0,
      pointToLine: 0,
      googleRoads: 0,
      enhancedOverpass: 0,
    };

    if (validResults.length > 0) {
      avgTimes.current =
        validResults.reduce((sum, r) => sum + (r.result?.methods.current.processingTime || 0), 0) /
        validResults.length;
      avgTimes.pointToLine =
        validResults.reduce(
          (sum, r) => sum + (r.result?.methods.pointToLine.processingTime || 0),
          0,
        ) / validResults.length;
      avgTimes.googleRoads =
        validResults.reduce(
          (sum, r) => sum + (r.result?.methods.googleRoads.processingTime || 0),
          0,
        ) / validResults.length;
      avgTimes.enhancedOverpass =
        validResults.reduce(
          (sum, r) => sum + (r.result?.methods.enhancedOverpass.processingTime || 0),
          0,
        ) / validResults.length;

      console.log('\nAverage Processing Times:');
      console.log(`  Current Method:        ${avgTimes.current.toFixed(1)}ms`);
      console.log(`  Point-to-Line:         ${avgTimes.pointToLine.toFixed(1)}ms`);
      console.log(`  Google Roads:          ${avgTimes.googleRoads.toFixed(1)}ms`);
      console.log(`  Enhanced Overpass:     ${avgTimes.enhancedOverpass.toFixed(1)}ms`);
    }
  }

  console.log('\n✅ Validation complete!');
}

// Check if server is running
async function checkServerHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error(`Server health check failed: ${response.status}`);
    }
    return true;
  } catch (error) {
    console.error('❌ Server is not running or not accessible at', API_BASE_URL);
    console.error('   Please make sure the backend server is running on port 3000');
    console.error('   Run: deno task dev');
    return false;
  }
}

// Main execution
if (import.meta.main) {
  const serverHealthy = await checkServerHealth();
  if (serverHealthy) {
    await runValidation();
  } else {
    Deno.exit(1);
  }
}

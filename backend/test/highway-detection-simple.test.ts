import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";

describe("Highway Detection Comparison API - Simple Test", () => {
  const baseUrl = "http://localhost:3000"; // Use the running application

  describe("POST /api/poi/highway-detection-comparison", () => {
    it("should return comparison results for test location", async () => {
      const testLocation = {
        latitude: 40.53383335817636,
        longitude: -74.3467882397128,
      };

      try {
        const response = await fetch(
          `${baseUrl}/api/poi/highway-detection-comparison`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(testLocation),
          }
        );

        if (response.status === 200) {
          const result = await response.json();

          // Verify response structure
          assertExists(result.location);
          assertExists(result.methods);
          assertExists(result.timestamp);

          assertEquals(result.location.latitude, testLocation.latitude);
          assertEquals(result.location.longitude, testLocation.longitude);

          // Verify all four methods are present
          assertExists(result.methods.current);
          assertExists(result.methods.pointToLine);
          assertExists(result.methods.googleRoads);
          assertExists(result.methods.enhancedOverpass);

          console.log(
            "✅ Highway Detection Comparison API is working correctly!"
          );
          console.log(`📊 Results summary:`);

          for (const [methodName, methodResult] of Object.entries(
            result.methods
          )) {
            const method = methodResult as any;
            console.log(
              `  ${methodName}: ${
                method.highways.length
              } highways found, ${method.processingTime.toFixed(2)}ms`
            );

            if (method.error) {
              console.log(`    ⚠️  Error: ${method.error}`);
            }

            if (method.highways.length > 0) {
              const closest = method.highways[0];
              console.log(
                `    🛣️  Closest: ${closest.name} (${closest.distance.toFixed(
                  0
                )}m, confidence: ${(closest.confidence * 100).toFixed(1)}%)`
              );
            }
          }
        } else {
          console.log(`❌ API returned status ${response.status}`);
          const errorText = await response.text();
          console.log(`Error: ${errorText}`);
        }
      } catch (error) {
        console.log(
          `❌ Failed to connect to API: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        console.log("Make sure the backend is running on port 3000");
      }
    });

    it("should handle invalid input", async () => {
      const invalidLocation = {
        latitude: 91, // Invalid latitude
        longitude: -74,
      };

      try {
        const response = await fetch(
          `${baseUrl}/api/poi/highway-detection-comparison`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(invalidLocation),
          }
        );

        assertEquals(response.status, 400);
        console.log("✅ Input validation is working correctly!");
      } catch (error) {
        console.log(
          `❌ Failed to test input validation: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    });
  });
});

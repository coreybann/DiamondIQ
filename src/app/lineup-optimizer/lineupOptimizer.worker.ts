
import { findBestSimulatedLineup } from "@/lib/lineupSimulation";
import type { LineupHitter } from "@/lib/lineupOptimizer";

self.onmessage = (event: MessageEvent<LineupHitter[]>) => {
  try {
    const hitters = event.data;

    const optimizedLineup = findBestSimulatedLineup(
      hitters,
      100,
      200
    );

    self.postMessage({
      success: true,
      lineup: optimizedLineup,
    });
  } catch {
    self.postMessage({
      success: false,
      error: "Unable to optimize lineup",
    });
  }
};

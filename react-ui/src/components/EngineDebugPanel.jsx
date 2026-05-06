import { useMemo } from "react";
import { getEngineDebugSamples } from "../engine/engineDebugSamples.js";
import "./game.css";

export function EngineDebugPanel() {
  const samples = useMemo(() => getEngineDebugSamples(), []);

  return (
    <div className="engine-debug" aria-label="エンジン確認（モック）">
      <details>
        <summary>エンジン確認（役 / Side Pot / サポートAI）</summary>
        <pre className="engine-pre">{JSON.stringify(samples, null, 2)}</pre>
      </details>
    </div>
  );
}


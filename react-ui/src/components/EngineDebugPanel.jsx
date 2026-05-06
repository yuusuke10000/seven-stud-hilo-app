import { useMemo } from "react";
import { getEngineDebugSamples } from "../engine/engineDebugSamples.js";
import "./game.css";

export function EngineDebugPanel({ state }) {
  const samples = useMemo(() => getEngineDebugSamples(), []);
  const live = useMemo(() => {
    if (!state) return null;
    return {
      phase: state.phase,
      street: state.street,
      pot: state.pot,
      blindRotateIndex: state.blindRotateIndex,
      handBlindsPosted: state.handBlindsPosted,
      handSbSeat: state.handSbSeat,
      handBbSeat: state.handBbSeat,
      ante: state.settings?.ante,
      smallBlind: state.settings?.smallBlind,
      bigBlind: state.settings?.bigBlind,
      totalCommitted: state.totalCommitted,
      folded: state.folded,
      allIn: state.allIn,
      betting: state.betting,
      lastResult: state.lastResult,
    };
  }, [state]);

  return (
    <div className="engine-debug" aria-label="エンジン確認（モック）">
      <details>
        <summary>エンジン確認（役 / Side Pot / サポートAI）</summary>
        {live ? <pre className="engine-pre">{JSON.stringify(live, null, 2)}</pre> : null}
        <pre className="engine-pre">{JSON.stringify(samples, null, 2)}</pre>
      </details>
    </div>
  );
}


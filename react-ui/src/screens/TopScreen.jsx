import "./screens.css";

export function TopScreen({ onStart, onGo }) {
  return (
    <section className="screen" aria-label="トップ">
      <div className="screen-inner">
        <header className="screen-hero">
          <h1 className="screen-title">スタッド・ハイロー トレーナー</h1>
          <p className="screen-sub">学習用（オフライン）・換金不可の仮想チップ</p>
        </header>

        <div className="screen-cards">
          <button type="button" className="screen-primary" onClick={onStart}>
            ゲーム開始
          </button>
          <div className="screen-grid">
            <button type="button" className="screen-btn" onClick={() => onGo("settings")}>
              設定
            </button>
            <button type="button" className="screen-btn" onClick={() => onGo("rules")}>
              ルール
            </button>
            <button type="button" className="screen-btn" onClick={() => onGo("stats")}>
              戦績
            </button>
            <button type="button" className="screen-btn" onClick={() => onGo("history")}>
              履歴
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}


import "./screens.css";

function Field({ label, children }) {
  return (
    <label className="form-field">
      <span className="form-label">{label}</span>
      {children}
    </label>
  );
}

export function SettingsScreen({ settings, onChange, onStart, onBack }) {
  return (
    <section className="screen" aria-label="ゲーム設定">
      <div className="screen-inner">
        <header className="screen-head">
          <h2 className="screen-h2">ゲーム設定</h2>
          <div className="screen-head-actions">
            <button type="button" className="screen-btn" onClick={onBack}>
              戻る
            </button>
          </div>
        </header>

        <div className="panel">
          <div className="form-grid">
            <Field label="CPU人数">
              <select value={settings.cpuCount} onChange={(e) => onChange({ cpuCount: Number(e.target.value) })}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="初期チップ">
              <select value={settings.startChips} onChange={(e) => onChange({ startChips: Number(e.target.value) })}>
                {[500, 1000, 2000].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="アンティ">
              <select value={settings.ante} onChange={(e) => onChange({ ante: Number(e.target.value) })}>
                {[5, 10, 20].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="ベット単位">
              <select value={settings.betUnit} onChange={(e) => onChange({ betUnit: Number(e.target.value) })}>
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="ブラインド">
              <select value={settings.blindsOn ? "on" : "off"} onChange={(e) => onChange({ blindsOn: e.target.value === "on" })}>
                <option value="on">ON</option>
                <option value="off">OFF</option>
              </select>
            </Field>
            <Field label="SB">
              <select
                value={settings.smallBlind}
                disabled={!settings.blindsOn}
                onChange={(e) => onChange({ smallBlind: Number(e.target.value) })}
              >
                {[5, 10, 20].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="BB">
              <select
                value={settings.bigBlind}
                disabled={!settings.blindsOn}
                onChange={(e) => onChange({ bigBlind: Number(e.target.value) })}
              >
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <div className="screen-footer">
          <button type="button" className="screen-primary" onClick={onStart}>
            この設定で開始
          </button>
        </div>
      </div>
    </section>
  );
}


import "./screens.css";

export function RulesScreen({ onBack }) {
  return (
    <section className="screen" aria-label="ルール">
      <div className="screen-inner">
        <header className="screen-head">
          <h2 className="screen-h2">ルール（要点）</h2>
          <div className="screen-head-actions">
            <button type="button" className="screen-btn" onClick={onBack}>
              戻る
            </button>
          </div>
        </header>

        <div className="panel panel-scroll">
          <p className="p">
            Seven Card Stud Hi-Lo（8 or Better）の練習用です。換金不可の仮想チップのみを扱います。
          </p>
          <ul className="list">
            <li>ストリート: Third → Fourth → Fifth → Sixth → Seventh → Showdown</li>
            <li>アンティ: ハンド開始時に全員が支払います</li>
            <li>ブラインド（任意）: ON の場合 SB/BB を支払います（ハンドごとに位置が移動）</li>
            <li>ロー: 8 or Better（A〜8 の5枚・すべてランクが異なるとき成立）</li>
            <li>サイドポット: totalCommitted から層を作り、層ごとに eligible で分配します</li>
            <li>オールイン: フォールド扱いではありません。最後まで配られ、ショーダウン対象です</li>
          </ul>
        </div>
      </div>
    </section>
  );
}


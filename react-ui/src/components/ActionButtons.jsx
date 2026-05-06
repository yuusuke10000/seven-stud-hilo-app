import "./game.css";

function Btn({ className, children }) {
  return (
    <button type="button" className={className}>
      {children}
    </button>
  );
}

export function ActionButtons() {
  return (
    <div className="actions" aria-label="操作（モック）">
      <div className="actions-row">
        <Btn className="btn btn-fold">フォールド</Btn>
        <Btn className="btn">チェック</Btn>
        <Btn className="btn">コール</Btn>
      </div>
      <div className="actions-row">
        <Btn className="btn">シングル</Btn>
        <Btn className="btn">ダブル</Btn>
        <Btn className="btn">トリプル</Btn>
      </div>
    </div>
  );
}


import "./game.css";

function Btn({ className, children, onClick, disabled }) {
  return (
    <button type="button" className={className} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function ActionButtons({ onAction, disabled }) {
  return (
    <div className="actions" aria-label="操作（モック）">
      <div className="actions-row">
        <Btn className="btn btn-fold" onClick={() => onAction?.("fold")} disabled={disabled}>
          フォールド
        </Btn>
        <Btn className="btn" onClick={() => onAction?.("check")} disabled={disabled}>
          チェック
        </Btn>
        <Btn className="btn" onClick={() => onAction?.("call")} disabled={disabled}>
          コール
        </Btn>
      </div>
      <div className="actions-row">
        <Btn className="btn" onClick={() => onAction?.("single")} disabled={disabled}>
          シングル
        </Btn>
        <Btn className="btn" onClick={() => onAction?.("double")} disabled={disabled}>
          ダブル
        </Btn>
        <Btn className="btn" onClick={() => onAction?.("triple")} disabled={disabled}>
          トリプル
        </Btn>
      </div>
    </div>
  );
}


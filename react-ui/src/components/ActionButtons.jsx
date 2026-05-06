import "./game.css";

function Btn({ className, children, onClick, disabled }) {
  return (
    <button type="button" className={className} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function ActionButtons({ onAction, disabled }) {
  // disabled can be boolean or per-action map
  const isDisabled = (k) => {
    if (typeof disabled === "boolean") return disabled;
    return !!disabled?.[k];
  };
  return (
    <div className="actions" aria-label="操作（モック）">
      <div className="actions-row">
        <Btn className="btn btn-fold" onClick={() => onAction?.("fold")} disabled={isDisabled("fold")}>
          フォールド
        </Btn>
        <Btn className="btn" onClick={() => onAction?.("check")} disabled={isDisabled("check")}>
          チェック
        </Btn>
        <Btn className="btn" onClick={() => onAction?.("call")} disabled={isDisabled("call")}>
          コール
        </Btn>
      </div>
      <div className="actions-row">
        <Btn className="btn" onClick={() => onAction?.("single")} disabled={isDisabled("single")}>
          シングル
        </Btn>
        <Btn className="btn" onClick={() => onAction?.("double")} disabled={isDisabled("double")}>
          ダブル
        </Btn>
        <Btn className="btn" onClick={() => onAction?.("triple")} disabled={isDisabled("triple")}>
          トリプル
        </Btn>
      </div>
    </div>
  );
}


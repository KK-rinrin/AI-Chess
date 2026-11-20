import { PieceSymbol, Color } from 'chess.js';
import { Crown, Shield, Sparkles, Swords } from 'lucide-react';

interface PromotionModalProps {
  color: Color;
  onSelect: (piece: PieceSymbol) => void;
}

export function PromotionModal({ color, onSelect }: PromotionModalProps) {
  const isWhite = color === 'w';

  const options: Array<{ type: PieceSymbol; name: string; weapon: string; icon: React.ReactNode }> = [
    { type: 'q', name: 'クイーン', weapon: '優雅な宝剣レイピア', icon: <Crown className="w-8 h-8 text-amber-400" /> },
    { type: 'r', name: 'ルーク', weapon: '重戦斧・城塞槌', icon: <Shield className="w-8 h-8 text-blue-400" /> },
    { type: 'b', name: 'ビショップ', weapon: '聖なる水晶杖', icon: <Sparkles className="w-8 h-8 text-emerald-400" /> },
    { type: 'n', name: 'ナイト', weapon: '突撃長柄ランス', icon: <Swords className="w-8 h-8 text-indigo-400" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-100">
        <h3 className="text-xl font-bold text-center mb-1 text-amber-300">
          ポーンプロモーション (昇格)
        </h3>
        <p className="text-xs text-center text-slate-400 mb-6">
          昇格する駒を選択してください。新たな固有武器を携えて戦場に降臨します。
        </p>

        <div className="grid grid-cols-2 gap-3">
          {options.map((opt) => (
            <button
              key={opt.type}
              onClick={() => onSelect(opt.type)}
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 hover:border-amber-400/50 transition cursor-pointer group"
            >
              <div className="p-3 rounded-full bg-slate-900 group-hover:scale-110 transition-transform mb-2">
                {opt.icon}
              </div>
              <span className="font-semibold text-sm text-slate-200 group-hover:text-amber-300">
                {opt.name}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 text-center">
                {opt.weapon}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Sparkles } from 'lucide-react';

interface CreatorNoteProps {
  note: string;
  creatorName?: string;
  variant?: 'card' | 'expanded';
  className?: string;
}

export const CreatorNote: React.FC<CreatorNoteProps> = ({
  note,
  creatorName = 'Sunidhi',
  variant = 'card',
  className = '',
}) => {
  if (!note) return null;

  if (variant === 'card') {
    return (
      <div className={`text-xs text-neutral-600 bg-stone-50 border border-stone-200/70 rounded-lg p-2.5 flex items-start gap-2 ${className}`}>
        <Sparkles className="w-3.5 h-3.5 text-neutral-800 shrink-0 mt-0.5" />
        <p className="line-clamp-2 leading-relaxed">
          <span className="font-medium text-neutral-900">{creatorName} says: </span>
          {note}
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-[#FAF8F5] border border-stone-200 rounded-xl p-4 md:p-5 relative overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-800">
        <Sparkles className="w-4 h-4 text-amber-700" />
        <span>{creatorName}&apos;s Styling Note</span>
      </div>
      <p className="text-sm md:text-base text-neutral-700 leading-relaxed italic font-normal">
        &ldquo;{note}&rdquo;
      </p>
      <div className="mt-3 flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px] font-bold">
          S
        </div>
        <span className="text-xs font-medium text-neutral-500">Curated & Verified by Sunidhi</span>
      </div>
    </div>
  );
};

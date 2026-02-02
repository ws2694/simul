'use client';

export default function KnowledgeLegend() {
  return (
    <div className="fixed bottom-6 left-6 bg-white/90 backdrop-blur-sm rounded-2xl shadow-game-panel p-4 z-20">
      <h3 className="font-heading font-semibold text-sm text-game-text-dark mb-3">
        Bubble Size
      </h3>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-lavender to-lavender-light" />
          <span className="text-xs text-game-text-light">15+ decisions (Large)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-lavender to-lavender-light" />
          <span className="text-xs text-game-text-light">7-14 decisions (Medium)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-lavender to-lavender-light" />
          <span className="text-xs text-game-text-light">&lt;7 decisions (Small)</span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-lavender-light">
        <h3 className="font-heading font-semibold text-sm text-game-text-dark mb-2">
          Confidence Ring
        </h3>
        <p className="text-xs text-game-text-light">
          The outer ring shows average confidence level
        </p>
      </div>
    </div>
  );
}

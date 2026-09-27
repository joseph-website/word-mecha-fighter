import React, { forwardRef } from 'react';
import { motion } from 'motion/react';

interface FighterStationProps {
  cannonRecoil: boolean;
  typedInputLength: number;
  targetTextLength: number;
}

export const FighterStation = forwardRef<HTMLDivElement, FighterStationProps>(
  ({ cannonRecoil, typedInputLength, targetTextLength }, ref) => {
    const hasInput = typedInputLength > 0;
    const targetLen = targetTextLength || 1;

    return (
      <div
        ref={ref}
        className="relative z-10 w-full flex flex-col items-center justify-end pb-1"
      >
        <motion.div
          animate={cannonRecoil ? { y: 6, scale: 0.94 } : { y: 0, scale: 1 }}
          transition={{ duration: 0.1 }}
          className="flex flex-col items-center select-none"
        >
          <div className="relative flex flex-col items-center">
            {/* Twin Plasma Cannons at Wingtips / Nose */}
            <div className="flex items-center gap-5 sm:gap-7 z-20">
              <div
                className={`w-1.5 sm:w-2 h-4 sm:h-5 rounded-t transition-all duration-200 ${
                  cannonRecoil
                    ? 'bg-amber-300 border-t border-amber-100 shadow-[0_0_16px_#f59e0b]'
                    : hasInput
                    ? 'bg-amber-400 border-t border-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.8)]'
                    : 'bg-stone-600 border-t border-stone-500'
                }`}
              />
              <div
                className={`w-1.5 sm:w-2 h-4 sm:h-5 rounded-t transition-all duration-200 ${
                  cannonRecoil
                    ? 'bg-amber-300 border-t border-amber-100 shadow-[0_0_16px_#f59e0b]'
                    : hasInput
                    ? 'bg-amber-400 border-t border-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.8)]'
                    : 'bg-stone-600 border-t border-stone-500'
                }`}
              />
            </div>

            {/* Fighter Aerodynamic Nose & Wings Silhouette */}
            <div className="relative -mt-2 flex items-center justify-center">
              {/* Left Swept Wing */}
              <div
                className="w-8 sm:w-11 h-4 sm:h-5 bg-gradient-to-bl from-stone-700 via-stone-800 to-stone-900 border-t border-l border-stone-600 rounded-tl-lg shadow-md"
                style={{ transform: 'skewX(-28deg)' }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400/80 m-1 shadow-[0_0_4px_#f59e0b]" />
              </div>

              {/* Central Cockpit & Reinforced Fuselage */}
              <div className="relative z-30 w-7 sm:w-9 h-7 sm:h-8 bg-gradient-to-b from-stone-600 via-stone-800 to-stone-950 border border-stone-600 rounded-t-xl flex flex-col items-center justify-between p-1 shadow-lg shadow-black/80">
                {/* Glowing Cyan/Amber Pilot Canopy */}
                <div
                  className={`w-3.5 sm:w-4.5 h-3 sm:h-3.5 rounded-t-lg transition-all duration-300 ${
                    cannonRecoil
                      ? 'bg-amber-300 shadow-[0_0_12px_#f59e0b]'
                      : hasInput
                      ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]'
                      : 'bg-cyan-600/70 shadow-[0_0_6px_rgba(34,211,238,0.4)]'
                  }`}
                />
                {/* Integrated 3-stage Reactor Cells */}
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3].map((barIdx) => {
                    const isCharged = typedInputLength >= Math.ceil((targetLen / 3) * barIdx);
                    return (
                      <span
                        key={barIdx}
                        className={`w-1.5 h-1 rounded-xs transition-all duration-150 ${
                          isCharged
                            ? 'bg-amber-400 shadow-[0_0_6px_#f59e0b]'
                            : 'bg-stone-800'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Right Swept Wing */}
              <div
                className="w-8 sm:w-11 h-4 sm:h-5 bg-gradient-to-br from-stone-700 via-stone-800 to-stone-900 border-t border-r border-stone-600 rounded-tr-lg shadow-md"
                style={{ transform: 'skewX(28deg)' }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400/80 m-1 ml-auto shadow-[0_0_4px_#f59e0b]" />
              </div>
            </div>

            {/* Ion Thrusters Afterburner Plume at Tail */}
            <div className="flex items-center gap-3 sm:gap-4 -mt-0.5">
              <div className="w-2.5 h-2 bg-cyan-400/70 rounded-b blur-xs animate-pulse" />
              <div className="w-3.5 h-2.5 bg-amber-400 rounded-b blur-xs animate-pulse" />
              <div className="w-2.5 h-2 bg-cyan-400/70 rounded-b blur-xs animate-pulse" />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }
);

FighterStation.displayName = 'FighterStation';

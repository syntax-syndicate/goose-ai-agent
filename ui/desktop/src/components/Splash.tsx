import React from 'react';
import SplashPills from './SplashPills';
import { Goose, Rain } from './icons/Goose';
import GooseLogo from './GooseLogo';

export default function Splash({ append }) {
  return (
    <div className="h-full flex flex-col pb-12">
      <div className="p-8">
        <div className="relative text-textStandard mb-12">
          {/* <GooseSplashLogo className="animate-[popin_500ms_ease-in_forwards]" /> */}
          <GooseLogo />
        </div>

        <div className="flex">
          <SplashPills append={append} />
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import GooseSplashLogo from './GooseSplashLogo';
import SplashPills from './SplashPills';
import GooseSplashLogoGradient from './GooseSplashLogoGradient';

export default function Splash({ append }) {
  return (
    <div className="h-full flex flex-col items-center justify-center pb-12">
      <div className="flex flex-1" />
      <div className="flex items-center justify-center mb-12">
        <div className="relative group text-iconExtraSubtle">
          <GooseSplashLogoGradient className="absolute opacity-0 group-hover:opacity-100 transition-all duration-400" />
          <GooseSplashLogo />
        </div>
        <span className="text-slate dark:text-textStandard text-base leading-5 ml-[8px]">
          ask
          <br />
          goose
        </span>
      </div>

      <div className="pt-8 border-t border-borderSubtle">
        <div
          className="px-12 py-4 text-base text-center whitespace-nowrap cursor-pointer bg-slate hover:bg-black hover:dark:bg-bgStandard text-white rounded-full inline-block transition-all duration-150"
          onClick={async () => {
            const message = {
              content: 'What can Goose do?',
              role: 'user',
            };
            await append(message);
          }}
        >
          What can goose do?
        </div>
      </div>

      <div className="flex flex-1" />
      <div className="flex items-center p-4">
        <SplashPills append={append} />
      </div>
    </div>
  );
}

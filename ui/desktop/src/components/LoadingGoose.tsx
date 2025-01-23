import React, { useState, useEffect } from 'react';
import GooseSplashLogo from './GooseSplashLogo';
// import svg1 from '../images/loading-goose/1.svg';
// import svg2 from '../images/loading-goose/2.svg';
// import svg3 from '../images/loading-goose/3.svg';
// import svg4 from '../images/loading-goose/4.svg';
// import svg5 from '../images/loading-goose/5.svg';
// import svg6 from '../images/loading-goose/6.svg';
// import svg7 from '../images/loading-goose/7.svg';

const LoadingGoose = () => {
  // const [currentFrame, setCurrentFrame] = useState(0);
  // const frames = [svg1, svg2, svg3, svg4, svg5, svg6, svg7];
  // const frameCount = frames.length;

  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setCurrentFrame((prev) => (prev + 1) % frameCount);
  //   }, 200); // 200ms for smoother animation

  //   return () => clearInterval(interval);
  // }, [frameCount]);

  return (
    // <div>
    //   <img src={frames[currentFrame]} alt={`Animation frame ${currentFrame + 1}`} />
    // </div>

    <div className="w-full pb-[2px] opacity-0 animate-[fadeIn_300ms_ease-in_forwards]">
      <div className="flex items-center text-xs text-textSubtle mb-2 pl-4">
        <GooseSplashLogo className="h-6 w-6 mr-2" /> goose is working on it..
      </div>
      <div className="absolute w-[300px] h-[2px] bg-gradient-to-r from-blockTeal to-blockOrange animate-gradient-loader"></div>
    </div>
  );
};

export default LoadingGoose;

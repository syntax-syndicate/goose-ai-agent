import React from 'react';

function SplashPill({ content, append }) {
  return (
    <div
      className="px-4 py-3 text-sm text-center text-textSubtle dark:text-textStandard bg-bgSubtle cursor-pointer hover:bg-bgStandard rounded-full transition-all duration-150"
      onClick={async () => {
        const message = {
          content,
          role: 'user',
        };
        await append(message);
      }}
    >
      <div className="line-clamp-2">{content}</div>
    </div>
  );
}

export default function SplashPills({ append }) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-[8px]">
      <SplashPill content="Demo writing and reading files" append={append} />
      <SplashPill content="Make a snake game in a new folder" append={append} />
      <SplashPill content="List files in my current directory" append={append} />
      <SplashPill content="Take a screenshot and summarize" append={append} />
    </div>
  );
}

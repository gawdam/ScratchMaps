import './index.css';

import { context, navigateTo, requestExpandedMode } from '@devvit/web/client';
import { Button, PlopProvider, Tag, WordSticker } from '@plop-ui/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

export const Splash = () => {
  return (
    <PlopProvider surface="kraft" theme="light" haptics={false} toaster={false} className="splash-paper">
      <main className="splash-game">
        <Tag tone="mint" tilt={-2}>A little geography game</Tag>
        <h1 className="splash-title"><WordSticker tone="mustard" size={54} tilt={-2}>Scratch Maps</WordSticker></h1>
        <p className="splash-description">
          {context?.username ? `Ready, ${context.username}? ` : 'Ready to explore? '}
          Scratch the map, follow the clues, and find the X!
        </p>
        <div className="splash-start">
          <Button
            variant="tomato"
            size="lg"
            buddy
            onClick={(event) => requestExpandedMode(event.nativeEvent, 'game')}
          >
            Tap to start
          </Button>
        </div>
        <footer className="splash-footer">
          <Button variant="plain" size="sm" tilt={-1} onClick={() => navigateTo('https://developers.reddit.com/docs')}>Docs</Button>
          <Button variant="plain" size="sm" tilt={1} onClick={() => navigateTo('https://www.reddit.com/r/Devvit')}>r/Devvit</Button>
          <Button variant="plain" size="sm" tilt={-1} onClick={() => navigateTo('https://discord.com/invite/R7yu2wh9Qz')}>Discord</Button>
        </footer>
      </main>
    </PlopProvider>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);

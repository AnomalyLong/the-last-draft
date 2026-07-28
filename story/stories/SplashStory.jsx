import React from 'react';
import StoryFrame from '../StoryFrame.jsx';
import { SplashScreen } from '@src/components/SplashScreen.jsx';

export default function SplashStory() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <StoryFrame title="Splash Screen (inline / Reddit feed)">
        <SplashScreen />
      </StoryFrame>
    </div>
  );
}

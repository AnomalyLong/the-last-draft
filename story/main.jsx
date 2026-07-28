import React from 'react';
import { createRoot } from 'react-dom/client';
import Shell from './Shell.jsx';
import SpritePreview from './SpritePreview.jsx';
import TitleStory from './stories/TitleStory.jsx';
import OptionsStory from './stories/OptionsStory.jsx';
import TeamSelectStory from './stories/TeamSelectStory.jsx';
import DraftStory from './stories/DraftStory.jsx';
import Collection2Story from './stories/Collection2Story.jsx';
import CourtStory from './stories/CourtStory.jsx';
import AdminStory from './AdminStory.jsx';
import MatchmakingStory from './stories/MatchmakingStory.jsx';
import LobbyStory from './stories/LobbyStory.jsx';
import FeaturedEventsStory from './stories/FeaturedEventsStory.jsx';
import BattlePassStory from './stories/BattlePassStory.jsx';
import SplashStory from './stories/SplashStory.jsx';
import BidCardStory from './stories/BidCardStory.jsx';
import BrandGuideStory from './stories/BrandGuideStory.jsx';
import ChallengeCardStory from './stories/ChallengeCardStory.jsx';

const pages = {
  brandGuide:   BrandGuideStory,
  lobby:        LobbyStory,
  featuredEvents: FeaturedEventsStory,
  battlePass:   BattlePassStory,
  sprites:      SpritePreview,
  splash:       SplashStory,
  bidCard:      BidCardStory,
  challengeCard: ChallengeCardStory,
  title:        TitleStory,
  options:      OptionsStory,
  teamSelect:   TeamSelectStory,
  draft:        DraftStory,
  matchmaking:  MatchmakingStory,
  collection2:  Collection2Story,
  court:        CourtStory,
  admin:        AdminStory,
};

// Farnsworth canvas view routing.
// When Farnsworth's live-preview iframe loads ?view=post|mobile|desktop, render
// that single story chromeless (no dev nav sidebar), sized to fill the iframe.
// Any other URL renders the full dev Shell with the nav.
//
// To change which story shows in each Farnsworth frame, edit VIEW_MAP:
const VIEW_MAP = {
  post: 'splash',    // Reddit inline post  → Splash (Inline)
  mobile: 'title',   // App Mobile / Fullscreen expanded → Title Screen
  desktop: 'title',  // App Desktop expanded → Title Screen
};

const view = new URLSearchParams(window.location.search).get('view');
const viewPageId = view && VIEW_MAP[view];
const root = createRoot(document.getElementById('root'));

if (viewPageId && pages[viewPageId]) {
  // Chromeless single-story render for the Farnsworth canvas iframe.
  document.documentElement.classList.add('fw-view');
  const Page = pages[viewPageId];
  root.render(
    <div className={`fw-stage fw-stage--${view}`}>
      <Page />
    </div>
  );
} else {
  root.render(<Shell pages={pages} />);
}

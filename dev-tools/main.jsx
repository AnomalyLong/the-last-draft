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

createRoot(document.getElementById('root')).render(<Shell pages={pages} />);

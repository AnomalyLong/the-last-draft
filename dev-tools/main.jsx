import React from 'react';
import { createRoot } from 'react-dom/client';
import Shell from './Shell.jsx';
import SpritePreview from './SpritePreview.jsx';
import TitleStory from './stories/TitleStory.jsx';
import OptionsStory from './stories/OptionsStory.jsx';
import TeamSelectStory from './stories/TeamSelectStory.jsx';
import DraftStory from './stories/DraftStory.jsx';
import CollectionStory from './stories/CollectionStory.jsx';
import Collection2Story from './stories/Collection2Story.jsx';
import CourtStory from './stories/CourtStory.jsx';
import AdminStory from './AdminStory.jsx';
import MatchmakingStory from './stories/MatchmakingStory.jsx';

const pages = {
  sprites:      SpritePreview,
  title:        TitleStory,
  options:      OptionsStory,
  teamSelect:   TeamSelectStory,
  draft:        DraftStory,
  matchmaking:  MatchmakingStory,
  collection:   CollectionStory,
  collection2:  Collection2Story,
  court:        CourtStory,
  admin:        AdminStory,
};

createRoot(document.getElementById('root')).render(<Shell pages={pages} />);

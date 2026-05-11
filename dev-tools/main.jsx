import React from 'react';
import { createRoot } from 'react-dom/client';
import Shell from './Shell.jsx';
import SpritePreview from './SpritePreview.jsx';
import TitleStory from './stories/TitleStory.jsx';
import OptionsStory from './stories/OptionsStory.jsx';
import TeamSelectStory from './stories/TeamSelectStory.jsx';
import DraftStory from './stories/DraftStory.jsx';
import CollectionStory from './stories/CollectionStory.jsx';
import CourtStory from './stories/CourtStory.jsx';

const pages = {
  sprites:    SpritePreview,
  title:      TitleStory,
  options:    OptionsStory,
  teamSelect: TeamSelectStory,
  draft:      DraftStory,
  collection: CollectionStory,
  court:      CourtStory,
};

createRoot(document.getElementById('root')).render(<Shell pages={pages} />);

import React from 'react';
import { createRoot } from 'react-dom/client';
import Shell from './Shell.jsx';

// Match the real client bootstrap (src/main.jsx) so the game mounts the same
// way it does inside Reddit — no StrictMode double-invoke surprises.
createRoot(document.getElementById('root')).render(<Shell />);

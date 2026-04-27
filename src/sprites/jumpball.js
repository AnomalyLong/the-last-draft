import { DUNK_FRAMES, DUNK_BALL_OFFSETS } from './dunk.js';

// Dunk played in reverse: player rises from crouch to peak jump
// Frame 0 = landing/squat, frame 8 = peak arm-up (tip moment)
export const JUMP_BALL_FRAMES = [...DUNK_FRAMES].reverse();

// Ball offsets reversed — ball appears at peak (frames 6-8 of this sequence)
export const JUMP_BALL_OFFSETS = [...DUNK_BALL_OFFSETS].reverse();

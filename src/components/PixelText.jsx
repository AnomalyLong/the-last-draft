import React from 'react';
import { pixelTextPixels, MONOGRAM_CELL_W } from '../sprites/monogram.js';

const DIRS4 = [[-1,0],[1,0],[0,-1],[0,1]];
const DIRS8 = [...DIRS4, [-1,-1],[1,-1],[-1,1],[1,1]];

export function PixelText({ text, x, y, scale = 2, fill = '#fff', outline = '#000', thick = false }) {
  const pixels = pixelTextPixels(text, x, y, scale);
  const dirs = thick ? DIRS8 : DIRS4;
  return (
    <g shapeRendering="crispEdges">
      {outline != null && dirs.map(([dx,dy],oi) => pixels.map(([px,py],pi) => (
        <rect key={`o${oi}_${pi}`} x={px+dx*scale} y={py+dy*scale} width={scale} height={scale} fill={outline} />
      )))}
      {pixels.map(([px,py],pi) => (
        <rect key={`f${pi}`} x={px} y={py} width={scale} height={scale} fill={fill} />
      ))}
    </g>
  );
}

export function PixelTextC({ text, cx, y, scale = 2, ...rest }) {
  const w = text.length * MONOGRAM_CELL_W * scale;
  return <PixelText text={text} x={Math.round(cx - w / 2)} y={y} scale={scale} {...rest} />;
}

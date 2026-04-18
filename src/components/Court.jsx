import React from 'react';
import { W, COURT_H, COURT_Y, COURT_MID_Y } from '../constants.js';

export function Court() {
  const planks = Array.from({ length: 30 }, (_, i) => COURT_Y + 8 + i * 8);
  return (
    <g>
      <rect x={0} y={COURT_Y} width={30} height={COURT_H} fill="#d6bc97" />
      <rect x={650} y={COURT_Y} width={30} height={COURT_H} fill="#d6bc97" />
      <rect x={30} y={COURT_Y} width={620} height={COURT_H} fill="#e8d5b0" />
      {planks.map((y) => (
        <rect key={y} x={30} y={y} width={620} height={2} fill="#c4a97a" opacity={0.15} />
      ))}
      <rect x={30} y={178} width={125} height={76} fill="#7ab3c8" opacity={0.55} />
      <rect x={525} y={178} width={125} height={76} fill="#7ab3c8" opacity={0.55} />
      {/* Court boundaries */}
      <rect x={0} y={COURT_Y} width={W} height={COURT_H} fill="none" stroke="#3a5a8a" strokeWidth={1.5} shapeRendering="crispEdges" />
      <rect x={30} y={COURT_Y} width={620} height={COURT_H} fill="none" stroke="#3a5a8a" strokeWidth={1.5} shapeRendering="crispEdges" />
      {/* Paint */}
      <rect x={30} y={178} width={125} height={76} fill="none" stroke="#3a5a8a" strokeWidth={1.5} shapeRendering="crispEdges" />
      <rect x={30} y={187} width={125} height={58} fill="none" stroke="#3a5a8a" strokeWidth={1.5} shapeRendering="crispEdges" />
      <rect x={525} y={178} width={125} height={76} fill="none" stroke="#3a5a8a" strokeWidth={1.5} shapeRendering="crispEdges" />
      <rect x={525} y={187} width={125} height={58} fill="none" stroke="#3a5a8a" strokeWidth={1.5} shapeRendering="crispEdges" />
      {/* Free throw arcs */}
      <path d="M155,194 A39,22 0 0,1 155,238" fill="none" stroke="#3a5a8a" strokeWidth={1.5} />
      <path d="M155,194 A39,22 0 0,0 155,238" fill="none" stroke="#3a5a8a" strokeWidth={1.5} strokeDasharray="4 4" />
      <path d="M525,194 A39,22 0 0,0 525,238" fill="none" stroke="#3a5a8a" strokeWidth={1.5} />
      <path d="M525,194 A39,22 0 0,1 525,238" fill="none" stroke="#3a5a8a" strokeWidth={1.5} strokeDasharray="4 4" />
      {/* 3pt lines */}
      <line x1={30} y1={110} x2={68} y2={110} stroke="#3a5a8a" strokeWidth={1.5} shapeRendering="crispEdges" />
      <line x1={30} y1={322} x2={68} y2={322} stroke="#3a5a8a" strokeWidth={1.5} shapeRendering="crispEdges" />
      <path d="M68,110 A141,106 0 0,1 68,322" fill="none" stroke="#3a5a8a" strokeWidth={1.5} clipPath="url(#left-arc-clip)" />
      <line x1={650} y1={110} x2={612} y2={110} stroke="#3a5a8a" strokeWidth={1.5} shapeRendering="crispEdges" />
      <line x1={650} y1={322} x2={612} y2={322} stroke="#3a5a8a" strokeWidth={1.5} shapeRendering="crispEdges" />
      <path d="M612,110 A141,106 0 0,0 612,322" fill="none" stroke="#3a5a8a" strokeWidth={1.5} clipPath="url(#right-arc-clip)" />
      {/* Half court */}
      <line x1={340} y1={COURT_Y} x2={340} y2={336} stroke="#3a5a8a" strokeWidth={1.5} shapeRendering="crispEdges" />
      <ellipse cx={340} cy={COURT_MID_Y} rx={52} ry={28} fill="none" stroke="#3a5a8a" strokeWidth={1.5} />
      {/* Left basket */}
      <line x1={2} y1={182} x2={28} y2={182} stroke="#777" strokeWidth={2.5} strokeLinecap="square" />
      <line x1={2} y1={182} x2={2} y2={221} stroke="#777" strokeWidth={3} strokeLinecap="square" />
      <line x1={2} y1={210} x2={26} y2={184} stroke="#777" strokeWidth={1.5} />
      <rect x={27} y={172} width={5} height={22} fill="#e0e0e0" stroke="#aaa" strokeWidth={1} shapeRendering="crispEdges" />
      <rect x={36} y={191} width={12} height={1} fill="#e8a020" shapeRendering="crispEdges" />
      <rect x={33} y={192} width={18} height={1} fill="#e8a020" shapeRendering="crispEdges" />
      <rect x={32} y={193} width={1} height={4} fill="#e8a020" shapeRendering="crispEdges" />
      <rect x={51} y={193} width={1} height={4} fill="#e8a020" shapeRendering="crispEdges" />
      <rect x={33} y={197} width={18} height={1} fill="#e8a020" shapeRendering="crispEdges" />
      <rect x={36} y={198} width={12} height={1} fill="#e8a020" shapeRendering="crispEdges" />
      <line x1={30} y1={194} x2={32} y2={194} stroke="#e8a020" strokeWidth={2} strokeLinecap="square" />
      <line x1={33} y1={198} x2={36} y2={206} stroke="#fff" strokeWidth={1} shapeRendering="crispEdges" />
      <line x1={37} y1={198} x2={38} y2={206} stroke="#fff" strokeWidth={1} shapeRendering="crispEdges" />
      <line x1={41} y1={198} x2={41} y2={206} stroke="#fff" strokeWidth={1} shapeRendering="crispEdges" />
      <line x1={45} y1={198} x2={44} y2={206} stroke="#fff" strokeWidth={1} shapeRendering="crispEdges" />
      <line x1={49} y1={198} x2={46} y2={206} stroke="#fff" strokeWidth={1} shapeRendering="crispEdges" />
      <line x1={51} y1={198} x2={47} y2={206} stroke="#fff" strokeWidth={1} shapeRendering="crispEdges" />
      <line x1={33} y1={202} x2={47} y2={202} stroke="#fff" strokeWidth={0.8} shapeRendering="crispEdges" />
      <line x1={35} y1={206} x2={46} y2={206} stroke="#fff" strokeWidth={0.8} shapeRendering="crispEdges" />
      <ellipse cx={42} cy={COURT_MID_Y} rx={7} ry={3} fill="none" stroke="#8a6a3a" strokeWidth={1.5} opacity={0.5} />
      {/* Right basket */}
      <line x1={678} y1={182} x2={652} y2={182} stroke="#777" strokeWidth={2.5} strokeLinecap="square" />
      <line x1={678} y1={182} x2={678} y2={221} stroke="#777" strokeWidth={3} strokeLinecap="square" />
      <line x1={678} y1={210} x2={654} y2={184} stroke="#777" strokeWidth={1.5} />
      <rect x={648} y={172} width={5} height={22} fill="#e0e0e0" stroke="#aaa" strokeWidth={1} shapeRendering="crispEdges" />
      <rect x={631} y={191} width={12} height={1} fill="#e8a020" shapeRendering="crispEdges" />
      <rect x={629} y={192} width={18} height={1} fill="#e8a020" shapeRendering="crispEdges" />
      <rect x={628} y={193} width={1} height={4} fill="#e8a020" shapeRendering="crispEdges" />
      <rect x={647} y={193} width={1} height={4} fill="#e8a020" shapeRendering="crispEdges" />
      <rect x={629} y={197} width={18} height={1} fill="#e8a020" shapeRendering="crispEdges" />
      <rect x={631} y={198} width={12} height={1} fill="#e8a020" shapeRendering="crispEdges" />
      <line x1={648} y1={194} x2={650} y2={194} stroke="#e8a020" strokeWidth={2} strokeLinecap="square" />
      <line x1={629} y1={198} x2={633} y2={206} stroke="#fff" strokeWidth={1} shapeRendering="crispEdges" />
      <line x1={633} y1={198} x2={635} y2={206} stroke="#fff" strokeWidth={1} shapeRendering="crispEdges" />
      <line x1={637} y1={198} x2={638} y2={206} stroke="#fff" strokeWidth={1} shapeRendering="crispEdges" />
      <line x1={641} y1={198} x2={641} y2={206} stroke="#fff" strokeWidth={1} shapeRendering="crispEdges" />
      <line x1={645} y1={198} x2={643} y2={206} stroke="#fff" strokeWidth={1} shapeRendering="crispEdges" />
      <line x1={647} y1={198} x2={644} y2={206} stroke="#fff" strokeWidth={1} shapeRendering="crispEdges" />
      <line x1={631} y1={202} x2={645} y2={202} stroke="#fff" strokeWidth={0.8} shapeRendering="crispEdges" />
      <line x1={633} y1={206} x2={644} y2={206} stroke="#fff" strokeWidth={0.8} shapeRendering="crispEdges" />
      <ellipse cx={638} cy={COURT_MID_Y} rx={7} ry={3} fill="none" stroke="#8a6a3a" strokeWidth={1.5} opacity={0.5} />
    </g>
  );
}

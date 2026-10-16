import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  Building as BldIcon,
  Zap,
  Droplets,
  Trash2,
  AlertTriangle,
  Camera as CameraIcon,
  Coins,
  Layers,
  Maximize2,
  ChevronRight,
  Utensils,
  BookOpen,
  FlaskConical,
  Atom,
  Monitor,
  Volume2,
  ArrowLeft,
  X,
  Plus,
  Minus,
  CheckCircle2,
  Info,
  Users,
  RotateCcw,
} from 'lucide-react';
import {
  fetchBuildings,
  fetchWaterAlerts,
  fetchWasteIncidents,
  fetchCameras,
  updateRoom,
  type Building,
  type Room,
  type WaterAlert,
  type WasteIncident,
  type Camera,
} from '../api';
import { statusColor, getAssetPath } from '../utils';

// ============================================================================
// 1. 3D CAMPUS TERRAIN, ROADS, PARKING & FORMAL GARDENS
// ============================================================================

function CampusGrounds() {
  return (
    <group position={[0, -0.05, 0]}>
      {/* Base Grass Lawn Plane matching reference screenshot */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[130, 100]} />
        <meshStandardMaterial color="#3E7B3E" roughness={0.9} />
      </mesh>

      {/* Main Front Asphalt Roadway (in foreground) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 18]} receiveShadow>
        <planeGeometry args={[115, 6.5]} />
        <meshStandardMaterial color="#36322E" roughness={0.8} />
      </mesh>

      {/* White Dashed Road Centerlines */}
      {[-45, -30, -15, 0, 15, 30, 45].map((x, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.03, 18]}>
          <planeGeometry args={[5.5, 0.35]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      ))}

      {/* Main Parking Lot in front of School of Engineering (center) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2.5, 0.03, 9]} receiveShadow>
        <planeGeometry args={[26, 6.5]} />
        <meshStandardMaterial color="#2E2B27" roughness={0.75} />
      </mesh>

      {/* White Parking Stall Lines */}
      {Array.from({ length: 9 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-9.5 + i * 2.8, 0.04, 9]}>
          <planeGeometry args={[0.12, 5.5]} />
          <meshBasicMaterial color="#E8DDCB" />
        </mesh>
      ))}

      {/* 3D Parked Cars in Parking Stalls */}
      {[
        { x: -8.1, color: '#F0EFEA' }, // White sedan
        { x: -5.3, color: '#1A1A1A' }, // Black SUV
        { x: -2.5, color: '#C94A42' }, // Red sedan
        { x: 3.1, color: '#2B5D80' },  // Blue hatchback
        { x: 5.9, color: '#C0C0C0' },  // Silver sedan
        { x: 8.7, color: '#4A4A4A' },  // Dark gray SUV
      ].map((car, idx) => (
        <group key={idx} position={[car.x, 0.45, 9]}>
          <mesh castShadow position={[0, 0, 0]}>
            <boxGeometry args={[1.5, 0.5, 3.0]} />
            <meshStandardMaterial color={car.color} roughness={0.4} metalness={0.6} />
          </mesh>
          <mesh castShadow position={[0, 0.38, -0.15]}>
            <boxGeometry args={[1.3, 0.42, 1.7]} />
            <meshStandardMaterial color="#1A1A1A" roughness={0.2} metalness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Entrance Security / Gatehouse with Terracotta Roof (Left of Parking) */}
      <group position={[-5.5, 0, 14]}>
        {/* Gatehouse body */}
        <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.8, 2.2, 2.4]} />
          <meshStandardMaterial color="#F5EFE6" roughness={0.6} />
        </mesh>
        {/* Front window and door */}
        <mesh position={[0, 1.0, 1.21]}>
          <planeGeometry args={[1.6, 1.2]} />
          <meshStandardMaterial color="#1E3E59" roughness={0.2} metalness={0.8} />
        </mesh>
        {/* Terracotta pitched hipped roof with eaves */}
        <mesh position={[0, 2.6, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[2.5, 1.1, 4]} />
          <meshStandardMaterial color="#D97736" roughness={0.65} />
        </mesh>
        {/* White roof fascia */}
        <mesh position={[0, 2.25, 0]} castShadow>
          <boxGeometry args={[3.2, 0.15, 2.8]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
      </group>

      {/* Paved Walkways & Pedestrian Paths (Connecting all 5 buildings) */}
      {/* Central Plaza in front of School of Engineering */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 3.5]} receiveShadow>
        <planeGeometry args={[18, 5]} />
        <meshStandardMaterial color="#E8DDCB" roughness={0.7} />
      </mesh>
      {/* Horizontal connector pathway between top buildings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -10]} receiveShadow>
        <planeGeometry args={[65, 3]} />
        <meshStandardMaterial color="#E8DDCB" roughness={0.7} />
      </mesh>
      {/* North-South pathway to School of Engineering */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -6]} receiveShadow>
        <planeGeometry args={[4, 7]} />
        <meshStandardMaterial color="#E8DDCB" roughness={0.7} />
      </mesh>
      {/* Pathway to School of Health Sciences (Top-Left) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-21, 0.02, -10]} receiveShadow>
        <planeGeometry args={[4, 8]} />
        <meshStandardMaterial color="#E8DDCB" roughness={0.7} />
      </mesh>
      {/* Pathway to CDSIMER Hospital (Top-Right) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[21, 0.02, -10]} receiveShadow>
        <planeGeometry args={[4, 8]} />
        <meshStandardMaterial color="#E8DDCB" roughness={0.7} />
      </mesh>
      {/* Pathway to Campus Cafeteria (Bottom-Left) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-21, 0.02, 13]} receiveShadow>
        <planeGeometry args={[4, 7]} />
        <meshStandardMaterial color="#E8DDCB" roughness={0.7} />
      </mesh>
      {/* Pathway to Hospital Emergency Block (Bottom-Right) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[21, 0.02, 13]} receiveShadow>
        <planeGeometry args={[4, 7]} />
        <meshStandardMaterial color="#E8DDCB" roughness={0.7} />
      </mesh>
      {/* Pathway from parking lot to main road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2.5, 0.02, 14]} receiveShadow>
        <planeGeometry args={[4.5, 5]} />
        <meshStandardMaterial color="#E8DDCB" roughness={0.7} />
      </mesh>
    </group>
  );
}

function CampusTree({ x, z, scale = 1.0 }: { x: number; z: number; scale?: number }) {
  return (
    <group position={[x, 0, z]} scale={[scale, scale, scale]}>
      <mesh position={[0, 1.0 * scale, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.35, 2.0 * scale, 8]} />
        <meshStandardMaterial color="#4A3525" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.6 * scale, 0]} castShadow>
        <sphereGeometry args={[1.4, 8, 8]} />
        <meshStandardMaterial color="#285E28" roughness={0.8} />
      </mesh>
      <mesh position={[0, 3.5 * scale, 0]} castShadow>
        <sphereGeometry args={[1.0, 7, 7]} />
        <meshStandardMaterial color="#357A35" roughness={0.8} />
      </mesh>
    </group>
  );
}

// ============================================================================
// 2. CAMPUS BUILDINGS (Architectural Representation of DSU Campus)
// ============================================================================

interface CampusBuildingProps {
  building: Building;
  selected: boolean;
  hovered: boolean;
  showLabels: boolean;
  portalRef?: any;
  onClick: () => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
}

function CampusBuilding({
  building,
  selected,
  hovered,
  showLabels,
  portalRef,
  onClick,
  onPointerOver,
  onPointerOut,
}: CampusBuildingProps) {
  const color = statusColor(building.status);
  const bCode = (building.code || '').toUpperCase();
  const bName = (building.name || '').toLowerCase();

  const isSchoolOfEng = bCode === 'ACAD-A' || bName.includes('engineering');
  const isHealthSci = bCode === 'HEALTH' || bName.includes('health');
  const isCDSIMER = bCode === 'CDSIMER' || bName.includes('cdsimer');
  const isHospER = bCode === 'HOSP-ER' || bName.includes('emergency');
  const isCafe = bCode === 'CAFE' || bName.includes('cafeteria');
  const isMatched = isSchoolOfEng || isHealthSci || isCDSIMER || isHospER || isCafe;

  // Label height: taller buildings get higher labels
  const labelY = isCDSIMER ? 13.5 : isSchoolOfEng ? 12.0 : isHealthSci ? 11.0 : isHospER ? 8.5 : 7.0;

  return (
    <group
      position={[building.pos_x, 0, building.pos_z]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onPointerOver();
      }}
      onPointerOut={onPointerOut}
    >
      {/* Floating Status Ring / Beacon */}
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[selected ? 5.2 : 3.8, selected ? 5.8 : 4.2, 32]} />
        <meshBasicMaterial
          color={selected ? '#2E6B45' : color}
          side={THREE.DoubleSide}
          transparent
          opacity={selected ? 0.9 : 0.6}
        />
      </mesh>

      {/* Floating Name Beacon Label: ONLY rendered when showLabels is true (contained in 3D canvas) */}
      {showLabels && (
        <Html
          position={[0, labelY, 0]}
          center
          distanceFactor={45}
          portal={portalRef}
          zIndexRange={[10, 0]}
          style={{ pointerEvents: 'auto' }}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className={`cursor-pointer px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap shadow-md transition-all flex items-center gap-1.5 ${
              selected
                ? 'bg-[#2E6B45] text-white ring-2 ring-white scale-105'
                : hovered
                ? 'bg-[#332820] text-white scale-105'
                : 'bg-white/95 text-[#292D29] border border-[#E8DDCB]'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: selected ? '#FFF' : color }}
            />
            <span>{building.name}</span>
          </div>
        </Html>
      )}

      {/* 1. ARCHITECTURE: School of Engineering (Central Neoclassical Wing) */}
      {isSchoolOfEng && (
        <group>
          {/* Main Central 3-Story Body */}
          <mesh position={[0, 4.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[13, 9, 7.5]} />
            <meshStandardMaterial color="#F2E6D0" roughness={0.7} />
          </mesh>
          {/* West Wing */}
          <mesh position={[-9.5, 3.5, 1]} castShadow receiveShadow>
            <boxGeometry args={[7, 7, 6]} />
            <meshStandardMaterial color="#EFE3CC" roughness={0.7} />
          </mesh>
          {/* East Wing */}
          <mesh position={[9.5, 3.5, 1]} castShadow receiveShadow>
            <boxGeometry args={[7, 7, 6]} />
            <meshStandardMaterial color="#EFE3CC" roughness={0.7} />
          </mesh>

          {/* Pitched Terracotta Hipped Roofs (#D97736) with White Fascia Eaves (#FAF5EB) */}
          {/* Central Roof Eave Fascia */}
          <mesh position={[0, 9.15, 0]} castShadow>
            <boxGeometry args={[13.8, 0.35, 8.2]} />
            <meshStandardMaterial color="#FAF5EB" roughness={0.5} />
          </mesh>
          {/* Central Pitched Hip Roof */}
          <mesh position={[0, 10.35, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <cylinderGeometry args={[2.0, 7.2, 2.2, 4]} />
            <meshStandardMaterial color="#D97736" roughness={0.65} />
          </mesh>

          {/* West Wing Roof Eave Fascia & Pitch */}
          <mesh position={[-9.5, 7.15, 1]} castShadow>
            <boxGeometry args={[7.6, 0.35, 6.6]} />
            <meshStandardMaterial color="#FAF5EB" roughness={0.5} />
          </mesh>
          <mesh position={[-9.5, 8.1, 1]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <cylinderGeometry args={[1.0, 4.2, 1.8, 4]} />
            <meshStandardMaterial color="#D97736" roughness={0.65} />
          </mesh>

          {/* East Wing Roof Eave Fascia & Pitch */}
          <mesh position={[9.5, 7.15, 1]} castShadow>
            <boxGeometry args={[7.6, 0.35, 6.6]} />
            <meshStandardMaterial color="#FAF5EB" roughness={0.5} />
          </mesh>
          <mesh position={[9.5, 8.1, 1]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <cylinderGeometry args={[1.0, 4.2, 1.8, 4]} />
            <meshStandardMaterial color="#D97736" roughness={0.65} />
          </mesh>

          {/* Front Portico with 6 Ionic Columns */}
          <group position={[0, 0, 4.3]}>
            <mesh position={[0, 0.3, 0]} castShadow>
              <boxGeometry args={[6.5, 0.6, 2.5]} />
              <meshStandardMaterial color="#D4C5B0" />
            </mesh>
            {[-2.5, -1.5, -0.5, 0.5, 1.5, 2.5].map((cx, i) => (
              <mesh key={i} position={[cx, 4.2, 0.8]} castShadow>
                <cylinderGeometry args={[0.2, 0.24, 7.5, 12]} />
                <meshStandardMaterial color="#FAF5EB" roughness={0.3} />
              </mesh>
            ))}
            <mesh position={[0, 8.4, 0.5]} castShadow>
              <boxGeometry args={[6.8, 0.8, 2.0]} />
              <meshStandardMaterial color="#C19A6B" />
            </mesh>
          </group>

          {/* Window Matrix */}
          {[1.8, 3.8, 5.8, 7.8].map((wy, floorIdx) => (
            <group key={floorIdx} position={[0, wy, 3.8]}>
              {[-5, -3.5, -2, 2, 3.5, 5].map((wx, i) => (
                <mesh key={i} position={[wx, 0, 0]}>
                  <planeGeometry args={[0.9, 1.2]} />
                  <meshStandardMaterial color="#1B3347" roughness={0.2} metalness={0.7} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      )}

      {/* 2. ARCHITECTURE: School of Health Sciences (Neoclassical Academic & Clinical Wing) */}
      {isHealthSci && (
        <group>
          {/* Main 4-story Academic Body */}
          <mesh position={[0, 4.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[11, 8.4, 7.0]} />
            <meshStandardMaterial color="#F5EFE4" roughness={0.7} />
          </mesh>
          {/* Symmetrical Left & Right Annex Wings */}
          <mesh position={[-7.5, 3.5, 0.5]} castShadow receiveShadow>
            <boxGeometry args={[4.5, 7.0, 6.0]} />
            <meshStandardMaterial color="#EFE6D6" roughness={0.75} />
          </mesh>
          <mesh position={[7.5, 3.5, 0.5]} castShadow receiveShadow>
            <boxGeometry args={[4.5, 7.0, 6.0]} />
            <meshStandardMaterial color="#EFE6D6" roughness={0.75} />
          </mesh>

          {/* Pitched Terracotta Hipped Roofs (#D97736) with White Fascia Eaves (#FAF5EB) */}
          <mesh position={[0, 8.6, 0]} castShadow>
            <boxGeometry args={[11.6, 0.35, 7.6]} />
            <meshStandardMaterial color="#FAF5EB" roughness={0.5} />
          </mesh>
          <mesh position={[0, 9.75, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <cylinderGeometry args={[1.6, 6.0, 2.1, 4]} />
            <meshStandardMaterial color="#D97736" roughness={0.65} />
          </mesh>

          <mesh position={[-7.5, 7.15, 0.5]} castShadow>
            <boxGeometry args={[5.0, 0.35, 6.4]} />
            <meshStandardMaterial color="#FAF5EB" roughness={0.5} />
          </mesh>
          <mesh position={[-7.5, 8.0, 0.5]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <cylinderGeometry args={[0.8, 3.2, 1.6, 4]} />
            <meshStandardMaterial color="#D97736" roughness={0.65} />
          </mesh>

          <mesh position={[7.5, 7.15, 0.5]} castShadow>
            <boxGeometry args={[5.0, 0.35, 6.4]} />
            <meshStandardMaterial color="#FAF5EB" roughness={0.5} />
          </mesh>
          <mesh position={[7.5, 8.0, 0.5]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <cylinderGeometry args={[0.8, 3.2, 1.6, 4]} />
            <meshStandardMaterial color="#D97736" roughness={0.65} />
          </mesh>

          {/* Entrance Portico with Classical Columns */}
          <group position={[0, 0, 3.8]}>
            <mesh position={[0, 0.3, 0]} castShadow>
              <boxGeometry args={[5.5, 0.6, 2.0]} />
              <meshStandardMaterial color="#D8C8B4" />
            </mesh>
            {[-2.0, -0.7, 0.7, 2.0].map((cx, i) => (
              <mesh key={i} position={[cx, 3.8, 0.7]} castShadow>
                <cylinderGeometry args={[0.18, 0.22, 7.0, 12]} />
                <meshStandardMaterial color="#FAF5EB" roughness={0.3} />
              </mesh>
            ))}
            <mesh position={[0, 7.6, 0.5]} castShadow>
              <boxGeometry args={[5.8, 0.6, 1.8]} />
              <meshStandardMaterial color="#C19A6B" />
            </mesh>
          </group>

          {/* Window Matrix */}
          {[1.8, 3.6, 5.4, 7.2].map((wy, fIdx) => (
            <group key={fIdx} position={[0, wy, 3.52]}>
              {[-4.2, -2.8, -1.4, 1.4, 2.8, 4.2].map((wx, i) => (
                <mesh key={i} position={[wx, 0, 0]}>
                  <planeGeometry args={[0.9, 1.1]} />
                  <meshStandardMaterial color="#2B5D80" roughness={0.2} metalness={0.8} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      )}

      {/* 3. ARCHITECTURE: CDSIMER Hospital (Grand Multi-Story Hospital & Trauma Center) */}
      {isCDSIMER && (
        <group>
          {/* Central High-Rise Tower (5 Floors) */}
          <mesh position={[0, 5.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[14, 10.4, 8.5]} />
            <meshStandardMaterial color="#F4EFE6" roughness={0.65} />
          </mesh>
          {/* East and West Hospital Wings */}
          <mesh position={[-9.5, 4.0, 1]} castShadow receiveShadow>
            <boxGeometry args={[6.5, 8.0, 7.0]} />
            <meshStandardMaterial color="#EAE2D4" roughness={0.7} />
          </mesh>
          <mesh position={[9.5, 4.0, 1]} castShadow receiveShadow>
            <boxGeometry args={[6.5, 8.0, 7.0]} />
            <meshStandardMaterial color="#EAE2D4" roughness={0.7} />
          </mesh>

          {/* Pitched Terracotta Hipped Roofs (#D97736) with White Fascia Eaves (#FAF5EB) */}
          <mesh position={[0, 10.6, 0]} castShadow>
            <boxGeometry args={[14.8, 0.45, 9.2]} />
            <meshStandardMaterial color="#FAF5EB" roughness={0.5} />
          </mesh>
          <mesh position={[0, 11.9, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <cylinderGeometry args={[2.2, 7.6, 2.4, 4]} />
            <meshStandardMaterial color="#D97736" roughness={0.65} />
          </mesh>

          <mesh position={[-9.5, 8.15, 1]} castShadow>
            <boxGeometry args={[7.0, 0.35, 7.4]} />
            <meshStandardMaterial color="#FAF5EB" roughness={0.5} />
          </mesh>
          <mesh position={[-9.5, 9.15, 1]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <cylinderGeometry args={[1.0, 4.2, 1.8, 4]} />
            <meshStandardMaterial color="#D97736" roughness={0.65} />
          </mesh>

          <mesh position={[9.5, 8.15, 1]} castShadow>
            <boxGeometry args={[7.0, 0.35, 7.4]} />
            <meshStandardMaterial color="#FAF5EB" roughness={0.5} />
          </mesh>
          <mesh position={[9.5, 9.15, 1]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <cylinderGeometry args={[1.0, 4.2, 1.8, 4]} />
            <meshStandardMaterial color="#D97736" roughness={0.65} />
          </mesh>

          {/* Grand Hospital Porte-Cochere / Ambulance Drive-Thru Entrance */}
          <group position={[0, 0, 4.8]}>
            <mesh position={[0, 0.2, 0]} receiveShadow>
              <boxGeometry args={[8.0, 0.4, 3.2]} />
              <meshStandardMaterial color="#C8BCAB" />
            </mesh>
            {[-3.2, 3.2].map((cx, i) => (
              <mesh key={i} position={[cx, 2.2, 1.2]} castShadow>
                <boxGeometry args={[0.6, 4.2, 0.6]} />
                <meshStandardMaterial color="#FAF5EB" />
              </mesh>
            ))}
            {/* Canopy */}
            <mesh position={[0, 4.5, 0.8]} castShadow>
              <boxGeometry args={[8.4, 0.5, 3.0]} />
              <meshStandardMaterial color="#2E6B45" roughness={0.4} />
            </mesh>
            {/* Hospital Cross Emblem */}
            <mesh position={[0, 4.5, 2.32]}>
              <boxGeometry args={[1.2, 0.35, 0.05]} />
              <meshBasicMaterial color="#C94A42" />
            </mesh>
            <mesh position={[0, 4.5, 2.32]}>
              <boxGeometry args={[0.35, 1.2, 0.05]} />
              <meshBasicMaterial color="#C94A42" />
            </mesh>
          </group>

          {/* Hospital Fenestration / Ribbons */}
          {[2.0, 4.0, 6.0, 8.0, 9.8].map((wy, fIdx) => (
            <group key={fIdx} position={[0, wy, 4.28]}>
              {[-5.5, -3.8, -2.0, 2.0, 3.8, 5.5].map((wx, i) => (
                <mesh key={i} position={[wx, 0, 0]}>
                  <planeGeometry args={[1.2, 1.2]} />
                  <meshStandardMaterial color="#1B3E59" roughness={0.15} metalness={0.85} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      )}

      {/* 4. ARCHITECTURE: Hospital Emergency Block (24/7 Critical Care & Trauma Unit) */}
      {isHospER && (
        <group>
          <mesh position={[0, 3.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[10.5, 6.4, 7.5]} />
            <meshStandardMaterial color="#FAF5ED" roughness={0.6} />
          </mesh>

          {/* Pitched Terracotta Hipped Roof (#D97736) with White Fascia Eaves (#FAF5EB) */}
          <mesh position={[0, 6.55, 0]} castShadow>
            <boxGeometry args={[11.2, 0.35, 8.2]} />
            <meshStandardMaterial color="#FAF5EB" roughness={0.5} />
          </mesh>
          <mesh position={[0, 7.55, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <cylinderGeometry args={[1.2, 5.6, 1.8, 4]} />
            <meshStandardMaterial color="#D97736" roughness={0.65} />
          </mesh>

          {/* Red Emergency Signage Bar across facade */}
          <mesh position={[0, 5.2, 3.8]}>
            <boxGeometry args={[9.5, 0.8, 0.2]} />
            <meshStandardMaterial color="#C94A42" roughness={0.3} />
          </mesh>
          {/* Red Cross Symbol on Signage */}
          <mesh position={[-3.8, 5.2, 3.92]}>
            <boxGeometry args={[0.7, 0.2, 0.05]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
          <mesh position={[-3.8, 5.2, 3.92]}>
            <boxGeometry args={[0.2, 0.7, 0.05]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>

          {/* Emergency Ambulance Bay Canopy */}
          <group position={[1.5, 0, 4.4]}>
            <mesh position={[0, 3.2, 0]} castShadow>
              <boxGeometry args={[6.5, 0.35, 3.0]} />
              <meshStandardMaterial color="#E8DDCB" roughness={0.5} />
            </mesh>
            <mesh position={[-2.8, 1.6, 1.2]} castShadow>
              <cylinderGeometry args={[0.1, 0.1, 3.2, 12]} />
              <meshStandardMaterial color="#332820" />
            </mesh>
            <mesh position={[2.8, 1.6, 1.2]} castShadow>
              <cylinderGeometry args={[0.1, 0.1, 3.2, 12]} />
              <meshStandardMaterial color="#332820" />
            </mesh>
          </group>

          {/* Glazed Emergency Observation Windows */}
          {[1.8, 3.6].map((wy, i) => (
            <mesh key={i} position={[-2.4, wy, 3.77]}>
              <planeGeometry args={[3.8, 1.1]} />
              <meshStandardMaterial color="#224A66" roughness={0.1} metalness={0.9} />
            </mesh>
          ))}
        </group>
      )}

      {/* 5. ARCHITECTURE: Campus Cafeteria (Dining Pavilion & Outdoor Terrace) */}
      {isCafe && (
        <group>
          <mesh position={[0, 2.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[8.5, 4.4, 6.5]} />
            <meshStandardMaterial color="#F5EFE6" roughness={0.8} />
          </mesh>

          {/* Pitched Terracotta Hipped Roof (#D97736) with White Fascia Eaves (#FAF5EB) */}
          <mesh position={[0, 4.55, 0]} castShadow>
            <boxGeometry args={[9.2, 0.35, 7.2]} />
            <meshStandardMaterial color="#FAF5EB" roughness={0.5} />
          </mesh>
          <mesh position={[0, 5.45, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <cylinderGeometry args={[1.0, 4.8, 1.6, 4]} />
            <meshStandardMaterial color="#D97736" roughness={0.65} />
          </mesh>

          {/* Red Brick Accent Columns */}
          {[-3.8, -1.3, 1.3, 3.8].map((cx, i) => (
            <mesh key={i} position={[cx, 2.2, 3.3]} castShadow>
              <boxGeometry args={[0.6, 4.5, 0.6]} />
              <meshStandardMaterial color="#A64B2A" roughness={0.85} />
            </mesh>
          ))}

          {/* Cafe Panoramic Glass Windows */}
          {[-2.5, 0, 2.5].map((wx, i) => (
            <mesh key={i} position={[wx, 2.2, 3.28]}>
              <planeGeometry args={[1.8, 2.6]} />
              <meshStandardMaterial color="#2B5D80" roughness={0.2} metalness={0.7} />
            </mesh>
          ))}

          {/* Outdoor Terrace Dining Tables & Parasols */}
          {[-2.5, 2.5].map((tx, i) => (
            <group key={i} position={[tx, 0, 5.0]}>
              <mesh position={[0, 0.45, 0]} castShadow>
                <cylinderGeometry args={[0.6, 0.6, 0.1, 16]} />
                <meshStandardMaterial color="#E8DDCB" />
              </mesh>
              <mesh position={[0, 1.7, 0]} castShadow>
                <coneGeometry args={[1.1, 0.5, 8]} />
                <meshStandardMaterial color="#2E6B45" />
              </mesh>
              <mesh position={[0, 1.0, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 1.4]} />
                <meshStandardMaterial color="#4A4540" />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* 6. PROCEDURAL FALLBACK ARCHITECTURE (Ensures any building is always 100% visible) */}
      {!isMatched && (
        <group>
          <mesh position={[0, (building.floors || 3) * 1.6, 0]} castShadow receiveShadow>
            <boxGeometry args={[11, (building.floors || 3) * 3.2, 8]} />
            <meshStandardMaterial color="#F4EFE6" roughness={0.7} />
          </mesh>
          <mesh position={[0, (building.floors || 3) * 3.2 + 1.2, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <cylinderGeometry args={[1.5, 6.8, 2.2, 4]} />
            <meshStandardMaterial color="#D97736" roughness={0.65} />
          </mesh>
          <mesh position={[0, 0.4, 4.3]} castShadow>
            <boxGeometry args={[3.5, 0.8, 1.2]} />
            <meshStandardMaterial color="#C19A6B" />
          </mesh>
        </group>
      )}
    </group>
  );
}

// ============================================================================
// 3. 3D CUTAWAY ARCHITECTURAL FLOOR PLAN (Ground Floor & Upper Floors)
// ============================================================================

interface FloorCutawayProps {
  floorNumber: number;
  buildingCode?: string;
  rooms: Room[];
  selectedRoomId: number | null;
  showLabels: boolean;
  portalRef?: any;
  onSelectRoom: (room: Room) => void;
}

function FloorCutaway3D({
  floorNumber,
  buildingCode = 'ACAD-A',
  rooms,
  selectedRoomId,
  showLabels,
  portalRef,
  onSelectRoom,
}: FloorCutawayProps) {
  const [hoveredRoomName, setHoveredRoomName] = useState<string | null>(null);

  // Helper to match rooms by code or name
  const findRoom = (pattern: string) =>
    rooms.find((r) => r.code.toLowerCase().includes(pattern.toLowerCase()) || r.name.toLowerCase().includes(pattern.toLowerCase()));

  // --------------------------------------------------------------------------
  // GROUND FLOOR (Floor 0) — CENTRAL LIBRARY
  // --------------------------------------------------------------------------
  if (buildingCode === 'ACAD-A' && floorNumber === 0) {
    const libMain = findRoom('SOE-LIB-01') || findRoom('Central Library') || rooms[0];
    const libDesk = findRoom('SOE-LIB-02') || findRoom('Circulation') || rooms[1];
    const libDigital = findRoom('SOE-LIB-03') || findRoom('Digital Learning') || rooms[2];
    const libRef = findRoom('SOE-LIB-04') || findRoom('Reference') || rooms[3];
    const libLounge = findRoom('SOE-LIB-05') || findRoom('Lounge') || rooms[4];

    return (
      <group position={[0, 0, 0]}>
        {/* Base Floor Slab */}
        <mesh position={[0, 0.1, 0]} receiveShadow>
          <boxGeometry args={[28, 0.2, 18]} />
          <meshStandardMaterial color="#EAE2D2" roughness={0.5} />
        </mesh>

        {/* Library Perimeter Walls */}
        <mesh position={[0, 0.9, -8.9]} castShadow>
          <boxGeometry args={[28, 1.6, 0.3]} />
          <meshStandardMaterial color="#F5EFE6" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.9, 8.9]} castShadow>
          <boxGeometry args={[28, 1.6, 0.3]} />
          <meshStandardMaterial color="#F5EFE6" roughness={0.8} />
        </mesh>
        <mesh position={[-13.9, 0.9, 0]} castShadow>
          <boxGeometry args={[0.3, 1.6, 18]} />
          <meshStandardMaterial color="#F5EFE6" roughness={0.8} />
        </mesh>
        <mesh position={[13.9, 0.9, 0]} castShadow>
          <boxGeometry args={[0.3, 1.6, 18]} />
          <meshStandardMaterial color="#F5EFE6" roughness={0.8} />
        </mesh>

        {/* Central Entrance Corridor & Glass Turnstiles */}
        <mesh position={[0, 0.21, 5.0]} receiveShadow>
          <boxGeometry args={[5.5, 0.04, 7.5]} />
          <meshStandardMaterial color="#D8C8B5" roughness={0.3} />
        </mesh>

        {/* 1. LIBRARIAN DESK & CIRCULATION COUNTER (Entrance Front Center) */}
        <group
          position={[0, 0.2, 3.5]}
          onClick={(e) => {
            e.stopPropagation();
            if (libDesk) onSelectRoom(libDesk);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHoveredRoomName('Librarian Desk');
          }}
          onPointerOut={() => setHoveredRoomName(null)}
        >
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[7, 4.5]} />
            <meshBasicMaterial
              color={selectedRoomId === libDesk?.id ? '#2E6B45' : '#4A90E2'}
              transparent
              opacity={selectedRoomId === libDesk?.id ? 0.35 : hoveredRoomName === 'Librarian Desk' ? 0.2 : 0}
            />
          </mesh>
          {/* Curved Mahogany Service Counter */}
          <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[4.2, 0.9, 1.2]} />
            <meshStandardMaterial color="#6B3A1E" roughness={0.5} />
          </mesh>
          {/* Issue Terminals & Monitors */}
          {[-1.2, 1.2].map((tx, idx) => (
            <group key={idx} position={[tx, 0.95, 0]}>
              <mesh position={[0, 0.2, 0]}>
                <boxGeometry args={[0.6, 0.4, 0.04]} />
                <meshStandardMaterial color="#111" />
              </mesh>
              <mesh position={[0, 0.02, 0.2]}>
                <boxGeometry args={[0.4, 0.02, 0.15]} />
                <meshStandardMaterial color="#333" />
              </mesh>
            </group>
          ))}
          {/* RFID Book Drop Kiosk */}
          <mesh position={[-2.8, 0.6, 0.5]} castShadow>
            <boxGeometry args={[0.8, 1.2, 0.7]} />
            <meshStandardMaterial color="#2E6B45" />
          </mesh>
          {showLabels && (
            <Html position={[0, 1.8, 0]} center distanceFactor={30} portal={portalRef} zIndexRange={[10, 0]}>
              <div
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold shadow-md cursor-pointer whitespace-nowrap transition-all ${
                  selectedRoomId === libDesk?.id
                    ? 'bg-[#2E6B45] text-white ring-2 ring-white scale-110'
                    : 'bg-white/95 text-[#292D29] border border-[#E8DDCB]'
                }`}
              >
                Librarian Desk & Issue Counter
              </div>
            </Html>
          )}
        </group>

        {/* 2. CENTRAL LIBRARY & STACK AREA (Main Reading Tables + Bookshelf Rows) */}
        <group
          position={[-6.5, 0.2, -3.2]}
          onClick={(e) => {
            e.stopPropagation();
            if (libMain) onSelectRoom(libMain);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHoveredRoomName('Central Library');
          }}
          onPointerOut={() => setHoveredRoomName(null)}
        >
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[13.5, 9.5]} />
            <meshBasicMaterial
              color={selectedRoomId === libMain?.id ? '#2E6B45' : '#4A90E2'}
              transparent
              opacity={selectedRoomId === libMain?.id ? 0.35 : hoveredRoomName === 'Central Library' ? 0.2 : 0}
            />
          </mesh>
          {/* 3 Parallel Rows of Double-Sided Bookshelves */}
          {[-4.5, -1.5, 1.5, 4.5].map((sx, idx) => (
            <group key={idx} position={[sx, 0, -2.2]}>
              <mesh position={[0, 1.2, 0]} castShadow>
                <boxGeometry args={[1.8, 2.2, 3.8]} />
                <meshStandardMaterial color="#4A2E18" roughness={0.7} />
              </mesh>
              {/* Colorful Book Spines */}
              {[-0.8, -0.1, 0.6, 1.3].map((by, bIdx) => (
                <mesh key={bIdx} position={[0, by + 0.6, 0]}>
                  <boxGeometry args={[1.82, 0.4, 3.7]} />
                  <meshStandardMaterial color={['#A63A2A', '#2E6B45', '#1B3E59', '#D89A35'][bIdx % 4]} />
                </mesh>
              ))}
            </group>
          ))}
          {/* 4 Oak Reading Tables with Brass Lamps */}
          {[-3.0, 3.0].map((tx, tIdx) => (
            <group key={tIdx} position={[tx, 0, 2.8]}>
              <mesh position={[0, 0.42, 0]} castShadow>
                <boxGeometry args={[4.5, 0.08, 1.8]} />
                <meshStandardMaterial color="#C19A6B" roughness={0.6} />
              </mesh>
              {/* Reading Lamp */}
              <mesh position={[0, 0.75, 0]} castShadow>
                <boxGeometry args={[0.2, 0.6, 0.2]} />
                <meshStandardMaterial color="#2E6B45" />
              </mesh>
              {/* Chairs around Table */}
              {[-1.5, 0, 1.5].map((cx, cIdx) => (
                <React.Fragment key={cIdx}>
                  <mesh position={[cx, 0.25, -1.1]} castShadow>
                    <boxGeometry args={[0.5, 0.5, 0.5]} />
                    <meshStandardMaterial color="#332820" />
                  </mesh>
                  <mesh position={[cx, 0.25, 1.1]} castShadow>
                    <boxGeometry args={[0.5, 0.5, 0.5]} />
                    <meshStandardMaterial color="#332820" />
                  </mesh>
                </React.Fragment>
              ))}
            </group>
          ))}
          {showLabels && (
            <Html position={[0, 2.4, 0]} center distanceFactor={30} portal={portalRef} zIndexRange={[10, 0]}>
              <div
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold shadow-md cursor-pointer whitespace-nowrap transition-all ${
                  selectedRoomId === libMain?.id
                    ? 'bg-[#2E6B45] text-white ring-2 ring-white scale-110'
                    : 'bg-white/95 text-[#292D29] border border-[#E8DDCB]'
                }`}
              >
                Central Library & Stack Area
              </div>
            </Html>
          )}
        </group>

        {/* 3. DIGITAL LEARNING & E-RESOURCE LAB (South-West) */}
        <group
          position={[-8.5, 0.2, 4.5]}
          onClick={(e) => {
            e.stopPropagation();
            if (libDigital) onSelectRoom(libDigital);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHoveredRoomName('Digital Learning');
          }}
          onPointerOut={() => setHoveredRoomName(null)}
        >
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[8.5, 6.0]} />
            <meshBasicMaterial
              color={selectedRoomId === libDigital?.id ? '#2E6B45' : '#4A90E2'}
              transparent
              opacity={selectedRoomId === libDigital?.id ? 0.35 : hoveredRoomName === 'Digital Learning' ? 0.2 : 0}
            />
          </mesh>
          {/* 2 Rows of Workstations */}
          {[-1.2, 1.2].map((wz, rIdx) => (
            <group key={rIdx} position={[0, 0, wz]}>
              <mesh position={[0, 0.38, 0]} castShadow>
                <boxGeometry args={[6.8, 0.08, 0.9]} />
                <meshStandardMaterial color="#E8DDCB" />
              </mesh>
              {[-2.2, 0, 2.2].map((mx, mIdx) => (
                <group key={mIdx} position={[mx, 0.42, 0]}>
                  <mesh position={[0, 0.22, 0]}>
                    <boxGeometry args={[0.7, 0.45, 0.04]} />
                    <meshStandardMaterial color="#0F172A" />
                  </mesh>
                  <mesh position={[0, 0.02, 0.2]}>
                    <boxGeometry args={[0.45, 0.02, 0.15]} />
                    <meshStandardMaterial color="#333" />
                  </mesh>
                </group>
              ))}
            </group>
          ))}
          {showLabels && (
            <Html position={[0, 1.8, 0]} center distanceFactor={30} portal={portalRef} zIndexRange={[10, 0]}>
              <div
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold shadow-md cursor-pointer whitespace-nowrap transition-all ${
                  selectedRoomId === libDigital?.id
                    ? 'bg-[#2E6B45] text-white ring-2 ring-white scale-110'
                    : 'bg-white/95 text-[#292D29] border border-[#E8DDCB]'
                }`}
              >
                Digital Learning & E-Resource Lab
              </div>
            </Html>
          )}
        </group>

        {/* 4. REFERENCE & BOOK STORAGE AREA (North-East Archive Stacks) */}
        <group
          position={[7.5, 0.2, -3.2]}
          onClick={(e) => {
            e.stopPropagation();
            if (libRef) onSelectRoom(libRef);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHoveredRoomName('Reference Archive');
          }}
          onPointerOut={() => setHoveredRoomName(null)}
        >
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[11.0, 9.5]} />
            <meshBasicMaterial
              color={selectedRoomId === libRef?.id ? '#2E6B45' : '#4A90E2'}
              transparent
              opacity={selectedRoomId === libRef?.id ? 0.35 : hoveredRoomName === 'Reference Archive' ? 0.2 : 0}
            />
          </mesh>
          {/* High-Density Archival Steel Stacks */}
          {[-3.5, -1.0, 1.5, 4.0].map((rx, idx) => (
            <mesh key={idx} position={[rx, 1.1, 0]} castShadow>
              <boxGeometry args={[1.2, 2.2, 7.5]} />
              <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
            </mesh>
          ))}
          {showLabels && (
            <Html position={[0, 2.2, 0]} center distanceFactor={30} portal={portalRef} zIndexRange={[10, 0]}>
              <div
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold shadow-md cursor-pointer whitespace-nowrap transition-all ${
                  selectedRoomId === libRef?.id
                    ? 'bg-[#2E6B45] text-white ring-2 ring-white scale-110'
                    : 'bg-white/95 text-[#292D29] border border-[#E8DDCB]'
                }`}
              >
                Reference & Book Storage Area
              </div>
            </Html>
          )}
        </group>

        {/* 5. READING & WAITING LOUNGE (South-East Lounge Area) */}
        <group
          position={[7.5, 0.2, 4.5]}
          onClick={(e) => {
            e.stopPropagation();
            if (libLounge) onSelectRoom(libLounge);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHoveredRoomName('Reading Lounge');
          }}
          onPointerOut={() => setHoveredRoomName(null)}
        >
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[9.5, 6.0]} />
            <meshBasicMaterial
              color={selectedRoomId === libLounge?.id ? '#2E6B45' : '#4A90E2'}
              transparent
              opacity={selectedRoomId === libLounge?.id ? 0.35 : hoveredRoomName === 'Reading Lounge' ? 0.2 : 0}
            />
          </mesh>
          {/* Comfortable Armchairs and Coffee Table */}
          {[-2.0, 2.0].map((lx, lIdx) => (
            <group key={lIdx} position={[lx, 0, 0]}>
              <mesh position={[0, 0.3, 0]} castShadow>
                <boxGeometry args={[1.2, 0.6, 1.2]} />
                <meshStandardMaterial color="#2E6B45" />
              </mesh>
              <mesh position={[0, 0.6, -0.5]}>
                <boxGeometry args={[1.2, 0.6, 0.2]} />
                <meshStandardMaterial color="#2E6B45" />
              </mesh>
            </group>
          ))}
          <mesh position={[0, 0.25, 0]} castShadow>
            <boxGeometry args={[1.5, 0.5, 1.0]} />
            <meshStandardMaterial color="#C19A6B" />
          </mesh>
          {showLabels && (
            <Html position={[0, 1.8, 0]} center distanceFactor={30} portal={portalRef} zIndexRange={[10, 0]}>
              <div
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold shadow-md cursor-pointer whitespace-nowrap transition-all ${
                  selectedRoomId === libLounge?.id
                    ? 'bg-[#2E6B45] text-white ring-2 ring-white scale-110'
                    : 'bg-white/95 text-[#292D29] border border-[#E8DDCB]'
                }`}
              >
                Reading & Waiting Lounge
              </div>
            </Html>
          )}
        </group>
      </group>
    );
  }

  // --------------------------------------------------------------------------
  // FIRST FLOOR (Floor 1) — ENGINEERING LABORATORIES (8 SEPARATE LABS)
  // --------------------------------------------------------------------------
  if (buildingCode === 'ACAD-A' && floorNumber === 1) {
    const lab1 = findRoom('SOE-LAB-01') || findRoom('Programming') || rooms[0];
    const lab2 = findRoom('SOE-LAB-02') || findRoom('Machine Learning') || rooms[1];
    const lab3 = findRoom('SOE-LAB-03') || findRoom('Data Science') || rooms[2];
    const lab4 = findRoom('SOE-LAB-04') || findRoom('Electronics') || rooms[3];
    const lab5 = findRoom('SOE-LAB-05') || findRoom('Embedded') || rooms[4];
    const lab6 = findRoom('SOE-LAB-06') || findRoom('Innovation') || rooms[5];
    const lab7 = findRoom('SOE-LAB-07') || findRoom('Store') || rooms[6];
    const lab8 = findRoom('SOE-LAB-08') || findRoom('Instructor') || rooms[7];

    const labConfigs = [
      // North Wing (z = -4.5)
      { room: lab1, name: 'Computer Programming Lab', pos: [-9.5, 0.2, -4.8], size: [6.2, 7.2], type: 'coding' },
      { room: lab2, name: 'AI & Machine Learning Lab', pos: [-3.2, 0.2, -4.8], size: [5.8, 7.2], type: 'gpu' },
      { room: lab3, name: 'Data Science Lab', pos: [3.2, 0.2, -4.8], size: [5.8, 7.2], type: 'cluster' },
      { room: lab7, name: 'Laboratory Store', pos: [9.5, 0.2, -4.8], size: [6.2, 7.2], type: 'store' },
      // South Wing (z = 4.5)
      { room: lab4, name: 'Electronics Lab', pos: [-9.5, 0.2, 4.8], size: [6.2, 7.2], type: 'circuits' },
      { room: lab5, name: 'Hardware & Embedded Lab', pos: [-3.2, 0.2, 4.8], size: [5.8, 7.2], type: 'hardware' },
      { room: lab6, name: 'Project & Innovation Lab', pos: [3.2, 0.2, 4.8], size: [5.8, 7.2], type: '3dprint' },
      { room: lab8, name: 'Faculty & Lab Instructor Room', pos: [9.5, 0.2, 4.8], size: [6.2, 7.2], type: 'office' },
    ];

    return (
      <group position={[0, 0, 0]}>
        {/* Floor Base Slab */}
        <mesh position={[0, 0.1, 0]} receiveShadow>
          <boxGeometry args={[28, 0.2, 18]} />
          <meshStandardMaterial color="#E8DDCB" roughness={0.5} />
        </mesh>
        {/* Central Hallway Corridor */}
        <mesh position={[0, 0.21, 0]} receiveShadow>
          <boxGeometry args={[27.5, 0.04, 2.4]} />
          <meshStandardMaterial color="#D4C8B5" roughness={0.3} />
        </mesh>

        {/* Outer and Dividing Wall Partitions */}
        <mesh position={[0, 0.9, -8.7]} castShadow>
          <boxGeometry args={[28, 1.6, 0.25]} />
          <meshStandardMaterial color="#F4ECDC" />
        </mesh>
        <mesh position={[0, 0.9, 8.7]} castShadow>
          <boxGeometry args={[28, 1.6, 0.25]} />
          <meshStandardMaterial color="#F4ECDC" />
        </mesh>
        <mesh position={[0, 0.9, -1.2]} castShadow>
          <boxGeometry args={[28, 1.6, 0.2]} />
          <meshStandardMaterial color="#EDE3D2" />
        </mesh>
        <mesh position={[0, 0.9, 1.2]} castShadow>
          <boxGeometry args={[28, 1.6, 0.2]} />
          <meshStandardMaterial color="#EDE3D2" />
        </mesh>
        {[-6.4, 0, 6.4].map((wx, idx) => (
          <React.Fragment key={idx}>
            <mesh position={[wx, 0.9, -4.8]} castShadow>
              <boxGeometry args={[0.2, 1.6, 7.2]} />
              <meshStandardMaterial color="#EDE3D2" />
            </mesh>
            <mesh position={[wx, 0.9, 4.8]} castShadow>
              <boxGeometry args={[0.2, 1.6, 7.2]} />
              <meshStandardMaterial color="#EDE3D2" />
            </mesh>
          </React.Fragment>
        ))}

        {/* 8 Laboratory Rooms */}
        {labConfigs.map((cfg, idx) => {
          const isSelected = selectedRoomId === cfg.room?.id;
          const isHovered = hoveredRoomName === cfg.name;

          return (
            <group
              key={idx}
              position={cfg.pos as [number, number, number]}
              onClick={(e) => {
                e.stopPropagation();
                if (cfg.room) onSelectRoom(cfg.room);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredRoomName(cfg.name);
              }}
              onPointerOut={() => setHoveredRoomName(null)}
            >
              {/* Interactive Floor Target */}
              <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={cfg.size as [number, number]} />
                <meshBasicMaterial
                  color={isSelected ? '#2E6B45' : '#4A90E2'}
                  transparent
                  opacity={isSelected ? 0.35 : isHovered ? 0.2 : 0}
                />
              </mesh>

              {/* Lab Furniture & Specialized Equipment */}
              {cfg.type === 'coding' && (
                <group>
                  {[-1.5, 1.5].map((wz, rIdx) => (
                    <group key={rIdx} position={[0, 0, wz]}>
                      <mesh position={[0, 0.35, 0]} castShadow>
                        <boxGeometry args={[4.8, 0.08, 0.8]} />
                        <meshStandardMaterial color="#E8DDCB" />
                      </mesh>
                      {[-1.5, 0, 1.5].map((px, pIdx) => (
                        <mesh key={pIdx} position={[px, 0.65, 0]} castShadow>
                          <boxGeometry args={[0.65, 0.45, 0.04]} />
                          <meshStandardMaterial color="#0F172A" />
                        </mesh>
                      ))}
                    </group>
                  ))}
                  {/* Overhead Projector Screen */}
                  <mesh position={[0, 1.5, -3.2]}>
                    <boxGeometry args={[3.2, 1.2, 0.04]} />
                    <meshStandardMaterial color="#FFF" />
                  </mesh>
                </group>
              )}

              {cfg.type === 'gpu' && (
                <group>
                  <mesh position={[0, 0.35, 0]} castShadow>
                    <boxGeometry args={[4.5, 0.08, 1.2]} />
                    <meshStandardMaterial color="#332820" />
                  </mesh>
                  {[-1.4, 1.4].map((gx, gIdx) => (
                    <group key={gIdx} position={[gx, 0.8, 0]}>
                      <mesh position={[0, 0, 0]}>
                        <boxGeometry args={[0.9, 0.5, 0.04]} />
                        <meshStandardMaterial color="#1E3E59" />
                      </mesh>
                      {/* GPU Tower with Neon Accent */}
                      <mesh position={[0.5, -0.4, 0.2]} castShadow>
                        <boxGeometry args={[0.3, 0.7, 0.6]} />
                        <meshStandardMaterial color="#2E6B45" />
                      </mesh>
                    </group>
                  ))}
                </group>
              )}

              {cfg.type === 'cluster' && (
                <group>
                  <mesh position={[0, 0.35, 0]} castShadow>
                    <boxGeometry args={[4.2, 0.08, 1.0]} />
                    <meshStandardMaterial color="#E8DDCB" />
                  </mesh>
                  {/* Big Analytics Wall Screen */}
                  <mesh position={[0, 1.2, -3.0]}>
                    <boxGeometry args={[3.8, 1.5, 0.05]} />
                    <meshStandardMaterial color="#1B3347" roughness={0.1} />
                  </mesh>
                </group>
              )}

              {cfg.type === 'circuits' && (
                <group>
                  {/* Electronics Workbench with Oscilloscopes */}
                  <mesh position={[0, 0.4, 0]} castShadow>
                    <boxGeometry args={[4.8, 0.8, 1.2]} />
                    <meshStandardMaterial color="#CBD5E1" />
                  </mesh>
                  {[-1.6, 0, 1.6].map((ox, oIdx) => (
                    <mesh key={oIdx} position={[ox, 0.95, 0]} castShadow>
                      <boxGeometry args={[0.8, 0.4, 0.5]} />
                      <meshStandardMaterial color="#334155" metalness={0.8} />
                    </mesh>
                  ))}
                </group>
              )}

              {cfg.type === 'hardware' && (
                <group>
                  {/* Embedded System Testbench with Dev Kits */}
                  <mesh position={[0, 0.4, 0]} castShadow>
                    <boxGeometry args={[4.5, 0.8, 1.2]} />
                    <meshStandardMaterial color="#E8DDCB" />
                  </mesh>
                  <mesh position={[0, 1.0, 0]} castShadow>
                    <cylinderGeometry args={[0.1, 0.2, 0.6, 8]} />
                    <meshStandardMaterial color="#D89A35" />
                  </mesh>
                </group>
              )}

              {cfg.type === '3dprint' && (
                <group>
                  {/* 3D Printer Prototype Enclosure */}
                  <mesh position={[0, 0.8, 0]} castShadow>
                    <boxGeometry args={[1.5, 1.4, 1.5]} />
                    <meshStandardMaterial color="#C19A6B" roughness={0.5} />
                  </mesh>
                  <mesh position={[0, 0.8, 0]}>
                    <boxGeometry args={[1.2, 1.1, 1.2]} />
                    <meshStandardMaterial color="#FAF5EB" />
                  </mesh>
                </group>
              )}

              {cfg.type === 'store' && (
                <group>
                  {/* Storage Racks */}
                  {[-1.2, 1.2].map((rx, rIdx) => (
                    <mesh key={rIdx} position={[rx, 1.0, 0]} castShadow>
                      <boxGeometry args={[0.8, 2.0, 4.0]} />
                      <meshStandardMaterial color="#64748B" metalness={0.7} />
                    </mesh>
                  ))}
                </group>
              )}

              {cfg.type === 'office' && (
                <group>
                  {/* Instructor Desk & Chair */}
                  <mesh position={[0, 0.45, 0]} castShadow>
                    <boxGeometry args={[2.5, 0.9, 1.2]} />
                    <meshStandardMaterial color="#78350F" />
                  </mesh>
                  <mesh position={[0, 0.5, 1.2]} castShadow>
                    <boxGeometry args={[0.6, 0.8, 0.6]} />
                    <meshStandardMaterial color="#2E6B45" />
                  </mesh>
                </group>
              )}

              {/* Room HTML Label */}
              {showLabels && (
                <Html position={[0, 1.8, 0]} center distanceFactor={32} portal={portalRef} zIndexRange={[10, 0]}>
                  <div
                    className={`px-2 py-0.8 rounded text-[10px] font-bold shadow-md cursor-pointer whitespace-nowrap transition-all ${
                      isSelected
                        ? 'bg-[#2E6B45] text-white ring-2 ring-white scale-110'
                        : 'bg-white/95 text-[#292D29] border border-[#E8DDCB]'
                    }`}
                  >
                    {cfg.name}
                  </div>
                </Html>
              )}
            </group>
          );
        })}
      </group>
    );
  }

  // --------------------------------------------------------------------------
  // SECOND FLOOR (Floor 2) — CLASSROOMS & SEMINAR ROOMS (8 SEPARATE ROOMS)
  // --------------------------------------------------------------------------
  if (buildingCode === 'ACAD-A' && floorNumber === 2) {
    const cls1 = findRoom('SOE-CLS-201') || findRoom('Classroom 201') || rooms[0];
    const cls2 = findRoom('SOE-CLS-202') || findRoom('Classroom 202') || rooms[1];
    const cls3 = findRoom('SOE-CLS-203') || findRoom('Classroom 203') || rooms[2];
    const cls4 = findRoom('SOE-CLS-204') || findRoom('Classroom 204') || rooms[3];
    const smartCls = findRoom('SOE-CLS-SMART') || findRoom('Smart Classroom') || rooms[4];
    const seminar = findRoom('SOE-CLS-SEM') || findRoom('Seminar Room') || rooms[5];
    const faculty = findRoom('SOE-CLS-FAC') || findRoom('Faculty Room') || rooms[6];
    const collab = findRoom('SOE-CLS-DISC') || findRoom('Collaboration') || rooms[7];

    const clsConfigs = [
      // North Wing (z = -4.8)
      { room: cls1, name: 'Classroom 201', pos: [-9.5, 0.2, -4.8], size: [6.2, 7.2], type: 'tiered' },
      { room: cls2, name: 'Classroom 202', pos: [-3.2, 0.2, -4.8], size: [5.8, 7.2], type: 'desks' },
      { room: cls3, name: 'Classroom 203', pos: [3.2, 0.2, -4.8], size: [5.8, 7.2], type: 'desks' },
      { room: cls4, name: 'Classroom 204', pos: [9.5, 0.2, -4.8], size: [6.2, 7.2], type: 'desks' },
      // South Wing (z = 4.8)
      { room: smartCls, name: 'Smart Classroom', pos: [-9.5, 0.2, 4.8], size: [6.2, 7.2], type: 'smart' },
      { room: seminar, name: 'Seminar Room', pos: [-3.2, 0.2, 4.8], size: [5.8, 7.2], type: 'seminar' },
      { room: faculty, name: 'Faculty Room', pos: [3.2, 0.2, 4.8], size: [5.8, 7.2], type: 'faculty' },
      { room: collab, name: 'Student Collaboration Area', pos: [9.5, 0.2, 4.8], size: [6.2, 7.2], type: 'collab' },
    ];

    return (
      <group position={[0, 0, 0]}>
        {/* Floor Base Slab */}
        <mesh position={[0, 0.1, 0]} receiveShadow>
          <boxGeometry args={[28, 0.2, 18]} />
          <meshStandardMaterial color="#E8DDCB" roughness={0.5} />
        </mesh>
        {/* Central Hallway Corridor */}
        <mesh position={[0, 0.21, 0]} receiveShadow>
          <boxGeometry args={[27.5, 0.04, 2.4]} />
          <meshStandardMaterial color="#D4C8B5" roughness={0.3} />
        </mesh>

        {/* Perimeter and Corridor Walls */}
        <mesh position={[0, 0.9, -8.7]} castShadow>
          <boxGeometry args={[28, 1.6, 0.25]} />
          <meshStandardMaterial color="#F4ECDC" />
        </mesh>
        <mesh position={[0, 0.9, 8.7]} castShadow>
          <boxGeometry args={[28, 1.6, 0.25]} />
          <meshStandardMaterial color="#F4ECDC" />
        </mesh>
        <mesh position={[0, 0.9, -1.2]} castShadow>
          <boxGeometry args={[28, 1.6, 0.2]} />
          <meshStandardMaterial color="#EDE3D2" />
        </mesh>
        <mesh position={[0, 0.9, 1.2]} castShadow>
          <boxGeometry args={[28, 1.6, 0.2]} />
          <meshStandardMaterial color="#EDE3D2" />
        </mesh>
        {[-6.4, 0, 6.4].map((wx, idx) => (
          <React.Fragment key={idx}>
            <mesh position={[wx, 0.9, -4.8]} castShadow>
              <boxGeometry args={[0.2, 1.6, 7.2]} />
              <meshStandardMaterial color="#EDE3D2" />
            </mesh>
            <mesh position={[wx, 0.9, 4.8]} castShadow>
              <boxGeometry args={[0.2, 1.6, 7.2]} />
              <meshStandardMaterial color="#EDE3D2" />
            </mesh>
          </React.Fragment>
        ))}

        {/* 8 Classroom & Seminar Spaces */}
        {clsConfigs.map((cfg, idx) => {
          const isSelected = selectedRoomId === cfg.room?.id;
          const isHovered = hoveredRoomName === cfg.name;

          return (
            <group
              key={idx}
              position={cfg.pos as [number, number, number]}
              onClick={(e) => {
                e.stopPropagation();
                if (cfg.room) onSelectRoom(cfg.room);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredRoomName(cfg.name);
              }}
              onPointerOut={() => setHoveredRoomName(null)}
            >
              {/* Interactive Floor Target */}
              <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={cfg.size as [number, number]} />
                <meshBasicMaterial
                  color={isSelected ? '#2E6B45' : '#4A90E2'}
                  transparent
                  opacity={isSelected ? 0.35 : isHovered ? 0.2 : 0}
                />
              </mesh>

              {/* Specific Furniture per Room Type */}
              {cfg.type === 'tiered' && (
                <group>
                  {/* Amphitheatre Tiered Seating Rows */}
                  {[-1.2, 0.6, 2.2].map((ty, tIdx) => (
                    <mesh key={tIdx} position={[0, (tIdx + 1) * 0.18, ty]} castShadow>
                      <boxGeometry args={[4.5, 0.2, 0.7]} />
                      <meshStandardMaterial color="#C19A6B" />
                    </mesh>
                  ))}
                  <mesh position={[0, 0.5, -3.0]} castShadow>
                    <boxGeometry args={[1.2, 0.9, 0.6]} />
                    <meshStandardMaterial color="#6B3A1E" />
                  </mesh>
                  <mesh position={[0, 1.4, -3.4]}>
                    <boxGeometry args={[4.0, 1.0, 0.04]} />
                    <meshStandardMaterial color="#FFF" />
                  </mesh>
                </group>
              )}

              {cfg.type === 'desks' && (
                <group>
                  {/* Classroom Desks and Chairs */}
                  {[-1.5, 0.5, 2.2].map((dz, rIdx) => (
                    <mesh key={rIdx} position={[0, 0.38, dz]} castShadow>
                      <boxGeometry args={[4.5, 0.08, 0.8]} />
                      <meshStandardMaterial color="#E8DDCB" />
                    </mesh>
                  ))}
                  <mesh position={[0, 1.3, -3.2]}>
                    <boxGeometry args={[3.8, 1.0, 0.04]} />
                    <meshStandardMaterial color="#1B382B" />
                  </mesh>
                </group>
              )}

              {cfg.type === 'smart' && (
                <group>
                  {/* 86-inch Interactive Display Screen */}
                  <mesh position={[0, 1.2, -3.2]}>
                    <boxGeometry args={[3.8, 1.6, 0.08]} />
                    <meshStandardMaterial color="#0F172A" roughness={0.1} metalness={0.8} />
                  </mesh>
                  {/* Collaboration Table Pods */}
                  {[-1.5, 1.5].map((cx, cIdx) => (
                    <mesh key={cIdx} position={[cx, 0.38, 0.5]} castShadow>
                      <cylinderGeometry args={[1.0, 1.0, 0.08, 16]} />
                      <meshStandardMaterial color="#2E6B45" />
                    </mesh>
                  ))}
                </group>
              )}

              {cfg.type === 'seminar' && (
                <group>
                  {/* Executive Conference U-Shaped Table */}
                  <mesh position={[0, 0.42, 0]} castShadow>
                    <boxGeometry args={[4.5, 0.8, 2.5]} />
                    <meshStandardMaterial color="#6B3A1E" roughness={0.4} />
                  </mesh>
                  <mesh position={[0, 1.3, -3.2]}>
                    <boxGeometry args={[4.0, 1.2, 0.04]} />
                    <meshStandardMaterial color="#0F172A" />
                  </mesh>
                </group>
              )}

              {cfg.type === 'faculty' && (
                <group>
                  {/* Faculty Partitioned Cubicles */}
                  {[-1.5, 1.5].map((fx, fIdx) => (
                    <group key={fIdx} position={[fx, 0, 0]}>
                      <mesh position={[0, 0.45, 0]} castShadow>
                        <boxGeometry args={[2.0, 0.9, 1.2]} />
                        <meshStandardMaterial color="#C19A6B" />
                      </mesh>
                      <mesh position={[0, 0.9, -0.6]}>
                        <boxGeometry args={[2.0, 0.8, 0.08]} />
                        <meshStandardMaterial color="#D8C8B4" />
                      </mesh>
                    </group>
                  ))}
                </group>
              )}

              {cfg.type === 'collab' && (
                <group>
                  {/* Round Breakout Tables & Stools */}
                  {[-1.4, 1.4].map((px, pIdx) => (
                    <group key={pIdx} position={[px, 0, 0]}>
                      <mesh position={[0, 0.4, 0]} castShadow>
                        <cylinderGeometry args={[1.1, 1.1, 0.08, 16]} />
                        <meshStandardMaterial color="#E8DDCB" />
                      </mesh>
                      {[-0.8, 0.8].map((sx, sIdx) => (
                        <mesh key={sIdx} position={[sx, 0.25, 0]} castShadow>
                          <cylinderGeometry args={[0.3, 0.3, 0.5, 12]} />
                          <meshStandardMaterial color={['#D89A35', '#2E6B45'][sIdx % 2]} />
                        </mesh>
                      ))}
                    </group>
                  ))}
                  {/* Mobile Dry-Erase Whiteboards */}
                  <mesh position={[0, 1.0, 2.8]}>
                    <boxGeometry args={[2.4, 1.4, 0.1]} />
                    <meshStandardMaterial color="#FFF" />
                  </mesh>
                </group>
              )}

              {/* Room HTML Label */}
              {showLabels && (
                <Html position={[0, 1.8, 0]} center distanceFactor={32} portal={portalRef} zIndexRange={[10, 0]}>
                  <div
                    className={`px-2 py-0.8 rounded text-[10px] font-bold shadow-md cursor-pointer whitespace-nowrap transition-all ${
                      isSelected
                        ? 'bg-[#2E6B45] text-white ring-2 ring-white scale-110'
                        : 'bg-white/95 text-[#292D29] border border-[#E8DDCB]'
                    }`}
                  >
                    {cfg.name}
                  </div>
                </Html>
              )}
            </group>
          );
        })}
      </group>
    );
  }

  // --------------------------------------------------------------------------
  // GENERIC DYNAMIC FLOOR FALLBACK (FOR OTHER BUILDINGS / ROOMS)
  // --------------------------------------------------------------------------
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[26, 0.2, 18]} />
        <meshStandardMaterial color="#E8DEC8" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.21, 0]} receiveShadow>
        <boxGeometry args={[25.5, 0.05, 3.2]} />
        <meshStandardMaterial color="#D9CEB8" roughness={0.3} />
      </mesh>
      {/* Outer Walls */}
      <mesh position={[0, 0.8, -8.9]} castShadow>
        <boxGeometry args={[26, 1.4, 0.3]} />
        <meshStandardMaterial color="#F4ECDC" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.8, 8.9]} castShadow>
        <boxGeometry args={[26, 1.4, 0.3]} />
        <meshStandardMaterial color="#F4ECDC" roughness={0.8} />
      </mesh>

      {/* Render Dynamic Rooms */}
      {rooms.map((room, idx) => {
        const isSelected = selectedRoomId === room.id;
        const isHovered = hoveredRoomName === room.name;
        // Position up to 4 rooms neatly in 4 quadrants
        const rx = idx % 2 === 0 ? -7.5 : 7.5;
        const rz = idx < 2 ? -4.5 : 4.5;

        return (
          <group
            key={room.id}
            position={[rx, 0.2, rz]}
            onClick={(e) => {
              e.stopPropagation();
              onSelectRoom(room);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredRoomName(room.name);
            }}
            onPointerOut={() => setHoveredRoomName(null)}
          >
            <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[11, 7.5]} />
              <meshBasicMaterial
                color={isSelected ? '#2E6B45' : '#4A90E2'}
                transparent
                opacity={isSelected ? 0.35 : isHovered ? 0.2 : 0}
              />
            </mesh>
            <mesh position={[0, 0.38, 0]} castShadow>
              <boxGeometry args={[6.5, 0.75, 1.8]} />
              <meshStandardMaterial color="#C19A6B" roughness={0.6} />
            </mesh>
            {showLabels && (
              <Html position={[0, 1.8, 0]} center distanceFactor={28} portal={portalRef} zIndexRange={[10, 0]}>
                <div
                  className={`px-2 py-0.8 rounded text-[11px] font-bold shadow-md cursor-pointer whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-[#2E6B45] text-white ring-2 ring-white scale-110'
                      : 'bg-white/95 text-[#292D29] border border-[#E8DDCB]'
                  }`}
                >
                  {room.name}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}

// ============================================================================
// 4. VERTICAL EXPLODED BUILDING VIEW (Separates Floors Vertically)
// ============================================================================

interface ExplodedBuildingProps {
  buildingCode?: string;
  totalFloors?: number;
  selectedFloor: number;
  showLabels: boolean;
  portalRef?: any;
  onSelectFloor: (fl: number) => void;
}

function ExplodedBuilding3D({
  buildingCode = 'ACAD-A',
  totalFloors = 3,
  selectedFloor,
  showLabels,
  portalRef,
  onSelectFloor,
}: ExplodedBuildingProps) {
  const floors = useMemo(() => {
    if (buildingCode === 'ACAD-A') {
      return [
        { num: 0, label: 'Ground Floor — Central Library', y: 0.0 },
        { num: 1, label: 'First Floor — Laboratories', y: 6.5 },
        { num: 2, label: 'Second Floor — Classrooms', y: 13.0 },
      ];
    }
    const list = [];
    const count = totalFloors || 3;
    for (let i = 1; i <= count; i++) {
      list.push({ num: i, label: `Floor ${i}`, y: (i - 1) * 6.0 });
    }
    return list;
  }, [buildingCode, totalFloors]);

  return (
    <group position={[0, 0, 0]}>
      {floors.map((fl) => {
        const isSel = selectedFloor === fl.num;
        return (
          <group
            key={fl.num}
            position={[0, fl.y, 0]}
            onClick={(e) => {
              e.stopPropagation();
              onSelectFloor(fl.num);
            }}
          >
            <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
              <boxGeometry args={[22, 0.35, 15]} />
              <meshStandardMaterial color={isSel ? '#2E6B45' : '#E8DDCB'} roughness={0.6} />
            </mesh>

            <mesh position={[0, 0.8, -7.3]} castShadow>
              <boxGeometry args={[22, 1.2, 0.3]} />
              <meshStandardMaterial color="#F4ECDC" />
            </mesh>
            <mesh position={[0, 0.8, 7.3]} castShadow>
              <boxGeometry args={[22, 1.2, 0.3]} />
              <meshStandardMaterial color="#F4ECDC" />
            </mesh>
            <mesh position={[-10.8, 0.8, 0]} castShadow>
              <boxGeometry args={[0.3, 1.2, 15]} />
              <meshStandardMaterial color="#F4ECDC" />
            </mesh>
            <mesh position={[10.8, 0.8, 0]} castShadow>
              <boxGeometry args={[0.3, 1.2, 15]} />
              <meshStandardMaterial color="#F4ECDC" />
            </mesh>

            {showLabels && (
              <Html position={[-12.5, 0.8, 0]} center distanceFactor={40} portal={portalRef} zIndexRange={[10, 0]}>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer shadow-md whitespace-nowrap transition-all ${
                    isSel
                      ? 'bg-[#2E6B45] text-white ring-2 ring-white scale-110'
                      : 'bg-white text-[#292D29] border border-[#E8DDCB] hover:border-[#2E6B45]'
                  }`}
                >
                  {fl.label}
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {[-10.8, 10.8].map((gx) =>
        [-7.3, 7.3].map((gz) => (
          <mesh key={`${gx}-${gz}`} position={[gx, (floors.length * 6) / 2, gz]}>
            <cylinderGeometry args={[0.04, 0.04, floors.length * 6 + 2]} />
            <meshBasicMaterial color="#2E6B45" transparent opacity={0.4} />
          </mesh>
        ))
      )}
    </group>
  );
}

// ============================================================================
// 5. MAIN DIGITAL TWIN COMPONENT & DATA LAYER
// ============================================================================

interface PreviewModalData {
  url: string;
  title: string;
  category?: string;
  type?: string;
  location?: string;
  cameraCode?: string;
  status?: string;
  isCctv?: boolean;
  notes?: string;
}

// ============================================================================
// DEFAULT 5 CAMPUS BUILDINGS DATASET (Guarantees immediate visibility on mount)
// ============================================================================
export const DEFAULT_CAMPUS_BUILDINGS: Building[] = [
  {
    id: 1,
    code: 'ACAD-A',
    name: 'School of Engineering',
    floors: 3,
    pos_x: 0.0,
    pos_z: -2.0,
    status: 'normal',
    image_key: 'School Of Engineering (2).jpg',
    category: 'Academic',
    rooms: [
      // Ground Floor — Central Library (Floor 0)
      { id: 101, code: 'SOE-LIB-01', name: 'Central Library & Stack Area', floor: 0, capacity: 120, occupied: true, lights_on: true, ac_on: true, projector_on: false, current_load_kw: 4.5, image_key: 'library', facility_type: 'Library', description: 'Main campus library housing academic book-shelf rows, quiet reading tables, and core reference archives.', equipment: 'Book-shelf rows, study desks with reading lamps, reference catalogue terminals, acoustic baffles' },
      { id: 102, code: 'SOE-LIB-02', name: 'Librarian Desk & Circulation Counter', floor: 0, capacity: 15, occupied: true, lights_on: true, ac_on: true, projector_on: false, current_load_kw: 1.8, image_key: 'library', facility_type: 'Reception & Circulation', description: 'Entrance reception, book issue/return counter, student assistance desk, and catalogue search terminals.', equipment: 'Librarian service desk, RFID issue kiosk, barcode scanners, digital management computer' },
      { id: 103, code: 'SOE-LIB-03', name: 'Digital Learning & E-Resource Lab', floor: 0, capacity: 40, occupied: true, lights_on: true, ac_on: true, projector_on: true, current_load_kw: 6.2, image_key: 'Dennis M. Ritchie Common Computer Lab.jpg', facility_type: 'Digital Learning', description: 'Computer and digital-learning section providing high-speed access to online journals and research portals.', equipment: '25 Computer terminals, high-speed internet, digital catalogue screens, laser printer' },
      { id: 104, code: 'SOE-LIB-04', name: 'Reference & Book Storage Area', floor: 0, capacity: 25, occupied: false, lights_on: false, ac_on: true, projector_on: false, current_load_kw: 0.8, image_key: 'library', facility_type: 'Archive', description: 'High-density reference stacks, archival literature, research theses, and technical publications.', equipment: 'Compact mobile shelving rows, document preservation dehumidifier, microform reader' },
      { id: 105, code: 'SOE-LIB-05', name: 'Reading & Waiting Lounge', floor: 0, capacity: 30, occupied: true, lights_on: true, ac_on: false, projector_on: false, current_load_kw: 1.2, image_key: 'library', facility_type: 'Lounge', description: 'Informal reading seats, periodical stands, study lounge, and quiet collaboration spaces.', equipment: 'Comfortable lounge chairs, low coffee tables, magazine racks, natural daylight glazing' },
      // First Floor — 8 Engineering Labs (Floor 1)
      { id: 106, code: 'SOE-LAB-01', name: 'Computer Programming Lab', floor: 1, capacity: 40, occupied: true, lights_on: true, ac_on: true, projector_on: true, current_load_kw: 8.5, image_key: 'Dennis M. Ritchie Common Computer Lab.jpg', facility_type: 'Computer Laboratory', description: 'High-performance computing laboratory configured for algorithmic development, data structures, and code profiling.', equipment: '40x Core i7 Workstations, Dual 4K Monitors, Gigabit LAN, Gigabit Switch Rack' },
      { id: 107, code: 'SOE-LAB-02', name: 'AI and Machine Learning Lab', floor: 1, capacity: 35, occupied: true, lights_on: true, ac_on: true, projector_on: true, current_load_kw: 14.2, image_key: 'Dennis M. Ritchie Common Computer Lab.jpg', facility_type: 'AI Research Lab', description: 'Deep learning research facility equipped with dedicated tensor core GPU accelerator servers and vision testbeds.', equipment: '8x NVIDIA A100 Tensor Core GPU Servers, High-density rack cooling, Dual interactive presentation screens' },
      { id: 108, code: 'SOE-LAB-03', name: 'Data Science Lab', floor: 1, capacity: 40, occupied: true, lights_on: true, ac_on: true, projector_on: false, current_load_kw: 9.1, image_key: 'Dennis M. Ritchie Common Computer Lab.jpg', facility_type: 'Data Science Lab', description: 'Big data analytics laboratory supporting distributed databases, machine intelligence, and cloud telemetry.', equipment: '35x Dual-Xeon workstations, Spark cluster nodes, automated environment sensors' },
      { id: 109, code: 'SOE-LAB-04', name: 'Electronics Lab', floor: 1, capacity: 30, occupied: true, lights_on: true, ac_on: true, projector_on: false, current_load_kw: 7.4, image_key: 'B.R. Ambedkar Block.jpg', facility_type: 'Electronics Laboratory', description: 'Analogue and digital electronics test lab with digital storage oscilloscopes, signal generators, and bench supplies.', equipment: '15x Tektronix 100MHz Oscilloscopes, Function generators, regulated DC power supplies, solder rework stations' },
      { id: 110, code: 'SOE-LAB-05', name: 'Hardware and Embedded Systems Lab', floor: 1, capacity: 30, occupied: true, lights_on: true, ac_on: true, projector_on: true, current_load_kw: 6.8, image_key: 'B.R. Ambedkar Block.jpg', facility_type: 'Embedded Systems Lab', description: 'Microcontroller, FPGA development, and IoT hardware prototyping laboratory with automated testing equipment.', equipment: 'ARM Cortex dev boards, Xilinx FPGA kits, Logic analyzers, IoT sensor nodes, precision multimeters' },
      { id: 111, code: 'SOE-LAB-06', name: 'Project and Innovation Lab', floor: 1, capacity: 25, occupied: true, lights_on: true, ac_on: true, projector_on: false, current_load_kw: 5.0, image_key: 'B.R. Ambedkar Block.jpg', facility_type: 'Innovation Lab', description: 'Makerspace for senior student capstones, robotics fabrication, Rapid 3D prototyping, and IoT testing.', equipment: 'Industrial 3D printers, laser cutter enclosure, robotics test arena, modular fabrication workbenches' },
      { id: 112, code: 'SOE-LAB-07', name: 'Laboratory Store', floor: 1, capacity: 5, occupied: false, lights_on: false, ac_on: false, projector_on: false, current_load_kw: 0.1, image_key: 'B.R. Ambedkar Block.jpg', facility_type: 'Storage & Inventory', description: 'Secure technical component repository, electronic component reels, consumable test leads, and inventory tracking.', equipment: 'ESD-safe storage cabinets, barcode inventory terminal, lockable instrument lockers' },
      { id: 113, code: 'SOE-LAB-08', name: 'Faculty or Lab Instructor Room', floor: 1, capacity: 10, occupied: true, lights_on: true, ac_on: true, projector_on: false, current_load_kw: 1.8, image_key: 'tutorial-room', facility_type: 'Faculty Office', description: 'Laboratory superintendent and course instructor preparation office with student review workspace.', equipment: '4x Instructor desks, reference component library, high-speed documentation terminal' },
      // Second Floor — 8 Classrooms/Spaces (Floor 2)
      { id: 114, code: 'SOE-CLS-201', name: 'Classroom 201', floor: 2, capacity: 60, occupied: true, lights_on: true, ac_on: true, projector_on: true, current_load_kw: 4.8, image_key: 'classroom', facility_type: 'Classroom', description: 'Standard engineering lecture hall equipped with interactive laser projection and smart energy controls.', equipment: 'Laser projector, motorized projection screen, audio amplification system, student lecture desks' },
      { id: 115, code: 'SOE-CLS-202', name: 'Classroom 202', floor: 2, capacity: 60, occupied: true, lights_on: true, ac_on: true, projector_on: true, current_load_kw: 4.9, image_key: 'classroom', facility_type: 'Classroom', description: 'Engineering lecture hall with energy-saving occupancy sensors and motorized blackout blinds.', equipment: 'Ultra-short-throw projector, interactive whiteboard, ceiling speaker array, wireless presentation receiver' },
      { id: 116, code: 'SOE-CLS-203', name: 'Classroom 203', floor: 2, capacity: 60, occupied: true, lights_on: true, ac_on: true, projector_on: false, current_load_kw: 3.6, image_key: 'classroom', facility_type: 'Classroom', description: 'Lecture room optimized for technical math, theory of computation, and engineering analysis lectures.', equipment: 'Dual magnetic chalkboards, digital podium, automated environmental HVAC damper, student desks' },
      { id: 117, code: 'SOE-CLS-204', name: 'Classroom 204', floor: 2, capacity: 60, occupied: false, lights_on: false, ac_on: false, projector_on: false, current_load_kw: 0.1, image_key: 'classroom', facility_type: 'Classroom', description: 'Multi-utility lecture hall with movable lecture tables for reconfigurable classroom setups.', equipment: 'Modular student study desks, ceiling projector, glass whiteboard, natural daylight harvesting louvers' },
      { id: 118, code: 'SOE-CLS-SMART', name: 'Smart Classroom', floor: 2, capacity: 50, occupied: true, lights_on: true, ac_on: true, projector_on: true, current_load_kw: 5.5, image_key: 'classroom', facility_type: 'Smart Classroom', description: 'Next-generation smart learning suite featuring 4K interactive digital touchscreens and hybrid lecture streaming.', equipment: '86-inch 4K Interactive Touchscreen, dual auto-tracking PTZ cameras, beamforming mic array, hybrid lecture stream server' },
      { id: 119, code: 'SOE-CLS-SEM', name: 'Seminar Room', floor: 2, capacity: 80, occupied: true, lights_on: true, ac_on: true, projector_on: true, current_load_kw: 7.0, image_key: 'tutorial-room', facility_type: 'Seminar Room', description: 'Executive conference and seminar hall for departmental dissertations, guest keynotes, and colloquiums.', equipment: 'Dual 75-inch commercial displays, wireless delegate mics, video conferencing codec, executive leather seating' },
      { id: 120, code: 'SOE-CLS-FAC', name: 'Faculty Room', floor: 2, capacity: 20, occupied: true, lights_on: true, ac_on: true, projector_on: false, current_load_kw: 3.2, image_key: 'tutorial-room', facility_type: 'Faculty Room', description: 'Department faculty workstation suites, consultation cubicles, and faculty discussion lounge.', equipment: '20 Faculty workstations, high-speed network, laser printer, private meeting corner, secure storage lockers' },
      { id: 121, code: 'SOE-CLS-DISC', name: 'Student Discussion and Collaboration Area', floor: 2, capacity: 40, occupied: true, lights_on: true, ac_on: true, projector_on: false, current_load_kw: 2.8, image_key: 'Cafeteria.jpg', facility_type: 'Collaboration Space', description: 'Open-plan student collaborative commons with breakout pods, whiteboard partitions, and mobile device charging.', equipment: 'Modular breakout tables, dry-erase mobile partitions, charging kiosks, comfortable bench seating' },
    ],
  },
  {
    id: 2,
    code: 'CAFE',
    name: 'Campus Cafeteria',
    floors: 2,
    pos_x: -21.0,
    pos_z: 7.0,
    status: 'normal',
    image_key: 'Cafeteria.jpg',
    category: 'Food and Dining',
    rooms: [
      { id: 201, code: 'CAFE-01', name: 'Main Dining Area', floor: 1, capacity: 300, occupied: true, lights_on: true, ac_on: true, projector_on: false, current_load_kw: 22.3, image_key: 'Cafeteria.jpg', facility_type: 'Dining Hall', description: 'Central dining hall with food counters and social seating.' },
      { id: 202, code: 'CAFE-02', name: 'Kitchen & Preparation', floor: 1, capacity: 20, occupied: true, lights_on: true, ac_on: false, projector_on: false, current_load_kw: 35.8, image_key: 'Cafeteria.jpg', facility_type: 'Commercial Kitchen', description: 'Commercial kitchen and dishwashing facility.' },
      { id: 203, code: 'CAFE-03', name: 'Mezzanine Dining Lounge', floor: 2, capacity: 60, occupied: true, lights_on: true, ac_on: true, projector_on: false, current_load_kw: 4.5, image_key: 'Cafeteria.jpg', facility_type: 'Dining Lounge', description: 'Second-level dining area overlooking main pavilion.' },
    ],
  },
  {
    id: 3,
    code: 'HEALTH',
    name: 'School of Health Sciences',
    floors: 4,
    pos_x: -21.0,
    pos_z: -17.0,
    status: 'normal',
    image_key: 'School Of Health Sciences.jpg',
    category: 'Academic',
    rooms: [
      { id: 301, code: 'HEALTH-101', name: 'Clinical Ward H101', floor: 1, capacity: 40, occupied: true, lights_on: true, ac_on: true, projector_on: false, current_load_kw: 4.5, image_key: 'School Of Health Sciences.jpg', facility_type: 'Clinical Training', description: 'Simulated nursing and clinical training ward.' },
      { id: 302, code: 'HEALTH-201', name: 'Health Sciences Lecture Hall', floor: 2, capacity: 100, occupied: true, lights_on: true, ac_on: true, projector_on: true, current_load_kw: 8.0, image_key: 'School Of Health Sciences.jpg', facility_type: 'Lecture Hall', description: 'Large amphitheatre lecture hall for medical sciences.' },
      { id: 303, code: 'HEALTH-301', name: 'Physiology Laboratory', floor: 3, capacity: 30, occupied: false, lights_on: false, ac_on: false, projector_on: false, current_load_kw: 0.2, image_key: 'School Of Health Sciences.jpg', facility_type: 'Medical Laboratory', description: 'Research laboratory for human physiology and pathology.' },
    ],
  },
  {
    id: 4,
    code: 'CDSIMER',
    name: 'CDSIMER Hospital',
    floors: 5,
    pos_x: 21.0,
    pos_z: -17.0,
    status: 'warning',
    image_key: 'CDSIMER Entrance.jpg',
    category: 'Healthcare',
    rooms: [
      { id: 401, code: 'CDSIMER-101', name: 'Hospital Main Reception', floor: 1, capacity: 30, occupied: true, lights_on: true, ac_on: true, projector_on: false, current_load_kw: 6.5, image_key: 'CDSIMER Entrance.jpg', facility_type: 'Hospital Reception', description: 'Patient registration, triage counter, and reception lobby.' },
      { id: 402, code: 'CDSIMER-102', name: 'Outpatient Clinic OPD', floor: 1, capacity: 50, occupied: true, lights_on: true, ac_on: true, projector_on: false, current_load_kw: 8.2, image_key: 'CDSIMER Entrance.jpg', facility_type: 'Outpatient Clinic', description: 'Multi-specialty outpatient consulting suites.' },
      { id: 403, code: 'CDSIMER-201', name: 'Radiology & Imaging Suite', floor: 2, capacity: 20, occupied: true, lights_on: true, ac_on: true, projector_on: true, current_load_kw: 18.5, image_key: 'CDSIMER Entrance.jpg', facility_type: 'Radiology Suite', description: 'Advanced diagnostic MRI and CT scanning suite.' },
    ],
  },
  {
    id: 5,
    code: 'HOSP-ER',
    name: 'Hospital Emergency Block',
    floors: 3,
    pos_x: 21.0,
    pos_z: 7.0,
    status: 'normal',
    image_key: 'Hospital Emergency Block.jpg',
    category: 'Healthcare',
    rooms: [
      { id: 501, code: 'HOSP-ER-101', name: 'Emergency Trauma Bay', floor: 1, capacity: 25, occupied: true, lights_on: true, ac_on: true, projector_on: false, current_load_kw: 16.2, image_key: 'Hospital Emergency Block.jpg', facility_type: 'Trauma Bay', description: '24/7 acute trauma resuscitation and triage bay.' },
      { id: 502, code: 'HOSP-ER-102', name: 'Intensive Care Unit (ICU)', floor: 1, capacity: 15, occupied: true, lights_on: true, ac_on: true, projector_on: false, current_load_kw: 22.0, image_key: 'Hospital Emergency Block.jpg', facility_type: 'ICU Wing', description: 'High-dependency intensive care monitoring unit.' },
      { id: 503, code: 'HOSP-ER-201', name: 'Critical Care Observation', floor: 2, capacity: 20, occupied: true, lights_on: true, ac_on: true, projector_on: false, current_load_kw: 12.5, image_key: 'Hospital Emergency Block.jpg', facility_type: 'Critical Care', description: 'Post-intervention observation and telemetry beds.' },
    ],
  },
];

interface DigitalTwinProps {
  initialSearch?: string;
}

export default function DigitalTwin({ initialSearch = '' }: DigitalTwinProps) {
  const [buildings, setBuildings] = useState<Building[]>(DEFAULT_CAMPUS_BUILDINGS);
  const [waterAlerts, setWaterAlerts] = useState<WaterAlert[]>([]);
  const [wasteIncidents, setWasteIncidents] = useState<WasteIncident[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(false);

  // Selection & UI Modes
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(DEFAULT_CAMPUS_BUILDINGS[0]);
  const [activeTab, setActiveTab] = useState<'overview' | 'floors' | 'energy' | 'water' | 'cctv' | 'details'>('floors');
  const [selectedFloor, setSelectedFloor] = useState<number>(0);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [floorMode, setFloorMode] = useState<'floor' | 'exploded' | 'campus'>('campus');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [hoveredBuildingId, setHoveredBuildingId] = useState<number | null>(null);

  // Lightbox Modal for High-Res Image Exploration or CCTV Live Feed Preview
  const [previewImage, setPreviewImage] = useState<PreviewModalData | null>(null);

  // Camera Orbit Controls Ref & Canvas Portal Container Ref
  const controlsRef = useRef<any>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Fetch all live campus data
  const loadAllData = async () => {
    try {
      try {
        const blds = await fetchBuildings();
        if (blds && Array.isArray(blds) && blds.length > 0) {
          setBuildings(blds);
          const currentId = selectedBuilding?.id;
          const match = blds.find(b => b.id === currentId) || blds.find(b => b.code === 'ACAD-A') || blds[0];
          if (match) setSelectedBuilding(match);
        }
      } catch (err) {
        console.warn('API buildings fetch skipped, using default campus dataset:', err);
      }

      try {
        const alerts = await fetchWaterAlerts();
        setWaterAlerts(alerts);
      } catch {}

      try {
        const waste = await fetchWasteIncidents();
        setWasteIncidents(waste);
      } catch {}

      try {
        const cams = await fetchCameras();
        setCameras(cams);
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle global search filter
  useEffect(() => {
    if (initialSearch.trim() && buildings.length > 0) {
      const q = initialSearch.toLowerCase();
      const matchBld = buildings.find((b) => b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q));
      if (matchBld) {
        setSelectedBuilding(matchBld);
      }
    }
  }, [initialSearch, buildings]);

  // Filtered buildings for campus map
  const filteredBuildings = useMemo(() => {
    if (statusFilter === 'all') return buildings;
    return buildings.filter((b) => b.status === statusFilter);
  }, [buildings, statusFilter]);

  // Handle room live telemetry toggles (persists to backend SQLite)
  const handleToggleRoomHardware = async (
    roomId: number,
    field: 'occupied' | 'lights_on' | 'ac_on' | 'projector_on',
    currentVal: boolean
  ) => {
    try {
      const updated = await updateRoom(roomId, { [field]: !currentVal });
      setSelectedRoom(updated);
      if (selectedBuilding) {
        setSelectedBuilding({
          ...selectedBuilding,
          rooms: selectedBuilding.rooms.map((r) => (r.id === roomId ? updated : r)),
        });
      }
    } catch (err: any) {
      alert(`Could not toggle room parameter: ${err.message}`);
    }
  };

  // Reset Camera View to comfortably frame all 5 buildings
  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 2, -4);
      controlsRef.current.object.position.set(0, 46, 52);
      controlsRef.current.update();
    }
  };

  // Zoom In / Zoom Out
  const handleZoom = (delta: number) => {
    if (controlsRef.current) {
      controlsRef.current.dollyIn(delta > 0 ? 1.2 : 0.8);
      controlsRef.current.update();
    }
  };

  // Live CCTV camera feed cards for bottom bar (matching campus facilities & actual photos)
  const liveCctvFeeds = [
    {
      id: 'cctv-1',
      code: 'CAM-SOE',
      name: 'School of Engineering',
      location: 'Engineering Quadrangle',
      image: '/assets/campus/School Of Engineering (2).jpg',
      status: 'Demo Preview',
    },
    {
      id: 'cctv-2',
      code: 'CAM-CAFE',
      name: 'Campus Cafeteria',
      location: 'Dining Pavilion',
      image: '/assets/campus/Cafeteria.jpg',
      status: 'Demo Preview',
    },
    {
      id: 'cctv-3',
      code: 'CAM-HEALTH',
      name: 'School of Health Sciences',
      location: 'Health Sciences Block',
      image: '/assets/campus/School Of Health Sciences.jpg',
      status: 'Demo Preview',
    },
    {
      id: 'cctv-4',
      code: 'CAM-CDSIMER',
      name: 'CDSIMER Hospital',
      location: 'Hospital Main Entrance',
      image: '/assets/campus/CDSIMER Entrance.jpg',
      status: 'Demo Preview',
    },
    {
      id: 'cctv-5',
      code: 'CAM-ER',
      name: 'Hospital Emergency Block',
      location: 'Emergency & Trauma Care',
      image: '/assets/campus/Hospital Emergency Block.jpg',
      status: 'Demo Preview',
    },
  ];

  // Current floor's rooms for the selected building
  const currentFloorRooms = useMemo(() => {
    if (!selectedBuilding || !selectedBuilding.rooms) return [];
    return selectedBuilding.rooms.filter((r) => r.floor === selectedFloor);
  }, [selectedBuilding, selectedFloor]);

  // Available floors for selected building (School of Engineering has 3: Ground=0, 1st=1, 2nd=2)
  const availableFloors = useMemo(() => {
    if (!selectedBuilding) return [];
    if (selectedBuilding.code === 'ACAD-A') {
      return [
        { num: 0, label: 'Ground Floor — Central Library' },
        { num: 1, label: 'First Floor — Laboratories' },
        { num: 2, label: 'Second Floor — Classrooms' },
      ];
    }
    const count = selectedBuilding.floors || 1;
    const list = [];
    for (let i = 1; i <= count; i++) {
      list.push({ num: i, label: `Floor ${i}` });
    }
    return list;
  }, [selectedBuilding]);

  const getFloorLabel = (floorNum: number, bldCode?: string) => {
    if (bldCode === 'ACAD-A') {
      if (floorNum === 0) return 'Ground Floor — Central Library';
      if (floorNum === 1) return 'First Floor — Laboratories';
      if (floorNum === 2) return 'Second Floor — Classrooms';
    }
    if (floorNum === 0) return 'Ground Floor';
    return `Floor ${floorNum}`;
  };

  // Ensure selectedFloor stays within valid floors when building changes
  useEffect(() => {
    if (selectedBuilding) {
      if (selectedBuilding.code === 'ACAD-A') {
        if (![0, 1, 2].includes(selectedFloor)) {
          setSelectedFloor(0);
        }
      } else {
        const maxFloor = selectedBuilding.floors || 1;
        if (selectedFloor === 0 || selectedFloor > maxFloor) {
          setSelectedFloor(1);
        }
      }
    }
  }, [selectedBuilding]);

  // CRITICAL FIX: Restrict labels strictly to the 3D scene and NEVER show them when any modal/CCTV feed is open
  const showCampusBuildingLabels = !previewImage && floorMode === 'campus';
  const showRoomLabels = !previewImage && floorMode === 'floor' && !selectedRoom;
  const showFloorLabels = !previewImage && floorMode === 'exploded';

  return (
    <div className="flex flex-col min-h-full bg-[#F5F0E7] select-none p-4 lg:p-6 gap-5">
      {/* ------------------------------------------------------------- */}
      {/* 1. 3D DIGITAL TWIN & BUILDING DETAILS WORKSPACE               */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col lg:flex-row gap-4 h-[560px] xl:h-[620px] 2xl:h-[680px] w-full min-h-[480px]">
        {/* Left: 3D Viewport with Internal Controls */}
        <div
          ref={canvasContainerRef}
          className="flex-1 relative rounded-2xl overflow-hidden border border-[#E8DDCB] shadow-xs w-full h-full min-w-0"
          style={{ isolation: 'isolate', zIndex: 0 }}
        >
          {/* Status Filters Pill Row (contained inside canvas) */}
          <div className="absolute top-3 left-3 z-10 pointer-events-auto">
            <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-full border border-[#E8DDCB] shadow-sm overflow-x-auto max-w-[calc(100%-80px)] sm:max-w-none">
              {[
                { id: 'all', label: 'All Buildings', color: '#2E6B45' },
                { id: 'normal', label: 'Normal', color: '#2E6B45' },
                { id: 'warning', label: 'Warning', color: '#D89A35' },
                { id: 'critical', label: 'Critical', color: '#C94A42' },
                { id: 'idle', label: 'Idle', color: '#6D716A' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    statusFilter === st.id
                      ? 'bg-[#2E6B45] text-white shadow-xs'
                      : 'text-[#6D716A] hover:text-[#292D29] hover:bg-[#FAF8F5]'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: statusFilter === st.id ? '#FFF' : st.color }}
                  />
                  <span>{st.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Compass & Navigation Tools (top-right of canvas; cannot overlap building details panel!) */}
          <div className="absolute top-3 right-3 z-10 pointer-events-auto flex flex-col gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-[#E8DDCB] shadow-sm">
            <button
              onClick={handleResetCamera}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#292D29] hover:bg-[#F5F0E7] font-bold text-xs"
              title="Reset North Orientation"
            >
              N
            </button>
            <button
              onClick={() => handleZoom(1)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#292D29] hover:bg-[#F5F0E7]"
              title="Zoom In"
            >
              <Plus size={15} />
            </button>
            <button
              onClick={() => handleZoom(-1)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#292D29] hover:bg-[#F5F0E7]"
              title="Zoom Out"
            >
              <Minus size={15} />
            </button>
            <button
              onClick={handleResetCamera}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#292D29] hover:bg-[#F5F0E7]"
              title="Reset Orbit Camera"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={() => setFloorMode(floorMode === 'exploded' ? 'campus' : 'exploded')}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                floorMode === 'exploded' ? 'bg-[#2E6B45] text-white' : 'text-[#292D29] hover:bg-[#F5F0E7]'
              }`}
              title="Exploded Vertical Floor View"
            >
              <Layers size={14} />
            </button>
          </div>

          {/* Re-open Details Panel Button when closed */}
          {!selectedBuilding && buildings.length > 0 && (
            <button
              onClick={() => {
                const soe = buildings.find((b) => b.code === 'ACAD-A' || b.name.includes('Engineering')) || buildings[0];
                setSelectedBuilding(soe);
              }}
              className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-md border border-[#E8DDCB] px-3.5 py-1.5 rounded-xl font-bold text-xs text-[#2E6B45] shadow-sm flex items-center gap-1.5 hover:bg-[#FAF8F5] pointer-events-auto transition-colors"
            >
              <BldIcon size={14} />
              <span>Inspect Building Details</span>
            </button>
          )}

          {/* 3D Canvas */}
          <Canvas
            shadows
            camera={{ position: [0, 46, 52], fov: 46 }}
            style={{ width: '100%', height: '100%', background: 'linear-gradient(to bottom, #D4E4EA 0%, #E8F0F8 100%)' }}
          >
            {/* Natural Daytime Sunlight & Sky Ambient */}
            <ambientLight intensity={0.9} color="#FFF8EE" />
            <directionalLight
              position={[35, 50, 25]}
              intensity={1.5}
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
              shadow-camera-near={1}
              shadow-camera-far={140}
              shadow-camera-left={-45}
              shadow-camera-right={45}
              shadow-camera-top={45}
              shadow-camera-bottom={-45}
              color="#FFF4DD"
            />
            <hemisphereLight args={['#D4E4EA', '#E8DDCB', 0.6]} />

            {/* VIEW MODE A: Exploded Floors View */}
            {floorMode === 'exploded' ? (
              <ExplodedBuilding3D
                buildingCode={selectedBuilding?.code}
                totalFloors={selectedBuilding?.floors}
                selectedFloor={selectedFloor}
                showLabels={showFloorLabels}
                portalRef={canvasContainerRef}
                onSelectFloor={(fl) => {
                  setSelectedFloor(fl);
                  setFloorMode('floor');
                }}
              />
            ) : floorMode === 'floor' && selectedBuilding ? (
              /* VIEW MODE B: Cutaway Floor-by-Floor 3D View */
              <FloorCutaway3D
                buildingCode={selectedBuilding?.code}
                floorNumber={selectedFloor}
                rooms={currentFloorRooms}
                selectedRoomId={selectedRoom?.id || null}
                showLabels={showRoomLabels}
                portalRef={canvasContainerRef}
                onSelectRoom={(r) => setSelectedRoom(r)}
              />
            ) : (
              /* VIEW MODE C: Campus Exterior Digital Twin */
              <group>
                <CampusGrounds />
                {/* Procedural Landscaping Trees */}
                {[
                  { x: -30, z: -15, s: 1.1 },
                  { x: -28, z: -8, s: 1.2 },
                  { x: -28, z: 5, s: 1.0 },
                  { x: -25, z: 14, s: 1.1 },
                  { x: 30, z: -15, s: 1.0 },
                  { x: 28, z: -5, s: 1.2 },
                  { x: 28, z: 8, s: 0.9 },
                  { x: 26, z: 15, s: 1.1 },
                  { x: -12, z: -4, s: 0.8 },
                  { x: 12, z: -4, s: 0.8 },
                ].map((t, idx) => (
                  <CampusTree key={idx} x={t.x} z={t.z} scale={t.s} />
                ))}

                {/* Campus Buildings */}
                {filteredBuildings.map((b) => (
                  <CampusBuilding
                    key={b.id}
                    building={b}
                    selected={selectedBuilding?.id === b.id}
                    hovered={hoveredBuildingId === b.id}
                    showLabels={showCampusBuildingLabels}
                    portalRef={canvasContainerRef}
                    onClick={() => {
                      setSelectedBuilding(b);
                      setSelectedRoom(null);
                    }}
                    onPointerOver={() => setHoveredBuildingId(b.id)}
                    onPointerOut={() => setHoveredBuildingId(null)}
                  />
                ))}
              </group>
            )}

            {/* Orbit Controls */}
            <OrbitControls
              ref={controlsRef}
              makeDefault
              target={[0, 2, -4]}
              minDistance={10}
              maxDistance={120}
              maxPolarAngle={Math.PI / 2.05}
              enableDamping
              dampingFactor={0.06}
            />
          </Canvas>
        </div>

        {/* Right: Building Details Panel (Responsive 370–400px, no overflow, scrollable) */}
        {selectedBuilding && (
          <div className="w-full lg:w-[370px] xl:w-[400px] shrink-0 h-full bg-white border border-[#E8DDCB] rounded-2xl shadow-sm flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">
            {/* Header: Building Name & Status */}
            <div className="p-3.5 border-b border-[#E8DDCB] flex items-center justify-between bg-[#FAF8F5] shrink-0">
              <div className="truncate pr-2">
                <h2 className="font-bold text-sm text-[#292D29] truncate flex items-center gap-1.5">
                  <BldIcon size={16} className="text-[#2E6B45] shrink-0" />
                  <span className="truncate">{selectedBuilding.name}</span>
                </h2>
                <p className="text-[11px] text-[#6D716A] truncate">
                  {selectedBuilding.category || 'Academic & Engineering'} · {selectedBuilding.floors} Floors
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{
                    background: `${statusColor(selectedBuilding.status)}18`,
                    color: statusColor(selectedBuilding.status),
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: statusColor(selectedBuilding.status) }}
                  />
                  {selectedBuilding.status === 'normal' ? 'Normal' : selectedBuilding.status.toUpperCase()}
                </span>
                <button
                  onClick={() => setSelectedBuilding(null)}
                  className="p-1 rounded-md text-[#6D716A] hover:bg-[#E8DDCB] text-xs ml-1 transition-colors"
                  aria-label="Close"
                  title="Close Details Panel"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Navigation Tabs (Never clipped, horizontally scrollable if needed) */}
            <div className="flex items-center border-b border-[#E8DDCB] bg-white text-xs px-2 overflow-x-auto shrink-0 scrollbar-none">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'floors', label: 'Floors' },
                { id: 'energy', label: 'Energy' },
                { id: 'water', label: 'Water' },
                { id: 'cctv', label: 'CCTV' },
                { id: 'details', label: 'Details' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    if (tab.id === 'floors' && floorMode === 'campus') {
                      setFloorMode('floor');
                    }
                  }}
                  className={`px-3 py-2.5 font-medium border-b-2 whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'border-[#2E6B45] text-[#2E6B45] font-bold'
                      : 'border-transparent text-[#6D716A] hover:text-[#292D29]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Contents: Vertically scrollable with overflow-y-auto */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 min-h-0">
              {/* TAB 1: FLOORS */}
              {activeTab === 'floors' && (
                <div className="space-y-3">
                  {/* Floor Level Selector Pills (Horizontally Scrollable) */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 shrink-0 scrollbar-thin">
                    {availableFloors.map((fl) => (
                      <button
                        key={fl.num}
                        onClick={() => {
                          setSelectedFloor(fl.num);
                          setSelectedRoom(null);
                          if (floorMode === 'campus') setFloorMode('floor');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                          selectedFloor === fl.num && floorMode === 'floor'
                            ? 'bg-[#2E6B45] text-white shadow-xs'
                            : 'bg-[#FAF8F5] border border-[#E8DDCB] text-[#6D716A] hover:border-[#2E6B45] hover:text-[#292D29]'
                        }`}
                      >
                        {fl.label}
                      </button>
                    ))}
                  </div>

                  {/* 3 View Mode Selector Controls */}
                  <div className="grid grid-cols-3 gap-1 p-1 bg-[#FAF8F5] rounded-xl border border-[#E8DDCB] text-[11px] shrink-0">
                    <button
                      onClick={() => setFloorMode('floor')}
                      className={`py-1.5 px-1 rounded-lg text-center font-semibold transition-all ${
                        floorMode === 'floor' ? 'bg-white text-[#2E6B45] shadow-xs' : 'text-[#6D716A] hover:text-[#292D29]'
                      }`}
                    >
                      Floor Cutaway
                    </button>
                    <button
                      onClick={() => setFloorMode('exploded')}
                      className={`py-1.5 px-1 rounded-lg text-center font-semibold transition-all ${
                        floorMode === 'exploded' ? 'bg-white text-[#2E6B45] shadow-xs' : 'text-[#6D716A] hover:text-[#292D29]'
                      }`}
                    >
                      Exploded View
                    </button>
                    <button
                      onClick={() => setFloorMode('campus')}
                      className={`py-1.5 px-1 rounded-lg text-center font-semibold transition-all ${
                        floorMode === 'campus' ? 'bg-white text-[#2E6B45] shadow-xs' : 'text-[#6D716A] hover:text-[#292D29]'
                      }`}
                    >
                      Campus Exterior
                    </button>
                  </div>

                  {/* SELECTED ROOM INSPECTION DRAWER */}
                  {selectedRoom ? (
                    <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8DDCB] space-y-3 animate-in fade-in duration-150">
                      {/* Header with Room Name, Type, Floor, and Back button */}
                      <div className="flex items-center justify-between border-b border-[#E8DDCB] pb-2">
                        <div className="min-w-0 pr-2">
                          <h4 className="font-bold text-xs text-[#292D29] truncate">{selectedRoom.name}</h4>
                          <p className="text-[10px] text-[#6D716A] truncate">
                            {selectedRoom.facility_type || 'Facility Room'} · {getFloorLabel(selectedRoom.floor, selectedBuilding.code)}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedRoom(null)}
                          className="text-xs text-[#2E6B45] font-semibold hover:underline flex items-center gap-1 shrink-0 px-2 py-0.5 rounded hover:bg-[#2E6B45]/10 transition-colors"
                        >
                          <ArrowLeft size={12} /> Back to Floor
                        </button>
                      </div>

                      {/* Reference Photograph or Placeholder Banner */}
                      {selectedRoom.image_key && getAssetPath(selectedRoom.image_key) ? (
                        <div className="space-y-1">
                          <div className="relative rounded-xl overflow-hidden border border-[#E8DDCB] group shadow-2xs">
                            <img
                              src={getAssetPath(selectedRoom.image_key)!}
                              alt={selectedRoom.name}
                              className="w-full h-32 sm:h-36 object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            <button
                              onClick={() => {
                                setPreviewImage({
                                  url: getAssetPath(selectedRoom.image_key)!,
                                  title: selectedRoom.name,
                                  type: selectedRoom.facility_type || 'Facility Overview',
                                  isCctv: false,
                                  notes: selectedRoom.description || 'Actual campus photographic reference illustrating workstation layout, laboratory equipment benches, and lighting infrastructure.',
                                });
                              }}
                              className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-[#2E6B45] text-white text-[10px] font-bold shadow-md flex items-center gap-1 hover:bg-[#255737] transition-colors"
                            >
                              <Maximize2 size={11} /> Explore Interior
                            </button>
                          </div>
                          <div className="text-[10px] text-[#6D716A] text-center italic flex items-center justify-center gap-1">
                            <span>📷</span> Reference Imagery (Illustrative Preview)
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-white rounded-xl border border-dashed border-[#C19A6B] text-center space-y-1">
                          <div className="text-xs font-semibold text-[#292D29]">{selectedRoom.name}</div>
                          <div className="text-[10px] text-[#6D716A] italic">📷 Reference Imagery (Illustrative Preview)</div>
                        </div>
                      )}

                      {/* Capacity & Facility Type Badges */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-white rounded-lg border border-[#E8DDCB] flex items-center gap-2">
                          <Users size={14} className="text-[#2E6B45] shrink-0" />
                          <div>
                            <div className="text-[9px] text-[#6D716A] font-semibold uppercase">Capacity</div>
                            <div className="font-bold text-[#292D29] text-[11px]">{selectedRoom.capacity} Seats</div>
                          </div>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-[#E8DDCB] flex items-center gap-2">
                          <Layers size={14} className="text-[#C19A6B] shrink-0" />
                          <div className="min-w-0">
                            <div className="text-[9px] text-[#6D716A] font-semibold uppercase">Type</div>
                            <div className="font-bold text-[#292D29] text-[11px] truncate">{selectedRoom.facility_type || 'Facility Room'}</div>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      {selectedRoom.description && (
                        <div className="p-2.5 bg-white rounded-lg border border-[#E8DDCB]">
                          <div className="text-[10px] font-bold text-[#6D716A] uppercase tracking-wider mb-1">
                            Description
                          </div>
                          <p className="text-[11px] text-[#292D29] leading-relaxed">
                            {selectedRoom.description}
                          </p>
                        </div>
                      )}

                      {/* Equipment & Facilities List */}
                      {selectedRoom.equipment && (
                        <div className="p-2.5 bg-white rounded-lg border border-[#E8DDCB]">
                          <div className="text-[10px] font-bold text-[#6D716A] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <CheckCircle2 size={12} className="text-[#2E6B45]" /> Key Equipment & Facilities
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedRoom.equipment.split(',').map((eq, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-[#E8DDCB] text-[10px] text-[#292D29] font-medium flex items-center gap-1"
                              >
                                <span className="w-1 h-1 rounded-full bg-[#2E6B45]" /> {eq.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Direct Hardware Telemetry Controls */}
                      <div>
                        <p className="text-[10px] font-bold text-[#6D716A] uppercase tracking-wider mb-1.5">
                          Direct Hardware Telemetry Controls
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <button
                            onClick={() => handleToggleRoomHardware(selectedRoom.id, 'occupied', selectedRoom.occupied)}
                            className={`p-2 rounded-lg border text-left transition-all ${
                              selectedRoom.occupied
                                ? 'bg-[#E0EFE6] border-[#C2DEC9] text-[#2E6B45]'
                                : 'bg-white border-[#E8DDCB] text-[#6D716A] hover:border-[#C19A6B]'
                            }`}
                          >
                            <span className="text-[10px] block text-[#6D716A]">State</span>
                            <span className="font-bold text-xs">{selectedRoom.occupied ? 'Occupied' : 'Vacant'}</span>
                          </button>

                          <button
                            onClick={() => handleToggleRoomHardware(selectedRoom.id, 'lights_on', selectedRoom.lights_on)}
                            className={`p-2 rounded-lg border text-left transition-all ${
                              selectedRoom.lights_on
                                ? 'bg-[#FFF8E7] border-[#FFE4A3] text-[#D89A35]'
                                : 'bg-white border-[#E8DDCB] text-[#6D716A] hover:border-[#C19A6B]'
                            }`}
                          >
                            <span className="text-[10px] block text-[#6D716A]">Lighting</span>
                            <span className="font-bold text-xs">{selectedRoom.lights_on ? 'Lights ON' : 'Lights OFF'}</span>
                          </button>

                          <button
                            onClick={() => handleToggleRoomHardware(selectedRoom.id, 'ac_on', selectedRoom.ac_on)}
                            className={`p-2 rounded-lg border text-left transition-all ${
                              selectedRoom.ac_on
                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                : 'bg-white border-[#E8DDCB] text-[#6D716A] hover:border-[#C19A6B]'
                            }`}
                          >
                            <span className="text-[10px] block text-[#6D716A]">HVAC</span>
                            <span className="font-bold text-xs">{selectedRoom.ac_on ? 'AC ON' : 'AC OFF'}</span>
                          </button>

                          <button
                            onClick={() => handleToggleRoomHardware(selectedRoom.id, 'projector_on', selectedRoom.projector_on)}
                            className={`p-2 rounded-lg border text-left transition-all ${
                              selectedRoom.projector_on
                                ? 'bg-purple-50 border-purple-200 text-purple-700'
                                : 'bg-white border-[#E8DDCB] text-[#6D716A] hover:border-[#C19A6B]'
                            }`}
                          >
                            <span className="text-[10px] block text-[#6D716A]">Equipment</span>
                            <span className="font-bold text-xs">{selectedRoom.projector_on ? 'Running' : 'Standby'}</span>
                          </button>
                        </div>
                        <div className="text-[10px] text-[#6D716A] italic mt-1.5 text-center">
                          * Simulated Telemetry — Toggle to test automated power-down workflows.
                        </div>
                      </div>

                      {/* Current Power Load */}
                      <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-[#E8DDCB]">
                        <span className="text-xs text-[#6D716A] flex items-center gap-1.5 font-medium">
                          <Zap size={14} className="text-[#C19A6B]" /> Power Draw:
                        </span>
                        <span className="font-mono text-sm font-bold text-[#292D29]">
                          {selectedRoom.current_load_kw.toFixed(1)} kW
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* ROOM LIST ON CURRENT FLOOR */
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#292D29]">
                          Floor {selectedFloor} - {selectedFloor === 0 ? 'Ground Floor' : `Floor ${selectedFloor}`}
                        </span>
                        <span className="text-[11px] text-[#6D716A] font-medium">
                          {currentFloorRooms.length} Rooms
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {currentFloorRooms.map((r) => (
                          <div
                            key={r.id}
                            onClick={() => setSelectedRoom(r)}
                            className="p-2.5 bg-[#FAF8F5] border border-[#E8DDCB] hover:border-[#2E6B45] rounded-xl cursor-pointer flex items-center justify-between transition-all group shadow-2xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-6 h-6 rounded-md bg-white border border-[#E8DDCB] flex items-center justify-center text-[#2E6B45] shrink-0">
                                {r.name.includes('Computer') ? (
                                  <Monitor size={13} />
                                ) : r.name.includes('Physics') ? (
                                  <Atom size={13} />
                                ) : r.name.includes('Chemistry') ? (
                                  <FlaskConical size={13} />
                                ) : r.name.includes('Lecture') ? (
                                  <Volume2 size={13} />
                                ) : (
                                  <BookOpen size={13} />
                                )}
                              </div>
                              <div className="truncate">
                                <p className="font-semibold text-xs text-[#292D29] group-hover:text-[#2E6B45] truncate">
                                  {r.name}
                                </p>
                                <p className="text-[10px] text-[#6D716A] truncate">
                                  {r.facility_type || 'Room'} · {r.capacity} seats
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className={`text-[10px] font-semibold flex items-center gap-1 ${
                                  r.occupied ? 'text-[#2E6B45]' : 'text-[#8C847B]'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    r.occupied ? 'bg-[#2E6B45]' : 'bg-[#8C847B]'
                                  }`}
                                />
                                {r.occupied ? 'Occupied' : 'Vacant'}
                              </span>
                              <ChevronRight size={14} className="text-[#8C847B] group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-3.5">
                  {selectedBuilding.image_key && (
                    <div className="rounded-xl overflow-hidden border border-[#E8DDCB] relative group shadow-2xs">
                      <img
                        src={getAssetPath(selectedBuilding.image_key)!}
                        alt={selectedBuilding.name}
                        className="w-full h-36 object-cover"
                      />
                      <button
                        onClick={() => {
                          setPreviewImage({
                            url: getAssetPath(selectedBuilding.image_key)!,
                            title: selectedBuilding.name,
                            category: selectedBuilding.category,
                            isCctv: false,
                            notes: 'Architectural facade reference illustrating neoclassical portico, Ionic order columns, and symmetrical facility wings.',
                          });
                        }}
                        className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-[#2E6B45] text-white text-[10px] font-bold shadow-md flex items-center gap-1 hover:bg-[#255737] transition-colors"
                      >
                        <Maximize2 size={11} />
                        {selectedBuilding.code === 'CAFE' ? 'Explore Interior' : 'Inspect Photo'}
                      </button>
                    </div>
                  )}

                  {/* CAFETERIA SPECIAL INTERACTION BUTTON */}
                  {selectedBuilding.code === 'CAFE' && (
                    <div className="p-3 bg-[#FFF8E7] border border-[#FFE4A3] rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-[#D89A35] font-bold text-xs">
                        <Utensils size={15} /> Campus Cafeteria Facility
                      </div>
                      <p className="text-[11px] text-[#292D29] leading-relaxed">
                        Features red brick architectural columns, multiple food service counter rows, extensive dining tables and student seating capacity for 320 diners.
                      </p>
                      <button
                        onClick={() => {
                          setPreviewImage({
                            url: '/assets/campus/Cafeteria.jpg',
                            title: 'Campus Cafeteria Dining Hall',
                            category: 'Food and Dining',
                            type: 'Cafeteria Interior',
                            isCctv: false,
                            notes: 'Red brick columns, food service counters, dining tables, chairs, and dedicated student seating zones.',
                          });
                        }}
                        className="btn-primary w-full text-xs py-2 flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Utensils size={13} /> Explore Cafeteria Interior
                      </button>
                    </div>
                  )}

                  {/* Power & Water Metrics */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#E8DDCB]">
                      <span className="text-[#6D716A] text-[11px] flex items-center gap-1">
                        <Zap size={12} className="text-[#C19A6B]" /> Power Load
                      </span>
                      <p className="text-base font-bold text-[#292D29] mt-0.5">
                        {selectedBuilding.rooms
                          ? selectedBuilding.rooms.reduce((acc, r) => acc + (r.current_load_kw || 0), 0).toFixed(1)
                          : '0.0'}{' '}
                        <span className="text-[10px] text-[#6D716A] font-normal">kW</span>
                      </p>
                    </div>
                    <div className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#E8DDCB]">
                      <span className="text-[#6D716A] text-[11px] flex items-center gap-1">
                        <Droplets size={12} className="text-[#0284c7]" /> Flow Rate
                      </span>
                      <p className="text-base font-bold text-[#292D29] mt-0.5">
                        {selectedBuilding.status === 'critical' ? '7.5' : '1.8'}{' '}
                        <span className="text-[10px] text-[#6D716A] font-normal">L/min</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: ENERGY */}
              {activeTab === 'energy' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8DDCB] space-y-2">
                    <span className="font-bold text-[#292D29] block">Building Energy Profile</span>
                    <p className="text-[11px] text-[#6D716A]">
                      Connected to 4 smart sub-meters. Currently drawing aggregate load across {selectedBuilding.rooms?.length || 0} rooms.
                    </p>
                    <div className="p-2.5 bg-white rounded-lg border border-[#E8DDCB] flex justify-between font-medium">
                      <span>Total Facility Draw:</span>
                      <span className="font-bold text-[#2E6B45]">
                        {selectedBuilding.rooms?.reduce((a, r) => a + r.current_load_kw, 0).toFixed(1)} kW
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: WATER */}
              {activeTab === 'water' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8DDCB] space-y-2">
                    <span className="font-bold text-[#292D29] block">Water Supply Telemetry</span>
                    <p className="text-[11px] text-[#6D716A]">Main flow meter monitoring pressure and intake volume.</p>
                    {waterAlerts.filter((a) => a.building_id === selectedBuilding.id).length > 0 ? (
                      <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 font-bold">
                        Suspected Leak Active on Supply Line
                      </div>
                    ) : (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[#2E6B45] font-bold">
                        Normal Water Flow Rate (1.8 L/min)
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: CCTV */}
              {activeTab === 'cctv' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8DDCB] space-y-2">
                    <span className="font-bold text-[#292D29] block">Security & Waste Monitoring</span>
                    <div
                      onClick={() => {
                        setPreviewImage({
                          url: getAssetPath(selectedBuilding.image_key) || '/assets/campus/School Of Engineering (2).jpg',
                          title: `${selectedBuilding.name} CCTV`,
                          type: 'Facility Optical Stream',
                          location: selectedBuilding.name,
                          cameraCode: `CAM-${selectedBuilding.code}`,
                          status: 'Live',
                          isCctv: true,
                          notes: `Live camera feed dedicated to ${selectedBuilding.name}. Integrated with continuous incident detection.`,
                        });
                      }}
                      className="relative rounded-xl overflow-hidden border border-[#E8DDCB] cursor-pointer group shadow-2xs"
                    >
                      <img
                        src={getAssetPath(selectedBuilding.image_key)!}
                        alt="Camera Feed"
                        className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute top-2 left-2 bg-[#2E6B45] text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Click to Expand Live Stream
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: DETAILS */}
              {activeTab === 'details' && (
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#E8DDCB] flex justify-between">
                    <span className="text-[#6D716A]">Building Code:</span>
                    <span className="font-mono font-bold text-[#292D29]">{selectedBuilding.code}</span>
                  </div>
                  <div className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#E8DDCB] flex justify-between">
                    <span className="text-[#6D716A]">Total Levels:</span>
                    <span className="font-bold text-[#292D29]">{selectedBuilding.floors} Storeys</span>
                  </div>
                  <div className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#E8DDCB] flex justify-between">
                    <span className="text-[#6D716A]">Category:</span>
                    <span className="font-bold text-[#2E6B45]">{selectedBuilding.category || 'Academic'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* EXPLORE BUILDING ACTION BUTTON IN FOOTER */}
            <div className="p-3 bg-[#FAF8F5] border-t border-[#E8DDCB] shrink-0">
              <button
                onClick={() => {
                  setActiveTab('floors');
                  setFloorMode('floor');
                }}
                className="btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-2 font-bold shadow-xs active:scale-[0.99] transition-transform"
              >
                <Layers size={15} />
                <span>EXPLORE BUILDING IN 3D</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. DEDICATED DASHBOARD: METRIC CARDS & LIVE CCTV FEEDS        */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col gap-4">
        {/* KPI Metrics Cards Strip (5 Campus Metrics) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* 1. Energy */}
          <div className="kpi-card p-3.5 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs text-[#6D716A]">
              <Zap size={15} className="text-[#C19A6B]" />
              <span className="font-semibold text-[11px] uppercase tracking-wider">Total Campus Energy</span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-extrabold text-[#292D29]">
                1,245 <span className="text-xs font-normal text-[#6D716A]">kWh</span>
              </span>
              <span className="text-[11px] text-[#2E6B45] font-bold bg-[#2E6B45]/10 px-1.5 py-0.5 rounded">
                ↓ 12%
              </span>
            </div>
          </div>

          {/* 2. Water */}
          <div className="kpi-card p-3.5 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs text-[#6D716A]">
              <Droplets size={15} className="text-[#0284c7]" />
              <span className="font-semibold text-[11px] uppercase tracking-wider">Total Water Usage</span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-extrabold text-[#292D29]">
                18,430 <span className="text-xs font-normal text-[#6D716A]">L</span>
              </span>
              <span className="text-[11px] text-[#2E6B45] font-bold bg-[#2E6B45]/10 px-1.5 py-0.5 rounded">
                ↓ 8%
              </span>
            </div>
          </div>

          {/* 3. Waste */}
          <div className="kpi-card p-3.5 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs text-[#6D716A]">
              <Trash2 size={15} className="text-[#2E6B45]" />
              <span className="font-semibold text-[11px] uppercase tracking-wider">Waste Collected</span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-extrabold text-[#292D29]">
                320 <span className="text-xs font-normal text-[#6D716A]">kg</span>
              </span>
              <span className="text-[11px] text-[#2E6B45] font-bold bg-[#2E6B45]/10 px-1.5 py-0.5 rounded">
                ↑ 5%
              </span>
            </div>
          </div>

          {/* 4. Estimated Cost Saved */}
          <div className="kpi-card p-3.5 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs text-[#6D716A]">
              <Coins size={15} className="text-[#2E6B45]" />
              <span className="font-semibold text-[11px] uppercase tracking-wider">Estimated Cost Saved</span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-extrabold text-[#2E6B45]">
                ₹20,000
              </span>
              <span className="text-[11px] text-[#2E6B45] font-bold bg-[#2E6B45]/10 px-1.5 py-0.5 rounded">
                ↑ 10%
              </span>
            </div>
            <div className="text-[10px] text-[#8C847B] mt-1 font-medium">Demo baseline</div>
          </div>

          {/* 5. Active Alerts */}
          <div className="kpi-card p-3.5 border-l-4 border-l-[#C94A42] shadow-xs">
            <div className="flex items-center gap-1.5 text-xs text-[#6D716A]">
              <AlertTriangle size={15} className="text-[#C94A42]" />
              <span className="font-semibold text-[11px] uppercase tracking-wider">Active Alerts</span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-extrabold text-[#C94A42]">3</span>
              <span className="text-[11px] text-[#8C847B] font-medium">
                1 Warning · 2 Critical
              </span>
            </div>
          </div>
        </div>

        {/* Live CCTV Feeds Container */}
        <div className="bg-white border border-[#E8DDCB] p-4 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CameraIcon size={16} className="text-[#2E6B45]" />
              <span className="font-bold text-sm text-[#292D29]">Live CCTV Feeds</span>
              <span className="text-xs text-[#8C847B] hidden sm:inline">· 5 Optical Monitoring Nodes (Demo Previews)</span>
            </div>
            <span className="text-xs font-semibold text-[#2E6B45] hover:underline cursor-pointer">
              View All Cameras →
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {liveCctvFeeds.map((feed) => (
              <div
                key={feed.id}
                onClick={() => {
                  setPreviewImage({
                    url: feed.image,
                    title: `${feed.name} CCTV`,
                    type: 'Surveillance Video Feed',
                    cameraCode: feed.code,
                    location: feed.location,
                    status: feed.status,
                    isCctv: true,
                    notes: `Live optical feed for ${feed.name} (${feed.location}). Operating in continuous analytical stream.`,
                  });
                }}
                className="relative rounded-xl overflow-hidden border border-[#E8DDCB] cursor-pointer group shadow-2xs hover:border-[#2E6B45] transition-all"
              >
                <img
                  src={getAssetPath(feed.image)!}
                  alt={feed.name}
                  className="w-full h-20 object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white truncate">{feed.name}</span>
                  <span className="text-[9px] font-bold text-white bg-[#2E6B45] px-1.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 6. MODAL: CCTV STREAM & HIGH-RES IMAGE PREVIEW (createPortal) */}
      {/* ------------------------------------------------------------- */}
      {previewImage &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] bg-[#332820]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 pointer-events-auto"
            style={{ zIndex: 99999 }}
            onClick={() => setPreviewImage(null)}
          >
            <div
              className="bg-white rounded-2xl max-w-2xl w-full border border-[#E8DDCB] shadow-2xl overflow-hidden flex flex-col relative z-[100000]"
              style={{ zIndex: 100000 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-[#E8DDCB] flex items-center justify-between bg-[#FAF8F5]">
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    {previewImage.isCctv && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-white bg-[#2E6B45] px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        Live CCTV
                      </span>
                    )}
                    <h3 className="font-bold text-sm text-[#292D29] truncate">{previewImage.title}</h3>
                  </div>
                  <p className="text-[11px] text-[#6D716A] mt-0.5 truncate">
                    {previewImage.location ? `${previewImage.location} · ` : ''}
                    {previewImage.category || previewImage.type || 'Surveillance Feed'}
                  </p>
                </div>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-[#6D716A] hover:text-[#292D29] transition-colors shrink-0"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Image / Video Frame */}
              <div className="p-3 bg-black flex items-center justify-center relative overflow-hidden">
                <img
                  src={previewImage.url}
                  alt={previewImage.title}
                  className="max-h-[380px] w-auto rounded shadow object-contain"
                />
                {previewImage.isCctv && (
                  <>
                    <div className="absolute top-5 left-5 flex items-center gap-2 bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded text-white text-[11px] font-mono">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span>REC ● 1080p 30fps</span>
                    </div>
                    <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between text-white/90 text-[10px] font-mono bg-black/60 backdrop-blur-xs px-3 py-1.5 rounded">
                      <span>{previewImage.cameraCode || 'CAM-STREAM'} · {previewImage.location || 'Campus'}</span>
                      <span>{new Date().toLocaleTimeString()}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer Notes */}
              <div className="p-4 bg-[#FAF8F5] border-t border-[#E8DDCB] space-y-1">
                <p className="text-[10px] font-bold text-[#6D716A] uppercase tracking-wider">
                  {previewImage.isCctv ? 'Camera Telemetry & Status' : 'Architectural & Interior Reference Notes'}
                </p>
                <p className="text-xs text-[#292D29] leading-relaxed">
                  {previewImage.notes ||
                    'Surveillance stream active and connected to NexusEco computer vision analytical pipeline.'}
                </p>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

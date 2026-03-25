import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { Settings, X, Megaphone, Package, Check, Pause, Volume2, VolumeX, LogIn, LogOut, Trophy, Gift, Lock, Unlock, Users, Play, Copy, Star, Briefcase, ChevronRight, ChevronLeft, ArrowUp, ArrowDown, Mail, Bell, Trash2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { hddBase64 as hddImg } from './hddBase64';
import { sdlhBase64 as santaImg } from './sdlhBase64';
import { hjdjBase64 as hjdjImg } from './hjdjBase64';
import { hjdjSkillBase64 as hjdjSkillImg } from './hjdjSkillBase64';
import { hzBase64 as hzImg } from './hzBase64';
import { hzskillBase64 as hzSkillImg } from './hzskillBase64';
import { hgteBase64 as hgteImg } from './hgteBase64';
import { hgteSkillBase64 as hgteSkillImg } from './hgteSkillBase64';
import { hxdBase64 as hxdImg } from './hxdBase64';
import { ndBase64 as ndImg } from './ndBase64';
import { ttdBase64 as ttdImg } from './ttdBase64';
import { auth, db } from './firebase';

const getCharacterImage = (charId: string | undefined) => {
  switch (charId) {
    case 'santa': return santaImg;
    case 'hjdj': return hjdjImg;
    case 'hz': return hzImg;
    case 'hgte': return hgteImg;
    case 'ttd': return ttdImg;
    case 'hdd':
    default: return hddImg;
  }
};
import { 
  onAuthStateChanged, 
  User,
  signOut,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  setDoc, 
  doc, 
  getDoc,
  serverTimestamp,
  getDocFromServer,
  Timestamp,
  runTransaction,
  getDocs,
  where,
  deleteDoc,
  updateDoc,
  addDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';

const GRAVITY = 0.8;
const JUMP_STRENGTH = -14;
const MAX_JUMPS = 2;

type Difficulty = 'easy' | 'normal' | 'hard';
type ObstacleType = 'normal' | 'tall' | 'wide' | 'flying' | 'sliding';
type PowerUpType = 'shield' | 'magnet' | 'doubleScore' | 'dash';

type BiomeType = 'FOREST' | 'DESERT' | 'ICE' | 'CYBER' | 'SPACE' | 'VOLCANO' | 'UNDERWATER' | 'VOID' | 'JUNGLE' | 'DESERT_STORM' | 'NEON_DREAM';
type WeatherType = 'CLEAR' | 'RAIN' | 'WIND_FORWARD' | 'WIND_BACKWARD' | 'SNOW';

interface Biome {
  id: BiomeType;
  name: string;
  bgTop: string;
  bgBottom: string;
  ground: string;
  gravityMod: number;
  jumpMod: number;
  speedMod: number;
  slideMod: number;
  scoreThreshold: number;
}

const BIOMES: Biome[] = [
  { id: 'FOREST', name: '🌲 绿野森林', bgTop: '#87CEEB', bgBottom: '#e0f6ff', ground: '#4caf50', gravityMod: 1, jumpMod: 1, speedMod: 1, slideMod: 1, scoreThreshold: 0 },
  { id: 'DESERT', name: '🌵 狂野沙漠', bgTop: '#FFB75E', bgBottom: '#ED8F03', ground: '#e6c229', gravityMod: 1, jumpMod: 1, speedMod: 1.05, slideMod: 1, scoreThreshold: 1000 },
  { id: 'ICE', name: '❄️ 极寒冰原', bgTop: '#a1c4fd', bgBottom: '#c2e9fb', ground: '#e0f7fa', gravityMod: 1, jumpMod: 1, speedMod: 1, slideMod: 1.5, scoreThreshold: 2000 },
  { id: 'CYBER', name: '🌃 赛博城市', bgTop: '#0f2027', bgBottom: '#203a43', ground: '#8e24aa', gravityMod: 1.1, jumpMod: 1.1, speedMod: 1.1, slideMod: 1, scoreThreshold: 3500 },
  { id: 'SPACE', name: '🌌 浩瀚星空', bgTop: '#000000', bgBottom: '#1a0b2e', ground: '#424242', gravityMod: 0.6, jumpMod: 1.2, speedMod: 0.9, slideMod: 1, scoreThreshold: 5000 },
  { id: 'VOLCANO', name: '🌋 熔岩火山', bgTop: '#430000', bgBottom: '#8b0000', ground: '#d84315', gravityMod: 1.2, jumpMod: 0.9, speedMod: 1.2, slideMod: 1, scoreThreshold: 7000 },
  { id: 'UNDERWATER', name: '🌊 深海遗迹', bgTop: '#001f3f', bgBottom: '#0074D9', ground: '#001f3f', gravityMod: 0.8, jumpMod: 1.0, speedMod: 0.8, slideMod: 1.2, scoreThreshold: 9000 },
  { id: 'VOID', name: '🌀 虚空裂隙', bgTop: '#1a1a1a', bgBottom: '#4a148c', ground: '#000000', gravityMod: 1.0, jumpMod: 1.0, speedMod: 1.5, slideMod: 1.0, scoreThreshold: 12000 },
  { id: 'JUNGLE', name: '🌿 原始丛林', bgTop: '#1b5e20', bgBottom: '#388e3c', ground: '#2e7d32', gravityMod: 1.0, jumpMod: 1.1, speedMod: 1.0, slideMod: 1.1, scoreThreshold: 15000 },
  { id: 'DESERT_STORM', name: '🌪️ 沙尘暴', bgTop: '#bf360c', bgBottom: '#d84315', ground: '#e64a19', gravityMod: 1.1, jumpMod: 1.0, speedMod: 1.3, slideMod: 0.9, scoreThreshold: 18000 },
  { id: 'NEON_DREAM', name: '✨ 霓虹梦境', bgTop: '#c51162', bgBottom: '#6200ea', ground: '#00b8d4', gravityMod: 0.9, jumpMod: 1.3, speedMod: 1.4, slideMod: 1.2, scoreThreshold: 22000 },
];

const TITLES = {
  // 新手/入门级 (Common)
  'rookie': { name: '🌱 初出茅庐', color: '#81c784', rarity: 'common', shadow: 'none', effect: 'none' },
  'runner': { name: '👟 奔跑者', color: '#aed581', rarity: 'common', shadow: 'none', effect: 'none' },
  'jumper': { name: '🦘 弹跳健将', color: '#dce775', rarity: 'common', shadow: 'none', effect: 'none' },
  'explorer': { name: '🧭 探索先锋', color: '#fff176', rarity: 'common', shadow: 'none', effect: 'none' },
  
  // 进阶/熟练级 (Rare)
  'expert': { name: '🏃 跑酷达人', color: '#64b5f6', rarity: 'rare', shadow: '0 0 5px #2196f3', effect: 'none' },
  'acrobat': { name: '🤸 杂技大师', color: '#4fc3f7', rarity: 'rare', shadow: '0 0 5px #03a9f4', effect: 'none' },
  'survivor': { name: '🛡️ 极限生存', color: '#4dd0e1', rarity: 'rare', shadow: '0 0 5px #00bcd4', effect: 'none' },
  'treasure_hunter': { name: '💰 寻宝猎人', color: '#ffd54f', rarity: 'rare', shadow: '0 0 5px #ffb300', effect: 'none' },
  'wind_chaser': { name: '🌪️ 追风少年', color: '#81d4fa', rarity: 'rare', shadow: '0 0 5px #29b6f6', effect: 'none' },

  // 高手/史诗级 (Epic)
  'void_walker': { name: '🌀 虚空行者', color: '#9575cd', rarity: 'epic', shadow: '0 0 8px #673ab7', effect: 'pulse' },
  'neon_dreamer': { name: '✨ 霓虹之梦', color: '#f06292', rarity: 'epic', shadow: '0 0 10px #e91e63', effect: 'glow' },
  'speed_demon': { name: '⚡ 极速狂魔', color: '#ff5722', rarity: 'epic', shadow: '0 0 12px #ff9800', effect: 'shake' },
  'shadow_ninja': { name: '🥷 影之忍者', color: '#78909c', rarity: 'epic', shadow: '0 0 10px #546e7a', effect: 'pulse' },
  'star_gazer': { name: '🔭 摘星者', color: '#ba68c8', rarity: 'epic', shadow: '0 0 10px #9c27b0', effect: 'glow' },
  'time_traveler': { name: '⏳ 时空旅人', color: '#4db6ac', rarity: 'epic', shadow: '0 0 10px #009688', effect: 'pulse' },
  'dragon_rider': { name: '🐉 龙骑士', color: '#e57373', rarity: 'epic', shadow: '0 0 10px #f44336', effect: 'glow' },

  // 顶尖/传说级 (Legendary)
  'diamond_king': { name: '💎 钻石之王', color: '#00bcd4', rarity: 'legendary', shadow: '0 0 15px #00e5ff', effect: 'rotate' },
  'king': { name: '👑 至尊王者', color: '#ffd54f', rarity: 'legendary', shadow: '0 0 15px #ffb300', effect: 'pulse' },
  'hdd_shadow': { name: '👤 呼大帝之影', color: '#4fc3f7', rarity: 'legendary', shadow: '0 0 15px #03a9f4', effect: 'glow' },
  'god_mode': { name: '🔥 降临神罚', color: '#f44336', rarity: 'legendary', shadow: '0 0 20px #d32f2f', effect: 'shake' },
  'galaxy_lord': { name: '🌌 银河领主', color: '#b388ff', rarity: 'legendary', shadow: '0 0 20px #651fff', effect: 'pulse' },
  'immortal': { name: '👼 不朽神明', color: '#ffff8d', rarity: 'legendary', shadow: '0 0 20px #ffea00', effect: 'glow' },
  'cyber_punk': { name: '🤖 赛博之神', color: '#69f0ae', rarity: 'legendary', shadow: '0 0 20px #00e676', effect: 'pulse' },
  'abyss_watcher': { name: '👁️ 深渊凝视者', color: '#ff5252', rarity: 'legendary', shadow: '0 0 20px #ff1744', effect: 'shake' },
  'creator': { name: '✨ 创世神', color: '#ffffff', rarity: 'legendary', shadow: '0 0 25px #ffffff, 0 0 10px #ffeb3b', effect: 'glow' },

  // 排位专属称号 (Ranked)
  'rank_bronze': { name: '🥉 初出茅庐', color: '#cd7f32', rarity: 'common', shadow: 'none', effect: 'none' },
  'rank_silver': { name: '🥈 崭露头角', color: '#c0c0c0', rarity: 'common', shadow: 'none', effect: 'none' },
  'rank_gold': { name: '🥇 身经百战', color: '#ffd700', rarity: 'rare', shadow: '0 0 5px #ffb300', effect: 'none' },
  'rank_platinum': { name: '💎 傲视群雄', color: '#00e5ff', rarity: 'rare', shadow: '0 0 8px #00bcd4', effect: 'glow' },
  'rank_diamond': { name: '💠 璀璨之星', color: '#b388ff', rarity: 'epic', shadow: '0 0 10px #7c4dff', effect: 'pulse' },
  'rank_star': { name: '🌟 星光熠熠', color: '#ff4081', rarity: 'epic', shadow: '0 0 15px #f50057', effect: 'rotate' },
  'rank_king': { name: '👑 荣耀王者', color: '#ff1744', rarity: 'legendary', shadow: '0 0 20px #d50000', effect: 'shake' },
};

type TitleId = keyof typeof TITLES;

const AVATAR_FRAMES = {
  'gold_shield': { name: '黄金之盾', color: '#ffd700', effect: 'none', border: '4px solid #ffd700', shadow: '0 0 10px #ffd700' },
  'platinum_wings': { name: '铂金之翼', color: '#00e5ff', effect: 'glow', border: '4px solid #00e5ff', shadow: '0 0 15px #00e5ff' },
  'diamond_light': { name: '钻石之光', color: '#b388ff', effect: 'pulse', border: '4px dashed #b388ff', shadow: '0 0 20px #b388ff' },
  'star_glow': { name: '星耀之芒', color: '#ff4081', effect: 'rotate', border: '4px dotted #ff4081', shadow: '0 0 25px #ff4081' },
  'king_wind': { name: '王者之风', color: '#ff1744', effect: 'shake', border: '4px double #ff1744', shadow: '0 0 30px #ff1744' },
};

const getRandomTypeForBiome = (biomeId: string) => {
  const types: {[key: string]: string[]} = {
    'FOREST': ['tree', 'bush', 'rock'],
    'DESERT': ['cactus', 'camel', 'rock'],
    'ICE': ['iceberg', 'snowdrift'],
    'CYBER': ['building', 'neon_sign'],
    'SPACE': ['star', 'planet'],
    'VOLCANO': ['volcano', 'rock'],
    'UNDERWATER': ['coral', 'seaweed'],
    'VOID': ['void_particle'],
    'JUNGLE': ['tree', 'bush'],
    'DESERT_STORM': ['cactus', 'rock'],
    'NEON_DREAM': ['neon_sign', 'building']
  };
  const biomeTypes = types[biomeId] || ['rock'];
  return biomeTypes[Math.floor(Math.random() * biomeTypes.length)];
}

const drawBackgroundElement = (ctx: CanvasRenderingContext2D, el: BackgroundElement) => {
  ctx.fillStyle = '#333';
  if (el.type === 'tree') {
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(el.x, el.y, 20, 50);
  } else if (el.type === 'cactus') {
    ctx.fillStyle = '#81c784';
    ctx.fillRect(el.x, el.y, 15, 40);
  } else if (el.type === 'camel') {
    ctx.fillStyle = '#d7ccc8';
    ctx.fillRect(el.x, el.y, 30, 20);
  } else if (el.type === 'rock') {
    ctx.fillStyle = '#9e9e9e';
    ctx.fillRect(el.x, el.y, 20, 15);
  }
}

type FrameId = keyof typeof AVATAR_FRAMES;

const ENTRANCE_EFFECTS = {
  'flowing_light': { name: '流光溢彩', color: '#00e5ff', type: 'flash' },
  'diamond_sparkle': { name: '碎钻闪耀', color: '#b388ff', type: 'sparkle' },
  'star_trek': { name: '星际迷航', color: '#ff4081', type: 'warp' },
  'king_arrival': { name: '君临天下', color: '#ff1744', type: 'screen_shake' },
};

type EntranceEffectId = keyof typeof ENTRANCE_EFFECTS;

const DIFFICULTY_SETTINGS = {
  easy: { speed: 3, spawnRate: 150, label: '简单' },
  normal: { speed: 5, spawnRate: 110, label: '普通' },
  hard: { speed: 7, spawnRate: 80, label: '困难' }
};

const POWERUP_CONFIG = {
  shield: { color: '#34d399', icon: '🛡️', duration: 500, label: '护盾' },
  magnet: { color: '#60a5fa', icon: '🧲', duration: 400, label: '磁铁' },
  doubleScore: { color: '#fbbf24', icon: '✨', duration: 300, label: '双倍积分' },
  dash: { color: '#f87171', icon: '⚡', duration: 200, label: '冲刺' }
};

const SHOP_ITEMS = {
  shield: { name: '护盾', cost: 20, description: '抵挡一次障碍物碰撞' },
  magnet: { name: '磁铁', cost: 30, description: '自动吸引附近的道具和钻石' },
  doubleScore: { name: '双倍积分', cost: 40, description: '获得积分翻倍' },
  dash: { name: '冲刺', cost: 60, description: '无敌冲刺并摧毁障碍物' }
};

const RANK_SYSTEM = [
  { name: '青铜', minRP: 0, color: '#cd7f32', icon: '🥉' },
  { name: '白银', minRP: 1200, color: '#c0c0c0', icon: '🥈' },
  { name: '黄金', minRP: 1400, color: '#ffd700', icon: '🥇' },
  { name: '铂金', minRP: 1600, color: '#00e5ff', icon: '💎' },
  { name: '钻石', minRP: 1800, color: '#b388ff', icon: '💠' },
  { name: '星耀', minRP: 2000, color: '#ff4081', icon: '🌟' },
  { name: '王者', minRP: 2200, color: '#ff1744', icon: '👑' }
];

const getRankInfo = (rp: number) => {
  for (let i = RANK_SYSTEM.length - 1; i >= 0; i--) {
    if (rp >= RANK_SYSTEM[i].minRP) {
      return RANK_SYSTEM[i];
    }
  }
  return RANK_SYSTEM[0];
};

const CHARACTER_REQUIREMENTS: Record<string, number> = {
  hdd: 0,
  hgte: 0,
  santa: 1000,
  hjdj: 2000,
  hz: 3000,
  ttd: 0
};

let audioCtx: AudioContext | null = null;
const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

let bgmAudio: HTMLAudioElement | null = null;
let isMuted = false;

const startBgm = () => {
  if (bgmAudio) return;
  bgmAudio = new Audio('https://cdn.pixabay.com/audio/2022/01/18/audio_d0a13f69d2.mp3');
  bgmAudio.loop = true;
  bgmAudio.volume = 0.3;
  if (!isMuted) {
    bgmAudio.play().catch(e => console.log("BGM autoplay blocked", e));
  }
};

const stopBgm = () => {
  if (bgmAudio) {
    bgmAudio.pause();
    bgmAudio = null;
  }
};

const toggleMute = () => {
  isMuted = !isMuted;
  if (bgmAudio) {
    if (isMuted) bgmAudio.pause();
    else bgmAudio.play().catch(() => {});
  }
  return isMuted;
};

const playSound = (type: 'jump' | 'score' | 'gameover' | 'hit' | 'newRecord' | 'powerup') => {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    
    if (type === 'jump') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'score') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.setValueAtTime(1200, now + 0.05);
      gainNode.gain.setValueAtTime(0.05, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'gameover') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'hit') {
      // Crisp "swish-bang" sound
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      
      const noiseOsc = audioCtx.createOscillator();
      const noiseGain = audioCtx.createGain();
      noiseOsc.type = 'sawtooth';
      noiseOsc.frequency.setValueAtTime(100, now);
      noiseOsc.connect(noiseGain);
      noiseGain.connect(audioCtx.destination);
      noiseGain.gain.setValueAtTime(0.2, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      noiseOsc.start(now);
      noiseOsc.stop(now + 0.15);

      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'newRecord') {
      // Fanfare arpeggio
      osc.type = 'square';
      const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
      let time = now;
      gainNode.gain.setValueAtTime(0, time);
      
      notes.forEach((freq, i) => {
        osc.frequency.setValueAtTime(freq, time);
        gainNode.gain.linearRampToValueAtTime(0.2, time + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, time + 0.15);
        time += 0.15;
      });
      
      osc.start(now);
      osc.stop(time);
    } else if (type === 'powerup') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  } catch (e) {
    console.error("Audio play failed", e);
  }
};

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
  isJumping: boolean;
  jumps: number;
  isSliding: boolean;
  slideTimer: number;
  shield: number;
  magnet: number;
  doubleScore: number;
  dash: number;
  invincibility: number;
  initialDashUsed: boolean;
  hjdjSkillActive: number;
  hjdjSkillCooldown: number;
  hzSkillCharges: number;
  hzSkillActive: number;
  hzSkillSprint: number;
  hzPassiveCharges: number;
  hddSkillTimer: number;
  hgteSkillCharges: number;
  hgtePartialCharges: number;
  hgteSkillActive: number;
  hgtePassiveUsed: boolean;
  hxdActive: boolean;
  ttdCombo: number;
  ttdMultiplier: number;
  ttdSuperJump: boolean;
  ttdEnergyBar: { active: boolean, type: 'jump' | 'crouch', timer: number, maxTimer: number };
}

const TtdUI = ({ playerRef, selectedCharacter }: { playerRef: React.RefObject<Player>, selectedCharacter: string }) => {
  const [tick, setTick] = useState(0);
  
  useEffect(() => {
    let frame: number;
    const update = () => {
      setTick(t => t + 1);
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, []);

  if (selectedCharacter !== 'ttd') return null;
  const player = playerRef.current;
  if (!player) return null;

  const progress = player.ttdEnergyBar.active 
    ? (player.ttdEnergyBar.timer / player.ttdEnergyBar.maxTimer) * 100 
    : 0;

  return (
    <div className="absolute bottom-4 left-24 z-10 flex flex-col items-start gap-1 pointer-events-none">
      {/* Arrows and Multiplier */}
      <div className="flex items-center gap-2 mb-1">
        <AnimatePresence mode="wait">
          {player.ttdEnergyBar.active && (
            <motion.div 
              key={player.ttdEnergyBar.type}
              initial={{ scale: 0.5, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0, y: -10 }}
              className={`w-12 h-12 rounded-full flex items-center justify-center border-4 ${
                player.ttdEnergyBar.type === 'jump' 
                  ? 'bg-green-500 border-green-300 shadow-[0_0_15px_rgba(74,222,128,0.5)]' 
                  : 'bg-red-500 border-red-300 shadow-[0_0_15px_rgba(248,113,113,0.5)]'
              }`}
            >
              {player.ttdEnergyBar.type === 'jump' ? (
                <ArrowUp className="text-white w-8 h-8" strokeWidth={4} />
              ) : (
                <ArrowDown className="text-white w-8 h-8" strokeWidth={4} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        <motion.div 
          key={player.ttdMultiplier}
          initial={{ scale: 1.2, color: '#fff' }}
          animate={{ scale: 1, color: '#facc15' }}
          className="bg-black/80 px-3 py-1 rounded-xl border-2 border-yellow-400 shadow-lg"
        >
          <span className="font-black text-xl italic tracking-tighter">
            x{player.ttdMultiplier.toFixed(1)}
          </span>
        </motion.div>
      </div>

      {/* Energy Bar */}
      <div className="relative w-48 h-6 bg-black/60 rounded-sm border-2 border-white/20 overflow-hidden transform skew-x-[-15deg]">
        <div 
          className="h-full bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-600 shadow-[0_0_10px_rgba(250,204,21,0.5)]"
          style={{ width: `${progress}%`, transition: 'width 0.05s linear' }}
        />
        <div className="absolute inset-0 flex items-center justify-center skew-x-[15deg]">
          <span className="text-[12px] font-black text-white uppercase tracking-widest drop-shadow-md">
            {player.ttdEnergyBar.active ? 'SEQUENCE' : 'READY'}
          </span>
        </div>
      </div>
    </div>
  );
};

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: ObstacleType;
  passed: boolean;
  vy?: number; // For floating/flying
  initialY?: number;
}

interface Boss {
  active: boolean;
  health: number;
  maxHealth: number;
  x: number;
  y: number;
  vy: number;
  phase: 'entering' | 'fighting' | 'defeated';
  attackTimer: number;
  playerHits: number;
  maxPlayerHits: number;
  projectiles: { x: number; y: number; vx: number; vy: number; width: number; height: number; type: 'milk' | 'diaper' }[];
  attackItems: { x: number; y: number; width: number; height: number; collected: boolean }[];
  playerProjectiles: { x: number; y: number; vx: number; vy: number; width: number; height: number }[];
  nextTriggerFrame: number;
}

interface PowerUp {
  x: number;
  y: number;
  width: number;
  height: number;
  type: PowerUpType;
  collected: boolean;
}

interface Diamond {
  x: number;
  y: number;
  width: number;
  height: number;
  collected: boolean;
}

interface Coin {
  x: number;
  y: number;
  width: number;
  height: number;
  collected: boolean;
}

interface BlackHole {
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
  rotation: number;
}

interface Cloud {
  x: number;
  y: number;
  width: number;
  speed: number;
  layer: number; // For parallax
}

interface BackgroundElement {
  x: number;
  y: number;
  type: string;
  layer: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

// --- Firebase Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Error Boundary ---
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      let message = "发生了一些错误。";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error.includes('insufficient permissions')) {
          message = "权限不足，请尝试重新登录。";
        }
      } catch(e) {}
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-8 text-center">
          <div className="bg-red-900/20 border border-red-500 p-6 rounded-2xl max-w-md">
            <h2 className="text-2xl font-bold text-red-500 mb-4">糟糕！</h2>
            <p className="text-white mb-6">{message}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-red-500 text-white rounded-full font-bold"
            >
              重试
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AvatarWithFrame = ({ avatarId, frameId, className = "w-16 h-16", onClick }: { avatarId: string, frameId?: FrameId | null, className?: string, onClick?: () => void }) => {
  const frame = frameId && AVATAR_FRAMES[frameId] ? AVATAR_FRAMES[frameId] : null;
  return (
    <div 
      className={`relative ${className} rounded-lg bg-[#f5e6c4] shrink-0 ${onClick ? 'cursor-pointer' : ''} ${frame?.effect === 'shake' ? 'animate-bounce' : ''}`}
      style={frame ? { border: frame.border, boxShadow: frame.shadow } : { border: '2px solid rgba(234, 179, 8, 0.5)' }}
      onClick={onClick}
    >
      <img src={getCharacterImage(avatarId)} alt="avatar" className={`w-full h-full object-contain ${frame?.effect === 'rotate' ? 'animate-spin' : ''}`} />
      {frame && frame.effect === 'glow' && <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />}
      {frame && frame.effect === 'pulse' && <div className="absolute inset-0 border-4 border-white/30 animate-ping pointer-events-none rounded-lg" />}
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <GameContent />
    </ErrorBoundary>
  );
}

function GameContent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scoreAccumulatorRef = useRef(0);
  const [gameState, setGameState] = useState<'start' | 'instructions' | 'playing' | 'paused' | 'gameover' | 'leaderboard' | 'gacha'>('start');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [rankPoints, setRankPoints] = useState<number | null>(null); // Default Bronze III
  const [rankedWins, setRankedWins] = useState(0);
  const [rankedTotal, setRankedTotal] = useState(0);
  const [diamonds, setDiamonds] = useState(200);
  const [inventory, setInventory] = useState<Record<PowerUpType, number>>({
    shield: 5,
    magnet: 5,
    doubleScore: 5,
    dash: 5
  });
  const [gameInventory, setGameInventory] = useState<Record<PowerUpType, number>>({
    shield: 0,
    magnet: 0,
    doubleScore: 0,
    dash: 0
  });
  const [leaderboard, setLeaderboard] = useState<{name: string, score: number, avatarId?: string, titleId?: TitleId, frameId?: FrameId, entranceEffectId?: EntranceEffectId}[]>([]);
  const [rankLeaderboard, setRankLeaderboard] = useState<{name: string, rankPoints: number, avatarId?: string, titleId?: TitleId, frameId?: FrameId, entranceEffectId?: EntranceEffectId}[]>([]);
  const [leaderboardTab, setLeaderboardTab] = useState<'score' | 'rank'>('score');
  const [selectedTitle, setSelectedTitle] = useState<TitleId | null>(null);
  const [unlockedTitles, setUnlockedTitles] = useState<TitleId[]>(['rookie']);
  const [selectedFrame, setSelectedFrame] = useState<FrameId | null>(null);
  const [unlockedFrames, setUnlockedFrames] = useState<FrameId[]>([]);
  const [selectedEntranceEffect, setSelectedEntranceEffect] = useState<EntranceEffectId | null>(null);
  const [unlockedEntranceEffects, setUnlockedEntranceEffects] = useState<EntranceEffectId[]>([]);
  const [showHonorModal, setShowHonorModal] = useState(false);
  const [honorTab, setHonorTab] = useState<'titles' | 'frames' | 'effects'>('titles');
  const [showRankedModal, setShowRankedModal] = useState(false);
  const [showRankRewardsModal, setShowRankRewardsModal] = useState(false);

  const [achievements, setAchievements] = useState<string[]>([]);
  const [unlockedCharacters, setUnlockedCharacters] = useState<string[]>(['hdd']);
  const [avatarId, setAvatarId] = useState<string>('hdd');
  const [showAvatarSelect, setShowAvatarSelect] = useState(false);
  const [unlockingChar, setUnlockingChar] = useState<string | null>(null);
  const [reviveCount, setReviveCount] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [showAdminMailModal, setShowAdminMailModal] = useState(false);
  const [adminMailData, setAdminMailData] = useState({ title: '', content: '', recipientId: 'all' });
  const [adminMailRewards, setAdminMailRewards] = useState<{type: string, amount: number}[]>([]);

  // Title Unlock Logic
  useEffect(() => {
    if (!user) return;
    const newTitles = [...unlockedTitles];
    let changed = false;

    // Common
    if (highScore >= 500 && !newTitles.includes('runner')) { newTitles.push('runner'); changed = true; }
    if (highScore >= 800 && !newTitles.includes('jumper')) { newTitles.push('jumper'); changed = true; }
    if (highScore >= 1200 && !newTitles.includes('explorer')) { newTitles.push('explorer'); changed = true; }

    // Rare
    if (highScore >= 2000 && !newTitles.includes('expert')) { newTitles.push('expert'); changed = true; }
    if (highScore >= 3000 && !newTitles.includes('acrobat')) { newTitles.push('acrobat'); changed = true; }
    if (highScore >= 4000 && !newTitles.includes('survivor')) { newTitles.push('survivor'); changed = true; }
    if (diamonds >= 5000 && !newTitles.includes('treasure_hunter')) { newTitles.push('treasure_hunter'); changed = true; }
    if (highScore >= 6000 && !newTitles.includes('wind_chaser')) { newTitles.push('wind_chaser'); changed = true; }

    // Epic
    if (highScore >= 8000 && !newTitles.includes('void_walker')) { newTitles.push('void_walker'); changed = true; }
    if (highScore >= 10000 && !newTitles.includes('neon_dreamer')) { newTitles.push('neon_dreamer'); changed = true; }
    if (highScore >= 12000 && !newTitles.includes('speed_demon')) { newTitles.push('speed_demon'); changed = true; }
    if (highScore >= 14000 && !newTitles.includes('shadow_ninja')) { newTitles.push('shadow_ninja'); changed = true; }
    if (highScore >= 16000 && !newTitles.includes('star_gazer')) { newTitles.push('star_gazer'); changed = true; }
    if (highScore >= 18000 && !newTitles.includes('time_traveler')) { newTitles.push('time_traveler'); changed = true; }
    if (highScore >= 20000 && !newTitles.includes('dragon_rider')) { newTitles.push('dragon_rider'); changed = true; }

    // Legendary
    if (diamonds >= 50000 && !newTitles.includes('diamond_king')) { newTitles.push('diamond_king'); changed = true; }
    if (leaderboard.length > 0 && leaderboard[0].name === (user.displayName || '匿名玩家') && !newTitles.includes('king')) { newTitles.push('king'); changed = true; }
    if (highScore >= 30000 && !newTitles.includes('hdd_shadow')) { newTitles.push('hdd_shadow'); changed = true; }
    if (highScore >= 40000 && !newTitles.includes('god_mode')) { newTitles.push('god_mode'); changed = true; }
    if (highScore >= 50000 && !newTitles.includes('galaxy_lord')) { newTitles.push('galaxy_lord'); changed = true; }
    if (highScore >= 60000 && !newTitles.includes('immortal')) { newTitles.push('immortal'); changed = true; }
    if (highScore >= 70000 && !newTitles.includes('cyber_punk')) { newTitles.push('cyber_punk'); changed = true; }
    if (highScore >= 80000 && !newTitles.includes('abyss_watcher')) { newTitles.push('abyss_watcher'); changed = true; }
    if (highScore >= 100000 && !newTitles.includes('creator')) { newTitles.push('creator'); changed = true; }

    // Ranked Titles
    const currentRP = rankPoints ?? 1000;
    if (currentRP >= 0 && !newTitles.includes('rank_bronze')) { newTitles.push('rank_bronze'); changed = true; }
    if (currentRP >= 1200 && !newTitles.includes('rank_silver')) { newTitles.push('rank_silver'); changed = true; }
    if (currentRP >= 1400 && !newTitles.includes('rank_gold')) { newTitles.push('rank_gold'); changed = true; }
    if (currentRP >= 1600 && !newTitles.includes('rank_platinum')) { newTitles.push('rank_platinum'); changed = true; }
    if (currentRP >= 1800 && !newTitles.includes('rank_diamond')) { newTitles.push('rank_diamond'); changed = true; }
    if (currentRP >= 2000 && !newTitles.includes('rank_star')) { newTitles.push('rank_star'); changed = true; }
    if (currentRP >= 2200 && !newTitles.includes('rank_king')) { newTitles.push('rank_king'); changed = true; }

    if (changed) {
      setUnlockedTitles(newTitles);
      setDoc(doc(db, 'users', user.uid), { unlockedTitles: newTitles }, { merge: true });
    }

    const newFrames = [...unlockedFrames];
    let framesChanged = false;
    if (currentRP >= 1400 && !newFrames.includes('gold_shield')) { newFrames.push('gold_shield'); framesChanged = true; }
    if (currentRP >= 1600 && !newFrames.includes('platinum_wings')) { newFrames.push('platinum_wings'); framesChanged = true; }
    if (currentRP >= 1800 && !newFrames.includes('diamond_light')) { newFrames.push('diamond_light'); framesChanged = true; }
    if (currentRP >= 2000 && !newFrames.includes('star_glow')) { newFrames.push('star_glow'); framesChanged = true; }
    if (currentRP >= 2200 && !newFrames.includes('king_wind')) { newFrames.push('king_wind'); framesChanged = true; }

    if (framesChanged) {
      setUnlockedFrames(newFrames);
      setDoc(doc(db, 'users', user.uid), { unlockedFrames: newFrames }, { merge: true });
    }

    const newEffects = [...unlockedEntranceEffects];
    let effectsChanged = false;
    if (currentRP >= 1600 && !newEffects.includes('flowing_light')) { newEffects.push('flowing_light'); effectsChanged = true; }
    if (currentRP >= 1800 && !newEffects.includes('diamond_sparkle')) { newEffects.push('diamond_sparkle'); effectsChanged = true; }
    if (currentRP >= 2000 && !newEffects.includes('star_trek')) { newEffects.push('star_trek'); effectsChanged = true; }
    if (currentRP >= 2200 && !newEffects.includes('king_arrival')) { newEffects.push('king_arrival'); effectsChanged = true; }

    if (effectsChanged) {
      setUnlockedEntranceEffects(newEffects);
      setDoc(doc(db, 'users', user.uid), { unlockedEntranceEffects: newEffects }, { merge: true });
    }
  }, [highScore, leaderboard, user, diamonds, rankPoints, unlockedTitles, unlockedFrames, unlockedEntranceEffects]);

  const selectTitle = async (titleId: TitleId | null) => {
    if (!user) return;
    setSelectedTitle(titleId);
    await setDoc(doc(db, 'users', user.uid), { selectedTitle: titleId }, { merge: true });
    // Also update leaderboard if exists
    await setDoc(doc(db, 'leaderboard', user.uid), { titleId }, { merge: true });
  };

  const selectFrame = async (frameId: FrameId | null) => {
    if (!user) return;
    setSelectedFrame(frameId);
    await setDoc(doc(db, 'users', user.uid), { selectedFrame: frameId }, { merge: true });
    await setDoc(doc(db, 'leaderboard', user.uid), { frameId }, { merge: true });
  };

  const selectEntranceEffect = async (effectId: EntranceEffectId | null) => {
    if (!user) return;
    setSelectedEntranceEffect(effectId);
    await setDoc(doc(db, 'users', user.uid), { selectedEntranceEffect: effectId }, { merge: true });
    await setDoc(doc(db, 'leaderboard', user.uid), { entranceEffectId: effectId }, { merge: true });
  };
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [playerImage, setPlayerImage] = useState<HTMLImageElement | null>(null);
  const [hxdImage, setHxdImage] = useState<HTMLImageElement | null>(null);
  const [hgteSkillImage, setHgteSkillImage] = useState<HTMLImageElement | null>(null);
  const [ndImage, setNdImage] = useState<HTMLImageElement | null>(null);
  
  const [isMutedState, setIsMutedState] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [selectedCharacter, setSelectedCharacter] = useState<'hdd' | 'santa' | 'hjdj' | 'hz' | 'hgte' | 'ttd'>('hdd');
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(true);
  const [showCharSelect, setShowCharSelect] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showGachaResultModal, setShowGachaResultModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [gachaResult, setGachaResult] = useState<{hgteFragments: number, ttdFragments: number, items: Record<string, number>}>({hgteFragments: 0, ttdFragments: 0, items: {}});
  const [checkInCount, setCheckInCount] = useState(0);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [checkInMessage, setCheckInMessage] = useState('');
  const [hgteFragments, setHgteFragments] = useState(0);
  const [ttdFragments, setTtdFragments] = useState(0);
  
  // Multiplayer state
  const [matchState, setMatchState] = useState<'none' | 'matching' | 'vs' | 'playing' | 'finished'>('none');
  const [matchmakingStatus, setMatchmakingStatus] = useState<string>('正在连接服务器...');
  const [matchId, setMatchId] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<{ name: string, score: number, status: string, character?: string, title?: string } | null>(null);
  const [matchResult, setMatchResult] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [matchMessage, setMatchMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  
  const envRef = useRef({
    biomeIndex: 0,
    weather: 'CLEAR' as WeatherType,
    weatherTimer: 0,
    weatherParticles: [] as {x: number, y: number, vx: number, vy: number, size: number, type: string, life: number}[],
    speedLines: [] as {x: number, y: number, length: number, speed: number, alpha: number}[],
    biomeTransition: 0,
    announcement: '',
    announcementTimer: 0,
    hasAnnouncedNewRecord: false,
    entranceEffectTimer: 0
  });

  const playerRef = useRef<Player>({ 
    x: 80, y: 0, width: 60, height: 120, vy: 0, 
    isJumping: false, jumps: 0, 
    isSliding: false, slideTimer: 0,
    shield: 0, magnet: 0, doubleScore: 0, 
    dash: 0, invincibility: 0, initialDashUsed: true,
    hjdjSkillActive: 0,
    hjdjSkillCooldown: 0,
    hzSkillCharges: 0,
    hzSkillActive: 0,
    hzSkillSprint: 0,
    hzPassiveCharges: 1,
    hddSkillTimer: 420,
    hgteSkillCharges: 3,
    hgtePartialCharges: 0,
    hgteSkillActive: 0,
    hgtePassiveUsed: false,
    hxdActive: false,
    ttdCombo: 0,
    ttdMultiplier: 1,
    ttdSuperJump: false,
    ttdEnergyBar: { active: false, type: 'jump', timer: 0, maxTimer: 90 }
  });
  const obstaclesRef = useRef<Obstacle[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const diamondsRef = useRef<Diamond[]>([]);
  const coinsRef = useRef<Coin[]>([]);
  const bossRef = useRef<Boss>({
    active: false,
    health: 100,
    maxHealth: 100,
    x: 0,
    y: 0,
    vy: 2,
    phase: 'entering',
    attackTimer: 0,
    playerHits: 0,
    maxPlayerHits: 5,
    projectiles: [],
    attackItems: [],
    playerProjectiles: [],
    nextTriggerFrame: 3600
  });
  const blackHoleRef = useRef<BlackHole | null>(null);
  const blackHoleCooldownRef = useRef(0);
  const bonusLevelRef = useRef({
    active: false,
    timer: 0,
    duration: 600 // 10 seconds at 60fps
  });
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef<number>(0);
  const animationRef = useRef<number>(0);
  const speedRef = useRef(DIFFICULTY_SETTINGS.normal.speed);
  const spawnRateRef = useRef(DIFFICULTY_SETTINGS.normal.spawnRate);
  const particlesRef = useRef<Particle[]>([]);
  
  const cloudsRef = useRef<Cloud[]>(Array.from({length: 12}, () => ({
    x: Math.random() * 800,
    y: Math.random() * 400 + 20,
    width: 40 + Math.random() * 100,
    speed: 0.1 + Math.random() * 0.5,
    layer: Math.floor(Math.random() * 3)
  })));

  const backgroundElementsRef = useRef<BackgroundElement[]>([]);

  const createParticles = useCallback((x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 1) * 6,
        life: 0,
        maxLife: 20 + Math.random() * 20,
        color,
        size: 2 + Math.random() * 4
      });
    }
  }, []);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authError, setAuthError] = useState('');

  // Friends & Custom Rooms state
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showMailModal, setShowMailModal] = useState(false);
  const [mails, setMails] = useState<any[]>([]);
  const [selectedMail, setSelectedMail] = useState<any>(null);
  const [friends, setFriends] = useState<string[]>([]);
  const [rankChange, setRankChange] = useState<{from: any, to: any, type: 'up' | 'down' | 'same', rpChange: number, currentRP: number, newRP: number} | null>(null);

  const isModalOpen = showHonorModal || showRankedModal || showRankRewardsModal || showAvatarSelect || showCharSelect || 
                      showCheckInModal || showGachaResultModal || showInventoryModal || 
                      showFriendsModal || showAuthModal || rankChange !== null ||
                      ['leaderboard', 'gacha', 'instructions'].includes(gameState);

  const [allUsers, setAllUsers] = useState<{uid: string, name: string, avatarId: string}[]>([]);
  const [friendsData, setFriendsData] = useState<{uid: string, name: string, avatarId: string, title?: string}[]>([]);
  const [pendingInvitation, setPendingInvitation] = useState<any>(null);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [matchType, setMatchType] = useState<'random' | 'private' | 'ranked'>('random');

  // --- Firebase Auth & Sync ---
  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;
    
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setIsAuthReady(true);
      
      if (unsubscribeUser) {
        unsubscribeUser();
        unsubscribeUser = null;
      }
      
      if (u) {
        // Fetch user stats
        try {
          unsubscribeUser = onSnapshot(doc(db, 'users', u.uid), async (userDoc) => {
            if (userDoc.exists()) {
              const data = userDoc.data();
              console.log("Firestore data received:", data);
              console.log("Rank points in data:", data.rankPoints);
              setHighScore(data.highScore || 0);
              const rp = data.rankPoints ?? 1000;
              setRankPoints(rp);
              console.log("Rank points state updated to:", rp);
              setRankedWins(data.rankedWins || 0);
              setRankedTotal(data.rankedTotal || 0);
              setDiamonds(data.diamonds || 0);
              const loadedInventory = data.inventory || { shield: 5, magnet: 5, doubleScore: 5, dash: 5 };
              setInventory(loadedInventory);
              setAchievements(data.achievements || []);
              
              const loadedUnlocked = data.unlockedCharacters || ['hdd'];
              const hgteFragments = data.hgteFragments || 0;
              const ttdFragments = data.ttdFragments || 0;
              
              setUnlockedCharacters(loadedUnlocked);
              
              setAvatarId(data.avatarId || 'hdd');
              setFriends(data.friends || []);
              setHgteFragments(data.hgteFragments || 0);
              setTtdFragments(data.ttdFragments || 0);
              setSelectedTitle(data.selectedTitle || null);
              setUnlockedTitles(data.unlockedTitles || ['rookie']);
              setSelectedFrame(data.selectedFrame || null);
              setUnlockedFrames(data.unlockedFrames || []);
              setSelectedEntranceEffect(data.selectedEntranceEffect || null);
              setUnlockedEntranceEffects(data.unlockedEntranceEffects || []);

            } else {
              // Initialize user doc
              const initialData = {
                userId: u.uid,
                name: u.displayName || '匿名玩家',
                email: u.email || '',
                highScore: 0,
                rankPoints: 1000,
                rankedWins: 0,
                rankedTotal: 0,
                totalGames: 0,
                diamonds: 200,
                inventory: { shield: 5, magnet: 5, doubleScore: 5, dash: 5 },
                achievements: [],
                unlockedCharacters: ['hdd'],
                hgteFragments: 0,
                ttdFragments: 0,
                avatarId: 'hdd',
                friends: [],
                selectedTitle: null,
                unlockedTitles: ['rookie'],
                selectedFrame: null,
                unlockedFrames: [],
                selectedEntranceEffect: null,
                unlockedEntranceEffects: []
              };
              await setDoc(doc(db, 'users', u.uid), initialData);
            }
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, `users/${u.uid}`);
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${u.uid}`);
        }

        // Fetch check-in data
        try {
          const checkInDoc = await getDoc(doc(db, 'checkIn', u.uid));
          if (checkInDoc.exists()) {
            const data = checkInDoc.data();
            const lastCheckInDate = data.lastCheckIn?.toDate();
            const count = data.checkInCount || 0;
            
            if (lastCheckInDate) {
              const today = new Date();
              const yesterday = new Date(today);
              yesterday.setDate(yesterday.getDate() - 1);
              
              const isToday = lastCheckInDate.toDateString() === today.toDateString();
              const isYesterday = lastCheckInDate.toDateString() === yesterday.toDateString();
              
              setHasCheckedInToday(isToday);
              
              if (isToday) {
                setCheckInCount(count);
              } else if (isYesterday) {
                setCheckInCount(count === 7 ? 0 : count);
              } else {
                setCheckInCount(0);
              }
            } else {
              setCheckInCount(0);
              setHasCheckedInToday(false);
            }
          } else {
            setCheckInCount(0);
            setHasCheckedInToday(false);
          }
        } catch (error) {
          console.error("Failed to fetch checkIn data", error);
        }
      } else {
        // Reset to local or zero
        setHighScore(Number(localStorage.getItem('highScore')) || 0);
        setAchievements(JSON.parse(localStorage.getItem('achievements') || '[]'));
      }
    });

    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    return () => {
      unsubscribe();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  // Fetch mails
  useEffect(() => {
    if (!user) {
      setMails([]);
      return;
    }
    const mailsQuery = query(
      collection(db, 'mails'),
      where('recipientId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );
    const unsubscribeMails = onSnapshot(mailsQuery, (snapshot) => {
      const loadedMails = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMails(loadedMails);
    }, (error) => {
      console.error("Mails listener error:", error);
    });
    return () => unsubscribeMails();
  }, [user]);

  // Invitation Listener
  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'invitations'), 
      where('toUid', '==', user.uid), 
      where('status', '==', 'pending')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Only show invitations if we are not currently in a match
      if (matchStateRef.current === 'none') {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            console.log("New invitation received:", data);
            setPendingInvitation({ id: change.doc.id, ...data });
          }
        });
      }
    });
    
    return () => unsubscribe();
  }, [user]);

  // --- Leaderboard Real-time Sync ---
  useEffect(() => {
    if (!user) return;
    
    // Score Leaderboard
    const scoreQuery = query(collection(db, 'leaderboard'), orderBy('score', 'desc'), limit(10));
    const unsubscribeScore = onSnapshot(scoreQuery, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({
        userId: doc.id,
        name: doc.data().name,
        score: doc.data().score,
        avatarId: doc.data().avatarId,
        titleId: doc.data().titleId,
        frameId: doc.data().frameId,
        entranceEffectId: doc.data().entranceEffectId
      }));
      setLeaderboard(entries);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'leaderboard');
    });

    // Rank Leaderboard
    const rankQuery = query(collection(db, 'users'), orderBy('rankPoints', 'desc'), limit(10));
    const unsubscribeRank = onSnapshot(rankQuery, (snapshot) => {
      const entries = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          userId: doc.id,
          name: data.name || '匿名玩家',
          rankPoints: typeof data.rankPoints === 'number' ? data.rankPoints : 1000,
          rankedWins: data.rankedWins || 0,
          rankedTotal: data.rankedTotal || 0,
          avatarId: data.avatarId,
          titleId: data.selectedTitle,
          frameId: data.selectedFrame,
          entranceEffectId: data.selectedEntranceEffect
        };
      });
      console.log("Rank Leaderboard updated:", entries.length, "entries");
      setRankLeaderboard(entries);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => {
      unsubscribeScore();
      unsubscribeRank();
    };
  }, [user]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'register') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
          await updateProfile(userCredential.user, { displayName });
          // Force a reload to ensure the user object has the updated displayName
          // because Firebase User object is a class instance and spreading it breaks it.
          window.location.reload();
          return;
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setShowAuthModal(false);
      setEmail('');
      setPassword('');
      setDisplayName('');
    } catch (error: any) {
      console.error("Auth error", error);
      if (error.code === 'auth/email-already-in-use') setAuthError('该邮箱已被注册');
      else if (error.code === 'auth/invalid-email') setAuthError('邮箱格式无效');
      else if (error.code === 'auth/weak-password') setAuthError('密码太弱，至少需要6位');
      else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') setAuthError('账号或密码错误');
      else setAuthError('认证失败：' + error.message);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      const usersList = snapshot.docs.map(doc => ({
        uid: doc.id,
        name: doc.data().name || '匿名玩家',
        avatarId: doc.data().avatarId || 'default'
      }));
      setAllUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const openAdminMailModal = () => {
    fetchAllUsers();
    setAdminMailData({ title: '', content: '', recipientId: 'all' });
    setAdminMailRewards([]);
    setShowAdminMailModal(true);
  };

  const sendAdminMail = async () => {
    if (!adminMailData.title.trim() || !adminMailData.content.trim()) {
      alert('请输入邮件标题和内容');
      return;
    }
    try {
      const baseMailData: any = {
        title: adminMailData.title,
        content: adminMailData.content,
        sender: '系统管理员',
        timestamp: serverTimestamp(),
        isRead: false
      };
      if (adminMailRewards.length > 0) {
        baseMailData.rewards = adminMailRewards;
      }

      if (adminMailData.recipientId === 'all') {
        const promises = allUsers.map(u => 
          addDoc(collection(db, 'mails'), { ...baseMailData, recipientId: u.uid })
        );
        await Promise.all(promises);
      } else {
        await addDoc(collection(db, 'mails'), { ...baseMailData, recipientId: adminMailData.recipientId });
      }

      alert('邮件发送成功！');
      setShowAdminMailModal(false);
    } catch (error) {
      console.error('Error sending admin mail:', error);
      alert('发送失败，请检查控制台。');
    }
  };

  const markMailAsRead = async (mail: any) => {
    if (mail.isRead) return;
    try {
      await updateDoc(doc(db, 'mails', mail.id), { isRead: true });
    } catch (error) {
      console.error("Error marking mail as read:", error);
    }
  };

  const claimMailRewards = async (mail: any) => {
    if (mail.isClaimed || !mail.rewards || !user) return;
    try {
      let newDiamonds = diamonds;
      let newInventory = { ...inventory };
      let newHgteFragments = hgteFragments;
      let newTtdFragments = ttdFragments;
      let newUnlocked = [...unlockedCharacters];
      
      mail.rewards.forEach((reward: any) => {
        if (reward.type === 'diamonds') newDiamonds += reward.amount;
        else if (['shield', 'magnet', 'doubleScore', 'dash'].includes(reward.type)) {
          newInventory[reward.type as PowerUpType] = (newInventory[reward.type as PowerUpType] || 0) + reward.amount;
        } else if (reward.type === 'hgteFragments') {
          newHgteFragments += reward.amount;
        } else if (reward.type === 'ttdFragments') {
          newTtdFragments += reward.amount;
        } else if (reward.type.startsWith('char_')) {
          const charId = reward.type.replace('char_', '');
          if (!newUnlocked.includes(charId)) {
            newUnlocked.push(charId);
          }
        }
      });
      
      setDiamonds(newDiamonds);
      setInventory(newInventory);
      setHgteFragments(newHgteFragments);
      setTtdFragments(newTtdFragments);
      setUnlockedCharacters(newUnlocked);
      
      await setDoc(doc(db, 'users', user.uid), {
        diamonds: newDiamonds,
        inventory: newInventory,
        hgteFragments: newHgteFragments,
        ttdFragments: newTtdFragments,
        unlockedCharacters: newUnlocked
      }, { merge: true });
      
      await updateDoc(doc(db, 'mails', mail.id), { isClaimed: true, isRead: true });
      
      setToastMessage('领取成功');
      setTimeout(() => setToastMessage(''), 3000);
      
      setSelectedMail({ ...mail, isClaimed: true, isRead: true });
    } catch (error) {
      console.error("Error claiming mail rewards:", error);
    }
  };

  const deleteMail = async (mailId: string) => {
    try {
      await deleteDoc(doc(db, 'mails', mailId));
      setSelectedMail(null);
    } catch (error) {
      console.error("Error deleting mail:", error);
    }
  };

  const loginGuest = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Guest login failed", error);
    }
  };

  const handleCheckIn = async () => {
    if (!user) {
      setCheckInMessage('请先登录');
      setTimeout(() => setCheckInMessage(''), 3000);
      return;
    }

    if (hasCheckedInToday) {
      setCheckInMessage('今天已经签到过了，请明天再来！');
      setTimeout(() => setCheckInMessage(''), 3000);
      return;
    }

    const newCount = (checkInCount % 7) + 1;
    const reward = newCount === 7 ? 9999 : 8888;
    const newDiamonds = diamonds + reward;
    
    setDiamonds(newDiamonds);
    setCheckInCount(newCount);
    setHasCheckedInToday(true);
    setCheckInMessage(`签到成功！获得 ${reward} 钻石💎`);
    setTimeout(() => setCheckInMessage(''), 3000);

    try {
      await setDoc(doc(db, 'users', user.uid), { diamonds: newDiamonds }, { merge: true });
      await setDoc(doc(db, 'checkIn', user.uid), {
        userId: user.uid,
        lastCheckIn: serverTimestamp(),
        checkInCount: newCount
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `checkIn/${user.uid}`);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handleGacha = async (count: number) => {
    const cost = count === 10 ? 800 : 91;
    if (diamonds < cost) {
      alert('钻石不足！');
      return;
    }
    
    setDiamonds(prev => prev - cost);
    
    let ttdFragmentsGained = 0;
    const newInv = { ...inventory };
    
    for (let i = 0; i < count; i++) {
      const roll = Math.random();
      if (roll < 0.2) {
        ttdFragmentsGained += 1;
      } else {
        const types: PowerUpType[] = ['shield', 'magnet', 'doubleScore', 'dash'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        newInv[randomType] = (newInv[randomType] || 0) + 1;
      }
    }
    
    let newHgteFragments = hgteFragments;
    let newTtdFragments = ttdFragments + ttdFragmentsGained;
    let newUnlocked = [...unlockedCharacters];
    
    if (newTtdFragments >= 78 && !newUnlocked.includes('ttd')) {
      newUnlocked.push('ttd');
      setUnlockedCharacters(newUnlocked);
      setUnlockingChar('ttd');
      newTtdFragments -= 78;
    }
    
    setTtdFragments(newTtdFragments);
    setInventory(newInv);
    
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          diamonds: diamonds - cost,
          inventory: newInv,
          ttdFragments: newTtdFragments,
          unlockedCharacters: newUnlocked
        }, { merge: true });
      } catch (error) {
        console.error("Gacha update error:", error);
        // If update fails, revert state
        setDiamonds(diamonds);
        setTtdFragments(ttdFragments);
        setInventory(inventory);
        setUnlockedCharacters(unlockedCharacters);
        alert('数据同步失败，请检查网络连接。');
        return;
      }
    }
    
    const itemsGained: Record<string, number> = {};
    Object.entries(newInv).forEach(([k, v]) => {
      const diff = v - (inventory[k as PowerUpType] || 0);
      if (diff > 0) itemsGained[k] = diff;
    });
    
    setGachaResult({
      hgteFragments: 0,
      ttdFragments: ttdFragmentsGained,
      items: itemsGained
    });
    setShowGachaResultModal(true);
  };

  const checkAchievements = useCallback(async (currentScore: number) => {
    const newAchievements: string[] = [];
    if (currentScore >= 10 && !achievements.includes('初出茅庐')) newAchievements.push('初出茅庐');
    if (currentScore >= 50 && !achievements.includes('跑酷达人')) newAchievements.push('跑酷达人');
    if (currentScore >= 100 && !achievements.includes('呼大帝之影')) newAchievements.push('呼大帝之影');
    
    if (newAchievements.length > 0) {
      const updated = [...achievements, ...newAchievements];
      setAchievements(updated);
      localStorage.setItem('achievements', JSON.stringify(updated));
      
      if (user) {
        try {
          await setDoc(doc(db, 'users', user.uid), { achievements: updated }, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
        }
      }
    }
  }, [achievements, user]);

  // Fetch all users for friends modal
  useEffect(() => {
    if (!showFriendsModal || !user) return;
    
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'), limit(100));
        const querySnapshot = await getDocs(q);
        const usersList: any[] = [];
        querySnapshot.forEach((doc) => {
          if (doc.id !== user.uid) {
            usersList.push({ 
              uid: doc.id, 
              name: doc.data().name, 
              avatarId: doc.data().avatarId,
              title: doc.data().selectedTitle
            });
          }
        });
        setAllUsers(usersList);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    
    fetchUsers();
  }, [showFriendsModal, user]);

  // Update friendsData when friends or allUsers changes
  useEffect(() => {
    if (allUsers.length > 0 && friends.length > 0) {
      const data = allUsers.filter(u => friends.includes(u.uid));
      setFriendsData(data);
    } else {
      setFriendsData([]);
    }
  }, [allUsers, friends]);


  // Listen for invitations
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'matches'),
      where('invitedFriendUid', '==', user.uid),
      where('status', '==', 'waiting')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setPendingInvitation({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setPendingInvitation(null);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const inviteFriend = async (friendUid: string) => {
    if (!user) return;
    
    // 1. Create a private room first if not already in one
    let roomId = matchId;
    if (!roomId) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setRoomCodeInput(code);
      setIsHost(true);
      setMatchType('private');
      setMatchState('matching');
      matchStateRef.current = 'matching';
      setMatchmakingStatus('等待好友加入...');
      setIsMultiplayer(true);
      
      // Create the match
      const newMatchRef = doc(collection(db, 'matches'));
      await setDoc(newMatchRef, {
        status: 'waiting',
        createdAt: serverTimestamp(),
        roomType: 'private',
        roomId: code,
        player1: {
          uid: user.uid,
          name: user.displayName || (user.isAnonymous ? '游客玩家' : '匿名玩家'),
          score: 0,
          status: 'playing',
          character: selectedCharacter
        }
      });
      roomId = newMatchRef.id;
      setMatchId(roomId);
      matchIdRef.current = roomId;
    }

    // 2. Send invitation to friend (via a new 'invitations' collection)
    try {
      await addDoc(collection(db, 'invitations'), {
        fromUid: user.uid,
        fromName: user.displayName || '匿名玩家',
        toUid: friendUid,
        matchId: roomId,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      alert("邀请已发送！");
    } catch (error) {
      console.error("Error inviting friend:", error);
      alert("邀请发送失败");
    }
  };

  const handleAcceptInvitation = async (invitation: any) => {
    if (!user || !invitation) {
      console.error("Cannot accept invitation: user or invitation missing", { user: !!user, invitation: !!invitation });
      return;
    }
    
    console.log("Accepting invitation:", invitation);
    
    try {
      // Set initial state for joining
      setMatchType('private');
      setMatchState('matching');
      matchStateRef.current = 'matching';
      setMatchmakingStatus('正在加入房间...');
      setIsMultiplayer(true);
      setMatchResult(null);
      setOpponent(null);
      setIsHost(false);
      setGameState('start'); // Ensure we are on the main menu to see the modal
      
      const matchRef = doc(db, 'matches', invitation.matchId);
      
      let joined = false;
      await runTransaction(db, async (transaction) => {
        const sfDoc = await transaction.get(matchRef);
        if (!sfDoc.exists()) {
          throw new Error("房间已不存在");
        }
        
        const matchData = sfDoc.data();
        if (matchData.status !== 'waiting') {
          throw new Error("房间已开始或已结束");
        }
        
        if (matchData.player2) {
          throw new Error("房间已满");
        }
        
        // Join the match
        transaction.update(matchRef, {
          player2: {
            uid: user.uid,
            name: user.displayName || (user.isAnonymous ? '游客玩家' : '匿名玩家'),
            score: 0,
            status: 'playing',
            character: selectedCharacter
          },
          status: 'ready' // Mark as ready for host to start
        });
        
        joined = true;
      });
      
      if (joined) {
        console.log("Successfully joined match:", invitation.matchId);
        setMatchId(invitation.matchId);
        matchIdRef.current = invitation.matchId;
        setMatchmakingStatus('已加入房间，等待房主开始...');
        
        // Update invitation status
        await updateDoc(doc(db, 'invitations', invitation.id), { status: 'accepted' });
        
        // Close invitation modal
        setPendingInvitation(null);
      }
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      alert("加入房间失败: " + (error.message || "未知错误"));
      
      setMatchState('none');
      matchStateRef.current = 'none';
      setIsMultiplayer(false);
      setMatchId(null);
      
      // Update invitation status to rejected if failed
      try {
        await updateDoc(doc(db, 'invitations', invitation.id), { status: 'rejected' });
      } catch (e) {
        console.error("Failed to update invitation status:", e);
      }
      
      // Close invitation modal even on failure
      setPendingInvitation(null);
    }
  };

  const addFriend = async (friendUid: string) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        friends: arrayUnion(friendUid)
      }, { merge: true });
      setFriends(prev => [...prev, friendUid]);
    } catch (error) {
      console.error("Error adding friend:", error);
    }
  };

  const removeFriend = async (friendUid: string) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        friends: arrayRemove(friendUid)
      }, { merge: true });
      setFriends(prev => prev.filter(id => id !== friendUid));
    } catch (error) {
      console.error("Error removing friend:", error);
    }
  };

  const createPrivateRoom = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setRoomCodeInput(code);
    setIsHost(true);
    setMatchType('private');
    setMatchState('matching');
    matchStateRef.current = 'matching';
    setMatchmakingStatus('等待好友加入...');
    setIsMultiplayer(true);
    setMatchResult(null);
    setOpponent(null);
    setMatchId(null);
    
    await createNewMatch('private', code);
  };

  const joinPrivateRoom = async (code: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    
    if (!code || code.length !== 6) {
      alert("请输入6位房间号");
      return;
    }
    
    setMatchType('private');
    setMatchState('matching');
    matchStateRef.current = 'matching';
    setMatchmakingStatus('正在加入房间...');
    setIsMultiplayer(true);
    setMatchResult(null);
    setOpponent(null);
    setMatchId(null);
    setIsHost(false);
    
    try {
      const q = query(
        collection(db, 'matches'), 
        where('roomType', '==', 'private'),
        where('roomId', '==', code),
        where('status', '==', 'waiting'),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        alert("未找到该房间或房间已满");
        setMatchState('none');
        matchStateRef.current = 'none';
        setIsMultiplayer(false);
        return;
      }
      
      const matchDoc = querySnapshot.docs[0];
      const matchRef = doc(db, 'matches', matchDoc.id);
      
      let joined = false;
      await runTransaction(db, async (transaction) => {
        const sfDoc = await transaction.get(matchRef);
        if (!sfDoc.exists() || sfDoc.data().status !== 'waiting') {
          throw new Error("Room no longer available");
        }
        
        transaction.update(matchRef, {
          status: 'ready', // Change to ready so host can start
          player2: {
            uid: user.uid,
            name: user.displayName || (user.isAnonymous ? '游客玩家' : '匿名玩家'),
            score: 0,
            status: 'playing',
            character: selectedCharacter
          }
        });
        joined = true;
      });
      
      if (joined) {
        setMatchId(matchDoc.id);
        matchIdRef.current = matchDoc.id;
        setMatchmakingStatus('已加入房间，等待房主开始...');
      }
    } catch (e) {
      console.error("Join room error:", e);
      alert("加入房间失败");
      setMatchState('none');
      matchStateRef.current = 'none';
      setIsMultiplayer(false);
    }
  };

  const startPrivateMatch = async () => {
    if (!isHost || !matchId) return;
    try {
      setShowFriendsModal(false);
      await setDoc(doc(db, 'matches', matchId), {
        status: 'playing'
      }, { merge: true });
    } catch (e) {
      console.error("Start match error:", e);
    }
  };

  const createNewMatch = async (type: 'random' | 'private' | 'ranked' = 'random', roomId?: string) => {
    if (!user) return;
    try {
      const newMatchRef = doc(collection(db, 'matches'));
      const matchData: any = {
        status: 'waiting',
        createdAt: serverTimestamp(),
        roomType: type === 'ranked' ? 'random' : type,
        matchType: type,
        player1: {
          uid: user.uid,
          name: user.displayName || (user.isAnonymous ? '游客玩家' : '匿名玩家'),
          score: 0,
          status: 'playing',
          character: selectedCharacter
        }
      };
      if (type === 'private' && roomId) {
        matchData.roomId = roomId;
      }
      await setDoc(newMatchRef, matchData);
      createdMatchIdRef.current = newMatchRef.id;
      setMatchId(newMatchRef.id);
      matchIdRef.current = newMatchRef.id;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'matches');
      setMatchState('none');
      matchStateRef.current = 'none';
      setMatchId(null);
      setIsMultiplayer(false);
    }
  };

  const startMatchmaking = async (retryCount = 0, type?: 'random' | 'private' | 'ranked') => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    
    if (retryCount === 0 && matchStateRef.current === 'matching') {
      return; // Already matching
    }
    
    // Reset state
    const targetType = type || matchType;
    setMatchType(targetType);
    setMatchState('matching');
    matchStateRef.current = 'matching';
    setMatchmakingStatus('正在连接服务器...');
    setIsMultiplayer(true);
    setMatchResult(null);
    setOpponent(null);
    setMatchId(null);
    
    try {
      // Add a small random jitter to reduce simultaneous creation collisions
      // Only add jitter if not a retry
      if (retryCount === 0) {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
      }

      // Check if we are still in matching state after jitter
      if (matchStateRef.current !== 'matching') return;

      setMatchmakingStatus('正在扫描可用房间...');

      // Query for waiting matches
      const q = query(
        collection(db, 'matches'), 
        where('status', '==', 'waiting'), 
        where('matchType', '==', targetType),
        limit(10)
      );
      const querySnapshot = await getDocs(q);
      
        const validDocs = querySnapshot.docs.filter(doc => {
          const data = doc.data();
          const isNotMe = data.player1?.uid !== user.uid;
          const createdAt = data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now();
          const isRecent = Math.abs(Date.now() - createdAt) < 300000; // 5 minutes window to handle clock skew
          return isNotMe && isRecent;
        });
      
      if (validDocs.length > 0) {
        // Sort by newest first
        validDocs.sort((a, b) => {
          const timeA = a.data().createdAt?.toMillis ? a.data().createdAt.toMillis() : 0;
          const timeB = b.data().createdAt?.toMillis ? b.data().createdAt.toMillis() : 0;
          return timeB - timeA;
        });
        
        const matchDoc = validDocs[0];
        console.log("Matchmaking: Found existing match", matchDoc.id);
        const matchRef = doc(db, 'matches', matchDoc.id);
        
        try {
          await runTransaction(db, async (transaction) => {
            const sfDoc = await transaction.get(matchRef);
            if (!sfDoc.exists() || sfDoc.data().status !== 'waiting') {
              throw new Error("Match no longer available");
            }
            
            transaction.update(matchRef, {
              status: 'playing',
              player2: {
                uid: user.uid,
                name: user.displayName || (user.isAnonymous ? '游客玩家' : '匿名玩家'),
                score: 0,
                status: 'playing',
                character: selectedCharacter
              }
            });
          });
          
          console.log("Matchmaking: Successfully joined match", matchDoc.id);
          setMatchId(matchDoc.id);
          matchIdRef.current = matchDoc.id;
        } catch (e) {
          console.log("Matchmaking: Transaction failed, retrying...", e);
          if (retryCount < 3) {
            setTimeout(() => startMatchmaking(retryCount + 1, targetType), 500);
          } else {
            console.log("Matchmaking: Transaction failed after retries, creating new match");
            createNewMatch(targetType);
          }
        }
      } else {
        console.log("Matchmaking: No existing match found, creating new match");
        setMatchmakingStatus('未找到房间，正在创建新房间...');
        // No match found, but wait a tiny bit more to see if one appears (double check)
        await new Promise(resolve => setTimeout(resolve, 500));
        if (matchStateRef.current !== 'matching') return;
        
        const secondCheck = await getDocs(q);
        const stillNoMatches = secondCheck.docs.filter(doc => {
          const data = doc.data();
          const createdAt = data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now();
          return data.player1?.uid !== user.uid && 
                 Math.abs(Date.now() - createdAt) < 300000;
        }).length === 0;

        if (stillNoMatches) {
          setMatchmakingStatus('正在创建房间并等待对手...');
          createNewMatch(targetType);
        } else {
          console.log("Matchmaking: Match appeared during double check, retrying");
          // A match appeared! Retry the whole process once.
          startMatchmaking(retryCount + 1, targetType);
        }
      }
    } catch (e) {
      console.error("Matchmaking error:", e);
      handleFirestoreError(e, OperationType.LIST, 'matches');
      setMatchState('none');
      matchStateRef.current = 'none';
      setMatchId(null);
      setIsMultiplayer(false);
    }
  };

  const updateMatchScore = useCallback(async (currentScore: number, status?: string) => {
    if (!isMultiplayer || !matchId || !user || !matchDataRef.current) {
      console.log("updateMatchScore skipped", { isMultiplayer, matchId, user, matchData: !!matchDataRef.current });
      return;
    }
    try {
      const matchRef = doc(db, 'matches', matchId);
      const data = matchDataRef.current;
      const isPlayer1 = data.player1.uid === user.uid;
      const playerKey = isPlayer1 ? 'player1' : 'player2';
      
      const updateData: any = { ...data[playerKey], score: currentScore };
      if (status) updateData.status = status;

      console.log("updateMatchScore syncing", { playerKey, currentScore, status });

      // Update locally first to avoid waiting for snapshot
      matchDataRef.current = {
        ...data,
        [playerKey]: updateData
      };

      await setDoc(matchRef, {
        [playerKey]: updateData
      }, { merge: true });
      console.log("updateMatchScore sync success");
    } catch (e) {
      console.error("Score sync error:", e);
    }
  }, [isMultiplayer, matchId, user]);

  const finishMatch = useCallback(async (finalScore: number) => {
    if (!isMultiplayer || !matchId || !user) return;
    try {
      console.log("finishMatch called", { finalScore });
      await runTransaction(db, async (transaction) => {
        const matchRef = doc(db, 'matches', matchId);
        const sfDoc = await transaction.get(matchRef);
        if (!sfDoc.exists()) return;
        
        const data = sfDoc.data();
        const isPlayer1 = data.player1.uid === user.uid;
        const playerKey = isPlayer1 ? 'player1' : 'player2';
        const oppKey = isPlayer1 ? 'player2' : 'player1';
        
        console.log("finishMatch transaction", { playerKey, oppKey, status: data[oppKey]?.status });

        const newData = {
          ...data,
          [playerKey]: {
            ...data[playerKey],
            status: 'dead',
            score: finalScore
          }
        };
        
        if (newData[oppKey] && newData[oppKey].status === 'dead') {
          console.log("finishMatch: both players dead, finishing match");
          newData.status = 'finished';
          if (newData.player1.score > newData.player2.score) {
            newData.winner = newData.player1.uid;
          } else if (newData.player2.score > newData.player1.score) {
            newData.winner = newData.player2.uid;
          } else {
            newData.winner = 'draw';
          }
        }
        
        transaction.update(matchRef, newData);
      });
    } catch (e) {
      console.error("Match finish failed", e);
    }
  }, [isMultiplayer, matchId, user]);

  const updateRankPoints = useCallback(async (result: 'win' | 'lose' | 'draw', currentMatchType: string) => {
    console.log("updateRankPoints called", { result, currentMatchType, user: user?.uid });
    if (!user || currentMatchType !== 'ranked') return;
    try {
      const userRef = doc(db, 'users', user.uid);
      
      let toastMsg = '';
      let rankUpOrDown: {from: any, to: any, type: 'up' | 'down' | 'same', rpChange: number, currentRP: number, newRP: number} | null = null;

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) return;
        
        const data = userDoc.data();
        console.log("Transaction data:", data);
        let currentRP = data.rankPoints ?? 1000;
        console.log("Current RP in transaction:", currentRP);
        let wins = data.rankedWins || 0;
        let total = data.rankedTotal || 0;
        let currentDiamonds = data.diamonds || 0;
        let lastWinDate = data.lastRankedWinDate || '';
        
        const oldRank = getRankInfo(currentRP);
        const today = new Date().toISOString().split('T')[0];
        
        let rpChange = 0;
        let diamondReward = 0;

        if (result === 'win') {
          rpChange = 25;
          wins += 1;
          toastMsg = '排位胜利！积分 +25';
          if (lastWinDate !== today) {
            diamondReward = 50;
            lastWinDate = today;
            toastMsg += ' | 首胜奖励：+50 钻石！';
          }
        } else if (result === 'lose') {
          rpChange = -15;
          toastMsg = '排位失败！积分 -15';
        }
        
        total += 1;
        const newRP = Math.max(0, currentRP + rpChange);
        currentRP = newRP;
        currentDiamonds += diamondReward;
        
        const newRank = getRankInfo(currentRP);
        rankUpOrDown = {
          from: oldRank,
          to: newRank,
          type: newRank.name !== oldRank.name ? (currentRP > (data.rankPoints ?? 1000) ? 'up' : 'down') : 'same',
          rpChange: rpChange,
          currentRP: data.rankPoints ?? 1000,
          newRP: currentRP
        };

        console.log("Updating user document with:", {
          rankPoints: currentRP,
          rankedWins: wins,
          rankedTotal: total,
          diamonds: currentDiamonds,
          lastRankedWinDate: lastWinDate
        });
        transaction.update(userRef, {
          rankPoints: currentRP,
          rankedWins: wins,
          rankedTotal: total,
          diamonds: currentDiamonds,
          lastRankedWinDate: lastWinDate
        });
      });

      if (rankUpOrDown) {
        setRankChange(rankUpOrDown);
        // Auto hide after 6 seconds for the new cool animation
        setTimeout(() => setRankChange(null), 6000);
      }

      if (toastMsg) {
        setToastMessage(toastMsg);
        setTimeout(() => setToastMessage(''), 3000);
      }
    } catch (e) {
      console.error("Failed to update rank points", e);
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
    }
  }, [user]);

  const updateLeaderboard = useCallback(async (finalScore: number) => {
    if (!user) {
      // Local fallback
      const newEntry = { name: '你', score: finalScore };
      const updated = [{name: '你', score: finalScore}].sort((a, b) => b.score - a.score).slice(0, 5);
      // We don't set global leaderboard state here as it's synced from Firebase
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      const currentHigh = userDoc.exists() ? userDoc.data().highScore : 0;

      if (finalScore >= currentHigh) {
        // Update user stats
        await setDoc(userRef, { 
          highScore: finalScore,
          totalGames: (userDoc.exists() ? userDoc.data().totalGames : 0) + 1
        }, { merge: true });

        // Update global leaderboard
        await setDoc(doc(db, 'leaderboard', user.uid), {
          userId: user.uid,
          name: user.displayName || (user.isAnonymous ? '游客玩家' : '匿名玩家'),
          score: finalScore,
          avatarId: avatarId,
          titleId: selectedTitle,
          frameId: selectedFrame,
          entranceEffectId: selectedEntranceEffect,
          timestamp: serverTimestamp()
        });
      } else {
        // Just increment games
        await setDoc(userRef, { 
          totalGames: (userDoc.exists() ? userDoc.data().totalGames : 0) + 1
        }, { merge: true });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'leaderboard/users');
    }
  }, [user]);

  const startGame = useCallback(() => {
    initAudio();
    startBgm();
    setGameState('playing');
    setScore(0);
    setReviveCount(0);
    scoreAccumulatorRef.current = 0;
    
    envRef.current = {
      biomeIndex: 0,
      weather: 'CLEAR',
      weatherTimer: 0,
      weatherParticles: [],
      speedLines: [],
      biomeTransition: 0,
      announcement: '🌲 绿野森林',
      announcementTimer: 120,
      hasAnnouncedNewRecord: false,
      entranceEffectTimer: selectedEntranceEffect ? 180 : 0
    };
    
    // Initialize game inventory with a cap of 5
    setGameInventory({
      shield: Math.min(inventory.shield || 0, 5),
      magnet: Math.min(inventory.magnet || 0, 5),
      doubleScore: Math.min(inventory.doubleScore || 0, 5),
      dash: Math.min(inventory.dash || 0, 5),
    });

    playerRef.current = { 
      x: 50, y: 400, width: 60, height: 120, vy: 0, 
      isJumping: false, jumps: 0, 
      isSliding: false, slideTimer: 0,
      shield: 0, magnet: 0, doubleScore: 0, 
      dash: selectedCharacter === 'santa' ? 900 : 0,
      invincibility: 0,
      initialDashUsed: selectedCharacter !== 'santa',
      hjdjSkillActive: 0,
      hjdjSkillCooldown: 0,
      hzSkillCharges: 0,
      hzSkillActive: 0,
      hzSkillSprint: 0,
      hzPassiveCharges: 1,
      hddSkillTimer: 420,
      hgteSkillCharges: 3,
      hgtePartialCharges: 0,
      hgteSkillActive: 0,
      hgtePassiveUsed: false,
      hxdActive: false,
      ttdCombo: 0,
      ttdMultiplier: 1,
      ttdSuperJump: false,
      ttdEnergyBar: { active: false, type: 'jump', timer: 0, maxTimer: 90 }
    };
    
    obstaclesRef.current = [];
    powerUpsRef.current = [];
    diamondsRef.current = [];
    coinsRef.current = [];
    blackHoleRef.current = null;
    blackHoleCooldownRef.current = 0;
    bonusLevelRef.current = { active: false, timer: 0, duration: 600 };
    bossRef.current = {
      active: false,
      health: 100,
      maxHealth: 100,
      x: 0,
      y: 0,
      vy: 2,
      phase: 'entering',
      attackTimer: 0,
      playerHits: 0,
      maxPlayerHits: 5,
      projectiles: [],
      attackItems: [],
      playerProjectiles: [],
      nextTriggerFrame: 3600
    };
    particlesRef.current = [];
    frameCountRef.current = 0;
    speedRef.current = DIFFICULTY_SETTINGS[difficulty].speed;
    spawnRateRef.current = DIFFICULTY_SETTINGS[difficulty].spawnRate;
  }, [difficulty, selectedCharacter, inventory]);

  const matchDataRef = useRef<any>(null);
  const matchStateRef = useRef(matchState);
  const createdMatchIdRef = useRef<string | null>(null);
  const matchIdRef = useRef<string | null>(matchId);
  
  useEffect(() => {
    matchStateRef.current = matchState;
  }, [matchState]);

  useEffect(() => {
    matchIdRef.current = matchId;
  }, [matchId]);

  // --- Match Real-time Sync ---
  useEffect(() => {
    if (!matchId || !user) {
      matchDataRef.current = null;
      return;
    }
    
    const unsubscribe = onSnapshot(doc(db, 'matches', matchId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log("Match Sync: Received update", matchId, data.status);
        matchDataRef.current = data;
        
        const isPlayer1 = data.player1.uid === user.uid;
        const oppData = isPlayer1 ? data.player2 : data.player1;
        
        if (oppData) {
          setOpponent(oppData);
        }
        
        if (data.matchType) {
          setMatchType(data.matchType);
        }
        
        if (data.status === 'ready' && matchStateRef.current === 'matching') {
          if (isPlayer1) {
            setMatchmakingStatus('好友已加入，可以开始比赛！');
          } else {
            setMatchmakingStatus('已加入房间，等待房主开始...');
          }
        }
        
        if (data.status === 'playing' && matchStateRef.current === 'matching') {
          console.log("Match Sync: Match found, transitioning to playing", matchId);
          setShowFriendsModal(false);
          // Match found, show VS screen!
          setMatchState('vs');
          matchStateRef.current = 'vs';
          setMatchmakingStatus('匹配成功！');
          setTimeout(() => {
            if (matchStateRef.current === 'vs') {
              setMatchState('playing');
              matchStateRef.current = 'playing';
              startGame();
            }
          }, 3000);
        }
        
        if (data.status === 'finished' && matchStateRef.current !== 'finished') {
          console.log("Match Sync: Match finished", matchId);
          setMatchState('finished');
          matchStateRef.current = 'finished';
          if (data.winner === user.uid) {
            setMatchResult('win');
            updateRankPoints('win', data.matchType);
          } else if (data.winner === 'draw') {
            setMatchResult('draw');
            updateRankPoints('draw', data.matchType);
          } else {
            setMatchResult('lose');
            updateRankPoints('lose', data.matchType);
          }
        }
      } else {
        console.log("Match Sync: Match document does not exist", matchId);
        if (matchId !== matchIdRef.current) {
          console.log("Match Sync: Ignoring delete for old match", matchId);
          return;
        }
        if (matchStateRef.current === 'matching' || matchStateRef.current === 'vs') {
          setMatchMessage('匹配已取消或失效');
          setMatchState('none');
          matchStateRef.current = 'none';
          setMatchId(null);
          setIsMultiplayer(false);
          createdMatchIdRef.current = null;
        }
      }
    }, (error) => {
      console.error("Match Sync: Error", error);
      handleFirestoreError(error, OperationType.GET, `matches/${matchId}`);
    });
    
    return () => unsubscribe();
  }, [matchId, user, startGame, updateRankPoints]);

  // --- Matchmaking Timeout & Polling ---
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let pollInterval: NodeJS.Timeout;

    if (matchState === 'matching') {
      if (matchType === 'random') {
        timeout = setTimeout(() => {
          if (matchStateRef.current === 'matching') {
            setMatchMessage('匹配超时，请重试');
            setMatchState('none');
            matchStateRef.current = 'none';
            setMatchId(null);
            setIsMultiplayer(false);
            
            if (createdMatchIdRef.current) {
              deleteDoc(doc(db, 'matches', createdMatchIdRef.current)).catch(console.error);
              createdMatchIdRef.current = null;
            }
          }
        }, 60000); // 60 seconds timeout
      }

      // Poll every 3 seconds to see if there are other waiting matches we can join
      if (matchType === 'random') {
        pollInterval = setInterval(async () => {
          if (matchStateRef.current !== 'matching' || !user) return;
          
          // If we already joined a match (but haven't transitioned to 'vs' yet), don't poll
          if (matchIdRef.current && matchIdRef.current !== createdMatchIdRef.current) return;
          
          setMatchmakingStatus(prev => prev === '正在扩大搜索范围...' ? '正在等待对手加入...' : '正在扩大搜索范围...');
          
          try {
            const q = query(
              collection(db, 'matches'), 
              where('status', '==', 'waiting'), 
              limit(10)
            );
            const querySnapshot = await getDocs(q);
            
            const validDocs = querySnapshot.docs.filter(doc => {
              const data = doc.data();
              const isNotMe = data.player1?.uid !== user.uid;
              const isRandom = data.roomType === 'random' || !data.roomType;
              const createdAt = data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now();
              const isRecent = Math.abs(Date.now() - createdAt) < 300000;
              
              // Only join if the other match has a smaller ID than ours
              // This prevents two players from joining each other's matches simultaneously
              let isOlder = true;
              if (createdMatchIdRef.current) {
                 isOlder = doc.id < createdMatchIdRef.current;
              }
              
              return isNotMe && isRecent && isOlder && isRandom;
            });
            
            if (validDocs.length > 0) {
              // Sort by newest first
              validDocs.sort((a, b) => {
                const timeA = a.data().createdAt?.toMillis ? a.data().createdAt.toMillis() : 0;
                const timeB = b.data().createdAt?.toMillis ? b.data().createdAt.toMillis() : 0;
                return timeB - timeA;
              });
              
              const matchDoc = validDocs[0];
              const matchRef = doc(db, 'matches', matchDoc.id);
              
              let joined = false;
              await runTransaction(db, async (transaction) => {
                const sfDoc = await transaction.get(matchRef);
                if (!sfDoc.exists() || sfDoc.data().status !== 'waiting') {
                  return; // Can't join
                }
                
                transaction.update(matchRef, {
                  status: 'playing',
                  player2: {
                    uid: user.uid,
                    name: user.displayName || (user.isAnonymous ? '游客玩家' : '匿名玩家'),
                    score: 0,
                    status: 'playing',
                    character: selectedCharacter
                  }
                });
                joined = true;
              });
              
              if (joined) {
                console.log("Matchmaking Polling: Successfully joined match", matchDoc.id);
                setMatchId(matchDoc.id);
                matchIdRef.current = matchDoc.id;
                // Delete our own waiting match if we had one
                if (createdMatchIdRef.current) {
                  deleteDoc(doc(db, 'matches', createdMatchIdRef.current)).catch(console.error);
                  createdMatchIdRef.current = null;
                }
              }
            }
          } catch (e) {
            console.error("Polling error", e);
          }
        }, 3000);
      }
    }
    
    return () => {
      clearTimeout(timeout);
      clearInterval(pollInterval);
    };
  }, [matchState, user, selectedCharacter, matchType]);

  const activateHgteSkill = useCallback(() => {
    if (selectedCharacter === 'hgte' && playerRef.current && playerRef.current.hgteSkillCharges > 0) {
      playerRef.current.hgteSkillCharges -= 1;
      playerRef.current.hgteSkillActive = 30; // 0.5s duration for swing
      playSound('hit');
      setScore(s => s + 50);
      // Screen shake effect
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.transform = 'translate(5px, 5px)';
        setTimeout(() => {
          if (canvas) canvas.style.transform = 'translate(-5px, -5px)';
          setTimeout(() => {
            if (canvas) canvas.style.transform = 'translate(0, 0)';
          }, 50);
        }, 50);
      }
    }
  }, [selectedCharacter]);

  const activateHzSkill = useCallback(() => {
    if (selectedCharacter === 'hz' && playerRef.current) {
      const maxCharges = playerRef.current.hzPassiveCharges > 0 ? 4 : 2;
      if (playerRef.current.hzSkillCharges >= maxCharges) {
        playerRef.current.hzSkillCharges -= maxCharges;
        playerRef.current.hzSkillActive = 600; // 10 seconds duration for shield
        playSound('score');
      }
    }
  }, [selectedCharacter]);

  const activateHjdjSkill = useCallback(() => {
    if (selectedCharacter === 'hjdj' && playerRef.current && playerRef.current.hjdjSkillCooldown <= 0) {
      playerRef.current.hjdjSkillActive = 600; // 10 seconds
      playerRef.current.hjdjSkillCooldown = 1800; // 30 seconds
      playSound('score');
    }
  }, [selectedCharacter]);

  // --- Match Score Sync ---
  const lastSyncedScoreRef = useRef(0);
  const lastSyncTimeRef = useRef(0);
  useEffect(() => {
    if (isMultiplayer && matchState === 'playing') {
      const now = Date.now();
      if (now - lastSyncTimeRef.current >= 1000 && score !== lastSyncedScoreRef.current) {
        updateMatchScore(score);
        lastSyncedScoreRef.current = score;
        lastSyncTimeRef.current = now;
      }
    } else if (matchState === 'none' || matchState === 'matching') {
      lastSyncedScoreRef.current = 0;
      lastSyncTimeRef.current = 0;
    }
  }, [score, isMultiplayer, matchState, updateMatchScore]);

  // --- BGM Control ---
  useEffect(() => {
    const handleFirstInteraction = () => {
      initAudio();
      startBgm();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);
    
    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  const handleToggleMute = () => {
    const muted = toggleMute();
    setIsMutedState(muted);
  };

  const handleDifficultyChange = useCallback((newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
    const timeFactor = Math.floor(frameCountRef.current / 1000);
    const maxSpeed = DIFFICULTY_SETTINGS[newDifficulty].speed + 1.5;
    speedRef.current = Math.min(maxSpeed, DIFFICULTY_SETTINGS[newDifficulty].speed + timeFactor * 0.05);
    spawnRateRef.current = Math.max(90, DIFFICULTY_SETTINGS[newDifficulty].spawnRate - timeFactor * 0.5);
  }, []);

  const resumeGame = useCallback(() => {
    setGameState('playing');
  }, []);

  const quitGame = useCallback(() => {
    stopBgm();
    setGameState('start');
  }, []);

  const showInstructions = useCallback(() => {
    setGameState('instructions');
  }, []);

  const revive = async () => {
    const costs = [50, 100, 200];
    if (reviveCount < 3 && diamonds >= costs[reviveCount]) {
      const newDiamonds = diamonds - costs[reviveCount];
      setDiamonds(newDiamonds);
      setReviveCount(prev => prev + 1);
      
      if (user) {
        try {
          await setDoc(doc(db, 'users', user.uid), {
            diamonds: newDiamonds
          }, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
        }
      }

      // Reset player state for continuation
      playerRef.current.invincibility = 180; // 3 seconds invincibility
      playerRef.current.vy = 0;
      playerRef.current.isJumping = false;
      playerRef.current.jumps = 0;
      
      setGameState('playing');

      // Clear obstacles near player
      obstaclesRef.current = obstaclesRef.current.filter(obs => obs.x > playerRef.current.x + 400);
      bossRef.current.projectiles = bossRef.current.projectiles.filter(p => p.x > playerRef.current.x + 400);
      bossRef.current.playerHits = 0;
      blackHoleRef.current = null;
      bonusLevelRef.current.active = false;
      coinsRef.current = [];
      
      setGameState('playing');
      startBgm();
      playSound('score');
    }
  };

  const updateAvatar = async (charId: string) => {
    if (!user) return;
    setAvatarId(charId);
    setShowAvatarSelect(false);
    try {
      // Update user profile
      await setDoc(doc(db, 'users', user.uid), {
        avatarId: charId
      }, { merge: true });

      // Update leaderboard entry if it exists
      const leaderboardRef = doc(db, 'leaderboard', user.uid);
      const leaderboardDoc = await getDoc(leaderboardRef);
      if (leaderboardDoc.exists()) {
        await setDoc(leaderboardRef, {
          avatarId: charId
        }, { merge: true });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const unlockCharacter = async (charId: string) => {
    if (!user) return;
    const req = CHARACTER_REQUIREMENTS[charId];
    if (highScore >= req && !unlockedCharacters.includes(charId)) {
      const newUnlocked = [...unlockedCharacters, charId];
      setUnlockedCharacters(newUnlocked);
      setUnlockingChar(charId);
      playSound('score');
      
      try {
        await setDoc(doc(db, 'users', user.uid), {
          unlockedCharacters: newUnlocked
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      }
    }
  };

  const useItem = (type: PowerUpType) => {
    if (gameState !== 'playing') return;
    if (gameInventory[type] > 0 && inventory[type] > 0) {
      const newGameInventory = { ...gameInventory, [type]: gameInventory[type] - 1 };
      setGameInventory(newGameInventory);
      
      const newInventory = { ...inventory, [type]: inventory[type] - 1 };
      setInventory(newInventory);
      
      if (type === 'shield') {
        playerRef.current.shield = 1; // Infinite until hit
      } else {
        let duration = POWERUP_CONFIG[type].duration;
        if (type === 'dash' && selectedCharacter === 'santa') {
          duration += 300; // 5 seconds extra
        }
        playerRef.current[type] = duration;
      }
      createParticles(playerRef.current.x + playerRef.current.width / 2, playerRef.current.y + playerRef.current.height / 2, POWERUP_CONFIG[type].color, 20);
      playSound('score');
      
      if (user) {
        setDoc(doc(db, 'users', user.uid), {
          inventory: newInventory
        }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`));
      }
    }
  };
  const jump = useCallback(() => {
    if (gameState !== 'playing') return;
    initAudio();
    const player = playerRef.current;
    
    if (selectedCharacter === 'ttd' && player.ttdEnergyBar.active) {
      if (player.ttdEnergyBar.type === 'jump') {
        player.ttdCombo++;
        player.ttdMultiplier = Math.min(3.5, player.ttdMultiplier + 0.2);
        setScore(s => s + Math.floor(50 * player.ttdMultiplier));
        createParticles(player.x, player.y, '#ffeb3b', 20);
        if (player.ttdCombo >= 5) {
          player.ttdSuperJump = true;
          player.ttdCombo = 0;
        }
      } else {
        player.ttdCombo = 0;
        player.ttdMultiplier = Math.max(1, player.ttdMultiplier - 0.2);
      }
      player.ttdEnergyBar.active = false;
    }

    // Cancel slide if jumping and restore height/position immediately
    if (player.isSliding) {
      player.isSliding = false;
      player.slideTimer = 0;
      player.y -= 60; // Move back up immediately to prevent ground clipping
      player.height = 120;
    }

    let maxJumpsAllowed = MAX_JUMPS;
    if (selectedCharacter === 'hgte') maxJumpsAllowed = player.hgtePassiveUsed ? 2 : 1;
    if (selectedCharacter === 'ttd') maxJumpsAllowed = 3;

    if (player.jumps < maxJumpsAllowed || player.ttdSuperJump) {
      playSound('jump');
      const currentBiome = BIOMES[envRef.current.biomeIndex];
      player.vy = (player.ttdSuperJump ? JUMP_STRENGTH * 1.5 : JUMP_STRENGTH) * currentBiome.jumpMod;
      player.jumps++;
      player.isJumping = true;
      createParticles(player.x + player.width / 2, player.y + player.height, '#fff', 10);
    }
  }, [gameState, createParticles, selectedCharacter]);

  const slide = useCallback(() => {
    if (gameState !== 'playing') return;
    const player = playerRef.current;
    
    if (selectedCharacter === 'ttd' && player.ttdEnergyBar.active) {
      if (player.ttdEnergyBar.type === 'crouch') {
        player.ttdCombo++;
        player.ttdMultiplier = Math.min(3.5, player.ttdMultiplier + 0.2);
        setScore(s => s + Math.floor(50 * player.ttdMultiplier));
        createParticles(player.x, player.y, '#ffeb3b', 20);
        if (player.ttdCombo >= 5) {
          player.ttdSuperJump = true;
          player.ttdCombo = 0;
        }
      } else {
        player.ttdCombo = 0;
        player.ttdMultiplier = Math.max(1, player.ttdMultiplier - 0.2);
      }
      player.ttdEnergyBar.active = false;
    }

    if (player.isJumping) {
      player.y = 10000; // Fast fall to ground
      player.vy = 2000; // High velocity to trigger landing particles
    } else if (!player.isSliding) {
      player.isSliding = true;
      const currentBiome = BIOMES[envRef.current.biomeIndex];
      player.slideTimer = 60 * currentBiome.slideMod; // 1 second at 60fps
      player.height = 60; // Half height
      player.y += 60; // Move down to stay on ground
      createParticles(player.x + player.width / 2, player.y + player.height, '#fff', 5);
    }
  }, [gameState, createParticles, selectedCharacter]);

  const restore = useCallback(() => {
    if (gameState !== 'playing') return;
    const player = playerRef.current;
    if (player.isSliding) {
      player.isSliding = false;
      player.slideTimer = 0;
      player.y -= 60; // Move back up
      player.height = 120;
      createParticles(player.x + player.width / 2, player.y + player.height, '#fff', 5);
    }
  }, [gameState, createParticles]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (gameState === 'playing') {
          jump();
        } else if (gameState === 'start') {
          showInstructions();
        } else if (gameState === 'instructions') {
          startGame();
        }
      } else if (e.code === 'KeyW') {
        e.preventDefault();
        if (gameState === 'playing') {
          restore();
        } else if (gameState === 'start') {
          showInstructions();
        } else if (gameState === 'instructions') {
          startGame();
        }
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        if (gameState === 'playing') {
          slide();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, jump, startGame, showInstructions]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const groundY = canvas.height - 100;

    const update = (time: number) => {
      if (gameState !== 'playing') {
        lastTimeRef.current = 0;
        return;
      }

      if (!lastTimeRef.current) lastTimeRef.current = time;
      const deltaTime = (time - lastTimeRef.current) / (1000 / 60);
      lastTimeRef.current = time;

      // Cap deltaTime to prevent huge jumps (e.g. after tab switch)
      const dt = Math.min(deltaTime, 3);

      const player = playerRef.current;
      const obstacles = obstaclesRef.current;
      const powerUps = powerUpsRef.current;

      // Power-up timers
      if (player.magnet > 0) player.magnet -= dt;
      if (player.doubleScore > 0) player.doubleScore -= dt;
      if (player.invincibility > 0) player.invincibility -= dt;
      if (player.hjdjSkillActive > 0) player.hjdjSkillActive -= dt;
      if (player.hzSkillActive > 0) player.hzSkillActive -= dt;
      if (player.hgteSkillActive > 0) player.hgteSkillActive -= dt;
      if (player.hzSkillSprint > 0) player.hzSkillSprint -= dt;
      if (player.hjdjSkillCooldown > 0) player.hjdjSkillCooldown -= dt;
      if (blackHoleCooldownRef.current > 0) blackHoleCooldownRef.current -= dt;
      
      if (selectedCharacter === 'ttd') {
        if (!player.ttdEnergyBar.active) {
          if (Math.random() < 0.0025 * dt) {
            player.ttdEnergyBar.active = true;
            player.ttdEnergyBar.type = Math.random() < 0.5 ? 'jump' : 'crouch';
            player.ttdEnergyBar.maxTimer = 90;
            player.ttdEnergyBar.timer = 90;
          }
        } else {
          player.ttdEnergyBar.timer -= dt;
          if (player.ttdEnergyBar.timer <= 0) {
            player.ttdEnergyBar.active = false;
            player.ttdCombo = 0;
            player.ttdMultiplier = Math.max(1, player.ttdMultiplier - 0.1);
          }
        }
      }

      if (player.dash > 0) {
        player.dash -= dt;
        if (player.dash <= 0) {
          // Clear obstacles
          obstaclesRef.current.forEach(obs => {
            createParticles(obs.x + obs.width/2, obs.y + obs.height/2, '#ef4444', 20);
          });
          obstaclesRef.current.length = 0;
          
          // Clear boss projectiles
          bossRef.current.projectiles.forEach(p => {
            createParticles(p.x + p.width/2, p.y + p.height/2, '#ef4444', 20);
          });
          bossRef.current.projectiles.length = 0;

          if (!player.initialDashUsed && selectedCharacter === 'santa') {
            player.shield = 1; // Infinite until hit
            player.initialDashUsed = true;
          }
        }
      }

      if (selectedCharacter === 'hdd') {
        player.hddSkillTimer -= dt;
        if (player.hddSkillTimer <= 0) {
          player.hddSkillTimer = 420; // 7 seconds
          const types: PowerUpType[] = ['shield', 'magnet', 'doubleScore', 'dash'];
          const randomType = types[Math.floor(Math.random() * types.length)];
          
          setInventory(prev => {
            const currentAmount = prev[randomType] || 0;
            if (currentAmount >= 5) return prev; // Cap at 5
            const newInv = { ...prev, [randomType]: currentAmount + 1 };
            if (user) {
              setDoc(doc(db, 'users', user.uid), { inventory: newInv }, { merge: true }).catch(err => console.error(err));
            }
            return newInv;
          });
          
          setGameInventory(prev => {
            const currentAmount = prev[randomType] || 0;
            if (currentAmount >= 5) return prev; // Cap at 5
            return { ...prev, [randomType]: currentAmount + 1 };
          });
          
          createParticles(player.x + player.width/2, player.y, POWERUP_CONFIG[randomType].color, 30);
          playSound('score');
        }
      }

      // Continuous scoring
      setScore(s => {
        const dashMultiplier = (selectedCharacter === 'santa' && player.dash > 0) ? 3 : 1;
        const ttdMult = selectedCharacter === 'ttd' ? player.ttdMultiplier : 1;
        const hzMult = (selectedCharacter === 'hz' && player.hzSkillActive > 0) ? 2 : 1;
        const increment = 5 * (dt / 60) * (player.doubleScore > 0 ? 2 : 1) * dashMultiplier * ttdMult * hzMult;
        scoreAccumulatorRef.current += increment;
        const integerIncrement = Math.floor(scoreAccumulatorRef.current);
        
        if (integerIncrement > 0) {
          scoreAccumulatorRef.current -= integerIncrement;
          const newScore = s + integerIncrement;
          checkAchievements(newScore);
          
          // New Record Check
          if (newScore > highScore && highScore > 0 && !envRef.current.hasAnnouncedNewRecord) {
            envRef.current.hasAnnouncedNewRecord = true;
            envRef.current.announcement = '🎉 新纪录! 🎉';
            envRef.current.announcementTimer = 180;
            playSound('newRecord');
            // Fireworks
            for(let i=0; i<50; i++) {
              createParticles(
                canvas.width/2 + (Math.random()-0.5)*300, 
                canvas.height/2 + (Math.random()-0.5)*300, 
                ['#fbbf24', '#f87171', '#60a5fa', '#34d399'][Math.floor(Math.random()*4)], 
                Math.random()*5 + 2
              );
            }
          }
          
          return newScore;
        }
        return s;
      });

      // Biome Logic
      let currentBiomeIndex = 0;
      for (let i = BIOMES.length - 1; i >= 0; i--) {
        if (score >= BIOMES[i].scoreThreshold) {
          currentBiomeIndex = i;
          break;
        }
      }
      
      if (envRef.current.biomeIndex !== currentBiomeIndex) {
        envRef.current.biomeIndex = currentBiomeIndex;
        envRef.current.biomeTransition = 1.0;
        envRef.current.announcement = BIOMES[currentBiomeIndex].name;
        envRef.current.announcementTimer = 180; // 3 seconds at 60fps
        
        // Regenerate background elements
        const biomeId = BIOMES[currentBiomeIndex].id;
        backgroundElementsRef.current = Array.from({length: 20}, () => ({
          x: Math.random() * canvas.width,
          y: groundY - 50 - Math.random() * 50, // On the ground
          type: getRandomTypeForBiome(biomeId),
          layer: Math.floor(Math.random() * 3)
        }));
        
        // Grant 5 seconds of invincibility on map change (300 frames at 60fps)
        if (currentBiomeIndex > 0) {
          player.invincibility = 300;
          createParticles(player.x + player.width / 2, player.y + player.height / 2, '#60a5fa', 50);
        }
      }

      if (envRef.current.biomeTransition > 0) {
        envRef.current.biomeTransition = Math.max(0, envRef.current.biomeTransition - 0.01 * dt);
      }
      if (envRef.current.announcementTimer > 0) {
        envRef.current.announcementTimer -= dt;
      }

      const currentBiome = BIOMES[envRef.current.biomeIndex];

      // Weather Logic
      envRef.current.weatherTimer -= dt;
      if (envRef.current.weatherTimer <= 0) {
        const weathers: WeatherType[] = ['CLEAR', 'RAIN', 'WIND_FORWARD', 'WIND_BACKWARD', 'SNOW'];
        envRef.current.weather = weathers[Math.floor(Math.random() * weathers.length)];
        envRef.current.weatherTimer = 600 + Math.random() * 600; // 10 to 20 seconds
        
        let weatherName = '';
        if (envRef.current.weather === 'RAIN') weatherName = '🌧️ 暴雨来袭 (视线模糊)';
        else if (envRef.current.weather === 'WIND_FORWARD') weatherName = '💨 顺风 (加速)';
        else if (envRef.current.weather === 'WIND_BACKWARD') weatherName = '🌪️ 逆风 (减速)';
        else if (envRef.current.weather === 'SNOW') weatherName = '❄️ 暴雪 (视线受阻)';
        else weatherName = '☀️ 晴空万里';
        
        envRef.current.announcement = weatherName;
        envRef.current.announcementTimer = 180;
      }

      // Update Weather Particles
      if (envRef.current.weather === 'RAIN' || envRef.current.weather === 'SNOW') {
        if (Math.random() < (envRef.current.weather === 'RAIN' ? 0.5 : 0.2)) {
          envRef.current.weatherParticles.push({
            x: Math.random() * canvas.width,
            y: -20,
            vx: envRef.current.weather === 'RAIN' ? -2 : -1,
            vy: envRef.current.weather === 'RAIN' ? 15 : 3,
            size: envRef.current.weather === 'RAIN' ? 2 : Math.random() * 3 + 1,
            type: envRef.current.weather,
            life: 0
          });
        }
      } else if (envRef.current.weather === 'WIND_FORWARD' || envRef.current.weather === 'WIND_BACKWARD') {
        if (Math.random() < 0.2) {
          envRef.current.weatherParticles.push({
            x: envRef.current.weather === 'WIND_FORWARD' ? -50 : canvas.width + 50,
            y: Math.random() * canvas.height,
            vx: envRef.current.weather === 'WIND_FORWARD' ? 20 : -20,
            vy: 0,
            size: Math.random() * 2 + 1,
            type: 'WIND',
            life: 0
          });
        }
      }

      for (let i = envRef.current.weatherParticles.length - 1; i >= 0; i--) {
        const wp = envRef.current.weatherParticles[i];
        wp.x += wp.vx * dt;
        wp.y += wp.vy * dt;
        wp.life += dt;
        if (wp.y > canvas.height || wp.x < -100 || wp.x > canvas.width + 100 || wp.life > 300) {
          envRef.current.weatherParticles.splice(i, 1);
        }
      }

      // Physics
      if (player.dash > 0 || player.hjdjSkillActive > 0) {
        player.vy = 0;
        player.y = groundY - player.height;
      } else {
        player.vy += GRAVITY * currentBiome.gravityMod * dt;
        player.y += player.vy * dt;
      }

      if (player.isSliding) {
        player.slideTimer -= dt;
        if (player.slideTimer <= 0) {
          player.isSliding = false;
          player.height = 120;
          player.y -= 60; // Move back up
        }
      }

      if (player.ttdSuperJump) {
        createParticles(player.x + player.width / 2, player.y + player.height, '#ffeb3b', 2);
      }

      if (player.y + player.height >= groundY) {
        if (player.vy > 10) {
          createParticles(player.x + player.width / 2, groundY, '#4ade80', 15);
        }
        player.y = groundY - player.height;
        player.vy = 0;
        player.isJumping = false;
        player.jumps = 0;
        
        if (player.ttdSuperJump) {
          player.ttdSuperJump = false;
          
          const canvas = canvasRef.current;
          if (canvas) {
            canvas.style.transform = 'translate(10px, 10px)';
            setTimeout(() => {
              if (canvas) canvas.style.transform = 'translate(-10px, -10px)';
              setTimeout(() => {
                if (canvas) canvas.style.transform = 'translate(10px, -10px)';
                setTimeout(() => {
                  if (canvas) canvas.style.transform = 'translate(0, 0)';
                }, 50);
              }, 50);
            }, 50);
          }

          createParticles(player.x + player.width / 2, groundY, '#ffeb3b', 100);
          createParticles(player.x + player.width / 2, groundY, '#f97316', 50);
          
          obstaclesRef.current.forEach(obs => {
            createParticles(obs.x + obs.width / 2, obs.y + obs.height / 2, '#ff0000', 20);
          });
          obstaclesRef.current.length = 0;
          playSound('hit');
          setScore(s => s + Math.floor(500 * player.ttdMultiplier));
        }
      }

      // Clouds (Parallax)
      cloudsRef.current.forEach(cloud => {
        const parallaxSpeed = cloud.speed * (cloud.layer + 1) * (player.dash > 0 ? 5 : 1);
        cloud.x -= parallaxSpeed * dt;
        if (cloud.x + cloud.width < 0) {
          cloud.x = canvas.width;
          cloud.y = Math.random() * 400 + 20;
        }
      });

      // Background Elements
      backgroundElementsRef.current.forEach(el => {
        const parallaxSpeed = 0.5 * (el.layer + 1) * (player.dash > 0 ? 5 : 1);
        el.x -= parallaxSpeed * dt;
        if (el.x + 50 < 0) {
          el.x = canvas.width;
        }
      });

      // Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx * (player.dash > 0 ? 0.5 : 1) * dt;
        p.y += p.vy * (player.dash > 0 ? 0.5 : 1) * dt;
        p.life += dt;
        if (p.life >= p.maxLife) {
          particlesRef.current.splice(i, 1);
        }
      }

      // Speed Lines Update
      const weatherSpeedMod = envRef.current.weather === 'WIND_FORWARD' ? 1.3 : envRef.current.weather === 'WIND_BACKWARD' ? 0.7 : 1;
      const currentSpeed = speedRef.current * currentBiome.speedMod * weatherSpeedMod * (player.dash > 0 || player.hjdjSkillActive > 0 || player.hzSkillSprint > 0 ? 3 : 1);
      
      const isHighSpeed = currentSpeed > 8 || player.dash > 0 || player.hjdjSkillActive > 0 || player.hzSkillSprint > 0;
      if (isHighSpeed) {
        // Spawn more lines based on speed
        const spawnCount = Math.floor((currentSpeed - 5) / 2);
        for(let i=0; i<spawnCount; i++) {
          if (Math.random() < 0.3) {
            envRef.current.speedLines.push({
              x: canvas.width + Math.random() * 200,
              y: Math.random() * canvas.height,
              length: 50 + Math.random() * 150,
              speed: currentSpeed * 2 + Math.random() * 10,
              alpha: 0.1 + Math.random() * 0.3
            });
          }
        }
      }
      
      for (let i = envRef.current.speedLines.length - 1; i >= 0; i--) {
        const line = envRef.current.speedLines[i];
        line.x -= line.speed * dt;
        if (line.x + line.length < 0) {
          envRef.current.speedLines.splice(i, 1);
        }
      }

      // Obstacles & Power-ups Spawning
      const prevFrameCount = frameCountRef.current;
      frameCountRef.current += dt;
      
      // Dynamic BGM Intensity
      if (bgmAudio) {
        // Base speed is ~5, max speed is ~13. Map this to playbackRate 1.0 -> 1.5
        const targetRate = 1.0 + (envRef.current.biomeIndex * 0.05) + Math.max(0, (currentSpeed - 5) / 20);
        // Smoothly transition playback rate
        bgmAudio.playbackRate += (targetRate - bgmAudio.playbackRate) * 0.05;
      }

      if (Math.floor(frameCountRef.current / 1000) > Math.floor(prevFrameCount / 1000)) {
        const maxSpeed = DIFFICULTY_SETTINGS[difficulty].speed + 1.5;
        if (speedRef.current < maxSpeed) {
          speedRef.current = Math.min(maxSpeed, speedRef.current + 0.05);
        }
        spawnRateRef.current = Math.max(90, spawnRateRef.current - 0.5);
      }

      // Boss Trigger
      if (frameCountRef.current >= bossRef.current.nextTriggerFrame && !bossRef.current.active) {
        bossRef.current.active = true;
        bossRef.current.health = bossRef.current.maxHealth;
        bossRef.current.phase = 'entering';
        bossRef.current.x = canvas.width + 200;
        bossRef.current.y = groundY - 200;
        bossRef.current.playerHits = 0;
        bossRef.current.projectiles = [];
        bossRef.current.attackItems = [];
        bossRef.current.playerProjectiles = [];
        playSound('powerup'); // Maybe a different sound for boss warning
      }

      // Spawn Obstacles
      const lastObstacle = obstacles[obstacles.length - 1];
      const minSpacing = 300 + Math.random() * 200; // Ensure at least 300px between obstacles
      
      if (!bossRef.current.active && !bonusLevelRef.current.active && Math.floor(frameCountRef.current / spawnRateRef.current) > Math.floor(prevFrameCount / spawnRateRef.current)) {
        if (!lastObstacle || (canvas.width - lastObstacle.x) > minSpacing) {
          const types: ObstacleType[] = ['normal', 'tall', 'wide', 'flying', 'sliding'];
          const type = types[Math.floor(Math.random() * types.length)];
          
          let width = 40, height = 40, y = groundY - height;
          let vy = 0;

          switch(type) {
            case 'tall': height = 80 + Math.random() * 40; width = 30; y = groundY - height; break;
            case 'wide': width = 80 + Math.random() * 40; height = 30; y = groundY - height; break;
            case 'flying': 
              width = 40; height = 40; 
              // Ensure flying obstacles are either high enough to slide/walk under, or low enough to jump over
              const isHigh = Math.random() > 0.5;
              if (isHigh) {
                y = groundY - 180 - Math.random() * 50; // High enough to slide under
              } else {
                y = groundY - 60 - Math.random() * 40; // Low enough to jump over
              }
              vy = (Math.random() - 0.5) * 1.5; 
              break;
            case 'sliding': width = 50; height = 50; y = groundY - height; break;
            default: width = 40 + Math.random() * 20; height = 40 + Math.random() * 20; y = groundY - height;
          }
          
          obstacles.push({
            x: canvas.width,
            y,
            width,
            height,
            type,
            passed: false,
            vy,
            initialY: y
          });
        }
      }

      // Spawn Power-ups
      if (!bossRef.current.active && !bonusLevelRef.current.active && Math.floor(frameCountRef.current / 200) > Math.floor(prevFrameCount / 200) && Math.random() > 0.4) {
        const types: PowerUpType[] = ['shield', 'magnet', 'doubleScore', 'dash'];
        const type = types[Math.floor(Math.random() * types.length)];
        powerUps.push({
          x: canvas.width,
          y: groundY - 100 - Math.random() * 200,
          width: 30,
          height: 30,
          type,
          collected: false
        });
      }

      // Spawn Diamonds or Coins
      if (!bossRef.current.active) {
        if (bonusLevelRef.current.active) {
          if (Math.floor(frameCountRef.current / 15) > Math.floor(prevFrameCount / 15)) {
            coinsRef.current.push({
              x: canvas.width,
              y: groundY - 50 - Math.random() * 200,
              width: 25,
              height: 25,
              collected: false
            });
          }
        } else {
          if (Math.floor(frameCountRef.current / 150) > Math.floor(prevFrameCount / 150)) {
            diamondsRef.current.push({
              x: canvas.width,
              y: groundY - 50 - Math.random() * 200,
              width: 25,
              height: 25,
              collected: false
            });
          }
        }
      }

      // Spawn Black Hole
      if (!bossRef.current.active && !bonusLevelRef.current.active && !blackHoleRef.current?.active && blackHoleCooldownRef.current <= 0) {
        if (Math.random() < 0.001) { // Random chance to spawn
          blackHoleRef.current = {
            x: canvas.width + 500,
            y: groundY - 150 - Math.random() * 100,
            width: 80,
            height: 80,
            active: true,
            rotation: 0
          };
          blackHoleCooldownRef.current = 1800; // 30 seconds cooldown at 60fps
        }
      }

      // Boss Update
      if (bossRef.current.active) {
        const boss = bossRef.current;
        
        if (boss.phase === 'entering') {
          boss.x -= 2 * dt;
          if (boss.x <= canvas.width - 150) {
            boss.x = canvas.width - 150;
            boss.phase = 'fighting';
          }
        } else if (boss.phase === 'fighting') {
          // Hover movement
          boss.y += boss.vy * dt;
          if (boss.y < groundY - 300) {
            boss.y = groundY - 300;
            boss.vy = Math.abs(boss.vy);
          } else if (boss.y > groundY - 100) {
            boss.y = groundY - 100;
            boss.vy = -Math.abs(boss.vy);
          }

          // Attack
          boss.attackTimer += dt;
          if (boss.attackTimer > 200) { // Increased from 100 to 200
            boss.attackTimer = 0;
            boss.projectiles.push({
              x: boss.x,
              y: boss.y + 50,
              vx: - (currentSpeed + 1 + Math.random() * 2), // Reduced speed
              vy: (Math.random() - 0.5) * 1.5, // Reduced vertical speed
              width: 30,
              height: 30,
              type: Math.random() > 0.5 ? 'milk' : 'diaper'
            });
          }

          // Spawn attack items for player
          if (Math.random() < 0.01 * dt) {
            boss.attackItems.push({
              x: canvas.width,
              y: groundY - 50 - Math.random() * 150,
              width: 40,
              height: 40,
              collected: false
            });
          }
        } else if (boss.phase === 'defeated') {
          boss.y += 5 * dt; // Fall down
          if (boss.y > canvas.height) {
            boss.active = false;
            boss.nextTriggerFrame = frameCountRef.current + 7200;
            
            // Bonus rewards
            const bossScoreReward = selectedCharacter === 'hjdj' ? 2000 : 1000;
            const ttdMult = selectedCharacter === 'ttd' ? player.ttdMultiplier : 1;
            setScore(s => s + Math.floor(bossScoreReward * ttdMult));
            const nextDiamonds = diamonds + 666;
            setDiamonds(nextDiamonds);
            if (user) {
              setDoc(doc(db, 'users', user.uid), { diamonds: nextDiamonds }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`));
            }
            playSound('powerup');
            envRef.current.announcement = `击败奶帝！获得 ${bossScoreReward} 分和 666 钻石！`;
            envRef.current.announcementTimer = 120; // Show for 2 seconds (assuming 60fps)
          }
        }

        // Update boss projectiles
        for (let i = boss.projectiles.length - 1; i >= 0; i--) {
          const p = boss.projectiles[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;

          // Destroyed by hgte skill
          if (player.hgteSkillActive > 0 && p.x > player.x && p.x < player.x + 200) {
            createParticles(p.x + p.width/2, p.y + p.height/2, '#f97316', 30);
            boss.projectiles.splice(i, 1);
            continue;
          }

          // Collision with player
          if (player.invincibility <= 0 && player.dash <= 0 && player.hjdjSkillActive <= 0 && player.hzSkillSprint <= 0) {
            if (player.x < p.x + p.width && player.x + player.width > p.x &&
                player.y < p.y + p.height && player.y + player.height > p.y) {
              
              if (player.shield > 0) {
                player.shield = 0;
                player.invincibility = 60;
                playSound('hit');
                createParticles(player.x, player.y, '#34d399', 20);
              } else {
                boss.playerHits++;
                player.invincibility = 60;
                playSound('hit');
                createParticles(player.x, player.y, '#ff0000', 20);
                
                if (boss.playerHits >= boss.maxPlayerHits) {
                  // Handle death
                  if (selectedCharacter === 'hgte' && !player.hgtePassiveUsed) {
                    player.hgtePassiveUsed = true;
                    player.hxdActive = true;
                    player.invincibility = 180;
                    boss.playerHits--; // Revert the last hit
                    playSound('powerup');
                  } else if (selectedCharacter === 'hz' && player.hzPassiveCharges > 0) {
                    player.hzPassiveCharges--;
                    player.invincibility = 120;
                    boss.playerHits--; // Revert the last hit
                    playSound('powerup');
                  } else {
                    setGameState('gameover');
                    stopBgm();
                    playSound('gameover');
                    const finalScore = score;
                    setHighScore(prev => {
                      const newHigh = Math.max(prev, finalScore);
                      localStorage.setItem('highScore', newHigh.toString());
                      return newHigh;
                    });
                    checkAchievements(finalScore);
                    if (user) {
                      updateLeaderboard(finalScore);
                      if (isMultiplayer) {
                        finishMatch(finalScore);
                      }
                    }
                  }
                }
              }
              boss.projectiles.splice(i, 1);
              continue;
            }
          }

          if (p.x + p.width < 0) {
            boss.projectiles.splice(i, 1);
          }
        }

        // Update attack items
        for (let i = boss.attackItems.length - 1; i >= 0; i--) {
          const item = boss.attackItems[i];
          item.x -= currentSpeed * dt;

          // Magnet effect
          if (player.magnet > 0 || player.hxdActive) {
            const dx = player.x - item.x;
            const dy = player.y - item.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 300) {
              item.x += dx * 0.15 * dt;
              item.y += dy * 0.15 * dt;
            }
          }

          if (!item.collected && 
              player.x < item.x + item.width &&
              player.x + player.width > item.x &&
              player.y < item.y + item.height &&
              player.y + player.height > item.y) {
            
            item.collected = true;
            playSound('score');
            
            // Fire player projectile
            boss.playerProjectiles.push({
              x: player.x + player.width,
              y: player.y + player.height / 2,
              vx: 10,
              vy: 0,
              width: 20,
              height: 20
            });
            
            boss.attackItems.splice(i, 1);
            continue;
          }

          if (item.x + item.width < 0) {
            boss.attackItems.splice(i, 1);
          }
        }

        // Update player projectiles
        for (let i = boss.playerProjectiles.length - 1; i >= 0; i--) {
          const p = boss.playerProjectiles[i];
          p.x += p.vx * dt;

          // Collision with boss
          if (boss.phase === 'fighting' && 
              p.x < boss.x + 150 && p.x + p.width > boss.x &&
              p.y < boss.y + 150 && p.y + p.height > boss.y) {
            
            boss.health -= 10;
            createParticles(boss.x + 75, boss.y + 75, '#ffff00', 20);
            playSound('hit');
            
            if (boss.health <= 0) {
              boss.phase = 'defeated';
              playSound('powerup');
            }
            
            boss.playerProjectiles.splice(i, 1);
            continue;
          }

          if (p.x > canvas.width) {
            boss.playerProjectiles.splice(i, 1);
          }
        }
      }

      // Update Power-ups
      for (let i = powerUps.length - 1; i >= 0; i--) {
        const pu = powerUps[i];
        pu.x -= currentSpeed * dt;

        // Magnet effect
        if (player.magnet > 0 || player.hxdActive) {
          const dx = player.x - pu.x;
          const dy = player.y - pu.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 300) { // Slightly larger range for hxd
            pu.x += dx * 0.1 * dt;
            pu.y += dy * 0.1 * dt;
          }
        }

        // Collection
        if (player.hjdjSkillActive > 0 && pu.x < player.x + 400) {
          createParticles(pu.x + pu.width/2, pu.y + pu.height/2, '#ff4400', 10);
          powerUps.splice(i, 1);
          continue;
        }

        if (!pu.collected && 
            player.x < pu.x + pu.width &&
            player.x + player.width > pu.x &&
            player.y < pu.y + pu.height &&
            player.y + player.height > pu.y) {
          pu.collected = true;
          
          // Huzi skill charge
          if (selectedCharacter === 'hz') {
            const maxCharges = player.hzPassiveCharges > 0 ? 4 : 2;
            if (player.hzSkillCharges < maxCharges) {
              player.hzSkillCharges += 1;
            }
          }
          
          // Hjdj skill charge and score
          if (selectedCharacter === 'hjdj') {
            if (player.hjdjSkillCooldown > 0) {
              player.hjdjSkillCooldown = Math.max(0, player.hjdjSkillCooldown - 120);
            }
            setScore(s => s + 50);
          }
          
          // Hgte skill charge
          if (selectedCharacter === 'hgte' && player.hgteSkillCharges < 6) {
            player.hgtePartialCharges += 1;
            if (player.hgtePartialCharges >= 2) {
              player.hgteSkillCharges += 1;
              player.hgtePartialCharges = 0;
            }
          }

          playSound('score');
          if (pu.type === 'shield') {
            player.shield = 1; // Infinite until hit
          } else {
            let duration = POWERUP_CONFIG[pu.type].duration;
            if (pu.type === 'dash' && selectedCharacter === 'santa') {
              duration += 300; // 5 seconds extra
            }
            player[pu.type] = duration;
          }
          createParticles(pu.x, pu.y, POWERUP_CONFIG[pu.type].color, 20);
          powerUps.splice(i, 1);
          continue;
        }

        if (pu.x + pu.width < 0) {
          powerUps.splice(i, 1);
        }
      }

      // Update Coins
      for (let i = coinsRef.current.length - 1; i >= 0; i--) {
        const c = coinsRef.current[i];
        c.x -= currentSpeed * dt;

        // Magnet effect
        if (player.magnet > 0 || player.hxdActive || bonusLevelRef.current.active) {
          const dx = player.x - c.x;
          const dy = player.y - c.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < (bonusLevelRef.current.active ? 150 : 300)) {
            c.x += dx * 0.15 * dt;
            c.y += dy * 0.15 * dt;
          }
        }

        // Collection
        if (!c.collected && 
            player.x < c.x + c.width &&
            player.x + player.width > c.x &&
            player.y < c.y + c.height &&
            player.y + player.height > c.y) {
          c.collected = true;
          playSound('score');
          const ttdMult = selectedCharacter === 'ttd' ? player.ttdMultiplier : 1;
          setScore(s => s + Math.floor(10 * ttdMult));
          createParticles(c.x + c.width/2, c.y + c.height/2, '#fbbf24', 15);
          coinsRef.current.splice(i, 1);
          continue;
        }

        if (c.x + c.width < 0) {
          coinsRef.current.splice(i, 1);
        }
      }

      // Update Diamonds
      for (let i = diamondsRef.current.length - 1; i >= 0; i--) {
        const d = diamondsRef.current[i];
        d.x -= currentSpeed * dt;

        // Magnet effect
        if (player.magnet > 0 || player.hxdActive) {
          const dx = player.x - d.x;
          const dy = player.y - d.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 300) { // Slightly larger range for hxd
            d.x += dx * 0.15 * dt;
            d.y += dy * 0.15 * dt;
          }
        }

        // Collection
        if (player.hjdjSkillActive > 0 && d.x < player.x + 400) {
          createParticles(d.x + d.width/2, d.y + d.height/2, '#ff4400', 10);
          diamondsRef.current.splice(i, 1);
          continue;
        }

        if (!d.collected && 
            player.x < d.x + d.width &&
            player.x + player.width > d.x &&
            player.y < d.y + d.height &&
            player.y + player.height > d.y) {
          d.collected = true;
          playSound('score');
          setDiamonds(prev => {
            const next = prev + 1;
            if (user) {
              setDoc(doc(db, 'users', user.uid), { diamonds: next }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`));
            }
            return next;
          });
          
          if (selectedCharacter === 'hgte' && player.hgteSkillCharges < 6) {
            player.hgtePartialCharges += 1;
            if (player.hgtePartialCharges >= 2) {
              player.hgteSkillCharges += 1;
              player.hgtePartialCharges = 0;
            }
          }
          
          createParticles(d.x, d.y, '#60a5fa', 15);
          diamondsRef.current.splice(i, 1);
          continue;
        }

        if (d.x + d.width < 0) {
          diamondsRef.current.splice(i, 1);
        }
      }

      // Update Bonus Level Timer
      if (bonusLevelRef.current.active) {
        bonusLevelRef.current.timer -= dt;
        if (bonusLevelRef.current.timer <= 0) {
          bonusLevelRef.current.active = false;
        }
      }

      // Update Black Hole
      if (blackHoleRef.current?.active) {
        const bh = blackHoleRef.current;
        bh.x -= currentSpeed * dt;
        bh.rotation += 0.05 * dt;

        // Collision with player
        const dx = (player.x + player.width/2) - (bh.x + bh.width/2);
        const dy = (player.y + player.height/2) - (bh.y + bh.height/2);
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < bh.width/2 + player.width/2) {
          // Enter bonus level
          bonusLevelRef.current.active = true;
          bonusLevelRef.current.timer = bonusLevelRef.current.duration;
          bh.active = false;
          playSound('powerup');
          createParticles(player.x, player.y, '#b388ff', 50);
          
          // Clear obstacles
          obstaclesRef.current.length = 0;
          bossRef.current.active = false;
        }

        if (bh.x + bh.width < 0) {
          bh.active = false;
        }
      }

      // Update Obstacles
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= currentSpeed * dt;

        if (obs.type === 'flying' && obs.vy !== undefined && obs.initialY !== undefined) {
          obs.y += obs.vy * dt;
          if (Math.abs(obs.y - obs.initialY) > 50) obs.vy *= -1;
        }

        // Hjdj skill destruction
        if (player.hjdjSkillActive > 0 && obs.x < player.x + 400) {
          createParticles(obs.x + obs.width/2, obs.y + obs.height/2, '#ff4400', 20);
          obstacles.splice(i, 1);
          continue;
        }

        // Hgte skill destruction
        if (player.hgteSkillActive > 0 && obs.x > player.x && obs.x < player.x + 200) {
          createParticles(obs.x + obs.width/2, obs.y + obs.height/2, '#f97316', 30); // Orange-red fire particles
          obstacles.splice(i, 1);
          setScore(s => s + 100);
          continue;
        }

        // Collision detection
        const hitboxShrinkX = 15;
        const hitboxShrinkY = player.isSliding ? 5 : 10;
        if (
          player.x + hitboxShrinkX < obs.x + obs.width &&
          player.x + player.width - hitboxShrinkX > obs.x &&
          player.y + hitboxShrinkY < obs.y + obs.height &&
          player.y + player.height - hitboxShrinkY > obs.y
        ) {
          if (player.invincibility > 0) {
            // Skip collision
            continue;
          }
          if (player.dash > 0) {
            // Smash through!
            createParticles(obs.x + obs.width/2, obs.y + obs.height/2, '#ef4444', 20);
            obstacles.splice(i, 1);
            setScore(s => {
              const dashMultiplier = (selectedCharacter === 'santa' && player.dash > 0) ? 3 : 1;
              const ttdMult = selectedCharacter === 'ttd' ? player.ttdMultiplier : 1;
              const newScore = s + Math.floor(5 * dashMultiplier * ttdMult);
              checkAchievements(newScore);
              
              if (newScore > highScore && highScore > 0 && !envRef.current.hasAnnouncedNewRecord) {
                envRef.current.hasAnnouncedNewRecord = true;
                envRef.current.announcement = '🎉 新纪录! 🎉';
                envRef.current.announcementTimer = 180;
                playSound('newRecord');
                for(let j=0; j<50; j++) {
                  createParticles(
                    canvas.width/2 + (Math.random()-0.5)*300, 
                    canvas.height/2 + (Math.random()-0.5)*300, 
                    ['#fbbf24', '#f87171', '#60a5fa', '#34d399'][Math.floor(Math.random()*4)], 
                    Math.random()*5 + 2
                  );
                }
              }
              
              return newScore;
            });
            continue;
          } else if (player.shield > 0 || player.hzSkillActive > 0) {
            if (player.hzSkillActive > 0) {
              player.hzSkillActive = 0;
              player.hzSkillSprint = 300; // 5 seconds sprint
              playSound('score');
            } else {
              player.shield = 0;
            }
            player.invincibility = 300; // 5 seconds at 60fps
            createParticles(player.x + player.width/2, player.y + player.height/2, '#34d399', 30);
            obstacles.splice(i, 1);
            continue;
          } else if (selectedCharacter === 'hz' && player.hzPassiveCharges > 0) {
            player.hzPassiveCharges -= 1;
            if (player.hzSkillCharges > 2) player.hzSkillCharges = 2;
            player.invincibility = 120; // 2 seconds invincibility after passive trigger
            createParticles(player.x + player.width/2, player.y + player.height/2, '#60a5fa', 30);
            obstacles.splice(i, 1);
            continue;
          } else if (selectedCharacter === 'hgte' && !player.hgtePassiveUsed) {
            player.hgtePassiveUsed = true;
            player.hxdActive = true;
            player.invincibility = 180; // 3 seconds invincibility
            createParticles(player.x + player.width/2, player.y + player.height/2, '#fbbf24', 50);
            obstacles.splice(i, 1);
            continue;
          } else {
            stopBgm();
            playSound('gameover');
            setGameState('gameover');
            const finalScore = score;
            setHighScore(prev => {
              const newHigh = Math.max(prev, finalScore);
              localStorage.setItem('highScore', newHigh.toString());
              return newHigh;
            });
            updateLeaderboard(finalScore);
            if (isMultiplayer) {
              finishMatch(finalScore);
            }
            createParticles(player.x + player.width/2, player.y + player.height/2, '#ef4444', 50);
            draw();
            return;
          }
        }

        if (!obs.passed && obs.x + obs.width < player.x) {
          obs.passed = true;
          playSound('score');
          setScore(s => {
            const dashMultiplier = (selectedCharacter === 'santa' && player.dash > 0) ? 3 : 1;
            const ttdMult = selectedCharacter === 'ttd' ? player.ttdMultiplier : 1;
            const hzMult = (selectedCharacter === 'hz' && player.hzSkillActive > 0) ? 2 : 1;
            const newScore = s + Math.floor((player.doubleScore > 0 ? 2 : 1) * dashMultiplier * ttdMult * hzMult);
            checkAchievements(newScore);
            
            if (newScore > highScore && highScore > 0 && !envRef.current.hasAnnouncedNewRecord) {
              envRef.current.hasAnnouncedNewRecord = true;
              envRef.current.announcement = '🎉 新纪录! 🎉';
              envRef.current.announcementTimer = 180;
              playSound('newRecord');
              for(let j=0; j<50; j++) {
                createParticles(
                  canvas.width/2 + (Math.random()-0.5)*300, 
                  canvas.height/2 + (Math.random()-0.5)*300, 
                  ['#fbbf24', '#f87171', '#60a5fa', '#34d399'][Math.floor(Math.random()*4)], 
                  Math.random()*5 + 2
                );
              }
            }
            
            return newScore;
          });
        }

        if (obs.x + obs.width < 0) {
          obstacles.splice(i, 1);
        }
      }

      draw();
      animationRef.current = requestAnimationFrame(update);
    };

    const draw = () => {
      const currentBiome = BIOMES[envRef.current.biomeIndex];
      let skyColorTop = currentBiome.bgTop;
      let skyColorBottom = currentBiome.bgBottom;
      let groundColor = currentBiome.ground;

      // Blend colors if transitioning
      if (envRef.current.biomeTransition > 0 && envRef.current.biomeIndex > 0) {
        const prevBiome = BIOMES[envRef.current.biomeIndex - 1];
        const t = envRef.current.biomeTransition;
        
        // Simple hex to rgb interpolation helper
        const hexToRgb = (hex: string) => {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return {r, g, b};
        };
        const blend = (c1: string, c2: string, t: number) => {
          const rgb1 = hexToRgb(c1);
          const rgb2 = hexToRgb(c2);
          const r = Math.round(rgb1.r * t + rgb2.r * (1 - t));
          const g = Math.round(rgb1.g * t + rgb2.g * (1 - t));
          const b = Math.round(rgb1.b * t + rgb2.b * (1 - t));
          return `rgb(${r},${g},${b})`;
        };

        skyColorTop = blend(prevBiome.bgTop, currentBiome.bgTop, t);
        skyColorBottom = blend(prevBiome.bgBottom, currentBiome.bgBottom, t);
        groundColor = blend(prevBiome.ground, currentBiome.ground, t);
      }

      if (bonusLevelRef.current.active) {
        const time = frameCountRef.current * 0.02;
        const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        
        // Convert HSL to RGB for canvas gradient
        const hslToRgb = (h: number, s: number, l: number) => {
          s /= 100;
          l /= 100;
          const k = (n: number) => (n + h / 30) % 12;
          const a = s * Math.min(l, 1 - l);
          const f = (n: number) =>
            l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
          return `rgb(${Math.round(255 * f(0))}, ${Math.round(255 * f(8))}, ${Math.round(255 * f(4))})`;
        };

        bgGradient.addColorStop(0, hslToRgb((time * 20) % 360, 80, 20));
        bgGradient.addColorStop(0.5, hslToRgb(((time * 20) + 45) % 360, 80, 30));
        bgGradient.addColorStop(1, hslToRgb(((time * 20) + 90) % 360, 80, 40));
        
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Speed lines/stars for bonus level
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        for(let i=0; i<30; i++) {
           const sx = ((frameCountRef.current * (8 + i%5) + i * 123) % (canvas.width + 400)) - 200;
           const sy = (i * 37) % groundY;
           ctx.fillRect(canvas.width - sx, sy, 30 + (i%10)*10, 2);
        }

        // Ground
        const groundGradient = ctx.createLinearGradient(0, groundY, 0, canvas.height);
        groundGradient.addColorStop(0, hslToRgb(((time * 20) + 180) % 360, 60, 30));
        groundGradient.addColorStop(1, '#000000');
        ctx.fillStyle = groundGradient;
        ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
        
        // Grid lines on ground for synthwave feel
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for(let i=0; i<20; i++) {
          const x = ((frameCountRef.current * 5 + i * 100) % canvas.width);
          ctx.moveTo(canvas.width - x, groundY);
          ctx.lineTo(canvas.width - x - 200, canvas.height);
        }
        ctx.moveTo(0, groundY + 20);
        ctx.lineTo(canvas.width, groundY + 20);
        ctx.moveTo(0, groundY + 60);
        ctx.lineTo(canvas.width, groundY + 60);
        ctx.stroke();
      } else {
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, skyColorTop);
        gradient.addColorStop(1, skyColorBottom);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Clouds (Parallax)
        cloudsRef.current.forEach(cloud => {
          ctx.fillStyle = `rgba(255, 255, 255, ${0.05 + cloud.layer * 0.05})`;
          ctx.beginPath();
          ctx.arc(cloud.x, cloud.y, cloud.width / 3, 0, Math.PI * 2);
          ctx.arc(cloud.x + cloud.width / 3, cloud.y - 10, cloud.width / 2.5, 0, Math.PI * 2);
          ctx.arc(cloud.x + cloud.width * 0.66, cloud.y, cloud.width / 3, 0, Math.PI * 2);
          ctx.fill();
        });

        // Background Elements
        backgroundElementsRef.current.forEach(el => {
          drawBackgroundElement(ctx, el);
        });

        // Ground
        ctx.fillStyle = groundColor;
        ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(0, groundY, canvas.width, 10);
      }

      // Weather Particles
      envRef.current.weatherParticles.forEach(wp => {
        if (wp.type === 'RAIN') {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = wp.size;
          ctx.beginPath();
          ctx.moveTo(wp.x, wp.y);
          ctx.lineTo(wp.x + wp.vx * 2, wp.y + wp.vy * 2);
          ctx.stroke();
        } else if (wp.type === 'SNOW') {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.beginPath();
          ctx.arc(wp.x, wp.y, wp.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (wp.type === 'WIND') {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.lineWidth = wp.size;
          ctx.beginPath();
          ctx.moveTo(wp.x, wp.y);
          ctx.lineTo(wp.x + wp.vx * 3, wp.y);
          ctx.stroke();
        }
      });

      // Weather Overlay
      if (envRef.current.weather === 'RAIN') {
        ctx.fillStyle = 'rgba(0, 0, 50, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (envRef.current.weather === 'SNOW') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Particles
      particlesRef.current.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 1 - p.life / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      // Speed Lines
      if (envRef.current.speedLines.length > 0) {
        ctx.save();
        envRef.current.speedLines.forEach(line => {
          ctx.globalAlpha = line.alpha;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(line.x, line.y);
          ctx.lineTo(line.x + line.length, line.y);
          ctx.stroke();
        });
        ctx.restore();
      }

      // Power-ups
      powerUpsRef.current.forEach(pu => {
        ctx.fillStyle = POWERUP_CONFIG[pu.type].color;
        ctx.beginPath();
        ctx.arc(pu.x + pu.width/2, pu.y + pu.height/2, pu.width/2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(POWERUP_CONFIG[pu.type].icon, pu.x + pu.width/2, pu.y + pu.height/2);
        
        // Glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = POWERUP_CONFIG[pu.type].color;
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // Black Hole
      if (blackHoleRef.current?.active) {
        const bh = blackHoleRef.current;
        ctx.save();
        ctx.translate(bh.x + bh.width/2, bh.y + bh.height/2);
        ctx.rotate(bh.rotation);
        
        // Outer glow
        const gradient = ctx.createRadialGradient(0, 0, bh.width/4, 0, 0, bh.width/2);
        gradient.addColorStop(0, 'rgba(0,0,0,1)');
        gradient.addColorStop(0.5, 'rgba(138,43,226,0.8)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, bh.width/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner core
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(0, 0, bh.width/4, 0, Math.PI * 2);
        ctx.fill();
        
        // Swirls
        ctx.strokeStyle = 'rgba(138,43,226,0.5)';
        ctx.lineWidth = 2;
        for(let i=0; i<3; i++) {
          ctx.beginPath();
          ctx.arc(0, 0, bh.width/3 + Math.sin(frameCountRef.current/10 + i)*5, (i*Math.PI*2)/3, (i*Math.PI*2)/3 + Math.PI);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Coins
      coinsRef.current.forEach(c => {
        ctx.save();
        ctx.translate(c.x + c.width/2, c.y + c.height/2);
        
        const scaleX = Math.sin(frameCountRef.current * 0.1 + c.x * 0.01);
        ctx.scale(scaleX, 1);
        
        ctx.beginPath();
        ctx.arc(0, 0, c.width/2, 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#b45309';
        ctx.stroke();
        
        // Inner ring
        ctx.beginPath();
        ctx.arc(0, 0, c.width/2 - 3, 0, Math.PI * 2);
        ctx.strokeStyle = '#f59e0b';
        ctx.stroke();
        
        ctx.fillStyle = '#b45309';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('¥', 0, 1);
        
        ctx.restore();
      });

      // Diamonds
      diamondsRef.current.forEach(d => {
        ctx.fillStyle = '#60a5fa';
        ctx.beginPath();
        ctx.moveTo(d.x + d.width/2, d.y);
        ctx.lineTo(d.x + d.width, d.y + d.height/2);
        ctx.lineTo(d.x + d.width/2, d.y + d.height);
        ctx.lineTo(d.x, d.y + d.height/2);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Shine
        ctx.fillStyle = 'white';
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(d.x + d.width/2, d.y + 5);
        ctx.lineTo(d.x + d.width - 5, d.y + d.height/2);
        ctx.lineTo(d.x + d.width/2, d.y + 10);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });

      // Obstacles
      obstaclesRef.current.forEach(obs => {
        switch(obs.type) {
          case 'tall': ctx.fillStyle = '#991b1b'; break;
          case 'wide': ctx.fillStyle = '#7f1d1d'; break;
          case 'flying': ctx.fillStyle = '#f87171'; break;
          case 'sliding': ctx.fillStyle = '#dc2626'; break;
          default: ctx.fillStyle = '#ef4444';
        }
        
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
      });

      // Boss Rendering
      if (bossRef.current.active) {
        const boss = bossRef.current;
        
        // Draw Boss
        if (ndImage) {
          ctx.drawImage(ndImage, boss.x, boss.y, 150, 150);
        } else {
          ctx.fillStyle = '#8b5cf6';
          ctx.fillRect(boss.x, boss.y, 150, 150);
          ctx.fillStyle = 'white';
          ctx.font = '20px sans-serif';
          ctx.fillText('奶帝', boss.x + 50, boss.y + 80);
        }

        // Draw Health Bar
        ctx.fillStyle = '#333';
        ctx.fillRect(canvas.width / 2 - 200, 120, 400, 20);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(canvas.width / 2 - 200, 120, 400 * (boss.health / boss.maxHealth), 20);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(canvas.width / 2 - 200, 120, 400, 20);
        ctx.fillStyle = 'white';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`奶帝 HP: ${boss.health}/${boss.maxHealth}`, canvas.width / 2, 135);
        ctx.textAlign = 'left';

        // Draw Player Hits (Hearts)
        for (let i = 0; i < boss.maxPlayerHits; i++) {
          ctx.fillStyle = i < boss.maxPlayerHits - boss.playerHits ? '#ef4444' : '#4b5563';
          ctx.beginPath();
          const hx = 20 + i * 30;
          const hy = 20;
          ctx.arc(hx + 10, hy + 10, 10, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw Boss Projectiles
        boss.projectiles.forEach(p => {
          ctx.fillStyle = p.type === 'milk' ? '#f3f4f6' : '#d1d5db';
          ctx.beginPath();
          ctx.arc(p.x + p.width/2, p.y + p.height/2, p.width/2, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#9ca3af';
          ctx.stroke();
        });

        // Draw Attack Items
        boss.attackItems.forEach(item => {
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.moveTo(item.x + item.width/2, item.y);
          ctx.lineTo(item.x + item.width, item.y + item.height/2);
          ctx.lineTo(item.x + item.width/2, item.y + item.height);
          ctx.lineTo(item.x, item.y + item.height/2);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#b45309';
          ctx.stroke();
        });

        // Draw Player Projectiles
        boss.playerProjectiles.forEach(p => {
          ctx.fillStyle = '#3b82f6';
          ctx.fillRect(p.x, p.y, p.width, p.height);
          ctx.strokeStyle = 'white';
          ctx.strokeRect(p.x, p.y, p.width, p.height);
        });
      }

      // Player
      const player = playerRef.current;

      // Hjdj Skill Effect (Flame)
      if (player.hjdjSkillActive > 0) {
        ctx.save();
        ctx.globalAlpha = 0.6 + Math.sin(frameCountRef.current * 0.2) * 0.2;
        const gradient = ctx.createLinearGradient(player.x + player.width, player.y, player.x + player.width + 400, player.y);
        gradient.addColorStop(0, 'rgba(255, 68, 0, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 136, 0, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 204, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(player.x + player.width, player.y - 20, 400, player.height + 40);
        
        // Add some flame particles
        if (Math.random() > 0.5) {
          createParticles(player.x + player.width + Math.random() * 200, player.y + Math.random() * player.height, '#ff4400', 1);
        }
        ctx.restore();
      }
      
      // Dash Trail
      if (player.dash > 0) {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#f87171';
        ctx.fillRect(player.x - 20, player.y, player.width, player.height);
        ctx.fillRect(player.x - 40, player.y, player.width, player.height);
        ctx.globalAlpha = 1.0;
      }

      // Shield Effect
      if (player.shield > 0 || player.hzSkillActive > 0) {
        ctx.strokeStyle = player.hzSkillActive > 0 ? '#60a5fa' : '#34d399';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(player.x + player.width/2, player.y + player.height/2, player.height/1.5, 0, Math.PI * 2);
        ctx.stroke();
        
        if (player.hzSkillActive > 0) {
          ctx.fillStyle = 'rgba(96, 165, 250, 0.2)';
          ctx.fill();
        }
      }

      if (playerImage) {
        const imgAspect = playerImage.width / playerImage.height;
        const playerAspect = player.width / player.height;
        
        let drawWidth = player.width;
        let drawHeight = player.height;
        let offsetX = 0;
        let offsetY = 0;

        if (imgAspect > playerAspect) {
          drawHeight = player.width / imgAspect;
          offsetY = player.height - drawHeight;
        } else {
          drawWidth = player.height * imgAspect;
          offsetX = (player.width - drawWidth) / 2;
        }

        ctx.save();
        if (player.isSliding) {
          // Visual squash for sliding
          ctx.translate(player.x + player.width / 2, player.y + player.height);
          ctx.scale(1.2, 0.5);
          ctx.translate(-(player.x + player.width / 2), -(player.y + player.height));
        }
        
        // Flickering effect for invincibility
        if (player.invincibility > 0) {
          ctx.globalAlpha = Math.floor(frameCountRef.current / 5) % 2 === 0 ? 0.3 : 0.8;
        }
        
        if (selectedCharacter === 'hgte') {
          const scale = 1.8;
          const newDrawWidth = drawWidth * scale;
          const newDrawHeight = drawHeight * scale;
          offsetX -= (newDrawWidth - drawWidth) / 2;
          offsetY -= (newDrawHeight - drawHeight);
          drawWidth = newDrawWidth;
          drawHeight = newDrawHeight;
        }
        
        ctx.drawImage(playerImage, player.x + offsetX, player.y + offsetY, drawWidth, drawHeight);
        ctx.restore();

        // Draw Title above head
        if (selectedTitle && TITLES[selectedTitle]) {
          const title = TITLES[selectedTitle];
          ctx.save();
          ctx.font = 'bold 14px Arial';
          ctx.textAlign = 'center';
          
          // Animate pulse if needed
          let alpha = 1;
          if (title.effect === 'pulse' || title.effect === 'glow' || title.effect === 'shake' || title.effect === 'rotate') {
            alpha = 0.7 + Math.sin(frameCountRef.current / 10) * 0.3;
          }
          
          ctx.globalAlpha = alpha;
          
          // Shadow/Glow
          if (title.shadow !== 'none') {
            ctx.shadowColor = title.color;
            ctx.shadowBlur = 10;
          }
          
          ctx.fillStyle = title.color;
          ctx.fillText(title.name, player.x + player.width / 2, player.y - 20);
          ctx.restore();
        }
      } else {
        // Flickering effect for invincibility
        if (player.invincibility > 0) {
          ctx.globalAlpha = Math.floor(frameCountRef.current / 5) % 2 === 0 ? 0.3 : 0.8;
        }

        ctx.fillStyle = '#3b82f6'; // blue-500
        ctx.fillRect(player.x, player.y, player.width, player.height);
        ctx.fillStyle = '#60a5fa'; // blue-400
        ctx.fillRect(player.x, player.y, player.width, 4);
        // Eye
        ctx.fillStyle = 'white';
        ctx.fillRect(player.x + player.width - 20, player.y + (player.isSliding ? 10 : 20), 12, 12);
        ctx.fillStyle = 'black';
        ctx.fillRect(player.x + player.width - 14, player.y + (player.isSliding ? 14 : 24), 6, 6);
        
        ctx.globalAlpha = 1.0;
      }
      
      // Draw hxd NPC
      if (player.hxdActive && hxdImage) {
        const hxdX = player.x - 50 + Math.sin(frameCountRef.current / 20) * 10;
        const hxdY = player.y - 30 + Math.cos(frameCountRef.current / 15) * 10;
        ctx.drawImage(hxdImage, hxdX, hxdY, 40, 40);
      }

      // Draw hgte swing effect
      if (player.hgteSkillActive > 0) {
        ctx.save();
        ctx.translate(player.x + player.width, player.y + player.height / 2);
        // Rotate based on remaining time (30 -> 0)
        const angle = (player.hgteSkillActive / 30) * Math.PI - Math.PI / 2;
        ctx.rotate(angle);
        
        // Draw fire trail
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(100, -20);
        ctx.lineTo(120, 0);
        ctx.lineTo(100, 20);
        ctx.fillStyle = 'rgba(249, 115, 22, 0.5)';
        ctx.fill();

        // Draw bat
        if (hgteSkillImage) {
          ctx.drawImage(hgteSkillImage, 0, -10, 80, 20);
        } else {
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(0, -5, 80, 10);
        }
        ctx.restore();
      }

      // Draw Announcement
      if (envRef.current.announcementTimer > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, envRef.current.announcementTimer / 30);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, canvas.height / 4 - 30, canvas.width, 60);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(envRef.current.announcement, canvas.width / 2, canvas.height / 4);
        ctx.restore();
      }

      // Draw Entrance Effect
      if (envRef.current.entranceEffectTimer > 0 && selectedEntranceEffect) {
        const effect = ENTRANCE_EFFECTS[selectedEntranceEffect];
        const timer = envRef.current.entranceEffectTimer;
        const maxTimer = 180;
        const progress = 1 - (timer / maxTimer);
        
        ctx.save();
        
        if (effect.type === 'flash') {
          // Flowing light effect
          ctx.globalAlpha = Math.max(0, Math.sin(progress * Math.PI) * 0.8);
          const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          gradient.addColorStop(0, 'transparent');
          gradient.addColorStop(0.5, effect.color);
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Light beams
          ctx.globalAlpha = Math.max(0, Math.sin(progress * Math.PI * 2) * 0.5);
          ctx.beginPath();
          ctx.moveTo(canvas.width / 2, 0);
          ctx.lineTo(player.x - 100, canvas.height);
          ctx.lineTo(player.x + player.width + 100, canvas.height);
          ctx.fillStyle = effect.color;
          ctx.fill();
        } else if (effect.type === 'sparkle') {
          // Diamond sparkle effect
          ctx.globalAlpha = Math.max(0, timer / maxTimer);
          for (let i = 0; i < 20; i++) {
            const x = (Math.sin(progress * 10 + i) * 0.5 + 0.5) * canvas.width;
            const y = (Math.cos(progress * 15 + i) * 0.5 + 0.5) * canvas.height;
            const size = Math.random() * 10 + 5;
            
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(progress * Math.PI * 4 + i);
            ctx.fillStyle = effect.color;
            ctx.shadowColor = effect.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(0, -size);
            ctx.lineTo(size/3, -size/3);
            ctx.lineTo(size, 0);
            ctx.lineTo(size/3, size/3);
            ctx.lineTo(0, size);
            ctx.lineTo(-size/3, size/3);
            ctx.lineTo(-size, 0);
            ctx.lineTo(-size/3, -size/3);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        } else if (effect.type === 'warp') {
          // Star trek warp effect
          ctx.globalAlpha = Math.max(0, timer / maxTimer);
          ctx.translate(canvas.width / 2, canvas.height / 2);
          for (let i = 0; i < 50; i++) {
            const angle = (i / 50) * Math.PI * 2 + progress * 2;
            const dist = progress * canvas.width * (Math.random() * 0.5 + 0.5);
            const length = Math.random() * 50 + 20;
            
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * dist, Math.sin(angle) * dist);
            ctx.lineTo(Math.cos(angle) * (dist + length), Math.sin(angle) * (dist + length));
            ctx.strokeStyle = effect.color;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        } else if (effect.type === 'screen_shake') {
          // King arrival effect
          if (timer > 120) {
            const shake = (timer - 120) / 60 * 10;
            ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
          }
          
          ctx.globalAlpha = Math.max(0, Math.sin(progress * Math.PI));
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          ctx.shadowColor = effect.color;
          ctx.shadowBlur = 20;
          ctx.fillStyle = effect.color;
          ctx.font = '900 60px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Scale text
          const scale = 1 + Math.sin(progress * Math.PI) * 0.5;
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.scale(scale, scale);
          ctx.fillText(effect.name, 0, 0);
        }
        
        ctx.restore();
        
        // Update timer
        if (gameState === 'playing') {
          envRef.current.entranceEffectTimer--;
        }
      }

      // Score is now rendered via React overlay
    };

    if (gameState === 'playing') {
      animationRef.current = requestAnimationFrame(update);
    } else {
      draw();
    }

    return () => cancelAnimationFrame(animationRef.current);
  }, [gameState, playerImage, hxdImage, hgteSkillImage, score, createParticles, updateLeaderboard, isMultiplayer, updateMatchScore, finishMatch]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setPlayerImage(img);
    };
    img.src = getCharacterImage(selectedCharacter);

    const hxdImgObj = new Image();
    hxdImgObj.onload = () => setHxdImage(hxdImgObj);
    hxdImgObj.src = hxdImg;

    const skillImgObj = new Image();
    skillImgObj.onload = () => setHgteSkillImage(skillImgObj);
    skillImgObj.src = hgteSkillImg;

    const ndImgObj = new Image();
    ndImgObj.onload = () => setNdImage(ndImgObj);
    ndImgObj.src = ndImg;
  }, [selectedCharacter]);

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 font-sans text-neutral-100">
      <div className="w-full max-w-[400px] bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden border-4 border-neutral-800 relative">
        
        {/* Avatar Selection Modal */}
        {showAvatarSelect && (
          <div className="absolute inset-0 z-[70] bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-[#fff8e1] w-full max-w-sm rounded-3xl border-4 border-[#ffb300] shadow-[0_10px_0_#ff8f00,0_15px_20px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
              <div className="bg-[#ffb300] p-4 flex justify-between items-center">
                <h2 className="text-2xl font-black text-white">选择头像</h2>
                <button onClick={() => setShowAvatarSelect(false)} className="text-white hover:scale-110 transition-transform">
                  <X size={32} strokeWidth={3} />
                </button>
              </div>
              <div className="p-6 grid grid-cols-2 gap-4">
                {Array.from(new Set(unlockedCharacters)).filter(id => ['hdd', 'santa', 'hjdj', 'hz', 'hgte', 'ttd'].includes(id)).map(charId => (
                  <button
                    key={charId}
                    onClick={() => updateAvatar(charId)}
                    className={`p-2 rounded-2xl border-4 flex flex-col items-center gap-2 transition-all ${avatarId === charId ? 'bg-[#ffecb3] border-[#ffb300]' : 'bg-white border-gray-200 hover:border-[#ffe082]'}`}
                  >
                    <div className="w-20 h-20 bg-white rounded-xl border-2 border-gray-100 flex items-center justify-center overflow-hidden">
                      <img src={getCharacterImage(charId)} alt={charId} className="h-full object-contain" />
                    </div>
                    <span className="text-sm font-black text-[#5d4037]">
                      {charId === 'hdd' ? '呼大帝' : charId === 'santa' ? '圣诞老呼' : charId === 'hjdj' ? '海军大将' : charId === 'hgte' ? '呼刚帝尔' : charId === 'ttd' ? '跳跳帝' : charId === 'hz' ? '呼子' : '未知'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Unlock Animation Modal */}
        <AnimatePresence>
          {unlockingChar && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-6 backdrop-blur-xl"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 12, stiffness: 100 }}
                className="relative flex flex-col items-center"
              >
                <div className="absolute inset-0 bg-yellow-400 rounded-full blur-3xl opacity-30 animate-pulse"></div>
                <div className="w-48 h-48 bg-gradient-to-br from-yellow-200 to-yellow-500 rounded-full border-8 border-white shadow-[0_0_50px_rgba(234,179,8,0.6)] flex items-center justify-center overflow-hidden mb-8 relative z-10">
                  <img 
                    src={getCharacterImage(unlockingChar)} 
                    alt="Unlocked" 
                    className="h-4/5 object-contain drop-shadow-2xl"
                  />
                </div>
                <motion.h2 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-4xl font-black text-yellow-400 mb-2 text-center"
                  style={{ textShadow: '0 0 20px rgba(234,179,8,0.8)' }}
                >
                  新角色解锁！
                </motion.h2>
                <motion.p 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-white text-xl font-bold mb-8"
                >
                  恭喜获得：{
                    unlockingChar === 'santa' ? '圣诞老呼' : 
                    unlockingChar === 'hjdj' ? '海军大将' : 
                    unlockingChar === 'hz' ? '呼子' : 
                    unlockingChar === 'hgte' ? '呼刚帝尔' : '新伙伴'
                  }
                </motion.p>
                <motion.button
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  onClick={() => setUnlockingChar(null)}
                  className="px-12 py-4 bg-white text-black rounded-full font-black text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all"
                >
                  太棒了！
                </motion.button>
              </motion.div>
              
              {/* Confetti-like particles */}
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ 
                    x: 0, 
                    y: 0, 
                    scale: 0 
                  }}
                  animate={{ 
                    x: (Math.random() - 0.5) * 400, 
                    y: (Math.random() - 0.5) * 400, 
                    scale: Math.random() * 1.5,
                    rotate: Math.random() * 360
                  }}
                  transition={{ 
                    duration: 1, 
                    delay: 0.2,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                  className="absolute w-4 h-4 rounded-sm"
                  style={{ 
                    backgroundColor: ['#fbbf24', '#34d399', '#60a5fa', '#f87171'][Math.floor(Math.random() * 4)]
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ranked Modal */}
        {showRankedModal && (
          <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#fff8e1] w-full max-w-[300px] rounded-3xl p-4 border-4 border-[#0288d1] shadow-[0_8px_0_#01579b,0_10px_15px_rgba(0,0,0,0.3)] flex flex-col items-center relative"
            >
              <button 
                onClick={() => setShowRankedModal(false)} 
                className="absolute -top-2 -right-2 text-[#0288d1] hover:scale-110 transition-transform bg-white rounded-full p-1 border-2 border-[#0288d1] shadow-md z-10"
              >
                <X size={20} strokeWidth={3} />
              </button>

              <div className="w-full text-center mb-3">
                <h2 className="text-2xl font-black text-[#0288d1] tracking-wider" style={{ textShadow: '1px 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff' }}>排位赛</h2>
                <p className="text-[#01579b] text-xs font-bold mt-0.5">与全服玩家一较高下！</p>
              </div>

              {(() => {
                const currentRP = rankPoints ?? 1000;
                const rankInfo = getRankInfo(currentRP);
                const nextRank = RANK_SYSTEM.find(r => r.minRP > currentRP);
                const progress = nextRank ? ((currentRP - rankInfo.minRP) / (nextRank.minRP - rankInfo.minRP)) * 100 : 100;
                
                return (
                  <div className="w-full flex flex-col items-center gap-2">
                    <div className="relative w-24 h-24 flex items-center justify-center bg-white rounded-full border-4 shadow-inner" style={{ borderColor: rankInfo.color }}>
                      <span className="text-4xl drop-shadow-md">{rankInfo.icon}</span>
                      <div className="absolute -bottom-2 bg-white px-3 py-0.5 rounded-full border-2 font-black text-[10px] shadow-md" style={{ borderColor: rankInfo.color, color: rankInfo.color }}>
                        {rankInfo.name}
                      </div>
                    </div>

                    <div className="w-full mt-2 bg-white/50 p-3 rounded-2xl border-2 border-[#0288d1]/20">
                      <div className="flex justify-between items-end mb-1">
                        <span className="text-[#01579b] font-black text-sm">{currentRP} RP</span>
                        {nextRank ? (
                          <span className="text-[10px] font-bold text-gray-500">距离 {nextRank.name} 还需 {nextRank.minRP - currentRP} RP</span>
                        ) : (
                          <span className="text-[10px] font-bold text-gray-500">已达最高段位</span>
                        )}
                      </div>
                      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden border border-gray-300 shadow-inner">
                        <div 
                          className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${progress}%`, backgroundColor: rankInfo.color, boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.2)' }}
                        />
                      </div>
                    </div>

                    <div className="w-full grid grid-cols-2 gap-2">
                      <div className="bg-white/60 p-2 rounded-xl border border-[#0288d1]/20 flex flex-col items-center">
                        <span className="text-[10px] text-gray-500 font-bold">总场次</span>
                        <span className="text-sm font-black text-[#0288d1]">{rankedTotal}</span>
                      </div>
                      <div className="bg-white/60 p-2 rounded-xl border border-[#0288d1]/20 flex flex-col items-center">
                        <span className="text-[10px] text-gray-500 font-bold">胜率</span>
                        <span className="text-sm font-black text-[#0288d1]">{rankedTotal > 0 ? Math.round((rankedWins / rankedTotal) * 100) : 0}%</span>
                      </div>
                    </div>

                    <div className="w-full bg-blue-50 p-2 rounded-xl border border-blue-200 flex justify-between items-center">
                      <div className="text-[10px] text-blue-800 font-bold">
                        <p>🏆 赛季奖励：</p>
                        <p className="text-blue-600 mt-0.5">称号、头像框、特效、海量钻石</p>
                      </div>
                      <button 
                        onClick={() => setShowRankRewardsModal(true)}
                        className="px-3 py-1.5 bg-blue-500 text-white text-[10px] font-bold rounded-lg shadow-sm hover:bg-blue-600 transition-colors"
                      >
                        查看详情
                      </button>
                    </div>

                    <button 
                      onClick={() => {
                        setShowRankedModal(false);
                        startMatchmaking(0, 'ranked');
                      }}
                      className="w-full mt-1 py-3 rounded-2xl font-black text-lg text-white border-4 border-white shadow-[0_4px_0_#0277bd,0_5px_10px_rgba(0,0,0,0.3)] transition-transform active:translate-y-1 active:shadow-[0_0px_0_#0277bd]"
                      style={{ background: 'linear-gradient(to bottom, #4fc3f7, #0288d1)', textShadow: '1px 1px 0 #01579b, -1px -1px 0 #01579b, 1px -1px 0 #01579b, -1px 1px 0 #01579b' }}
                    >
                      开始匹配
                    </button>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}

        {/* Rank Rewards Modal */}
        {showRankRewardsModal && (
          <div className="absolute inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#1a2a40] w-full max-w-md max-h-[80vh] rounded-3xl p-6 border-4 border-[#4aadff] shadow-[0_10px_0_#02579a,0_15px_20px_rgba(0,0,0,0.5)] flex flex-col items-center relative overflow-hidden"
            >
              <button 
                onClick={() => setShowRankRewardsModal(false)} 
                className="absolute top-4 right-4 text-[#4aadff] hover:text-white hover:scale-110 transition-all z-10"
              >
                <X size={24} strokeWidth={3} />
              </button>

              <div className="w-full text-center mb-6 relative z-10">
                <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-[#4aadff] tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">赛季排位奖励</h2>
                <p className="text-[#a0c4ff] text-sm font-bold mt-1">达到指定段位即可在赛季结算时获得丰厚奖励</p>
              </div>

              <div className="w-full overflow-y-auto pr-2 space-y-4 relative z-10 custom-scrollbar">
                {[
                  { rank: '王者', icon: '👑', color: '#ff1744', desc: '全服顶尖的象征', rewards: ['称号：荣耀王者', '动态头像框：王者之风', '全屏进场特效：君临天下', '专属皮肤：巅峰荣耀', '1500 钻石'] },
                  { rank: '星耀', icon: '🌟', color: '#ff4081', desc: '星光璀璨的强者', rewards: ['称号：星光熠熠', '动态头像框：星耀之芒', '进场特效：星际迷航', '800 钻石'] },
                  { rank: '钻石', icon: '💠', color: '#b388ff', desc: '坚不可摧的精英', rewards: ['称号：璀璨之星', '头像框：钻石之光', '进场特效：碎钻闪耀', '500 钻石'] },
                  { rank: '铂金', icon: '💎', color: '#00e5ff', desc: '技艺精湛的高手', rewards: ['称号：傲视群雄', '头像框：铂金之翼', '进场特效：流光溢彩', '300 钻石'] },
                  { rank: '黄金', icon: '🥇', color: '#ffd700', desc: '身经百战的勇士', rewards: ['称号：身经百战', '头像框：黄金之盾', '200 钻石'] },
                  { rank: '白银', icon: '🥈', color: '#c0c0c0', desc: '崭露头角的新秀', rewards: ['称号：崭露头角', '100 钻石'] },
                  { rank: '青铜', icon: '🥉', color: '#cd7f32', desc: '初出茅庐的挑战者', rewards: ['称号：初出茅庐', '50 钻石'] },
                ].map((tier, idx) => (
                  <div key={idx} className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-start gap-4 relative overflow-hidden group hover:bg-white/10 transition-colors">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full -z-10" />
                    <div className="flex flex-col items-center justify-center min-w-[80px]">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center text-4xl shadow-[0_0_15px_rgba(0,0,0,0.5)] border-2" style={{ borderColor: tier.color, background: `radial-gradient(circle, ${tier.color}40 0%, transparent 80%)` }}>
                        {tier.icon}
                      </div>
                      <span className="font-black mt-2 text-lg" style={{ color: tier.color, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{tier.rank}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-400 text-xs font-bold mb-2">{tier.desc}</p>
                      <div className="flex flex-wrap gap-2">
                        {tier.rewards.map((reward, rIdx) => (
                          <span key={rIdx} className="px-2 py-1 bg-black/40 rounded-md text-xs font-bold text-blue-200 border border-blue-500/30">
                            {reward}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Honor Modal */}
        {showHonorModal && (
          <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#fff8e1] w-full max-w-md rounded-3xl p-6 border-4 border-[#ffb300] shadow-[0_10px_0_#ff8f00,0_15px_20px_rgba(0,0,0,0.5)] flex flex-col items-center"
            >
              <div className="w-full flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="text-[#ffb300]" size={32} />
                  <h2 className="text-3xl font-black text-[#e65100]">荣誉殿堂</h2>
                </div>
                <button onClick={() => setShowHonorModal(false)} className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white font-bold shadow-md active:translate-y-1">X</button>
              </div>

              <div className="w-full flex gap-2 mb-4">
                <button 
                  onClick={() => setHonorTab('titles')}
                  className={`flex-1 py-2 rounded-xl font-bold transition-all ${honorTab === 'titles' ? 'bg-[#ffb300] text-white shadow-md' : 'bg-white/50 text-[#ffb300] hover:bg-white'}`}
                >
                  称号
                </button>
                <button 
                  onClick={() => setHonorTab('frames')}
                  className={`flex-1 py-2 rounded-xl font-bold transition-all ${honorTab === 'frames' ? 'bg-[#ffb300] text-white shadow-md' : 'bg-white/50 text-[#ffb300] hover:bg-white'}`}
                >
                  头像框
                </button>
                <button 
                  onClick={() => setHonorTab('effects')}
                  className={`flex-1 py-2 rounded-xl font-bold transition-all ${honorTab === 'effects' ? 'bg-[#ffb300] text-white shadow-md' : 'bg-white/50 text-[#ffb300] hover:bg-white'}`}
                >
                  进场特效
                </button>
              </div>

              <div className="w-full bg-white/50 rounded-2xl p-4 mb-6 border-2 border-[#ffb300]/20">
                {honorTab === 'titles' && (
                  <>
                    <p className="text-[#5d4037] font-bold text-center mb-4 italic">“真正的强者，不仅有实力，更有象征身份的称号。”</p>
                    <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2">
                      {(Object.keys(TITLES) as TitleId[]).map((titleId) => {
                        const title = TITLES[titleId];
                        const isUnlocked = unlockedTitles.includes(titleId);
                        const isSelected = selectedTitle === titleId;

                        return (
                          <div 
                            key={titleId}
                            className={`p-4 rounded-2xl border-2 transition-all relative overflow-hidden ${
                              isUnlocked 
                                ? isSelected 
                                  ? 'bg-white border-[#ffb300] shadow-md ring-2 ring-[#ffb300]/20' 
                                  : 'bg-white border-gray-200 hover:border-[#ffb300]/50 cursor-pointer'
                                : 'bg-gray-100 border-gray-200 opacity-60 grayscale'
                            }`}
                            onClick={() => isUnlocked && selectTitle(isSelected ? null : titleId)}
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex flex-col">
                                <span 
                                  className={`text-lg font-black ${title.effect === 'pulse' ? 'animate-pulse' : title.effect === 'rotate' ? 'animate-spin' : title.effect === 'shake' ? 'animate-bounce' : ''}`}
                                  style={{ 
                                    color: title.color,
                                    textShadow: title.shadow
                                  }}
                                >
                                  {title.name}
                                </span>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                  {title.rarity === 'legendary' ? '✨ 传说' : title.rarity === 'epic' ? '🌟 史诗' : title.rarity === 'rare' ? '💎 稀有' : '🌱 普通'}
                                </span>
                              </div>
                              {isUnlocked ? (
                                isSelected ? (
                                  <div className="bg-[#4caf50] text-white px-3 py-1 rounded-full text-xs font-black shadow-sm">已佩戴</div>
                                ) : (
                                  <div className="bg-gray-200 text-gray-500 px-3 py-1 rounded-full text-xs font-black">点击佩戴</div>
                                )
                              ) : (
                                <div className="flex items-center gap-1 text-gray-400 text-xs font-bold">
                                  <Lock size={12} />
                                  <span>未解锁</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Requirements hint */}
                            {!isUnlocked && (
                              <div className="mt-2 text-[10px] text-gray-500 font-bold bg-black/5 px-2 py-1 rounded-lg">
                                解锁条件：{
                                  titleId === 'rookie' ? '初始赠送' :
                                  titleId === 'runner' ? '历史最高分达到 500' :
                                  titleId === 'jumper' ? '历史最高分达到 800' :
                                  titleId === 'explorer' ? '历史最高分达到 1,200' :
                                  titleId === 'expert' ? '历史最高分达到 2,000' :
                                  titleId === 'acrobat' ? '历史最高分达到 3,000' :
                                  titleId === 'survivor' ? '历史最高分达到 4,000' :
                                  titleId === 'treasure_hunter' ? '钻石数量达到 5,000' :
                                  titleId === 'wind_chaser' ? '历史最高分达到 6,000' :
                                  titleId === 'void_walker' ? '历史最高分达到 8,000' :
                                  titleId === 'neon_dreamer' ? '历史最高分达到 10,000' :
                                  titleId === 'speed_demon' ? '历史最高分达到 12,000' :
                                  titleId === 'shadow_ninja' ? '历史最高分达到 14,000' :
                                  titleId === 'star_gazer' ? '历史最高分达到 16,000' :
                                  titleId === 'time_traveler' ? '历史最高分达到 18,000' :
                                  titleId === 'dragon_rider' ? '历史最高分达到 20,000' :
                                  titleId === 'diamond_king' ? '钻石数量达到 50,000' :
                                  titleId === 'king' ? '获得排行榜第 1 名' :
                                  titleId === 'hdd_shadow' ? '历史最高分达到 30,000' :
                                  titleId === 'god_mode' ? '历史最高分达到 40,000' :
                                  titleId === 'galaxy_lord' ? '历史最高分达到 50,000' :
                                  titleId === 'immortal' ? '历史最高分达到 60,000' :
                                  titleId === 'cyber_punk' ? '历史最高分达到 70,000' :
                                  titleId === 'abyss_watcher' ? '历史最高分达到 80,000' :
                                  titleId === 'creator' ? '历史最高分达到 100,000' : 
                                  titleId === 'rank_bronze' ? '排位赛达到青铜段位' :
                                  titleId === 'rank_silver' ? '排位赛达到白银段位' :
                                  titleId === 'rank_gold' ? '排位赛达到黄金段位' :
                                  titleId === 'rank_platinum' ? '排位赛达到铂金段位' :
                                  titleId === 'rank_diamond' ? '排位赛达到钻石段位' :
                                  titleId === 'rank_star' ? '排位赛达到星耀段位' :
                                  titleId === 'rank_king' ? '排位赛达到王者段位' : '未知条件'
                                }
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {honorTab === 'frames' && (
                  <>
                    <p className="text-[#5d4037] font-bold text-center mb-4 italic">“华丽的头像框，彰显你的排位实力。”</p>
                    <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2">
                      {(Object.keys(AVATAR_FRAMES) as FrameId[]).map((frameId) => {
                        const frame = AVATAR_FRAMES[frameId];
                        const isUnlocked = unlockedFrames.includes(frameId);
                        const isSelected = selectedFrame === frameId;

                        return (
                          <div 
                            key={frameId}
                            className={`p-4 rounded-2xl border-2 transition-all relative overflow-hidden flex items-center gap-4 ${
                              isUnlocked 
                                ? isSelected 
                                  ? 'bg-white border-[#ffb300] shadow-md ring-2 ring-[#ffb300]/20' 
                                  : 'bg-white border-gray-200 hover:border-[#ffb300]/50 cursor-pointer'
                                : 'bg-gray-100 border-gray-200 opacity-60 grayscale'
                            }`}
                            onClick={() => isUnlocked && selectFrame(isSelected ? null : frameId)}
                          >
                            <AvatarWithFrame avatarId={avatarId} frameId={frameId} className="w-16 h-16" />
                            <div className="flex-1 flex justify-between items-center">
                              <div className="flex flex-col">
                                <span className="text-lg font-black" style={{ color: frame.color }}>{frame.name}</span>
                              </div>
                              {isUnlocked ? (
                                isSelected ? (
                                  <div className="bg-[#4caf50] text-white px-3 py-1 rounded-full text-xs font-black shadow-sm">已佩戴</div>
                                ) : (
                                  <div className="bg-gray-200 text-gray-500 px-3 py-1 rounded-full text-xs font-black">点击佩戴</div>
                                )
                              ) : (
                                <div className="flex items-center gap-1 text-gray-400 text-xs font-bold">
                                  <Lock size={12} />
                                  <span>未解锁</span>
                                </div>
                              )}
                            </div>
                            {!isUnlocked && (
                              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 font-bold bg-black/5 px-2 py-0.5 rounded-lg w-11/12 text-center">
                                解锁条件：{
                                  frameId === 'gold_shield' ? '排位赛达到黄金段位' :
                                  frameId === 'platinum_wings' ? '排位赛达到铂金段位' :
                                  frameId === 'diamond_light' ? '排位赛达到钻石段位' :
                                  frameId === 'star_glow' ? '排位赛达到星耀段位' :
                                  frameId === 'king_wind' ? '排位赛达到王者段位' : '未知条件'
                                }
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {honorTab === 'effects' && (
                  <>
                    <p className="text-[#5d4037] font-bold text-center mb-4 italic">“炫酷的进场特效，让你成为全场焦点。”</p>
                    <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2">
                      {(Object.keys(ENTRANCE_EFFECTS) as EntranceEffectId[]).map((effectId) => {
                        const effect = ENTRANCE_EFFECTS[effectId];
                        const isUnlocked = unlockedEntranceEffects.includes(effectId);
                        const isSelected = selectedEntranceEffect === effectId;

                        return (
                          <div 
                            key={effectId}
                            className={`p-4 rounded-2xl border-2 transition-all relative overflow-hidden ${
                              isUnlocked 
                                ? isSelected 
                                  ? 'bg-white border-[#ffb300] shadow-md ring-2 ring-[#ffb300]/20' 
                                  : 'bg-white border-gray-200 hover:border-[#ffb300]/50 cursor-pointer'
                                : 'bg-gray-100 border-gray-200 opacity-60 grayscale'
                            }`}
                            onClick={() => isUnlocked && selectEntranceEffect(isSelected ? null : effectId)}
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex flex-col">
                                <span className="text-lg font-black" style={{ color: effect.color }}>{effect.name}</span>
                              </div>
                              {isUnlocked ? (
                                isSelected ? (
                                  <div className="bg-[#4caf50] text-white px-3 py-1 rounded-full text-xs font-black shadow-sm">已佩戴</div>
                                ) : (
                                  <div className="bg-gray-200 text-gray-500 px-3 py-1 rounded-full text-xs font-black">点击佩戴</div>
                                )
                              ) : (
                                <div className="flex items-center gap-1 text-gray-400 text-xs font-bold">
                                  <Lock size={12} />
                                  <span>未解锁</span>
                                </div>
                              )}
                            </div>
                            {!isUnlocked && (
                              <div className="mt-2 text-[10px] text-gray-500 font-bold bg-black/5 px-2 py-1 rounded-lg">
                                解锁条件：{
                                  effectId === 'flowing_light' ? '排位赛达到铂金段位' :
                                  effectId === 'diamond_sparkle' ? '排位赛达到钻石段位' :
                                  effectId === 'star_trek' ? '排位赛达到星耀段位' :
                                  effectId === 'king_arrival' ? '排位赛达到王者段位' : '未知条件'
                                }
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <p className="text-[10px] text-gray-400 font-bold text-center">
                {honorTab === 'titles' ? '称号将在排行榜和个人资料中展示' : 
                 honorTab === 'frames' ? '头像框将在排行榜和个人资料中展示' : 
                 '进场特效将在对局开始时展示'}
              </p>
            </motion.div>
          </div>
        )}

        {/* Gacha Result Modal */}
        {showGachaResultModal && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center p-4">
            <div className="bg-[#fff8e1] w-full max-w-sm rounded-3xl p-6 border-4 border-[#ffb300] shadow-[0_10px_0_#ff8f00,0_15px_20px_rgba(0,0,0,0.5)] flex flex-col items-center">
              <div className="w-full flex justify-between items-center mb-4">
                <h2 className="text-3xl font-black text-[#e65100]">抽奖结果</h2>
                <button onClick={() => setShowGachaResultModal(false)} className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold shadow-md active:translate-y-1">X</button>
              </div>
              <div className="flex flex-col items-center gap-3 mb-4">
                {gachaResult.hgteFragments > 0 && (
                  <div className="flex items-center gap-2 text-xl font-bold text-[#5d4037]">
                    获得呼刚帝尔碎片：
                    <img src={hgteImg} alt="碎片" className="w-8 h-8 object-contain drop-shadow-md" />
                    <span className="text-blue-600 font-black text-2xl">x{gachaResult.hgteFragments}</span>
                  </div>
                )}
                {gachaResult.ttdFragments > 0 && (
                  <div className="flex items-center gap-2 text-xl font-bold text-[#5d4037]">
                    获得跳跳帝碎片：
                    <img src={ttdImg} alt="碎片" className="w-8 h-8 object-contain drop-shadow-md" />
                    <span className="text-blue-600 font-black text-2xl">x{gachaResult.ttdFragments}</span>
                  </div>
                )}
                {gachaResult.hgteFragments === 0 && gachaResult.ttdFragments === 0 && (
                  <div className="text-gray-500 font-bold italic">本次未获得角色碎片</div>
                )}
              </div>
              <div className="w-full text-center">
                <p className="text-[#d84315] font-bold text-sm mb-2">获得道具：</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(gachaResult.items).map(([key, count]) => (
                    <div key={key} className="bg-white p-2 rounded-xl border border-[#ffe082] flex items-center justify-center gap-2">
                      <span className="text-2xl">{POWERUP_CONFIG[key as PowerUpType].icon}</span>
                      <span className="font-black text-lg text-[#e65100]">x{count}</span>
                    </div>
                  ))}
                  {Object.keys(gachaResult.items).length === 0 && <p className="text-gray-500 text-sm">无</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Modal */}
        {showInventoryModal && (
          <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-[#fff8e1] w-full max-w-sm rounded-3xl p-6 border-4 border-[#ffb300] shadow-[0_10px_0_#ff8f00,0_15px_20px_rgba(0,0,0,0.5)] flex flex-col items-center -mt-10">
              <div className="w-full flex justify-between items-center mb-4">
                <h2 className="text-3xl font-black text-[#e65100]">我的背包</h2>
                <button onClick={() => setShowInventoryModal(false)} className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold shadow-md active:translate-y-1">X</button>
              </div>
              
              <div className="w-full space-y-2 mb-4">
                <div className="bg-[#ffcc80]/30 py-3 px-4 rounded-xl border-2 border-[#ffb300]/30 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <img src={hgteImg} alt="碎片" className="w-8 h-8 object-contain drop-shadow-md" />
                    <span className="text-[#d84315] font-bold">呼刚帝尔碎片</span>
                  </div>
                  <span className="text-blue-600 font-black text-xl">{hgteFragments}/78</span>
                </div>
                <div className="bg-[#ffcc80]/30 py-3 px-4 rounded-xl border-2 border-[#ffb300]/30 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <img src={ttdImg} alt="碎片" className="w-8 h-8 object-contain drop-shadow-md" />
                    <span className="text-[#d84315] font-bold">跳跳帝碎片</span>
                  </div>
                  <span className="text-blue-600 font-black text-xl">{ttdFragments}/78</span>
                </div>
              </div>

              <div className="w-full">
                <h3 className="text-[#d84315] font-bold text-lg mb-2">游戏道具</h3>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(POWERUP_CONFIG) as PowerUpType[]).map(type => (
                    <div key={type} className="bg-white p-3 rounded-xl border-2 border-[#ffe082] flex flex-col items-center justify-center gap-1 shadow-sm">
                      <span className="text-3xl drop-shadow-sm">{POWERUP_CONFIG[type].icon}</span>
                      <span className="font-bold text-[#5d4037] text-sm">{POWERUP_CONFIG[type].label}</span>
                      <div className="bg-[#ffecb3] px-3 py-1 rounded-full mt-1">
                        <span className="font-black text-[#e65100]">x{inventory[type] || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Check-in Modal */}
        {showCheckInModal && (
          <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-[#fff8e1] w-full max-w-sm rounded-3xl p-6 border-4 border-[#ffb300] shadow-[0_10px_0_#ff8f00,0_15px_20px_rgba(0,0,0,0.5)] flex flex-col items-center -mt-10">
              <div className="w-full flex justify-between items-center mb-4">
                <h2 className="text-3xl font-black text-[#e65100]">签到福利</h2>
                <button onClick={() => setShowCheckInModal(false)} className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold shadow-md active:translate-y-1">X</button>
              </div>
              
              <div className="w-full bg-[#ffcc80]/30 py-2 px-4 rounded-xl border-2 border-[#ffb300]/30 mb-6 text-center">
                <p className="text-[#d84315] font-bold text-sm">内测送钻石，每天领取 <span className="text-blue-600 font-black text-lg">8888</span> 💎</p>
              </div>

              <div className="grid grid-cols-4 gap-2 w-full mb-6">
                {[...Array(7)].map((_, i) => {
                  const isCheckedIn = i < checkInCount;
                  return (
                    <div key={i} className={`flex flex-col items-center justify-center p-2 rounded-2xl border-2 ${i === 6 ? 'col-span-2 bg-gradient-to-br from-[#ffe082] to-[#ffca28] border-[#ff8f00]' : 'bg-white border-[#ffe082]'} shadow-sm relative overflow-hidden`}>
                      <div className="text-[#e65100] font-black text-xs mb-1">第{i + 1}天</div>
                      <div className="text-xl drop-shadow-sm">💎</div>
                      <div className="text-blue-600 font-black text-sm mt-1">{i === 6 ? 9999 : 8888}</div>
                      {isCheckedIn && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                          <span className="text-3xl drop-shadow-md">✅</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {checkInMessage && (
                <div className="w-full bg-black/60 text-white font-bold text-sm py-2 px-4 rounded-xl mb-4 text-center animate-pulse">
                  {checkInMessage}
                </div>
              )}

              <button 
                onClick={handleCheckIn}
                disabled={hasCheckedInToday}
                className={`w-full py-3 rounded-2xl font-black text-xl text-white border-4 border-white transition-transform ${hasCheckedInToday ? 'opacity-50 grayscale cursor-not-allowed shadow-[0_0px_0_#43a047]' : 'shadow-[0_6px_0_#43a047,0_10px_20px_rgba(0,0,0,0.4)] active:translate-y-2 active:shadow-[0_0px_0_#43a047]'}`}
                style={{ background: 'linear-gradient(to bottom, #a5d6a7, #66bb6a, #4caf50)', textShadow: '1px 1px 0 #2e7d32, -1px -1px 0 #2e7d32, 1px -1px 0 #2e7d32, -1px 1px 0 #2e7d32' }}
              >
                {hasCheckedInToday ? '今日已签到' : '立即签到'}
              </button>
            </div>
          </div>
        )}

        {/* Mailbox Modal */}
        {showMailModal && (
          <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[#FFFDF0] w-full max-w-3xl rounded-3xl overflow-hidden flex flex-col max-h-[85vh] shadow-2xl border-4 border-[#FAD689]">
              <div className="p-6 flex justify-between items-center bg-[#FFFDF0] border-b-2 border-[#FAD689]">
                <div className="flex items-center gap-3">
                  {selectedMail && (
                    <button onClick={() => setSelectedMail(null)} className="mr-2 text-[#A65D2C] hover:text-[#8a4d24]">
                      <ChevronLeft size={28} />
                    </button>
                  )}
                  <div className="bg-orange-400 p-2 rounded-xl">
                    <Mail className="text-white" size={24} />
                  </div>
                  <h2 className="text-3xl font-black text-[#A65D2C] tracking-tight">
                    {selectedMail ? selectedMail.title : '我的邮件'}
                  </h2>
                </div>
                <button onClick={() => { setShowMailModal(false); setSelectedMail(null); }} className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-md">
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex-1 overflow-hidden flex">
                {/* Mail List */}
                <div className={`w-full shrink-0 flex-col overflow-y-auto p-4 gap-3 ${selectedMail ? 'hidden' : 'flex'}`}>
                  {mails.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-[#A65D2C] opacity-50">
                      <Bell size={48} className="mb-4" />
                      <p className="font-bold">邮件空空如也</p>
                    </div>
                  ) : (
                    mails.map(mail => (
                      <button 
                        key={mail.id}
                        onClick={() => { setSelectedMail(mail); markMailAsRead(mail); }}
                        className={`flex flex-col p-4 rounded-2xl border-2 transition-all text-left relative ${
                          selectedMail?.id === mail.id 
                            ? 'bg-[#FAD689] border-[#A65D2C] shadow-inner' 
                            : 'bg-white border-[#FAD689] hover:border-[#F9C75C] shadow-sm'
                        }`}
                      >
                        {!mail.isRead && (
                          <div className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
                        )}
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-black text-[#A65D2C] line-clamp-1 pr-4">{mail.title}</span>
                          <span className="text-[10px] text-[#A65D2C] opacity-60 whitespace-nowrap shrink-0">
                            {mail.timestamp?.toDate ? mail.timestamp.toDate().toLocaleDateString() : '刚刚'}
                          </span>
                        </div>
                        <p className="text-xs text-[#A65D2C] opacity-70 line-clamp-1">{mail.content}</p>
                        <div className="mt-2 flex items-center justify-between w-full">
                          <span className="text-[10px] bg-[#A65D2C]/10 text-[#A65D2C] px-2 py-0.5 rounded-full font-bold">
                            来自: {mail.sender}
                          </span>
                          {mail.rewards && mail.rewards.length > 0 && (
                            <div className="flex items-center gap-1">
                              {mail.rewards.slice(0, 3).map((reward: any, idx: number) => (
                                <span key={idx} className="text-xs flex items-center justify-center">
                                  {reward.type === 'diamonds' ? '💎' : 
                                   reward.type === 'hgteFragments' ? '🧩' : 
                                   reward.type === 'ttdFragments' ? '🧩' : 
                                   reward.type === 'char_santa' ? <img src={getCharacterImage('santa')} className="w-4 h-4 object-contain" /> :
                                   reward.type === 'char_hjdj' ? <img src={getCharacterImage('hjdj')} className="w-4 h-4 object-contain" /> :
                                   reward.type === 'char_hz' ? <img src={getCharacterImage('hz')} className="w-4 h-4 object-contain" /> :
                                   reward.type === 'char_hgte' ? <img src={getCharacterImage('hgte')} className="w-4 h-4 object-contain" /> :
                                   reward.type === 'char_ttd' ? <img src={getCharacterImage('ttd')} className="w-4 h-4 object-contain" /> :
                                   POWERUP_CONFIG[reward.type as PowerUpType]?.icon || '🎁'}
                                </span>
                              ))}
                              {mail.rewards.length > 3 && <span className="text-[10px] text-[#A65D2C] font-bold">...</span>}
                            </div>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {/* Mail Content */}
                {selectedMail && (
                  <div className="flex-1 flex flex-col bg-white overflow-y-auto">
                    <div className="p-6 flex flex-col h-full">
                      <div className="flex justify-between items-start mb-6">
                        <h3 className="text-2xl font-black text-[#A65D2C] leading-tight">{selectedMail.title}</h3>
                        <button 
                          onClick={() => deleteMail(selectedMail.id)}
                          className="text-red-400 hover:text-red-600 p-2"
                          title="删除邮件"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#FAD689]/30">
                        <div className="w-10 h-10 bg-[#FAD689] rounded-full flex items-center justify-center font-bold text-[#A65D2C]">
                          {selectedMail.sender[0]}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-[#A65D2C]">{selectedMail.sender}</span>
                          <span className="text-xs text-[#A65D2C] opacity-60">
                            {selectedMail.timestamp?.toDate ? selectedMail.timestamp.toDate().toLocaleString() : '刚刚'}
                          </span>
                        </div>
                      </div>

                      <div className="flex-1 text-[#A65D2C] leading-relaxed whitespace-pre-wrap text-sm">
                        {selectedMail.content}
                      </div>

                      {selectedMail.rewards && selectedMail.rewards.length > 0 && (
                        <div className="mt-6 p-4 bg-white rounded-2xl border-2 border-[#FAD689]">
                          <h4 className="font-bold text-[#A65D2C] mb-3">附件奖励</h4>
                          <div className="flex flex-wrap gap-3">
                            {selectedMail.rewards.map((reward: any, index: number) => (
                              <div key={index} className="flex items-center gap-2 bg-[#FFF0D4] px-3 py-2 rounded-xl border border-[#FAD689] whitespace-nowrap">
                                <span className="text-lg flex items-center justify-center">
                                  {reward.type === 'diamonds' ? '💎' : 
                                   reward.type === 'hgteFragments' ? '🧩' : 
                                   reward.type === 'ttdFragments' ? '🧩' : 
                                   reward.type === 'char_santa' ? <img src={getCharacterImage('santa')} className="w-6 h-6 object-contain" /> :
                                   reward.type === 'char_hjdj' ? <img src={getCharacterImage('hjdj')} className="w-6 h-6 object-contain" /> :
                                   reward.type === 'char_hz' ? <img src={getCharacterImage('hz')} className="w-6 h-6 object-contain" /> :
                                   reward.type === 'char_hgte' ? <img src={getCharacterImage('hgte')} className="w-6 h-6 object-contain" /> :
                                   reward.type === 'char_ttd' ? <img src={getCharacterImage('ttd')} className="w-6 h-6 object-contain" /> :
                                   POWERUP_CONFIG[reward.type as PowerUpType]?.icon || '🎁'}
                                </span>
                                <span className="font-bold text-[#A65D2C]">
                                  {reward.type === 'diamonds' ? '钻石' : 
                                   reward.type === 'hgteFragments' ? 'HGTE碎片' : 
                                   reward.type === 'ttdFragments' ? 'TTD碎片' : 
                                   reward.type === 'char_santa' ? '角色: 圣诞老呼' : 
                                   reward.type === 'char_hjdj' ? '角色: 海军大将' : 
                                   reward.type === 'char_hz' ? '角色: 呼子' : 
                                   reward.type === 'char_hgte' ? '角色: 呼刚帝尔' : 
                                   reward.type === 'char_ttd' ? '角色: 跳跳帝' : 
                                   POWERUP_CONFIG[reward.type as PowerUpType]?.label || reward.type}
                                </span>
                                <span className="font-black text-[#e65100]">x{reward.amount}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-8 pt-6 border-t border-[#FAD689]/30 flex justify-between items-center">
                        <button 
                          onClick={() => setSelectedMail(null)}
                          className="md:hidden bg-[#FAD689] text-[#A65D2C] font-bold px-6 py-2 rounded-xl"
                        >
                          返回列表
                        </button>
                        <div className="flex-1"></div>
                        <div className="flex items-center gap-4">
                          {selectedMail.rewards && selectedMail.rewards.length > 0 && !selectedMail.isClaimed && (
                            <button
                              onClick={() => claimMailRewards(selectedMail)}
                              className="bg-[#4CAF50] text-white font-bold px-6 py-2 rounded-xl hover:bg-[#45a049] transition-colors shadow-md"
                            >
                              一键领取
                            </button>
                          )}
                          {selectedMail.rewards && selectedMail.rewards.length > 0 && selectedMail.isClaimed && (
                            <div className="flex items-center gap-2 text-[#4CAF50] font-bold text-sm">
                              <CheckCircle2 size={16} /> 已领取
                            </div>
                          )}
                          <div className="hidden md:flex items-center gap-2 text-[#4CAF50] font-bold text-sm">
                            <CheckCircle2 size={16} /> 已读
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Admin Mail Modal */}
        {showAdminMailModal && (
          <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[#FFFDF0] w-full max-w-lg rounded-3xl overflow-hidden flex flex-col max-h-[85vh] shadow-2xl border-4 border-[#FAD689]">
              <div className="p-6 flex justify-between items-center bg-[#FFFDF0] border-b-2 border-[#FAD689]">
                <h2 className="text-3xl font-black text-[#A65D2C] tracking-tight">发送邮件</h2>
                <button onClick={() => setShowAdminMailModal(false)} className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-md">
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-gradient-to-b from-[#FFFDF0] to-[#FFF0D4]">
                <div>
                  <label className="block text-[#A65D2C] font-bold mb-2">收件人</label>
                  <select 
                    value={adminMailData.recipientId}
                    onChange={(e) => setAdminMailData({...adminMailData, recipientId: e.target.value})}
                    className="w-full border-2 border-[#FAD689] rounded-xl px-4 py-3 bg-white text-black focus:border-[#4CAF50] focus:outline-none"
                  >
                    <option value="all">所有玩家 (全服邮件)</option>
                    {allUsers.map(u => (
                      <option key={u.uid} value={u.uid}>{u.name} ({u.uid.substring(0, 6)}...)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#A65D2C] font-bold mb-2">标题</label>
                  <input 
                    type="text" 
                    value={adminMailData.title}
                    onChange={(e) => setAdminMailData({...adminMailData, title: e.target.value})}
                    placeholder="邮件标题"
                    className="w-full border-2 border-[#FAD689] rounded-xl px-4 py-3 bg-white text-black focus:border-[#4CAF50] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#A65D2C] font-bold mb-2">内容</label>
                  <textarea 
                    value={adminMailData.content}
                    onChange={(e) => setAdminMailData({...adminMailData, content: e.target.value})}
                    placeholder="邮件内容"
                    rows={5}
                    className="w-full border-2 border-[#FAD689] rounded-xl px-4 py-3 bg-white text-black focus:border-[#4CAF50] focus:outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[#A65D2C] font-bold mb-2">附加奖励</label>
                  <div className="flex flex-wrap gap-2">
                    {['diamonds', 'shield', 'magnet', 'doubleScore', 'dash', 'hgteFragments', 'ttdFragments', 'char_santa', 'char_hjdj', 'char_hz', 'char_hgte', 'char_ttd'].map(type => {
                      const label = type === 'diamonds' ? '钻石' : 
                                    type === 'shield' ? '护盾' : 
                                    type === 'magnet' ? '磁铁' : 
                                    type === 'doubleScore' ? '双倍积分' : 
                                    type === 'dash' ? '冲刺' : 
                                    type === 'hgteFragments' ? 'HGTE碎片' : 
                                    type === 'ttdFragments' ? 'TTD碎片' : 
                                    type === 'char_santa' ? '角色: 圣诞老呼' : 
                                    type === 'char_hjdj' ? '角色: 海军大将' : 
                                    type === 'char_hz' ? '角色: 呼子' : 
                                    type === 'char_hgte' ? '角色: 呼刚帝尔' : 
                                    type === 'char_ttd' ? '角色: 跳跳帝' : type;
                      return (
                      <button
                        key={type}
                        onClick={() => {
                          const existing = adminMailRewards.find(r => r.type === type);
                          if (existing) {
                            setAdminMailRewards(adminMailRewards.filter(r => r.type !== type));
                          } else {
                            setAdminMailRewards([...adminMailRewards, { type, amount: 1 }]);
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-sm font-bold border-2 transition-colors ${
                          adminMailRewards.some(r => r.type === type)
                            ? 'bg-[#4CAF50] text-white border-[#4CAF50]'
                            : 'bg-white text-[#A65D2C] border-[#FAD689] hover:bg-[#FFF0D4]'
                        }`}
                      >
                        {label}
                      </button>
                    )})}
                  </div>
                  {adminMailRewards.length > 0 && (
                    <div className="mt-3 flex flex-col gap-2">
                      {adminMailRewards.map(reward => {
                        const label = reward.type === 'diamonds' ? '钻石' : 
                                      reward.type === 'shield' ? '护盾' : 
                                      reward.type === 'magnet' ? '磁铁' : 
                                      reward.type === 'doubleScore' ? '双倍积分' : 
                                      reward.type === 'dash' ? '冲刺' : 
                                      reward.type === 'hgteFragments' ? 'HGTE碎片' : 
                                      reward.type === 'ttdFragments' ? 'TTD碎片' : 
                                      reward.type === 'char_santa' ? '角色: 圣诞老呼' : 
                                      reward.type === 'char_hjdj' ? '角色: 海军大将' : 
                                      reward.type === 'char_hz' ? '角色: 呼子' : 
                                      reward.type === 'char_hgte' ? '角色: 呼刚帝尔' : 
                                      reward.type === 'char_ttd' ? '角色: 跳跳帝' : reward.type;
                        return (
                        <div key={reward.type} className="flex items-center gap-2 bg-white p-2 rounded-lg border-2 border-[#FAD689]">
                          <span className="font-bold text-[#A65D2C] w-32 truncate" title={label}>
                            {label}
                          </span>
                          {!reward.type.startsWith('char_') && (
                            <input 
                              type="number" 
                              min="1"
                              value={reward.amount}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 1;
                                setAdminMailRewards(adminMailRewards.map(r => r.type === reward.type ? { ...r, amount: val } : r));
                              }}
                              className="flex-1 border-2 border-[#FAD689] rounded-lg px-2 py-1 text-center focus:border-[#4CAF50] focus:outline-none"
                            />
                          )}
                          {reward.type.startsWith('char_') && (
                            <span className="flex-1 text-center text-[#4CAF50] font-bold">1</span>
                          )}
                        </div>
                      )})}
                    </div>
                  )}
                </div>
                <button 
                  onClick={sendAdminMail}
                  className="mt-4 w-full py-3 rounded-2xl font-black text-xl text-white border-4 border-white shadow-[0_6px_0_#1976D2,0_10px_20px_rgba(0,0,0,0.4)] active:translate-y-2 active:shadow-[0_0px_0_#1976D2] transition-transform"
                  style={{ background: 'linear-gradient(to bottom, #64B5F6, #2196F3, #1976D2)', textShadow: '1px 1px 0 #0D47A1, -1px -1px 0 #0D47A1, 1px -1px 0 #0D47A1, -1px 1px 0 #0D47A1' }}
                >
                  发送邮件
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Friends Modal */}
        {showFriendsModal && (
          <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[#FFFDF0] w-full max-w-md rounded-3xl overflow-hidden flex flex-col max-h-[85vh] shadow-2xl border-4 border-[#FAD689]">
              <div className="p-6 flex justify-between items-center bg-[#FFFDF0]">
                <h2 className="text-3xl font-black text-[#A65D2C] tracking-tight">好友与房间</h2>
                <button onClick={() => setShowFriendsModal(false)} className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-md">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 flex flex-col gap-6 overflow-y-auto bg-gradient-to-b from-[#FFFDF0] to-[#FFF0D4]">
                {/* Room Section */}
                <div className="bg-white p-5 rounded-2xl border-2 border-[#FAD689] shadow-sm">
                  <h3 className="font-bold text-[#A65D2C] mb-4 flex items-center gap-2 text-lg">
                    <Play size={20} className="text-[#4CAF50]" /> 自定义房间
                  </h3>
                  <div className="flex gap-3 mb-4">
                    <button 
                      onClick={createPrivateRoom}
                      className="flex-1 bg-[#4CAF50] text-white font-bold py-3 rounded-xl hover:bg-[#45A049] active:scale-95 transition-all shadow-md"
                    >
                      创建房间
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="输入6位房间号" 
                      value={roomCodeInput}
                      onChange={(e) => setRoomCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="flex-1 border-2 border-[#FAD689] rounded-xl px-4 py-3 font-mono text-center text-[#A65D2C] bg-white focus:border-[#4CAF50] focus:outline-none"
                    />
                    <button 
                      onClick={() => joinPrivateRoom(roomCodeInput)}
                      className="bg-[#FAD689] text-[#A65D2C] font-bold px-6 py-3 rounded-xl hover:bg-[#F9C75C] active:scale-95 transition-all shadow-md"
                    >
                      加入
                    </button>
                  </div>
                </div>

                {/* Friends List */}
                <div>
                  <h3 className="font-bold text-[#A65D2C] mb-3 flex items-center gap-2 text-lg">
                    <Users size={20} className="text-[#4CAF50]" /> 我的好友 ({friendsData.length})
                  </h3>
                  {friendsData.length === 0 ? (
                    <div className="text-[#A65D2C] text-sm text-center py-8 bg-white rounded-2xl border-2 border-dashed border-[#FAD689]">
                      暂无好友，快去添加吧！
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {friendsData.map(friend => (
                        <div key={friend.uid} className="flex items-center justify-between bg-white border-2 border-[#FAD689] p-3 rounded-2xl hover:border-[#4CAF50] transition-all shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#FFFDF0] rounded-full overflow-hidden flex items-center justify-center border-2 border-[#4CAF50]">
                              {friend.avatarId ? (
                                <img src={getCharacterImage(friend.avatarId)} alt="avatar" className="w-full h-full object-contain" />
                              ) : (
                                <Users size={20} className="text-[#4CAF50]" />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-[#A65D2C]">{friend.name}</span>
                              {friend.title && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: TITLES[friend.title as any]?.color, backgroundColor: `${TITLES[friend.title as any]?.color}20` }}>
                                  {TITLES[friend.title as any]?.name}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => inviteFriend(friend.uid)}
                              className="flex items-center justify-center bg-[#4CAF50] text-white p-2 rounded-xl hover:bg-[#45A049] active:scale-95 transition-all shadow-sm"
                              title="邀请加入房间"
                            >
                              <Play size={16} fill="currentColor" />
                            </button>
                            <button 
                              onClick={() => removeFriend(friend.uid)}
                              className="flex items-center justify-center bg-red-100 text-red-500 p-2 rounded-xl hover:bg-red-500 hover:text-white active:scale-95 transition-all shadow-sm"
                              title="删除好友"
                            >
                              <X size={16} strokeWidth={3} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* All Users List */}
                <div>
                  <h3 className="font-bold text-[#A65D2C] mb-3 flex items-center gap-2 text-lg">
                    <Users size={20} className="text-[#FAD689]" /> 所有玩家
                  </h3>
                  <div className="flex flex-col gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {allUsers.filter(u => u.uid !== user?.uid).map(u => {
                      const isFriend = friends.includes(u.uid);
                      return (
                        <div key={u.uid} className="flex items-center justify-between bg-white border-2 border-[#FAD689]/50 p-3 rounded-2xl hover:border-[#FAD689] transition-all shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#FFFDF0] rounded-full overflow-hidden flex items-center justify-center border-2 border-[#FAD689]">
                              {u.avatarId ? (
                                <img src={getCharacterImage(u.avatarId)} alt="avatar" className="w-full h-full object-contain" />
                              ) : (
                                <Users size={20} className="text-[#FAD689]" />
                              )}
                            </div>
                            <span className="font-bold text-[#A65D2C] text-sm truncate max-w-[120px]">{u.name}</span>
                          </div>
                          {isFriend ? (
                            <span className="text-[#A65D2C]/60 text-xs font-bold px-3 py-1.5 bg-[#FFFDF0] border-2 border-[#FAD689]/50 rounded-xl">已添加</span>
                          ) : (
                            <button 
                              onClick={() => addFriend(u.uid)}
                              className="text-white text-xs font-bold px-4 py-1.5 bg-[#4CAF50] rounded-xl hover:bg-[#45A049] shadow-sm active:scale-95 transition-all"
                            >
                              添加
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rank Change Animation */}
        <AnimatePresence>
          {rankChange && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none overflow-hidden"
              style={{
                background: 'radial-gradient(circle at 50% 100%, #0c3366 0%, #051630 60%, #020813 100%)'
              }}
            >
              {/* Vertical Light Pillar */}
              <motion.div
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute bottom-0 w-[300px] h-[100vh] origin-bottom"
                style={{
                  background: 'linear-gradient(to top, rgba(74, 173, 255, 0.6) 0%, rgba(74, 173, 255, 0.1) 50%, transparent 100%)',
                  filter: 'blur(30px)'
                }}
              />
              <motion.div
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                className="absolute bottom-0 w-[80px] h-[80vh] origin-bottom"
                style={{
                  background: 'linear-gradient(to top, rgba(255, 255, 255, 0.8) 0%, rgba(100, 200, 255, 0.3) 60%, transparent 100%)',
                  filter: 'blur(10px)'
                }}
              />

              {/* Floating Particles */}
              {[...Array(30)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-white rounded-full"
                  initial={{ 
                    x: (Math.random() - 0.5) * window.innerWidth, 
                    y: window.innerHeight / 2 + Math.random() * window.innerHeight / 2,
                    opacity: Math.random() * 0.5 + 0.5,
                    scale: Math.random() * 2 + 0.5
                  }}
                  animate={{ 
                    y: -100,
                    opacity: 0
                  }}
                  transition={{ 
                    duration: Math.random() * 3 + 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                    ease: "linear"
                  }}
                  style={{
                    boxShadow: '0 0 6px 2px rgba(100,200,255,0.8)'
                  }}
                />
              ))}

              <div className="relative z-10 flex flex-col items-center w-full h-full justify-center mt-[-10vh]">
                {/* Header Text */}
                <motion.div 
                  initial={{ y: -30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="absolute top-[15%] flex flex-col items-center text-center w-full"
                >
                  <h2 className="text-4xl md:text-5xl font-bold text-white tracking-widest drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5), 0 0 20px rgba(74,173,255,0.5)' }}>
                    {rankChange.type === 'up' ? `恭喜您段位提升至${rankChange.to.name}` : 
                     rankChange.type === 'down' ? `很遗憾段位降至${rankChange.to.name}` : 
                     rankChange.rpChange > 0 ? '排位赛胜利' : 
                     rankChange.rpChange < 0 ? '排位赛失败' : '排位赛平局'}
                  </h2>
                  <p className="text-lg md:text-xl text-blue-200 mt-4 tracking-widest opacity-80 font-light drop-shadow-[0_1px_5px_rgba(0,0,0,0.8)]">
                    {rankChange.type === 'up' ? '荣耀加冕，实力见证' : 
                     rankChange.type === 'down' ? '重整旗鼓，再创辉煌' : 
                     rankChange.rpChange > 0 ? '稳扎稳打，步步高升' : 
                     rankChange.rpChange < 0 ? '胜败乃兵家常事' : '势均力敌的较量'}
                  </p>
                </motion.div>

                {/* Central Emblem */}
                <motion.div
                  initial={{ scale: 0, opacity: 0, y: 50 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, type: "spring", damping: 15, stiffness: 100 }}
                  className="relative flex items-center justify-center mt-20"
                >
                  {/* Glowing aura behind emblem */}
                  <motion.div 
                    animate={{ 
                      scale: [1, 1.1, 1],
                      opacity: [0.6, 0.9, 0.6]
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute w-[350px] h-[350px] rounded-full"
                    style={{
                      background: `radial-gradient(circle, ${rankChange.to.color}60 0%, transparent 70%)`,
                      filter: 'blur(25px)'
                    }}
                  />
                  
                  {/* Elaborate Border/Wings around the icon */}
                  <div className="absolute w-[400px] h-[400px] flex items-center justify-center pointer-events-none z-20">
                    <svg width="100%" height="100%" viewBox="0 0 400 400" className="absolute inset-0">
                      <defs>
                        <linearGradient id="wingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                          <stop offset="100%" stopColor="#a0c4ff" stopOpacity="0.2" />
                        </linearGradient>
                        <linearGradient id="wingGradRight" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#a0c4ff" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.9" />
                        </linearGradient>
                        <filter id="glowWing" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="4" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                      </defs>
                      
                      {/* Left Wings */}
                      <motion.g initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1, duration: 0.8, ease: "easeOut" }} filter="url(#glowWing)">
                        <path d="M 120 150 Q 60 120 20 160 Q 70 180 100 180 Z" fill="url(#wingGrad)" />
                        <path d="M 110 180 Q 40 170 10 210 Q 60 220 95 210 Z" fill="url(#wingGrad)" />
                        <path d="M 115 210 Q 50 220 30 260 Q 80 250 110 230 Z" fill="url(#wingGrad)" />
                      </motion.g>
                      
                      {/* Right Wings */}
                      <motion.g initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1, duration: 0.8, ease: "easeOut" }} filter="url(#glowWing)">
                        <path d="M 280 150 Q 340 120 380 160 Q 330 180 300 180 Z" fill="url(#wingGradRight)" />
                        <path d="M 290 180 Q 360 170 390 210 Q 340 220 305 210 Z" fill="url(#wingGradRight)" />
                        <path d="M 285 210 Q 350 220 370 260 Q 320 250 290 230 Z" fill="url(#wingGradRight)" />
                      </motion.g>

                      {/* Top Gem */}
                      <motion.g initial={{ opacity: 0, y: 20, scale: 0 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 1.2, type: "spring" }}>
                        <circle cx="200" cy="70" r="15" fill="#ff3366" filter="url(#glowWing)" />
                        <circle cx="200" cy="70" r="8" fill="#ffffff" />
                        <path d="M 180 80 Q 200 100 220 80 Q 200 60 180 80 Z" fill="#ffd700" />
                      </motion.g>

                      {/* Bottom Gem */}
                      <motion.g initial={{ opacity: 0, y: -20, scale: 0 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 1.3, type: "spring" }}>
                        <polygon points="200,310 220,330 200,360 180,330" fill="#a0c4ff" filter="url(#glowWing)" />
                        <polygon points="200,315 210,330 200,345 190,330" fill="#ffffff" />
                      </motion.g>
                    </svg>
                  </div>

                  {/* The Emblem itself */}
                  <div className="relative z-10 w-[220px] h-[220px] bg-gradient-to-br from-[#800000] to-[#cc0000] rounded-full border-[6px] flex items-center justify-center shadow-[inset_0_0_40px_rgba(0,0,0,0.6),0_0_30px_rgba(0,0,0,0.8)]" style={{ borderColor: '#ffd700' }}>
                    <div className="absolute inset-0 rounded-full border-2 border-white/30 m-1" />
                    <span className="text-[110px] drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]" style={{ color: rankChange.to.color }}>
                      {rankChange.to.icon}
                    </span>
                  </div>
                  
                  {/* RP Change Badge */}
                  <motion.div 
                    initial={{ scale: 0, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ delay: 1.5, type: "spring" }}
                    className="absolute -bottom-10 bg-gradient-to-b from-[#1a2a40] to-[#0a1526] border border-[#4aadff]/50 px-8 py-2 rounded-full flex items-center gap-4 shadow-[0_0_20px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.2)] z-30"
                  >
                    <span className="text-gray-300 font-mono text-xl">{rankChange.currentRP}</span>
                    <span className={`font-black text-3xl ${rankChange.rpChange > 0 ? 'text-[#4ade80]' : rankChange.rpChange < 0 ? 'text-[#f87171]' : 'text-gray-400'} drop-shadow-[0_0_8px_currentColor]`}>
                      {rankChange.rpChange > 0 ? `+${rankChange.rpChange}` : rankChange.rpChange}
                    </span>
                    <span className="text-white font-mono font-bold text-2xl drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">{rankChange.newRP}</span>
                  </motion.div>
                </motion.div>

                {/* Floating Avatars/Decorations around the emblem */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.2, duration: 0.8, type: "spring" }}
                  className="absolute ml-[-320px] mt-[-120px] flex flex-col items-center"
                >
                  <motion.div 
                    animate={{ y: [-10, 10, -10] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="w-24 h-24 rounded-full bg-gradient-to-br from-[#1a2a40] to-[#0a1526] border-[3px] border-[#ffd700] flex items-center justify-center text-5xl shadow-[0_0_20px_rgba(255,215,0,0.3),inset_0_0_15px_rgba(255,255,255,0.1)] relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
                    {rankChange.type !== 'same' ? rankChange.from.icon : '⭐'}
                  </motion.div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.4, duration: 0.8, type: "spring" }}
                  className="absolute mr-[-350px] mt-[80px] flex flex-col items-center"
                >
                  <motion.div 
                    animate={{ y: [10, -10, 10] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-[#1a2a40] to-[#0a1526] border-[3px] border-[#a0c4ff] flex items-center justify-center text-4xl shadow-[0_0_20px_rgba(160,196,255,0.3),inset_0_0_15px_rgba(255,255,255,0.1)] relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
                    🏆
                  </motion.div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.6, duration: 0.8, type: "spring" }}
                  className="absolute ml-[-220px] mt-[280px] flex flex-col items-center"
                >
                  <motion.div 
                    animate={{ y: [-8, 8, -8] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="w-28 h-28 rounded-full bg-gradient-to-br from-[#1a2a40] to-[#0a1526] border-[3px] border-[#c0c0c0] flex items-center justify-center text-6xl shadow-[0_0_20px_rgba(192,192,192,0.3),inset_0_0_15px_rgba(255,255,255,0.1)] relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
                    💎
                  </motion.div>
                </motion.div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Right Controls */}
        {!isModalOpen && (
          <div className="absolute top-4 right-4 z-[70] flex flex-col gap-3 items-center">
            <button 
              onClick={() => {
                const muted = toggleMute();
                setIsMutedState(muted);
              }}
              className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center border border-white/20 hover:bg-black/70 transition-colors shadow-lg"
            >
              {isMutedState ? <VolumeX className="text-white" size={20} /> : <Volume2 className="text-white" size={20} />}
            </button>
            
            {gameState === 'start' && (
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowHonorModal(true)}
                className="w-10 h-10 bg-[#ffb300] rounded-full flex items-center justify-center border-4 border-white shadow-[0_4px_0_#b7791f,0_6px_10px_rgba(0,0,0,0.3)] transition-transform"
              >
                <Trophy className="text-white" size={20} strokeWidth={3} />
              </motion.button>
            )}
          </div>
        )}

        {/* Pause Button (Playing) */}
        {gameState === 'playing' && (
          <button 
            onClick={() => setGameState('paused')}
            className="absolute top-4 left-4 z-10 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center border border-white/20 hover:bg-black/70 transition-colors"
          >
            <Pause className="text-white" size={20} fill="currentColor" />
          </button>
        )}

        {/* Score & Diamonds Display (Playing) */}
        {gameState === 'playing' && (
          <div className="absolute top-4 right-16 z-10 flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <div className="bg-black/50 px-3 py-1 rounded-full border border-white/20 flex items-center gap-2">
                <span className="text-blue-400 text-sm">💎</span>
                <span className="font-mono text-blue-400 font-bold text-lg">{diamonds}</span>
              </div>
              <div className="bg-black/50 px-4 py-1 rounded-full border border-white/20 flex flex-col items-end">
                <span className="font-mono text-yellow-400 font-bold text-xl leading-none">{Math.floor(score)}</span>
                {isMultiplayer && opponent && (
                  <span className="font-mono text-red-400 font-bold text-xs mt-1">对手: {opponent.score}</span>
                )}
              </div>
            </div>
            {/* Power-up Indicators */}
            <div className="flex flex-col gap-1">
              {playerRef.current?.shield > 0 && (
                <div className="bg-emerald-500/80 px-2 py-0.5 rounded text-[10px] font-bold text-white animate-pulse">
                  SHIELD {Math.ceil(playerRef.current.shield / 60)}s
                </div>
              )}
              {playerRef.current?.magnet > 0 && (
                <div className="bg-blue-500/80 px-2 py-0.5 rounded text-[10px] font-bold text-white animate-pulse">
                  MAGNET {Math.ceil(playerRef.current.magnet / 60)}s
                </div>
              )}
              {playerRef.current?.doubleScore > 0 && (
                <div className="bg-yellow-500/80 px-2 py-0.5 rounded text-[10px] font-bold text-white animate-pulse">
                  2X SCORE {Math.ceil(playerRef.current.doubleScore / 60)}s
                </div>
              )}
              {playerRef.current?.dash > 0 && (
                <div className="bg-red-500/80 px-2 py-0.5 rounded text-[10px] font-bold text-white animate-pulse">
                  DASH {Math.ceil(playerRef.current.dash / 60)}s
                </div>
              )}
              {playerRef.current?.hzSkillActive > 0 && (
                <div className="bg-blue-500/80 px-2 py-0.5 rounded text-[10px] font-bold text-white animate-pulse">
                  FAT SHIELD {Math.ceil(playerRef.current.hzSkillActive / 60)}s
                </div>
              )}
              {playerRef.current?.hzSkillSprint > 0 && (
                <div className="bg-orange-500/80 px-2 py-0.5 rounded text-[10px] font-bold text-white animate-pulse">
                  FAT SPRINT {Math.ceil(playerRef.current.hzSkillSprint / 60)}s
                </div>
              )}
              {selectedCharacter === 'hz' && playerRef.current && (
                <div className="bg-purple-500/80 px-2 py-0.5 rounded text-[10px] font-bold text-white">
                  PASSIVE: {playerRef.current.hzPassiveCharges}
                </div>
              )}
              {selectedCharacter === 'hgte' && playerRef.current && (
                <div className="bg-purple-500/80 px-2 py-0.5 rounded text-[10px] font-bold text-white">
                  PASSIVE: {playerRef.current.hgtePassiveUsed ? 0 : 1}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Inventory Buttons (Playing) */}
        {gameState === 'playing' && (
          <div className="absolute bottom-32 right-4 z-10 flex flex-col gap-3">
            {(Object.entries(SHOP_ITEMS) as [PowerUpType, any][]).map(([type, item]) => (
              <button
                key={type}
                onClick={() => useItem(type)}
                disabled={gameInventory[type] <= 0}
                className={`w-12 h-12 rounded-2xl border-2 flex flex-col items-center justify-center transition-all relative ${
                  gameInventory[type] > 0 
                    ? 'bg-white border-yellow-400 shadow-lg scale-110' 
                    : 'bg-black/30 border-white/10 opacity-50 grayscale'
                }`}
              >
                <span className="text-xl">{POWERUP_CONFIG[type].icon}</span>
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                  {gameInventory[type]}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Crouch Button */}
        {gameState === 'playing' && (
          <div className="absolute bottom-4 left-4 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                slide();
              }}
              className="w-16 h-16 rounded-full border-4 flex items-center justify-center transition-all relative overflow-hidden bg-blue-500 border-blue-300 shadow-[0_6px_0_#1d4ed8] active:translate-y-1 active:shadow-none"
            >
              <img src="xd.png" alt="Crouch" className="w-full h-full object-cover" />
            </button>
            <div className="text-center mt-1">
              <span className="text-white font-black text-xs bg-black/50 px-2 py-0.5 rounded-full">下蹲</span>
            </div>
          </div>
        )}

        {/* TTD UI */}
        {gameState === 'playing' && (
          <TtdUI playerRef={playerRef} selectedCharacter={selectedCharacter} />
        )}

        {/* Hjdj Skill Button */}
        {gameState === 'playing' && selectedCharacter === 'hjdj' && (
          <div className="absolute bottom-4 right-4 z-10">
            <button
              onClick={activateHjdjSkill}
              disabled={playerRef.current && playerRef.current.hjdjSkillCooldown > 0}
              className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all relative overflow-hidden ${
                playerRef.current && playerRef.current.hjdjSkillCooldown > 0
                  ? 'bg-black/50 border-white/20 grayscale'
                  : 'bg-orange-500 border-yellow-400 shadow-[0_6px_0_#e65100] active:translate-y-1 active:shadow-none'
              }`}
            >
              <img src={hjdjSkillImg} alt="Skill" className="w-full h-full object-cover" />
              {playerRef.current && playerRef.current.hjdjSkillCooldown > 0 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-black text-2xl">
                  {Math.ceil(playerRef.current.hjdjSkillCooldown / 60)}
                </div>
              )}
            </button>
            <div className="text-center mt-1">
              <span className="text-white font-black text-xs bg-black/50 px-2 py-0.5 rounded-full">火烧赤壁</span>
            </div>
          </div>
        )}

        {/* Hz Skill Button */}
        {gameState === 'playing' && selectedCharacter === 'hz' && (
          <div className="absolute bottom-4 right-4 z-10">
            <button
              onClick={activateHzSkill}
              disabled={playerRef.current && playerRef.current.hzSkillCharges < 4}
              className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all relative overflow-hidden ${
                playerRef.current && playerRef.current.hzSkillCharges < 4
                  ? 'bg-black/50 border-white/20 opacity-60'
                  : 'bg-green-500 border-green-300 shadow-[0_6px_0_#2e7d32] active:translate-y-1 active:shadow-none'
              }`}
            >
              <img src={hzSkillImg} alt="Skill" className="w-full h-full object-cover" />
              <div className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">
                {playerRef.current ? playerRef.current.hzSkillCharges : 0}/4
              </div>
            </button>
            <div className="text-center mt-1">
              <span className="text-white font-black text-xs bg-black/50 px-2 py-0.5 rounded-full">脂肪护盾</span>
            </div>
          </div>
        )}

        {/* Hgte Skill Button */}
        {gameState === 'playing' && selectedCharacter === 'hgte' && (
          <div className="absolute bottom-4 right-4 z-10">
            <button
              onClick={activateHgteSkill}
              disabled={playerRef.current && playerRef.current.hgteSkillCharges < 1}
              className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all relative overflow-hidden ${
                playerRef.current && playerRef.current.hgteSkillCharges < 1
                  ? 'bg-black/50 border-white/20 opacity-60'
                  : 'bg-orange-500 border-orange-300 shadow-[0_6px_0_#c2410c] active:translate-y-1 active:shadow-none'
              }`}
            >
              <img src={hgteSkillImg} alt="Skill" className="w-full h-full object-contain -rotate-45 scale-125 drop-shadow-md" />
              <div className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">
                {playerRef.current ? playerRef.current.hgteSkillCharges : 0}
              </div>
            </button>
            <div className="text-center mt-1">
              <span className="text-white font-black text-xs bg-black/50 px-2 py-0.5 rounded-full">挥棒</span>
            </div>
          </div>
        )}

        <div className="relative w-full h-[700px] bg-black">
          <canvas
            ref={canvasRef}
            width={400}
            height={700}
            className="w-full h-full object-cover cursor-pointer"
            onClick={jump}
          />

          {toastMessage && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] bg-black/80 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg border border-white/20 animate-bounce">
              {toastMessage}
            </div>
          )}

          {gameState === 'start' && (
            <div className="absolute inset-0 flex flex-col items-center justify-between pb-8 pt-6 px-4 bg-gradient-to-b from-blue-900/90 to-emerald-900/90 backdrop-blur-sm">
              {/* Top Bar */}
              <div className="w-full flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {/* Player Profile Section */}
                  <div className="flex items-center gap-2 bg-black/20 p-1 pr-4 rounded-xl border border-white/10 backdrop-blur-sm">
                    <AvatarWithFrame 
                      avatarId={avatarId} 
                      frameId={selectedFrame} 
                      className="w-16 h-16 shadow-lg" 
                      onClick={() => user && setShowAvatarSelect(true)} 
                    />
                    <div className="flex flex-col justify-center">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-black text-sm drop-shadow-md">
                          {user?.displayName || (user?.isAnonymous ? '游客' : (user ? '呼大帝' : '未登录'))}
                        </span>
                      </div>
                      {selectedTitle && TITLES[selectedTitle] && (
                        <span 
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block w-fit ${TITLES[selectedTitle].effect === 'pulse' ? 'animate-pulse' : TITLES[selectedTitle].effect === 'rotate' ? 'animate-spin' : ''}`}
                          style={{ 
                            color: TITLES[selectedTitle].color, 
                            backgroundColor: `${TITLES[selectedTitle].color}20`,
                            textShadow: TITLES[selectedTitle].shadow,
                            border: `1px solid ${TITLES[selectedTitle].color}40`
                          }}
                        >
                          {TITLES[selectedTitle].name}
                        </span>
                      )}
                      {selectedEntranceEffect && ENTRANCE_EFFECTS[selectedEntranceEffect] && (
                        <span 
                          className="text-[8px] font-bold px-1.5 py-0.5 rounded-sm inline-block w-fit mt-0.5"
                          style={{ 
                            color: ENTRANCE_EFFECTS[selectedEntranceEffect].color,
                            backgroundColor: `${ENTRANCE_EFFECTS[selectedEntranceEffect].color}15`,
                            borderLeft: `2px solid ${ENTRANCE_EFFECTS[selectedEntranceEffect].color}`
                          }}
                        >
                          ✨ {ENTRANCE_EFFECTS[selectedEntranceEffect].name}
                        </span>
                      )}
                      {user && (
                        <div className="flex gap-2 mt-0.5">
                          <button 
                            onClick={logout}
                            className="text-[10px] text-red-400 font-bold hover:text-red-300"
                          >
                            退出登录
                          </button>
                          {(user.displayName === 'hdd' || user.email === 'butanyueye@gmail.com') && (
                            <div className="flex gap-2 mt-0.5">
                              <button 
                                onClick={async () => {
                                  try {
                                    const matchesRef = collection(db, 'matches');
                                    const q = query(matchesRef);
                                    const snapshot = await getDocs(q);
                                    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
                                    await Promise.all(deletePromises);
                                    setToastMessage('匹配记录已清空');
                                    setTimeout(() => setToastMessage(''), 3000);
                                  } catch (e) {
                                    console.error(e);
                                    setToastMessage('清空失败');
                                    setTimeout(() => setToastMessage(''), 3000);
                                  }
                                }}
                                className="text-[10px] text-orange-400 font-bold hover:text-orange-300"
                              >
                                清空匹配
                              </button>
                              <button 
                                onClick={openAdminMailModal}
                                className="text-[10px] text-blue-400 font-bold hover:text-blue-300"
                              >
                                发送邮件
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {!user && (
                    <button 
                      onClick={() => setShowAuthModal(true)}
                      className="px-3 py-1 bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md hover:bg-blue-600 transition-colors"
                    >
                      登录
                    </button>
                  )}
                </div>
              </div>

              {/* Title */}
              <div className="mt-2 text-center relative z-20">
                <div className="flex justify-center gap-4 mb-2">
                  <div className="bg-black/30 px-4 py-1 rounded-full border border-white/20 flex items-center gap-2 backdrop-blur-sm">
                    <span className="text-blue-400">💎</span>
                    <span className="font-mono text-blue-400 font-bold">{diamonds}</span>
                  </div>
                  <div className="bg-black/30 px-4 py-1 rounded-full border border-white/20 flex items-center gap-2 backdrop-blur-sm">
                    <Trophy className="text-yellow-400" size={16} />
                    <span className="font-mono text-yellow-400 font-bold">{highScore}</span>
                  </div>
                </div>
                <h1 className="text-6xl font-black text-[#ffb300] tracking-tighter" style={{
                  WebkitTextStroke: '2px white',
                  textShadow: '0px 6px 0px #e65100, 0px 10px 15px rgba(0,0,0,0.5)'
                }}>
                  呼大帝快跑
                </h1>
                {/* {user && <p className="text-white text-xs font-bold mt-2 bg-black/30 px-2 py-1 rounded-full">欢迎, {user.displayName || (user.isAnonymous ? '游客' : '玩家')}</p>} */}
              </div>

              {/* Character & Side Buttons */}
              <div className="flex-1 w-full relative flex items-center justify-center mt-4">
                {/* Side Buttons */}
                <div className="absolute left-0 top-0 flex flex-col gap-4 z-20">
                  <div className="flex flex-col items-center">
                    <button 
                      onClick={() => setShowCheckInModal(true)}
                      className="w-14 h-14 bg-emerald-400 rounded-2xl flex items-center justify-center border-4 border-emerald-200 shadow-lg transform rotate-6"
                    >
                      <Check className="text-white" size={28} />
                    </button>
                    <span className="text-white font-bold mt-1 text-sm text-shadow-sm" style={{ textShadow: '1px 1px 2px black' }}>签到</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <button 
                      onClick={() => setShowMailModal(true)}
                      className="w-14 h-14 bg-orange-400 rounded-2xl flex items-center justify-center border-4 border-orange-200 shadow-lg transform -rotate-3 relative"
                    >
                      <Mail className="text-white" size={28} />
                      {mails.filter(m => !m.isRead).length > 0 && (
                        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                          {mails.filter(m => !m.isRead).length}
                        </div>
                      )}
                    </button>
                    <span className="text-white font-bold mt-1 text-sm text-shadow-sm" style={{ textShadow: '1px 1px 2px black' }}>邮件</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <button 
                      onClick={() => setGameState('leaderboard')}
                      className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border-4 border-gray-200 shadow-lg transform -rotate-6"
                    >
                      <Megaphone className="text-blue-500" size={28} fill="currentColor" />
                    </button>
                    <span className="text-white font-bold mt-1 text-sm text-shadow-sm" style={{ textShadow: '1px 1px 2px black' }}>排行榜</span>
                  </div>
                </div>

                {/* Right Side Buttons */}
                <div className="absolute right-0 top-0 flex flex-col gap-4 z-20">
                  <div className="flex flex-col items-center">
                    <button 
                      onClick={() => setShowFriendsModal(true)}
                      className="w-14 h-14 bg-blue-400 rounded-2xl flex items-center justify-center border-4 border-blue-200 shadow-lg transform -rotate-3"
                    >
                      <Users className="text-white" size={28} />
                    </button>
                    <span className="text-white font-bold mt-1 text-sm text-shadow-sm" style={{ textShadow: '1px 1px 2px black' }}>好友</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <button 
                      onClick={() => setGameState('gacha')}
                      className="w-14 h-14 bg-red-500 rounded-2xl flex items-center justify-center border-4 border-red-200 shadow-lg transform rotate-3"
                    >
                      <Star className="text-white" size={28} />
                    </button>
                    <span className="text-white font-bold mt-1 text-sm text-shadow-sm" style={{ textShadow: '1px 1px 2px black' }}>限定池</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <button 
                      onClick={() => setShowInventoryModal(true)}
                      className="w-14 h-14 bg-purple-500 rounded-2xl flex items-center justify-center border-4 border-purple-200 shadow-lg transform -rotate-3"
                    >
                      <Briefcase className="text-white" size={28} />
                    </button>
                    <span className="text-white font-bold mt-1 text-sm text-shadow-sm" style={{ textShadow: '1px 1px 2px black' }}>背包</span>
                  </div>
                </div>

                {/* Character */}
                <div className="flex flex-col items-center">
                  <img src={getCharacterImage(selectedCharacter)} alt="Character" className="h-56 object-contain drop-shadow-2xl z-10" />
                  
                  <button 
                    onClick={() => { playSound('score'); setShowCharSelect(true); }}
                    className="mt-2 bg-yellow-500 text-black px-6 py-2 rounded-full font-black text-sm shadow-lg hover:scale-105 transition-transform border-2 border-white"
                  >
                    切换角色
                  </button>
                </div>
              </div>

              {/* Bottom Area */}
              <div className="w-full flex flex-col items-center gap-4 mt-4 z-20">
                {/* Agreement */}
                <div className="flex items-center gap-2 text-xs text-white/90">
                  <div className="w-4 h-4 bg-white rounded flex items-center justify-center text-black">
                    <Check size={12} strokeWidth={4} />
                  </div>
                  <span>我已详细阅读并同意<span className="text-blue-300"> [游戏用户协议] </span>及<span className="text-blue-300"> [隐私保护指引] </span></span>
                </div>

                {/* Main Buttons */}
                <div className="flex gap-3 w-full px-1">
                  <button 
                    onClick={showInstructions}
                    className="flex-1 py-3 rounded-3xl font-black text-xl text-white border-4 border-white shadow-[0_6px_0_#e65100,0_10px_20px_rgba(0,0,0,0.4)] transition-transform active:translate-y-2 active:shadow-[0_0px_0_#e65100] leading-tight"
                    style={{ background: 'linear-gradient(to bottom, #fff59d, #fbc02d, #f57f17)', textShadow: '2px 2px 0 #e65100, -1px -1px 0 #e65100, 1px -1px 0 #e65100, -1px 1px 0 #e65100' }}
                  >
                    无尽<br/><span className="text-2xl">模式</span>
                  </button>
                  <button 
                    onClick={() => setShowRankedModal(true)}
                    className="flex-1 py-3 rounded-3xl font-black text-xl text-white border-4 border-white shadow-[0_6px_0_#0277bd,0_10px_20px_rgba(0,0,0,0.4)] transition-transform active:translate-y-2 active:shadow-[0_0px_0_#0277bd] leading-tight"
                    style={{ background: 'linear-gradient(to bottom, #e1f5fe, #29b6f6, #0288d1)', textShadow: '2px 2px 0 #01579b, -1px -1px 0 #01579b, 1px -1px 0 #01579b, -1px 1px 0 #01579b' }}
                  >
                    排位<br/><span className="text-2xl">模式</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {showAnnouncementModal && gameState === 'start' && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-[70] backdrop-blur-md p-4">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-[#fff8e1] w-full max-w-md rounded-3xl border-4 border-[#ffb300] shadow-[0_10px_0_#ff8f00,0_15px_20px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
              >
                <div className="bg-[#ffb300] p-4 flex justify-between items-center">
                  <h2 className="text-2xl font-black text-white drop-shadow-md">《呼大帝快跑》</h2>
                  <button onClick={() => setShowAnnouncementModal(false)} className="text-white hover:scale-110 transition-transform">
                    <X size={32} strokeWidth={3} />
                  </button>
                </div>
                
                <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh] text-[#5d4037]">
                  <h3 className="text-xl font-black text-center text-[#e65100]">📢 《呼大帝快跑》版本更新公告</h3>
                  <p className="font-bold">亲爱的跑酷者：</p>
                  <p className="font-medium">为了提升游戏的操作深度并丰富收集体验，我们于今日完成了一次重磅更新！本次更新不仅增加了全新的操作维度，还带来了强力新角色及安卓原生支持。</p>
                  
                  <div className="bg-white/50 p-4 rounded-xl border-2 border-[#ffb300]/30 space-y-2">
                    <h4 className="font-black text-[#e65100] flex items-center gap-2">✨ 角色平衡性调整</h4>
                    <ul className="list-disc pl-5 space-y-1 font-medium text-sm">
                      <li><span className="font-bold text-[#d84315]">呼刚帝尔：</span>新增挥棒获得50分，如果此次挥棒成功摧毁障碍则获得100分。</li>
                      <li><span className="font-bold text-[#d84315]">呼子：</span>技能获得的脂肪护盾存在期间，双倍得分。触发被动弹性肚腩抵消伤害之后，充能4次减少到充能2次就能开启技能。</li>
                      <li><span className="font-bold text-[#d84315]">跳跳帝 (TTD)：</span>得分加成上限由之前的 400%（5.0x） 降低到了 250%（3.5x）。稍微降低了跳跳帝能量条提示“蹲”或“跳”的出现频率（触发概率降低了一半），让操作节奏更加平缓。</li>
                    </ul>
                  </div>

                  <div className="bg-white/50 p-4 rounded-xl border-2 border-[#ffb300]/30 space-y-2">
                    <h4 className="font-black text-[#e65100] flex items-center gap-2">🛠️ 游戏体验优化与修复</h4>
                    <ul className="list-disc pl-5 space-y-1 font-medium text-sm">
                      <li><span className="font-bold text-[#d84315]">黑洞出现频率限制：</span>增加了黑洞冷却机制，现在黑洞出现后，至少需要等待 30秒（1800帧）才会再次出现。</li>
                      <li><span className="font-bold text-[#d84315]">降低后期游戏难度：</span>减缓了游戏随时间加速的幅度。降低了后期的最大速度上限。提高了后期障碍物生成的最小间隔，避免后期障碍物过于密集。</li>
                      <li><span className="font-bold text-[#d84315]">修复呼刚帝尔复活BUG：</span>修复了呼刚帝尔（Hgte）在Boss战中死亡后，使用钻石复活会因为Boss攻击次数未重置而导致瞬间再次死亡的BUG。现在复活时会正确清空Boss对玩家的命中次数。</li>
                    </ul>
                  </div>

                  <div className="bg-white/50 p-4 rounded-xl border-2 border-[#ffb300]/30 space-y-2">
                    <h4 className="font-black text-[#e65100] flex items-center gap-2">🎮 新增操作：下蹲功能 (Crouch)</h4>
                    <ul className="list-disc pl-5 space-y-1 font-medium text-sm">
                      <li><span className="font-bold text-[#d84315]">新增下蹲键：</span>我们在游戏界面右下方新增了下蹲按钮。</li>
                      <li><span className="font-bold text-[#d84315]">躲避高位障碍：</span>现在您可以点击下蹲键或按下键盘的 <span className="bg-gray-200 px-1 rounded">↓</span> / <span className="bg-gray-200 px-1 rounded">S</span> 键进行滑行下蹲，从而躲避那些无法通过跳跃避开的高位障碍物。</li>
                      <li><span className="font-bold text-[#d84315]">操作优化：</span>下蹲过程中可以随时衔接跳跃，操作手感更加丝滑。</li>
                    </ul>
                  </div>

                  <div className="bg-white/50 p-4 rounded-xl border-2 border-[#ffb300]/30 space-y-2">
                    <h4 className="font-black text-[#e65100] flex items-center gap-2">👤 新角色登场</h4>
                    <ul className="list-disc pl-5 space-y-1 font-medium text-sm">
                      <li><span className="font-bold text-[#d84315]">跳跳帝 (TTD)：</span>极具动感的限定角色，现已同步上线。</li>
                      <li><span className="font-bold text-[#d84315]">解锁方式：</span>新角色可通过收集 <span className="text-blue-600 font-black">78 个角色碎片</span> 进行合成解锁。</li>
                    </ul>
                  </div>

                  <div className="bg-white/50 p-4 rounded-xl border-2 border-[#ffb300]/30 space-y-2">
                    <h4 className="font-black text-[#e65100] flex items-center gap-2">🎡 召唤系统 & 背包优化</h4>
                    <ul className="list-disc pl-5 space-y-1 font-medium text-sm">
                      <li><span className="font-bold text-[#d84315]">跳跳帝限定池：</span>限定召唤现已更新为“跳跳帝专属奖池”，碎片产出概率大幅提升至 <span className="text-blue-600 font-black">20%</span>。</li>
                      <li><span className="font-bold text-[#d84315]">碎片进度追踪：</span>背包和角色选择界面现在会清晰显示呼刚帝尔与跳跳帝碎片的收集进度（x/78）。</li>
                      <li><span className="font-bold text-[#d84315]">抽奖结果展示：</span>优化了抽奖结果弹窗，现在会分别列出获得的各类碎片和道具。</li>
                    </ul>
                  </div>

                  <div className="bg-white/50 p-4 rounded-xl border-2 border-[#ffb300]/30 space-y-2">
                    <h4 className="font-black text-[#e65100] flex items-center gap-2">🛠️ 其他优化</h4>
                    <ul className="list-disc pl-5 space-y-1 font-medium text-sm">
                      <li><span className="font-bold text-[#d84315]">界面微调：</span>缩小了限定召唤弹窗的尺寸，使其在各种屏幕下更加精致。</li>
                      <li><span className="font-bold text-[#d84315]">数据同步：</span>强化了碎片获取与解锁状态的云端同步稳定性。</li>
                    </ul>
                  </div>

                  <p className="font-bold text-center mt-4">感谢您对《呼大帝快跑》的支持！快进入游戏，尝试全新的下蹲操作，挑战更高的分数吧！</p>
                  <div className="text-right text-sm font-bold text-[#5d4037]">
                    <p>《呼大帝快跑》开发组</p>
                    <p>2026年3月24日</p>
                  </div>
                </div>

                <div className="p-4 bg-[#ffecb3] flex justify-center border-t-4 border-[#ffb300]">
                  <button 
                    onClick={() => setShowAnnouncementModal(false)}
                    className="px-12 py-3 bg-[#ffb300] text-white rounded-full font-black text-xl shadow-[0_6px_0_#ff8f00] active:translate-y-1 active:shadow-none transition-all"
                  >
                    我知道了
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {showCharSelect && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-[60] backdrop-blur-md p-4">
              <div className="bg-[#fff8e1] w-full max-w-md rounded-3xl border-4 border-[#ffb300] shadow-[0_10px_0_#ff8f00,0_15px_20px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
                <div className="bg-[#ffb300] p-4 flex justify-between items-center">
                  <h2 className="text-2xl font-black text-white">选择角色</h2>
                  <button onClick={() => setShowCharSelect(false)} className="text-white hover:scale-110 transition-transform">
                    <X size={32} strokeWidth={3} />
                  </button>
                </div>
                
                <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
                  {[
                    { 
                      id: 'hdd', 
                      name: '呼大帝', 
                      img: hddImg, 
                      skill: '技能：狗运', 
                      desc: '每7秒随机获得一种道具。' 
                    },
                    { 
                      id: 'santa', 
                      name: '圣诞老呼', 
                      img: santaImg, 
                      skill: '技能：圣诞麋鹿的眷顾', 
                      desc: '开局获得圣诞麋鹿的恩赐，无敌冲刺15秒，并在冲刺结束后获得永久护盾。冲刺时间增长5秒。冲刺期间获得3倍得分！' 
                    },
                    { 
                      id: 'hjdj', 
                      name: '海军大将', 
                      author: '制作人：森森小帅哥',
                      img: hjdjImg, 
                      skill: '技能：火烧赤壁', 
                      desc: '获得主动技能火烧赤壁，获得十秒加速同时火势蔓延将前方障碍摧毁，副作用是道具也被烧了。被动：击败BOSS获得双倍分数，每次捡到道具减少2秒技能冷却并额外获得50分。' 
                    },
                    { 
                      id: 'hz', 
                      name: '呼子', 
                      img: hzImg, 
                      skill: '技能：脂肪护盾', 
                      desc: '捡道具获得充能，充能4次后可使用技能，主动开启后，用厚厚的脂肪层形成护盾，护盾存在期间双倍得分，护盾破碎后，还会获得冲刺五秒。被动：弹性肚腩，被障碍物撞击时，肚腩会像弹簧一样弹起，抵消伤害，全局仅限1次。触发被动后，技能充能上限减少至2次。' 
                    },
                    {
                      id: 'hgte',
                      name: '呼刚帝尔',
                      img: hgteImg,
                      skill: '技能：挥棒',
                      desc: '点击攻击按钮挥动棒球棒摧毁前方障碍物，挥棒获得50分，成功摧毁障碍物获得100分。扔出“呼小帝”前无法二段跳。初始3次充能，捡起2次掉落物可充能1次，最多充能6次。被动：首次受到致命伤害时不会死亡，扔出无敌的“呼小帝”帮忙收集掉落物，全局仅限1次。扔出后解锁二段跳。'
                    },
                    {
                      id: 'ttd',
                      name: '跳跳帝',
                      img: ttdImg,
                      skill: '技能：三段跳',
                      desc: '拥有三段跳能力。按照能量条提示进行“跳跃”或“蹲下”操作可触发连击并提升得分倍率。连续达成5次连击将触发“超高一跳”，落地时摧毁屏幕内所有障碍物并获得高额得分。每次超高一跳会永久增加得分倍率，上限提升至3.5倍。'
                    }
                  ].map(char => {
                    const isUnlocked = unlockedCharacters.includes(char.id);
                    const canUnlock = highScore >= CHARACTER_REQUIREMENTS[char.id];
                    const reqScore = CHARACTER_REQUIREMENTS[char.id];
                    const isTtd = char.id === 'ttd';
                    const isHgte = char.id === 'hgte';
                    const isFragmentChar = isTtd || isHgte;

                    return (
                      <div 
                        key={char.id}
                        onClick={() => { 
                          if (isFragmentChar && !isUnlocked) {
                            const fragments = char.id === 'ttd' ? ttdFragments : hgteFragments;
                            const charName = char.id === 'ttd' ? '跳跳帝' : '呼刚帝尔';
                            if (fragments >= 78) {
                              alert('碎片已集齐，请点击卡片上的【合成角色】按钮解锁！');
                            } else {
                              alert(`未拥有${charName}角色，请前往限定池获取碎片！`);
                            }
                            return;
                          }
                          if (isUnlocked) {
                            playSound('score'); 
                            setSelectedCharacter(char.id as any); 
                          }
                        }}
                        className={`flex items-center gap-4 p-4 rounded-2xl border-4 transition-all cursor-pointer relative ${
                          selectedCharacter === char.id ? 'bg-[#ffecb3] border-[#ffb300] scale-[1.02]' : 
                          isUnlocked ? 'bg-white border-gray-200 hover:border-[#ffe082]' : 
                          'bg-gray-100 border-gray-300 opacity-80'
                        }`}
                      >
                        {!isUnlocked && (
                          <div className="absolute inset-0 z-20 bg-black/10 flex flex-col items-center justify-center rounded-xl backdrop-blur-[1px]">
                            <div className="bg-black/70 text-white px-3 py-1 rounded-full text-[10px] font-bold mb-2 flex items-center gap-1">
                              <Lock size={10} /> {isFragmentChar ? (
                                <span className="flex items-center gap-1">
                                  <img src={char.id === 'ttd' ? ttdImg : hgteImg} alt="碎片" className="w-3 h-3 object-contain" /> 
                                  {(char.id === 'ttd' ? ttdFragments : hgteFragments)}/78
                                </span>
                              ) : `需达到 ${reqScore} 分`}
                            </div>
                            {(canUnlock && !isFragmentChar) && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); unlockCharacter(char.id); }}
                                className="bg-green-500 text-white px-4 py-1 rounded-full text-xs font-black shadow-[0_4px_0_#2e7d32] active:translate-y-1 active:shadow-none animate-bounce"
                              >
                                点击解锁
                              </button>
                            )}
                            {(isFragmentChar && (char.id === 'ttd' ? ttdFragments : hgteFragments) >= 78) && (
                              <button 
                                onClick={async (e) => { 
                                  e.stopPropagation(); 
                                  if (user) {
                                    const charId = char.id;
                                    const newUnlocked = [...unlockedCharacters, charId];
                                    setUnlockedCharacters(newUnlocked);
                                    setUnlockingChar(charId as any);
                                    if (charId === 'ttd') setTtdFragments(prev => prev - 78);
                                    else setHgteFragments(prev => prev - 78);
                                    
                                    try {
                                      await setDoc(doc(db, 'users', user.uid), {
                                        unlockedCharacters: newUnlocked,
                                        [charId === 'ttd' ? 'ttdFragments' : 'hgteFragments']: (charId === 'ttd' ? ttdFragments : hgteFragments) - 78
                                      }, { merge: true });
                                    } catch (error) {
                                      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
                                    }
                                  }
                                }}
                                className="bg-yellow-500 text-white px-4 py-1 rounded-full text-xs font-black shadow-[0_4px_0_#f57f17] active:translate-y-1 active:shadow-none animate-bounce"
                              >
                                合成角色
                              </button>
                            )}
                          </div>
                        )}
                        <div className={`w-20 h-20 bg-white rounded-xl border-2 border-gray-100 flex items-center justify-center overflow-hidden shrink-0 ${!isUnlocked ? 'grayscale' : ''}`}>
                          <img src={char.img} alt={char.name} className="h-full object-contain" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex flex-col">
                              <h3 className="text-xl font-black text-[#5d4037]">{char.name}</h3>
                              {'author' in char && <span className="text-[10px] text-gray-500 font-bold mt-0.5">{char.author}</span>}
                            </div>
                            {selectedCharacter === char.id && (
                              <span className="bg-[#ffb300] text-white text-[10px] px-2 py-0.5 rounded-full font-bold mt-1">已选择</span>
                            )}
                          </div>
                          <p className="text-[#e65100] font-black text-xs mb-1">{char.skill}</p>
                          <p className="text-[#795548] text-[10px] leading-tight font-medium">{char.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="p-6 pt-0">
                  <button 
                    onClick={() => setShowCharSelect(false)}
                    className="w-full py-3 rounded-2xl bg-[#ffb300] text-white font-black text-xl shadow-[0_4px_0_#ff8f00] active:translate-y-1 active:shadow-none transition-all"
                  >
                    确认选择
                  </button>
                </div>
              </div>
            </div>
          )}

          {gameState === 'gameover' && !isMultiplayer && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur-md z-30">
              <h2 className="text-5xl font-black text-red-500 mb-2 tracking-tighter drop-shadow-lg" style={{ WebkitTextStroke: '1px white' }}>GAME OVER</h2>
              <p className="text-2xl text-white mb-10 font-medium">Score: <span className="font-mono text-yellow-400 font-bold">{Math.floor(score)}</span></p>
              
              <div className="flex flex-col gap-4 w-full px-10">
                {reviveCount < 3 && (
                  <button 
                    onClick={revive}
                    disabled={diamonds < [50, 100, 200][reviveCount]}
                    className={`w-full py-4 rounded-3xl font-black text-2xl text-white border-4 border-white shadow-[0_6px_0_#0277bd,0_10px_20px_rgba(0,0,0,0.4)] transition-transform active:translate-y-2 active:shadow-[0_0px_0_#0277bd] flex items-center justify-center gap-2 ${diamonds < [50, 100, 200][reviveCount] ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                    style={{ background: 'linear-gradient(to bottom, #e1f5fe, #29b6f6, #0288d1)', textShadow: '2px 2px 0 #01579b, -1px -1px 0 #01579b, 1px -1px 0 #01579b, -1px 1px 0 #01579b' }}
                  >
                    <span>复活</span>
                    <span className="text-lg bg-black/20 px-2 py-0.5 rounded-full border border-white/20">💎 {[50, 100, 200][reviveCount]}</span>
                  </button>
                )}

                {reviveCount >= 3 && (
                  <div className="w-full py-3 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-200 text-center font-bold">
                    已达到最大复活次数
                  </div>
                )}

                <button 
                  onClick={showInstructions}
                  className="w-full py-4 rounded-3xl font-black text-2xl text-white border-4 border-white shadow-[0_6px_0_#e65100,0_10px_20px_rgba(0,0,0,0.4)] transition-transform active:translate-y-2 active:shadow-[0_0px_0_#e65100]"
                  style={{ background: 'linear-gradient(to bottom, #fff59d, #fbc02d, #f57f17)', textShadow: '2px 2px 0 #e65100, -1px -1px 0 #e65100, 1px -1px 0 #e65100, -1px 1px 0 #e65100' }}
                >
                  再来一局
                </button>

                <button 
                  onClick={() => setGameState('start')}
                  className="w-full py-4 rounded-3xl font-black text-2xl text-white border-4 border-white shadow-[0_6px_0_#757575,0_10px_20px_rgba(0,0,0,0.4)] transition-transform active:translate-y-2 active:shadow-[0_0px_0_#757575]"
                  style={{ background: 'linear-gradient(to bottom, #eeeeee, #bdbdbd, #757575)', textShadow: '2px 2px 0 #424242, -1px -1px 0 #424242, 1px -1px 0 #424242, -1px 1px 0 #424242' }}
                >
                  回到主页
                </button>
              </div>
            </div>
          )}

          {gameState === 'gameover' && isMultiplayer && matchState !== 'finished' && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur-md z-30">
              <h2 className="text-4xl font-black text-white mb-4 tracking-tighter drop-shadow-lg">等待对手结束...</h2>
              <p className="text-xl text-white/80 mb-8 font-medium">你的最终得分: <span className="font-mono text-yellow-400 font-bold">{Math.floor(score)}</span></p>
              <div className="w-16 h-16 border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent rounded-full animate-spin mb-8"></div>
              <button 
                onClick={() => {
                  setMatchState('none');
                  matchStateRef.current = 'none';
                  setMatchId(null);
                  setIsMultiplayer(false);
                  setGameState('start');
                }}
                className="px-6 py-2 rounded-full bg-red-500/20 border-2 border-red-500 text-red-400 font-bold hover:bg-red-500/40 transition-colors"
              >
                退出匹配
              </button>
            </div>
          )}

          {/* VS Modal */}
          {matchState === 'vs' && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-[70] backdrop-blur-md p-4">
              <div className="w-full max-w-md flex items-center justify-between relative">
                {/* Player 1 (You) */}
                <div className="flex flex-col items-center z-10 animate-slideInLeft">
                  <div className="w-32 h-32 rounded-full border-4 border-blue-500 overflow-hidden bg-white/10 mb-4 shadow-[0_0_30px_rgba(59,130,246,0.5)]">
                    <img 
                      src={getCharacterImage(selectedCharacter)} 
                      alt="You" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="text-2xl font-black text-white bg-blue-600 px-4 py-1 rounded-full shadow-lg">
                    {user?.displayName || '你'}
                  </span>
                  {selectedTitle && (
                    <span className="mt-1 text-xs font-bold text-blue-200" style={{ color: TITLES[selectedTitle]?.color }}>
                      {TITLES[selectedTitle]?.name}
                    </span>
                  )}
                </div>

                {/* VS Text */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 animate-[pulse_1s_infinite]">
                  <span className="text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 to-red-600 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]" style={{ WebkitTextStroke: '2px white' }}>
                    VS
                  </span>
                </div>

                {/* Player 2 (Opponent) */}
                <div className="flex flex-col items-center z-10 animate-slideInRight">
                  <div className="w-32 h-32 rounded-full border-4 border-red-500 overflow-hidden bg-white/10 mb-4 shadow-[0_0_30px_rgba(239,68,68,0.5)]">
                    <img 
                      src={getCharacterImage(opponent?.character)} 
                      alt="Opponent" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="text-2xl font-black text-white bg-red-600 px-4 py-1 rounded-full shadow-lg">
                    {opponent?.name || '对手'}
                  </span>
                  {/* @ts-ignore */}
                  {opponent?.title && (
                    <span className="mt-1 text-xs font-bold text-red-200" style={{ color: TITLES[opponent.title as any]?.color }}>
                      {TITLES[opponent.title as any]?.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Matchmaking Modal */}
          {matchState === 'matching' && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-[70] backdrop-blur-md p-4">
              <div className="bg-[#1e1b4b] w-full max-w-sm rounded-3xl p-8 border-4 border-[#6366f1] shadow-[0_0_40px_rgba(99,102,241,0.5)] flex flex-col items-center relative overflow-hidden">
                {/* Animated background elements */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_#818cf8_0%,_transparent_60%)] animate-pulse"></div>
                </div>
                
                <h2 className="text-3xl font-black text-white mb-8 tracking-wider relative z-10" style={{ textShadow: '0 0 10px #818cf8' }}>
                  {matchType === 'private' ? '自定义房间' : '寻找对手中...'}
                </h2>
                
                {matchType === 'private' && isHost && (
                  <div className="mb-6 bg-white/10 p-4 rounded-xl border border-white/20 text-center relative z-10">
                    <p className="text-white text-sm mb-2">房间号</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-3xl font-mono font-black text-[#818cf8] tracking-widest">{roomCodeInput}</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(roomCodeInput);
                          alert('房间号已复制');
                        }}
                        className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                      >
                        <Copy size={16} className="text-white" />
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="relative w-32 h-32 mb-8 z-10">
                  <div className="absolute inset-0 border-4 border-t-[#818cf8] border-r-transparent border-b-[#818cf8] border-l-transparent rounded-full animate-spin"></div>
                  <div className="absolute inset-2 border-4 border-t-transparent border-r-[#c7d2fe] border-b-transparent border-l-[#c7d2fe] rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-5xl">⚔️</span>
                  </div>
                </div>
                
                <p className="text-[#c7d2fe] font-medium text-center relative z-10 animate-pulse mb-6">
                  {matchmakingStatus}
                </p>
                
                {matchType === 'private' && isHost && matchmakingStatus.includes('可以开始比赛') && (
                  <button 
                    onClick={startPrivateMatch}
                    className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black rounded-xl shadow-[0_4px_0_#15803d] active:translate-y-1 active:shadow-none transition-all mb-4 relative z-10"
                  >
                    开始比赛
                  </button>
                )}
                
                <button 
                  onClick={async () => {
                    const currentMatchId = matchId;
                    setMatchState('none');
                    matchStateRef.current = 'none';
                    setMatchId(null);
                    setIsMultiplayer(false);
                    
                    // Try to clean up the match if we were the creator
                    if (createdMatchIdRef.current) {
                      try {
                        await deleteDoc(doc(db, 'matches', createdMatchIdRef.current));
                        createdMatchIdRef.current = null;
                      } catch (e) {
                        console.error("Failed to cleanup match:", e);
                      }
                    } else if (currentMatchId && user) {
                      try {
                        const matchRef = doc(db, 'matches', currentMatchId);
                        const snap = await getDoc(matchRef);
                        if (snap.exists() && snap.data().status === 'waiting' && snap.data().player1.uid === user.uid) {
                          await deleteDoc(matchRef);
                        }
                      } catch (e) {
                        console.error("Failed to cleanup match:", e);
                      }
                    }
                  }}
                  className="mt-8 px-8 py-3 rounded-full bg-red-500/20 border-2 border-red-500 text-red-400 font-bold hover:bg-red-500/40 transition-colors relative z-10"
                >
                  取消匹配
                </button>
              </div>
            </div>
          )}

          {/* Match Result Modal */}
          {matchState === 'finished' && matchResult && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-[70] backdrop-blur-md p-4">
              <div className={`w-full max-w-sm rounded-3xl p-8 border-4 shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col items-center relative overflow-hidden ${
                matchResult === 'win' ? 'bg-[#14532d] border-[#4ade80]' : 
                matchResult === 'lose' ? 'bg-[#7f1d1d] border-[#f87171]' : 
                'bg-[#451a03] border-[#fbbf24]'
              }`}>
                
                <h2 className={`text-5xl font-black mb-6 tracking-wider relative z-10 ${
                  matchResult === 'win' ? 'text-[#4ade80]' : 
                  matchResult === 'lose' ? 'text-[#f87171]' : 
                  'text-[#fbbf24]'
                }`} style={{ textShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
                  {matchResult === 'win' ? '胜利!' : matchResult === 'lose' ? '失败' : '平局'}
                </h2>
                
                <div className="flex justify-between w-full items-center mb-8 relative z-10 bg-black/30 p-4 rounded-2xl">
                  <div className="flex flex-col items-center">
                    <span className="text-white font-bold mb-1">你</span>
                    <span className="text-3xl font-mono text-yellow-400">{Math.floor(score)}</span>
                  </div>
                  <div className="text-2xl font-black text-white/50">VS</div>
                  <div className="flex flex-col items-center">
                    <span className="text-white font-bold mb-1">对手</span>
                    <span className="text-3xl font-mono text-yellow-400">{opponent?.score || 0}</span>
                  </div>
                </div>

                {matchType === 'ranked' && (
                  <div className="flex flex-col items-center mb-6 relative z-10 bg-white/10 p-4 rounded-2xl border border-white/20 w-full">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-bold">排位积分:</span>
                      <span className={`text-3xl font-black ${matchResult === 'win' ? 'text-green-400' : matchResult === 'lose' ? 'text-red-400' : 'text-yellow-400'}`}>
                        {matchResult === 'win' ? '+25' : matchResult === 'lose' ? '-15' : '+0'}
                      </span>
                    </div>
                    <div className="text-white/60 text-sm mt-1 font-mono">
                      当前积分: {rankPoints}
                    </div>
                  </div>
                )}
                
                <button 
                  onClick={() => {
                    setMatchState('none');
                    matchStateRef.current = 'none';
                    setMatchId(null);
                    setIsMultiplayer(false);
                    setGameState('start');
                  }}
                  className="w-full py-4 rounded-3xl font-black text-2xl text-white border-4 border-white shadow-[0_6px_0_#e65100,0_10px_20px_rgba(0,0,0,0.4)] transition-transform active:translate-y-2 active:shadow-[0_0px_0_#e65100] relative z-10"
                  style={{ background: 'linear-gradient(to bottom, #fff59d, #fbc02d, #f57f17)', textShadow: '2px 2px 0 #e65100, -1px -1px 0 #e65100, 1px -1px 0 #e65100, -1px 1px 0 #e65100' }}
                >
                  返回主菜单
                </button>
              </div>
            </div>
          )}

          {/* Leaderboard Modal */}
          <AnimatePresence>
            {gameState === 'leaderboard' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur-md z-30 px-6"
              >
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  className="bg-[#fff8e1] w-full max-w-sm rounded-3xl p-6 border-4 border-[#ffb300] shadow-[0_10px_0_#ff8f00,0_15px_20px_rgba(0,0,0,0.5)] flex flex-col items-center"
                >
                  <div className="w-full flex justify-between items-center mb-4">
                    <h2 className="text-3xl font-black text-[#e65100]">排行榜</h2>
                    <button onClick={() => setGameState('start')} className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold hover:bg-red-600 transition-colors">X</button>
                  </div>
                  
                  <div className="w-full flex gap-2 mb-4 bg-orange-100 p-1 rounded-xl border-2 border-orange-200">
                    <button 
                      onClick={() => setLeaderboardTab('score')}
                      className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${leaderboardTab === 'score' ? 'bg-white text-orange-600 shadow-sm border border-orange-200' : 'text-orange-400 hover:bg-orange-50'}`}
                    >
                      分数排行
                    </button>
                    <button 
                      onClick={() => setLeaderboardTab('rank')}
                      className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${leaderboardTab === 'rank' ? 'bg-white text-blue-600 shadow-sm border border-blue-200' : 'text-orange-400 hover:bg-orange-50'}`}
                    >
                      段位排行
                    </button>
                  </div>

                  <div className="w-full space-y-3 mb-6 h-[400px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-orange-300 scrollbar-track-transparent">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={leaderboardTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3"
                      >
                        {(leaderboardTab === 'score' ? leaderboard : rankLeaderboard).length > 0 ? (leaderboardTab === 'score' ? leaderboard : rankLeaderboard).map((entry: any, i) => (
                          <motion.div 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            key={entry.userId || `${leaderboardTab}-${entry.name}-${i}`} 
                            className={`flex justify-between items-center p-3 rounded-2xl border-2 shadow-sm relative overflow-hidden ${
                              i === 0 ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-400 z-10' : 
                              i === 1 ? 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300' : 
                              i === 2 ? 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-300' : 'bg-white border-gray-100'
                            }`}
                          >
                            {i === 0 && (
                              <motion.div 
                                animate={{ rotate: [0, 10, -10, 0] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="absolute -top-1 -right-1 text-2xl z-20"
                              >
                                👑
                              </motion.div>
                            )}
                            
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <span className={`absolute -top-1 -left-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white z-10 shadow-md ${
                                  i === 0 ? 'bg-yellow-500' : 
                                  i === 1 ? 'bg-gray-400' : 
                                  i === 2 ? 'bg-orange-500' : 'bg-gray-400'
                                }`}>
                                  {i + 1}
                                </span>
                                <AvatarWithFrame 
                                  avatarId={entry.avatarId || 'hdd'} 
                                  frameId={entry.frameId} 
                                  className={`w-12 h-12 rounded-full border-2 overflow-hidden flex items-center justify-center bg-gray-50 shadow-inner ${
                                    i === 0 ? 'border-yellow-400 ring-4 ring-yellow-200' : 
                                    i === 1 ? 'border-gray-300 ring-4 ring-gray-100' : 
                                    i === 2 ? 'border-orange-400 ring-4 ring-orange-100' : 'border-gray-100'
                                  }`} 
                                />
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1">
                                  <span className={`font-black text-[#5d4037] truncate ${i === 0 ? 'text-lg' : 'text-base'} max-w-[100px]`}>{entry.name}</span>
                                  {i < 3 && <Star className={`w-3 h-3 ${i === 0 ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} />}
                                </div>
                                <div className="flex flex-col gap-0.5 mt-0.5">
                                  {entry.titleId && TITLES[entry.titleId] && (
                                    <div className="h-5 flex items-center">
                                      <span 
                                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-block w-fit origin-center ${
                                          TITLES[entry.titleId].effect === 'pulse' ? 'animate-pulse' : 
                                          TITLES[entry.titleId].effect === 'rotate' ? 'animate-spin' : 
                                          TITLES[entry.titleId].effect === 'shake' ? 'animate-bounce' : ''
                                        }`}
                                        style={{ 
                                          color: TITLES[entry.titleId].color, 
                                          backgroundColor: `${TITLES[entry.titleId].color}20`,
                                          textShadow: TITLES[entry.titleId].shadow,
                                          border: `1px solid ${TITLES[entry.titleId].color}40`
                                        }}
                                      >
                                        {TITLES[entry.titleId].name}
                                      </span>
                                    </div>
                                  )}
                                  {entry.entranceEffectId && ENTRANCE_EFFECTS[entry.entranceEffectId] && (
                                    <div className="h-4 flex items-center">
                                      <span 
                                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm inline-block w-fit"
                                        style={{ 
                                          color: ENTRANCE_EFFECTS[entry.entranceEffectId].color,
                                          backgroundColor: `${ENTRANCE_EFFECTS[entry.entranceEffectId].color}15`,
                                          borderLeft: `2px solid ${ENTRANCE_EFFECTS[entry.entranceEffectId].color}`
                                        }}
                                      >
                                        ✨ {ENTRANCE_EFFECTS[entry.entranceEffectId].name}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end">
                              {leaderboardTab === 'score' ? (
                                <>
                                  <span className={`font-mono font-black text-lg leading-none ${
                                    i === 0 ? 'text-yellow-700 text-xl' : 
                                    i === 1 ? 'text-gray-600' : 
                                    i === 2 ? 'text-orange-700' : 'text-yellow-600'
                                  }`}>{'score' in entry ? entry.score : 0}</span>
                                  <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Points</span>
                                </>
                              ) : (
                                <>
                                  <div className="flex items-center gap-1">
                                    <span className="text-lg drop-shadow-sm">{getRankInfo(entry.rankPoints ?? 1000).icon}</span>
                                    <span className={`font-mono font-black text-lg leading-none ${
                                      i === 0 ? 'text-blue-700 text-xl' : 
                                      i === 1 ? 'text-gray-600' : 
                                      i === 2 ? 'text-orange-700' : 'text-blue-600'
                                    }`}>{entry.rankPoints ?? 1000}</span>
                                  </div>
                                  <span className="text-[10px] font-bold" style={{ color: getRankInfo(entry.rankPoints ?? 1000).color }}>
                                    {getRankInfo(entry.rankPoints ?? 1000).name}
                                  </span>
                                  {'rankedTotal' in entry && (entry as any).rankedTotal > 0 && (
                                    <span className="text-[8px] text-gray-400 font-bold mt-0.5">
                                      胜率: {Math.round(((entry as any).rankedWins / (entry as any).rankedTotal) * 100)}%
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </motion.div>
                        )) : (
                          <div className="flex flex-col items-center justify-center py-20 opacity-40">
                            <span className="text-4xl mb-2">🏆</span>
                            <p className="text-gray-500 font-bold italic">暂无排名，快去挑战吧！</p>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <button 
                    onClick={() => setGameState('start')}
                    className="w-full py-4 rounded-3xl font-black text-2xl text-white border-4 border-white shadow-[0_6px_0_#e65100,0_10px_20px_rgba(0,0,0,0.4)] transition-transform active:translate-y-2 active:shadow-[0_0px_0_#e65100] relative z-10"
                    style={{ background: 'linear-gradient(to bottom, #fff59d, #fbc02d, #f57f17)', textShadow: '2px 2px 0 #e65100, -1px -1px 0 #e65100, 1px -1px 0 #e65100, -1px 1px 0 #e65100' }}
                  >
                    返回主菜单
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Instructions Modal */}
          {gameState === 'instructions' && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur-md z-30 px-6">
              <div className="bg-[#fff8e1] w-full max-sm rounded-3xl p-6 border-4 border-[#ffb300] shadow-[0_10px_0_#ff8f00,0_15px_20px_rgba(0,0,0,0.5)] flex flex-col items-center text-center">
                <h2 className="text-3xl font-black text-[#e65100] mb-4">游戏说明</h2>
                <div className="text-[#5d4037] font-bold text-lg mb-6 space-y-2">
                  <p>点击屏幕 或 按<span className="text-blue-600">空格/向上键</span>跳跃</p>
                  <p>在空中再次点击可进行<span className="text-[#d84315]">二段跳</span></p>
                  <p>按<span className="text-blue-600">向下键/S键</span>滑行或<span className="text-blue-600">快速落地</span>，按<span className="text-blue-600">W键</span>恢复</p>
                  <p>躲避前方的障碍物，跑得越远越好！</p>
                </div>
                <button 
                  onClick={startGame}
                  className="w-full py-3 rounded-2xl font-black text-xl text-white border-4 border-white shadow-[0_6px_0_#43a047,0_10px_20px_rgba(0,0,0,0.4)] transition-transform active:translate-y-2 active:shadow-[0_0px_0_#43a047]"
                  style={{ background: 'linear-gradient(to bottom, #a5d6a7, #66bb6a, #4caf50)', textShadow: '1px 1px 0 #2e7d32, -1px -1px 0 #2e7d32, 1px -1px 0 #2e7d32, -1px 1px 0 #2e7d32' }}
                >
                  我知道了，开始游戏！
                </button>
              </div>
            </div>
          )}

          {/* Pause Modal */}
          {gameState === 'paused' && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur-md z-30 px-6">
              <div className="bg-[#fff8e1] w-full max-w-sm rounded-3xl p-6 border-4 border-[#ffb300] shadow-[0_10px_0_#ff8f00,0_15px_20px_rgba(0,0,0,0.5)] flex flex-col items-center text-center">
                <h2 className="text-4xl font-black text-[#e65100] mb-8">游戏暂停</h2>
                <div className="flex flex-col gap-4 w-full">
                  <button 
                    onClick={resumeGame}
                    className="w-full py-3 rounded-2xl font-black text-xl text-white border-4 border-white shadow-[0_6px_0_#0277bd,0_10px_20px_rgba(0,0,0,0.4)] transition-transform active:translate-y-2 active:shadow-[0_0px_0_#0277bd]"
                    style={{ background: 'linear-gradient(to bottom, #e1f5fe, #29b6f6, #0288d1)', textShadow: '1px 1px 0 #01579b, -1px -1px 0 #01579b, 1px -1px 0 #01579b, -1px 1px 0 #01579b' }}
                  >
                    继续游戏
                  </button>
                  <button 
                    onClick={quitGame}
                    className="w-full py-3 rounded-2xl font-black text-xl text-white border-4 border-white shadow-[0_6px_0_#c62828,0_10px_20px_rgba(0,0,0,0.4)] transition-transform active:translate-y-2 active:shadow-[0_0px_0_#c62828]"
                    style={{ background: 'linear-gradient(to bottom, #ffcdd2, #ef5350, #e53935)', textShadow: '1px 1px 0 #b71c1c, -1px -1px 0 #b71c1c, 1px -1px 0 #b71c1c, -1px 1px 0 #b71c1c' }}
                  >
                    退出游戏
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Auth Modal */}
          {showAuthModal && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur-md z-50 px-6">
              <div className="bg-[#fff8e1] w-full max-w-sm rounded-3xl p-6 border-4 border-[#ffb300] shadow-[0_10px_0_#ff8f00,0_15px_20px_rgba(0,0,0,0.5)] flex flex-col items-center relative">
                <button 
                  onClick={() => setShowAuthModal(false)}
                  className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
                >
                  <X size={24} />
                </button>
                <h2 className="text-3xl font-black text-[#e65100] mb-6">
                  {authMode === 'login' ? '账号登录' : '注册账号'}
                </h2>
                
                {authError && (
                  <div className="w-full bg-red-100 text-red-600 p-2 rounded-lg mb-4 text-sm text-center font-bold border border-red-300">
                    {authError}
                  </div>
                )}

                <form onSubmit={handleEmailAuth} className="w-full flex flex-col gap-4">
                  {authMode === 'register' && (
                    <input 
                      type="text" 
                      placeholder="昵称 (选填)" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 border-[#ffb300] focus:outline-none focus:border-[#e65100] font-bold text-gray-700"
                    />
                  )}
                  <input 
                    type="email" 
                    placeholder="邮箱" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#ffb300] focus:outline-none focus:border-[#e65100] font-bold text-gray-700"
                  />
                  <input 
                    type="password" 
                    placeholder="密码 (至少6位)" 
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#ffb300] focus:outline-none focus:border-[#e65100] font-bold text-gray-700"
                  />
                  
                  <button 
                    type="submit"
                    className="w-full py-3 mt-2 rounded-2xl font-black text-xl text-white border-4 border-white shadow-[0_6px_0_#0277bd,0_10px_20px_rgba(0,0,0,0.4)] transition-transform active:translate-y-2 active:shadow-[0_0px_0_#0277bd]"
                    style={{ background: 'linear-gradient(to bottom, #e1f5fe, #29b6f6, #0288d1)', textShadow: '1px 1px 0 #01579b, -1px -1px 0 #01579b, 1px -1px 0 #01579b, -1px 1px 0 #01579b' }}
                  >
                    {authMode === 'login' ? '登 录' : '注 册'}
                  </button>
                </form>

                <div className="mt-6 text-sm font-bold text-gray-600">
                  {authMode === 'login' ? '还没有账号？' : '已有账号？'}
                  <button 
                    onClick={() => {
                      setAuthMode(authMode === 'login' ? 'register' : 'login');
                      setAuthError('');
                    }}
                    className="ml-2 text-blue-600 hover:text-blue-800 underline"
                  >
                    {authMode === 'login' ? '立即注册' : '返回登录'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Gacha Screen */}
          {gameState === 'gacha' && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="bg-[#fff8e1] p-4 rounded-3xl border-4 border-[#ffb300] shadow-2xl w-full max-w-[340px] relative">
                <button onClick={() => setGameState('start')} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
                  <X size={20} />
                </button>
                <h2 className="text-2xl font-black text-[#e65100] mb-3 text-center">限定召唤</h2>
                <div className="w-full h-32 bg-gradient-to-b from-yellow-100 to-yellow-300 rounded-2xl mb-3 flex items-center justify-center border-4 border-white shadow-inner overflow-hidden">
                  <img src={getCharacterImage('ttd')} alt="限定角色" className="h-24 object-contain drop-shadow-lg" />
                </div>
                <div className="bg-white p-3 rounded-2xl mb-3 border-2 border-[#ffe082]">
                  <h3 className="font-bold text-[#5d4037] text-xs mb-1 text-center">跳跳帝限定奖池</h3>
                  <div className="grid grid-cols-5 gap-1 text-center text-[8px]">
                    {[
                      { name: '护盾', icon: POWERUP_CONFIG['shield'].icon },
                      { name: '磁铁', icon: POWERUP_CONFIG['magnet'].icon },
                      { name: '双倍', icon: POWERUP_CONFIG['doubleScore'].icon },
                      { name: '冲刺', icon: POWERUP_CONFIG['dash'].icon },
                      { name: '碎片', img: ttdImg }
                    ].map((item, i) => (
                      <div key={i} className="bg-gray-100 p-1 rounded-lg font-bold text-[#795548] flex flex-col items-center justify-center">
                        {item.img ? (
                          <img src={item.img} alt={item.name} className="w-5 h-5 object-contain mb-1" />
                        ) : (
                          <span className="text-lg mb-1">{item.icon}</span>
                        )}
                        {item.name}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleGacha(1)} className="flex-1 bg-blue-500 text-white font-black py-2 rounded-xl text-sm shadow-[0_4px_0_#1565c0] active:translate-y-1 active:shadow-none">单抽 91💎</button>
                  <button onClick={() => handleGacha(10)} className="flex-1 bg-red-500 text-white font-black py-2 rounded-xl text-sm shadow-[0_4px_0_#c62828] active:translate-y-1 active:shadow-none">十连 800💎</button>
                </div>
              </div>
            </div>
          )}

          {/* Invitation Modal */}
          {pendingInvitation && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded-2xl border-4 border-[#FAD689] shadow-xl w-full max-w-sm">
                <h3 className="text-xl font-bold text-[#A65D2C] mb-4">好友邀请</h3>
                <p className="text-[#A65D2C] mb-6">{pendingInvitation.fromName} 邀请你加入房间！</p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => handleAcceptInvitation(pendingInvitation)}
                    className="flex-1 bg-[#4CAF50] text-white font-bold py-3 rounded-xl hover:bg-[#45A049]"
                  >
                    同意
                  </button>
                  <button 
                    onClick={async () => {
                      setPendingInvitation(null);
                      await updateDoc(doc(db, 'invitations', pendingInvitation.id), { status: 'rejected' });
                    }}
                    className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600"
                  >
                    拒绝
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-6 text-neutral-500 text-sm max-w-sm text-center">
        <p>点击游戏画面或按空格键跳跃。支持二段跳！</p>
      </div>
    </div>
  );
}

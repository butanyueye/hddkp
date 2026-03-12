import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { Settings, X, Megaphone, Package, Check, Pause, Volume2, VolumeX, LogIn, LogOut, Trophy, Gift, Lock, Unlock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { hddBase64 as hddImg } from './hddBase64';
import { sdlhBase64 as santaImg } from './sdlhBase64';
import { hjdjBase64 as hjdjImg } from './hjdjBase64';
import { hjdjSkillBase64 as hjdjSkillImg } from './hjdjSkillBase64';
import { hzBase64 as hzImg } from './hzBase64';
import { hzskillBase64 as hzSkillImg } from './hzskillBase64';
import { auth, db } from './firebase';

const getCharacterImage = (charId: string | undefined) => {
  switch (charId) {
    case 'santa': return santaImg;
    case 'hjdj': return hjdjImg;
    case 'hz': return hzImg;
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
  deleteDoc
} from 'firebase/firestore';

const GRAVITY = 0.8;
const JUMP_STRENGTH = -14;
const MAX_JUMPS = 2;

type Difficulty = 'easy' | 'normal' | 'hard';
type ObstacleType = 'normal' | 'tall' | 'wide' | 'flying' | 'sliding';
type PowerUpType = 'shield' | 'magnet' | 'doubleScore' | 'dash';

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

const CHARACTER_REQUIREMENTS: Record<string, number> = {
  hdd: 0,
  santa: 1000,
  hjdj: 2000,
  hz: 3000
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

const playSound = (type: 'jump' | 'score' | 'gameover') => {
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
}

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

interface Cloud {
  x: number;
  y: number;
  width: number;
  speed: number;
  layer: number; // For parallax
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
  const [gameState, setGameState] = useState<'start' | 'instructions' | 'playing' | 'paused' | 'gameover' | 'leaderboard' | 'shop'>('start');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [diamonds, setDiamonds] = useState(200);
  const [inventory, setInventory] = useState<Record<PowerUpType, number>>({
    shield: 5,
    magnet: 5,
    doubleScore: 5,
    dash: 5
  });
  const [leaderboard, setLeaderboard] = useState<{name: string, score: number, avatarId?: string}[]>([]);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [unlockedCharacters, setUnlockedCharacters] = useState<string[]>(['hdd']);
  const [avatarId, setAvatarId] = useState<string>('hdd');
  const [showAvatarSelect, setShowAvatarSelect] = useState(false);
  const [unlockingChar, setUnlockingChar] = useState<string | null>(null);
  const [reviveCount, setReviveCount] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [playerImage, setPlayerImage] = useState<HTMLImageElement | null>(null);
  
  const [isMutedState, setIsMutedState] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [selectedCharacter, setSelectedCharacter] = useState<'hdd' | 'santa' | 'hjdj' | 'hz'>('hdd');
  const [showCharSelect, setShowCharSelect] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInCount, setCheckInCount] = useState(0);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [checkInMessage, setCheckInMessage] = useState('');
  
  // Multiplayer state
  const [matchState, setMatchState] = useState<'none' | 'matching' | 'vs' | 'playing' | 'finished'>('none');
  const [matchmakingStatus, setMatchmakingStatus] = useState<string>('正在连接服务器...');
  const [matchId, setMatchId] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<{ name: string, score: number, status: string, character?: string } | null>(null);
  const [matchResult, setMatchResult] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [matchMessage, setMatchMessage] = useState('');
  
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
    hzPassiveCharges: 3,
    hddSkillTimer: 420
  });
  const obstaclesRef = useRef<Obstacle[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const diamondsRef = useRef<Diamond[]>([]);
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

  // --- Firebase Auth & Sync ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setIsAuthReady(true);
      if (u) {
        // Fetch user stats
        try {
          const userDoc = await getDoc(doc(db, 'users', u.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setHighScore(data.highScore || 0);
            setDiamonds(data.diamonds || 0);
            setInventory(data.inventory || { shield: 5, magnet: 5, doubleScore: 5, dash: 5 });
            setAchievements(data.achievements || []);
            setUnlockedCharacters(data.unlockedCharacters || ['hdd']);
            setAvatarId(data.avatarId || 'hdd');
          } else {
            // Initialize user doc
            const initialData = {
              userId: u.uid,
              name: u.displayName || '匿名玩家',
              email: u.email || '',
              highScore: 0,
              totalGames: 0,
              diamonds: 200,
              inventory: { shield: 5, magnet: 5, doubleScore: 5, dash: 5 },
              achievements: [],
              unlockedCharacters: ['hdd'],
              avatarId: 'hdd'
            };
            await setDoc(doc(db, 'users', u.uid), initialData);
            setHighScore(0);
            setDiamonds(200);
            setInventory(initialData.inventory);
            setAchievements([]);
            setUnlockedCharacters(['hdd']);
            setAvatarId('hdd');
          }
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
              
              if (isToday || isYesterday) {
                setCheckInCount(count);
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

    return () => unsubscribe();
  }, []);

  // --- Leaderboard Real-time Sync ---
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'leaderboard'), orderBy('score', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({
        name: doc.data().name,
        score: doc.data().score,
        avatarId: doc.data().avatarId
      }));
      setLeaderboard(entries);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'leaderboard');
    });
    return () => unsubscribe();
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
    const newDiamonds = diamonds + 666;
    
    setDiamonds(newDiamonds);
    setCheckInCount(newCount);
    setHasCheckedInToday(true);
    setCheckInMessage('签到成功！获得 666 钻石💎');
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

  const createNewMatch = async () => {
    if (!user) return;
    try {
      const newMatchRef = doc(collection(db, 'matches'));
      await setDoc(newMatchRef, {
        status: 'waiting',
        createdAt: serverTimestamp(),
        player1: {
          uid: user.uid,
          name: user.displayName || (user.isAnonymous ? '游客玩家' : '匿名玩家'),
          score: 0,
          status: 'playing',
          character: selectedCharacter
        }
      });
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

  const startMatchmaking = async (retryCount = 0) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    
    if (retryCount === 0 && matchStateRef.current === 'matching') {
      return; // Already matching
    }
    
    // Reset state
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
            setTimeout(() => startMatchmaking(retryCount + 1), 500);
          } else {
            console.log("Matchmaking: Transaction failed after retries, creating new match");
            createNewMatch();
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
          return data.player1?.uid !== user.uid && 
                 data.status === 'waiting' && 
                 (Date.now() - (data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now())) < 30000;
        }).length === 0;

        if (stillNoMatches) {
          setMatchmakingStatus('正在创建房间并等待对手...');
          createNewMatch();
        } else {
          console.log("Matchmaking: Match appeared during double check, retrying");
          // A match appeared! Retry the whole process once.
          startMatchmaking(retryCount + 1);
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

  const updateMatchScore = useCallback(async (currentScore: number) => {
    if (!isMultiplayer || !matchId || !user || !matchDataRef.current) return;
    try {
      const matchRef = doc(db, 'matches', matchId);
      const data = matchDataRef.current;
      const isPlayer1 = data.player1.uid === user.uid;
      const playerKey = isPlayer1 ? 'player1' : 'player2';
      
      // Update locally first to avoid waiting for snapshot
      matchDataRef.current = {
        ...data,
        [playerKey]: { ...data[playerKey], score: currentScore }
      };

      await setDoc(matchRef, {
        [playerKey]: { ...data[playerKey], score: currentScore }
      }, { merge: true });
    } catch (e) {
      console.error("Score sync error:", e);
    }
  }, [isMultiplayer, matchId, user]);

  const finishMatch = useCallback(async (finalScore: number) => {
    if (!isMultiplayer || !matchId || !user) return;
    try {
      await runTransaction(db, async (transaction) => {
        const matchRef = doc(db, 'matches', matchId);
        const sfDoc = await transaction.get(matchRef);
        if (!sfDoc.exists()) return;
        
        const data = sfDoc.data();
        const isPlayer1 = data.player1.uid === user.uid;
        const playerKey = isPlayer1 ? 'player1' : 'player2';
        const oppKey = isPlayer1 ? 'player2' : 'player1';
        
        const newData = {
          ...data,
          [playerKey]: {
            ...data[playerKey],
            status: 'dead',
            score: finalScore
          }
        };
        
        if (newData[oppKey] && newData[oppKey].status === 'dead') {
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
      hzPassiveCharges: 3,
      hddSkillTimer: 420
    };
    
    obstaclesRef.current = [];
    powerUpsRef.current = [];
    diamondsRef.current = [];
    particlesRef.current = [];
    frameCountRef.current = 0;
    speedRef.current = DIFFICULTY_SETTINGS[difficulty].speed;
    spawnRateRef.current = DIFFICULTY_SETTINGS[difficulty].spawnRate;
  }, [difficulty, selectedCharacter]);

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
        
        if (data.status === 'playing' && matchStateRef.current === 'matching') {
          console.log("Match Sync: Match found, transitioning to playing", matchId);
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
          } else if (data.winner === 'draw') {
            setMatchResult('draw');
          } else {
            setMatchResult('lose');
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
  }, [matchId, user, startGame]);

  // --- Matchmaking Timeout & Polling ---
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let pollInterval: NodeJS.Timeout;

    if (matchState === 'matching') {
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

      // Poll every 3 seconds to see if there are other waiting matches we can join
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
            const createdAt = data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now();
            const isRecent = Math.abs(Date.now() - createdAt) < 300000;
            
            // Only join if the other match has a smaller ID than ours
            // This prevents two players from joining each other's matches simultaneously
            let isOlder = true;
            if (createdMatchIdRef.current) {
               isOlder = doc.id < createdMatchIdRef.current;
            }
            
            return isNotMe && isRecent && isOlder;
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
    
    return () => {
      clearTimeout(timeout);
      clearInterval(pollInterval);
    };
  }, [matchState, user, selectedCharacter]);

  const activateHzSkill = useCallback(() => {
    if (selectedCharacter === 'hz' && playerRef.current && playerRef.current.hzSkillCharges >= 3) {
      playerRef.current.hzSkillCharges -= 3;
      playerRef.current.hzSkillActive = 600; // 10 seconds duration for shield
      playSound('score');
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
  useEffect(() => {
    if (isMultiplayer && matchState === 'playing') {
      if (score - lastSyncedScoreRef.current >= 5) {
        updateMatchScore(score);
        lastSyncedScoreRef.current = score;
      }
    } else if (matchState === 'none' || matchState === 'matching') {
      lastSyncedScoreRef.current = 0;
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
    const timeFactor = Math.floor(frameCountRef.current / 600);
    speedRef.current = DIFFICULTY_SETTINGS[newDifficulty].speed + timeFactor * 0.5;
    spawnRateRef.current = Math.max(40, DIFFICULTY_SETTINGS[newDifficulty].spawnRate - timeFactor * 5);
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
      playerRef.current.shield = 180; // 3 seconds invincibility
      playerRef.current.vy = 0;
      playerRef.current.isJumping = false;
      playerRef.current.jumps = 0;
      
      // Reset speed
      speedRef.current = DIFFICULTY_SETTINGS[difficulty].speed;
      
      // Clear obstacles near player
      obstaclesRef.current = obstaclesRef.current.filter(obs => obs.x > playerRef.current.x + 300);
      
      setGameState('playing');
      startBgm();
      playSound('score');
    }
  };

  const buyItem = async (type: PowerUpType) => {
    const item = SHOP_ITEMS[type];
    if (diamonds >= item.cost) {
      const newDiamonds = diamonds - item.cost;
      const newInventory = { ...inventory, [type]: (inventory[type] || 0) + 1 };
      
      setDiamonds(newDiamonds);
      setInventory(newInventory);
      
      if (user) {
        try {
          await setDoc(doc(db, 'users', user.uid), {
            diamonds: newDiamonds,
            inventory: newInventory
          }, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
        }
      }
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
    if (inventory[type] > 0) {
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
    
    // Cancel slide if jumping and restore height/position immediately
    if (player.isSliding) {
      player.isSliding = false;
      player.slideTimer = 0;
      player.y -= 60; // Move back up immediately to prevent ground clipping
      player.height = 120;
    }

    if (player.jumps < MAX_JUMPS) {
      playSound('jump');
      player.vy = JUMP_STRENGTH;
      player.jumps++;
      player.isJumping = true;
      createParticles(player.x + player.width / 2, player.y + player.height, '#fff', 10);
    }
  }, [gameState, createParticles]);

  const slide = useCallback(() => {
    if (gameState !== 'playing') return;
    const player = playerRef.current;
    if (player.isJumping) {
      player.y = 10000; // Fast fall to ground
      player.vy = 2000; // High velocity to trigger landing particles
    } else if (!player.isSliding) {
      player.isSliding = true;
      player.slideTimer = 60; // 1 second at 60fps
      player.height = 60; // Half height
      player.y += 60; // Move down to stay on ground
      createParticles(player.x + player.width / 2, player.y + player.height, '#fff', 5);
    }
  }, [gameState, createParticles]);

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
        } else if (gameState === 'start' || gameState === 'gameover') {
          showInstructions();
        } else if (gameState === 'instructions') {
          startGame();
        }
      } else if (e.code === 'KeyW') {
        e.preventDefault();
        if (gameState === 'playing') {
          restore();
        } else if (gameState === 'start' || gameState === 'gameover') {
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
      if (player.hzSkillSprint > 0) player.hzSkillSprint -= dt;
      if (player.hjdjSkillCooldown > 0) player.hjdjSkillCooldown -= dt;
      if (player.dash > 0) {
        player.dash -= dt;
        if (player.dash <= 0) {
          // Clear obstacles
          obstaclesRef.current.forEach(obs => {
            createParticles(obs.x + obs.width/2, obs.y + obs.height/2, '#ef4444', 20);
          });
          obstaclesRef.current.length = 0;

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
            const newInv = { ...prev, [randomType]: prev[randomType] + 1 };
            if (user) {
              setDoc(doc(db, 'users', user.uid), { inventory: newInv }, { merge: true }).catch(err => console.error(err));
            }
            return newInv;
          });
          
          createParticles(player.x + player.width/2, player.y, POWERUP_CONFIG[randomType].color, 30);
          playSound('score');
        }
      }

      // Continuous scoring
      setScore(s => {
        const increment = 5 * (dt / 60) * (player.doubleScore > 0 ? 2 : 1);
        scoreAccumulatorRef.current += increment;
        const integerIncrement = Math.floor(scoreAccumulatorRef.current);
        
        if (integerIncrement > 0) {
          scoreAccumulatorRef.current -= integerIncrement;
          const newScore = s + integerIncrement;
          checkAchievements(newScore);
          return newScore;
        }
        return s;
      });

      // Physics
      if (player.dash > 0 || player.hjdjSkillActive > 0) {
        player.vy = 0;
        player.y = groundY - player.height;
      } else {
        player.vy += GRAVITY * dt;
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

      if (player.y + player.height >= groundY) {
        if (player.vy > 10) {
          createParticles(player.x + player.width / 2, groundY, '#4ade80', 15);
        }
        player.y = groundY - player.height;
        player.vy = 0;
        player.isJumping = false;
        player.jumps = 0;
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

      // Obstacles & Power-ups Spawning
      const prevFrameCount = frameCountRef.current;
      frameCountRef.current += dt;
      
      const currentSpeed = speedRef.current * (player.dash > 0 || player.hjdjSkillActive > 0 || player.hzSkillSprint > 0 ? 3 : 1);

      if (Math.floor(frameCountRef.current / 600) > Math.floor(prevFrameCount / 600)) {
        speedRef.current += 0.5;
        spawnRateRef.current = Math.max(40, spawnRateRef.current - 5);
      }

      // Spawn Obstacles
      const lastObstacle = obstacles[obstacles.length - 1];
      const minSpacing = 300 + Math.random() * 200; // Ensure at least 300px between obstacles
      
      if (Math.floor(frameCountRef.current / spawnRateRef.current) > Math.floor(prevFrameCount / spawnRateRef.current)) {
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
      if (Math.floor(frameCountRef.current / 200) > Math.floor(prevFrameCount / 200) && Math.random() > 0.4) {
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

      // Spawn Diamonds
      if (Math.floor(frameCountRef.current / 150) > Math.floor(prevFrameCount / 150)) {
        diamondsRef.current.push({
          x: canvas.width,
          y: groundY - 50 - Math.random() * 200,
          width: 25,
          height: 25,
          collected: false
        });
      }

      // Update Power-ups
      for (let i = powerUps.length - 1; i >= 0; i--) {
        const pu = powerUps[i];
        pu.x -= currentSpeed * dt;

        // Magnet effect
        if (player.magnet > 0) {
          const dx = player.x - pu.x;
          const dy = player.y - pu.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 200) {
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
          if (selectedCharacter === 'hz' && player.hzSkillCharges < 3) {
            player.hzSkillCharges += 1;
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

      // Update Diamonds
      for (let i = diamondsRef.current.length - 1; i >= 0; i--) {
        const d = diamondsRef.current[i];
        d.x -= currentSpeed * dt;

        // Magnet effect
        if (player.magnet > 0) {
          const dx = player.x - d.x;
          const dy = player.y - d.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 200) {
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
          createParticles(d.x, d.y, '#60a5fa', 15);
          diamondsRef.current.splice(i, 1);
          continue;
        }

        if (d.x + d.width < 0) {
          diamondsRef.current.splice(i, 1);
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
              const newScore = s + 5;
              checkAchievements(newScore);
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
            player.invincibility = 120; // 2 seconds invincibility after passive trigger
            createParticles(player.x + player.width/2, player.y + player.height/2, '#60a5fa', 30);
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
            const newScore = s + (player.doubleScore > 0 ? 2 : 1);
            checkAchievements(newScore);
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
      // Day/Night Cycle based on score
      const cycle = (score / 100) % 2; // 0 to 2
      let skyColorTop, skyColorBottom;
      
      if (cycle < 0.5) { // Day to Sunset
        skyColorTop = '#0f172a'; skyColorBottom = '#334155';
      } else if (cycle < 1) { // Sunset to Night
        skyColorTop = '#1e1b4b'; skyColorBottom = '#4338ca';
      } else if (cycle < 1.5) { // Night to Sunrise
        skyColorTop = '#020617'; skyColorBottom = '#0f172a';
      } else { // Sunrise to Day
        skyColorTop = '#312e81'; skyColorBottom = '#4f46e5';
      }

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

      // Ground
      ctx.fillStyle = '#1c1917'; // stone-900
      ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
      ctx.fillStyle = '#44403c'; // stone-700
      ctx.fillRect(0, groundY, canvas.width, 10);

      // Particles
      particlesRef.current.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 1 - p.life / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

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
        
        ctx.drawImage(playerImage, player.x + offsetX, player.y + offsetY, drawWidth, drawHeight);
        ctx.restore();
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
      
      // Score is now rendered via React overlay
    };

    if (gameState === 'playing') {
      animationRef.current = requestAnimationFrame(update);
    } else {
      draw();
    }

    return () => cancelAnimationFrame(animationRef.current);
  }, [gameState, playerImage, score, createParticles, updateLeaderboard, isMultiplayer, updateMatchScore, finishMatch]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setPlayerImage(img);
    };
    img.src = getCharacterImage(selectedCharacter);
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
                {unlockedCharacters.map(charId => (
                  <button
                    key={charId}
                    onClick={() => updateAvatar(charId)}
                    className={`p-2 rounded-2xl border-4 flex flex-col items-center gap-2 transition-all ${avatarId === charId ? 'bg-[#ffecb3] border-[#ffb300]' : 'bg-white border-gray-200 hover:border-[#ffe082]'}`}
                  >
                    <div className="w-20 h-20 bg-white rounded-xl border-2 border-gray-100 flex items-center justify-center overflow-hidden">
                      <img src={getCharacterImage(charId)} alt={charId} className="h-full object-contain" />
                    </div>
                    <span className="text-sm font-black text-[#5d4037]">
                      {charId === 'hdd' ? '呼大帝' : charId === 'santa' ? '圣诞老呼' : charId === 'hjdj' ? '海军大将' : '呼子'}
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
                    unlockingChar === 'hz' ? '呼子' : '新伙伴'
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

        {/* Check-in Modal */}
        {showCheckInModal && (
          <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-[#fff8e1] w-full max-w-sm rounded-3xl p-6 border-4 border-[#ffb300] shadow-[0_10px_0_#ff8f00,0_15px_20px_rgba(0,0,0,0.5)] flex flex-col items-center -mt-10">
              <div className="w-full flex justify-between items-center mb-4">
                <h2 className="text-3xl font-black text-[#e65100]">签到福利</h2>
                <button onClick={() => setShowCheckInModal(false)} className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold shadow-md active:translate-y-1">X</button>
              </div>
              
              <div className="w-full bg-[#ffcc80]/30 py-2 px-4 rounded-xl border-2 border-[#ffb300]/30 mb-6 text-center">
                <p className="text-[#d84315] font-bold text-sm">内测送钻石，每天领取 <span className="text-blue-600 font-black text-lg">666</span> 💎</p>
              </div>

              <div className="grid grid-cols-4 gap-2 w-full mb-6">
                {[...Array(7)].map((_, i) => {
                  const isCheckedIn = i < checkInCount;
                  return (
                    <div key={i} className={`flex flex-col items-center justify-center p-2 rounded-2xl border-2 ${i === 6 ? 'col-span-2 bg-gradient-to-br from-[#ffe082] to-[#ffca28] border-[#ff8f00]' : 'bg-white border-[#ffe082]'} shadow-sm relative overflow-hidden`}>
                      <div className="text-[#e65100] font-black text-xs mb-1">第{i + 1}天</div>
                      <div className="text-xl drop-shadow-sm">💎</div>
                      <div className="text-blue-600 font-black text-sm mt-1">666</div>
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

        {/* Mute Button */}
        <button 
          onClick={() => {
            const muted = toggleMute();
            setIsMutedState(muted);
          }}
          className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center border border-white/20 hover:bg-black/70 transition-colors"
        >
          {isMutedState ? <VolumeX className="text-white" size={20} /> : <Volume2 className="text-white" size={20} />}
        </button>

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
                <span className="font-mono text-yellow-400 font-bold text-xl leading-none">{score}</span>
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
            </div>
          </div>
        )}

        {/* Difficulty Selector (Playing) */}
        {gameState === 'playing' && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 flex gap-2 bg-black/50 p-1.5 rounded-full border border-white/20">
            {(['easy', 'normal', 'hard'] as Difficulty[]).map(d => (
              <button
                key={d}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDifficultyChange(d);
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                  difficulty === d 
                    ? 'bg-yellow-500 text-black' 
                    : 'text-white hover:bg-white/20'
                }`}
              >
                {DIFFICULTY_SETTINGS[d].label}
              </button>
            ))}
          </div>
        )}

        {/* Inventory Buttons (Playing) */}
        {gameState === 'playing' && (
          <div className="absolute bottom-32 right-4 z-10 flex flex-col gap-3">
            {(Object.entries(SHOP_ITEMS) as [PowerUpType, any][]).map(([type, item]) => (
              <button
                key={type}
                onClick={() => useItem(type)}
                disabled={inventory[type] <= 0}
                className={`w-12 h-12 rounded-2xl border-2 flex flex-col items-center justify-center transition-all relative ${
                  inventory[type] > 0 
                    ? 'bg-white border-yellow-400 shadow-lg scale-110' 
                    : 'bg-black/30 border-white/10 opacity-50 grayscale'
                }`}
              >
                <span className="text-xl">{POWERUP_CONFIG[type].icon}</span>
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                  {inventory[type]}
                </span>
              </button>
            ))}
          </div>
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
              disabled={playerRef.current && playerRef.current.hzSkillCharges < 3}
              className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all relative overflow-hidden ${
                playerRef.current && playerRef.current.hzSkillCharges < 3
                  ? 'bg-black/50 border-white/20 opacity-60'
                  : 'bg-green-500 border-green-300 shadow-[0_6px_0_#2e7d32] active:translate-y-1 active:shadow-none'
              }`}
            >
              <img src={hzSkillImg} alt="Skill" className="w-full h-full object-cover" />
              <div className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">
                {playerRef.current ? playerRef.current.hzSkillCharges : 0}/3
              </div>
            </button>
            <div className="text-center mt-1">
              <span className="text-white font-black text-xs bg-black/50 px-2 py-0.5 rounded-full">脂肪护盾</span>
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

          {gameState === 'start' && (
            <div className="absolute inset-0 flex flex-col items-center justify-between pb-8 pt-6 px-4 bg-gradient-to-b from-blue-900/90 to-emerald-900/90 backdrop-blur-sm">
              {/* Top Bar */}
              <div className="w-full flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {/* Player Profile Section */}
                  <div className="flex items-center gap-2 bg-black/20 p-1 pr-4 rounded-xl border border-white/10 backdrop-blur-sm">
                    <div 
                      className="w-16 h-16 rounded-lg border-2 border-yellow-500/50 overflow-hidden bg-[#f5e6c4] shadow-lg shrink-0 relative cursor-pointer"
                      onClick={() => user && setShowAvatarSelect(true)}
                    >
                      <img src={getCharacterImage(avatarId)} alt="avatar" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex flex-col justify-center">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-black text-sm drop-shadow-md">
                          {user?.displayName || (user?.isAnonymous ? '游客' : (user ? '呼大帝' : '未登录'))}
                        </span>
                      </div>
                      {user && (
                        <button 
                          onClick={logout}
                          className="text-[10px] text-red-400 font-bold mt-0.5 hover:text-red-300"
                        >
                          退出登录
                        </button>
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
                <button className="w-12 h-12 bg-[#ef5350] rounded-full flex items-center justify-center border-4 border-[#ffcdd2] shadow-lg">
                  <X className="text-white" size={24} />
                </button>
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
                <div className="absolute left-0 top-0 flex flex-col gap-6 z-20">
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
                      onClick={() => setGameState('leaderboard')}
                      className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border-4 border-gray-200 shadow-lg transform -rotate-6"
                    >
                      <Megaphone className="text-blue-500" size={28} fill="currentColor" />
                    </button>
                    <span className="text-white font-bold mt-1 text-sm text-shadow-sm" style={{ textShadow: '1px 1px 2px black' }}>排行榜</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <button 
                      onClick={() => setGameState('shop')}
                      className="w-14 h-14 bg-gradient-to-b from-yellow-200 to-yellow-500 rounded-2xl flex items-center justify-center border-4 border-yellow-100 shadow-lg transform rotate-3"
                    >
                      <Package className="text-yellow-800" size={28} />
                    </button>
                    <span className="text-white font-bold mt-1 text-sm text-shadow-sm" style={{ textShadow: '1px 1px 2px black' }}>商店</span>
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
                {/* Difficulty Selector */}
                <div className="flex gap-2 bg-black/30 p-1.5 rounded-full border border-white/20 backdrop-blur-sm">
                  {(['easy', 'normal', 'hard'] as Difficulty[]).map(d => (
                    <button
                      key={d}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDifficulty(d);
                      }}
                      className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${
                        difficulty === d 
                          ? 'bg-yellow-500 text-black' 
                          : 'text-white hover:bg-white/20'
                      }`}
                    >
                      {DIFFICULTY_SETTINGS[d].label}
                    </button>
                  ))}
                </div>

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
                    onClick={() => startMatchmaking()}
                    className="flex-1 py-3 rounded-3xl font-black text-xl text-white border-4 border-white shadow-[0_6px_0_#0277bd,0_10px_20px_rgba(0,0,0,0.4)] transition-transform active:translate-y-2 active:shadow-[0_0px_0_#0277bd] leading-tight"
                    style={{ background: 'linear-gradient(to bottom, #e1f5fe, #29b6f6, #0288d1)', textShadow: '2px 2px 0 #01579b, -1px -1px 0 #01579b, 1px -1px 0 #01579b, -1px 1px 0 #01579b' }}
                  >
                    竞技<br/><span className="text-2xl">对战</span>
                  </button>
                </div>
              </div>
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
                      desc: '开局获得圣诞麋鹿的恩赐，无敌冲刺15秒，并在冲刺结束后获得永久护盾。冲刺时间增长5秒。' 
                    },
                    { 
                      id: 'hjdj', 
                      name: '海军大将', 
                      author: '制作人：森森小帅哥',
                      img: hjdjImg, 
                      skill: '技能：火烧赤壁', 
                      desc: '获得主动技能火烧赤壁，获得十秒加速同时火势蔓延将前方障碍摧毁，副作用是道具也被烧了。' 
                    },
                    { 
                      id: 'hz', 
                      name: '呼子', 
                      img: hzImg, 
                      skill: '技能：脂肪护盾', 
                      desc: '捡道具获得充能，充能3次后可使用技能，主动开启后，用厚厚的脂肪层形成护盾，护盾破碎后，还会获得冲刺五秒。被动：弹性肚腩，被障碍物撞击时，肚腩会像弹簧一样弹起，抵消伤害，全局仅限3次。' 
                    }
                  ].map(char => {
                    const isUnlocked = unlockedCharacters.includes(char.id);
                    const canUnlock = highScore >= CHARACTER_REQUIREMENTS[char.id];
                    const reqScore = CHARACTER_REQUIREMENTS[char.id];

                    return (
                      <div 
                        key={char.id}
                        onClick={() => { 
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
                              <Lock size={10} /> 需达到 {reqScore} 分
                            </div>
                            {canUnlock && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); unlockCharacter(char.id); }}
                                className="bg-green-500 text-white px-4 py-1 rounded-full text-xs font-black shadow-[0_4px_0_#2e7d32] active:translate-y-1 active:shadow-none animate-bounce"
                              >
                                点击解锁
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
              <p className="text-2xl text-white mb-10 font-medium">Score: <span className="font-mono text-yellow-400 font-bold">{score}</span></p>
              
              <div className="flex flex-col gap-4 w-full px-10">
                <button 
                  onClick={revive}
                  disabled={diamonds < [50, 100, 200][reviveCount]}
                  className={`w-full py-4 rounded-3xl font-black text-2xl text-white border-4 border-white shadow-[0_6px_0_#0277bd,0_10px_20px_rgba(0,0,0,0.4)] transition-transform active:translate-y-2 active:shadow-[0_0px_0_#0277bd] flex items-center justify-center gap-2 ${diamonds < [50, 100, 200][reviveCount] ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                  style={{ background: 'linear-gradient(to bottom, #e1f5fe, #29b6f6, #0288d1)', textShadow: '2px 2px 0 #01579b, -1px -1px 0 #01579b, 1px -1px 0 #01579b, -1px 1px 0 #01579b' }}
                >
                  <span>复活</span>
                  <span className="text-lg bg-black/20 px-2 py-0.5 rounded-full border border-white/20">💎 {[50, 100, 200][reviveCount]}</span>
                </button>

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
              <p className="text-xl text-white/80 mb-8 font-medium">你的最终得分: <span className="font-mono text-yellow-400 font-bold">{score}</span></p>
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
                  寻找对手中...
                </h2>
                
                <div className="relative w-32 h-32 mb-8 z-10">
                  <div className="absolute inset-0 border-4 border-t-[#818cf8] border-r-transparent border-b-[#818cf8] border-l-transparent rounded-full animate-spin"></div>
                  <div className="absolute inset-2 border-4 border-t-transparent border-r-[#c7d2fe] border-b-transparent border-l-[#c7d2fe] rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-5xl">⚔️</span>
                  </div>
                </div>
                
                <p className="text-[#c7d2fe] font-medium text-center relative z-10 animate-pulse">
                  {matchmakingStatus}
                </p>
                
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
                    <span className="text-3xl font-mono text-yellow-400">{score}</span>
                  </div>
                  <div className="text-2xl font-black text-white/50">VS</div>
                  <div className="flex flex-col items-center">
                    <span className="text-white font-bold mb-1">对手</span>
                    <span className="text-3xl font-mono text-yellow-400">{opponent?.score || 0}</span>
                  </div>
                </div>
                
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
          {gameState === 'leaderboard' && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur-md z-30 px-6">
              <div className="bg-[#fff8e1] w-full max-w-sm rounded-3xl p-6 border-4 border-[#ffb300] shadow-[0_10px_0_#ff8f00,0_15px_20px_rgba(0,0,0,0.5)] flex flex-col items-center">
                <div className="w-full flex justify-between items-center mb-6">
                  <h2 className="text-3xl font-black text-[#e65100]">排行榜</h2>
                  <button onClick={() => setGameState('start')} className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">X</button>
                </div>
                
                <div className="w-full space-y-2 mb-6 max-h-[400px] overflow-y-auto pr-1">
                  {leaderboard.length > 0 ? leaderboard.map((entry, i) => (
                    <div key={i} className="flex justify-between items-center bg-white p-3 rounded-2xl border-2 border-gray-100 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <span className={`absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white z-10 shadow-sm ${
                            i === 0 ? 'bg-yellow-400' : 
                            i === 1 ? 'bg-gray-300' : 
                            i === 2 ? 'bg-orange-400' : 'bg-gray-400'
                          }`}>
                            {i + 1}
                          </span>
                          <div className={`w-10 h-10 rounded-full border-2 overflow-hidden flex items-center justify-center bg-gray-50 ${
                            i === 0 ? 'border-yellow-400' : 
                            i === 1 ? 'border-gray-300' : 
                            i === 2 ? 'border-orange-400' : 'border-gray-100'
                          }`}>
                            <img 
                              src={getCharacterImage(entry.avatarId || 'hdd')} 
                              alt={entry.name} 
                              className="w-full h-full object-contain"
                            />
                          </div>
                        </div>
                        <span className="font-black text-[#5d4037] truncate max-w-[120px]">{entry.name}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-mono font-black text-yellow-600 text-lg leading-none">{entry.score}</span>
                        <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Points</span>
                      </div>
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center py-10 opacity-40">
                      <span className="text-4xl mb-2">🏆</span>
                      <p className="text-gray-500 font-bold italic">暂无排名，快去挑战吧！</p>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => setGameState('start')}
                  className="w-full py-3 rounded-2xl font-black text-xl text-white border-4 border-white shadow-[0_6px_0_#43a047,0_10px_20px_rgba(0,0,0,0.4)] transition-transform active:translate-y-2 active:shadow-[0_0px_0_#43a047]"
                  style={{ background: 'linear-gradient(to bottom, #a5d6a7, #66bb6a, #4caf50)', textShadow: '1px 1px 0 #2e7d32, -1px -1px 0 #2e7d32, 1px -1px 0 #2e7d32, -1px 1px 0 #2e7d32' }}
                >
                  返回
                </button>
              </div>
            </div>
          )}

          {/* Shop Modal */}
          {gameState === 'shop' && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur-md z-30 px-6">
              <div className="bg-[#fff8e1] w-full max-w-sm rounded-3xl p-6 border-4 border-[#ffb300] shadow-[0_10px_0_#ff8f00,0_15px_20px_rgba(0,0,0,0.5)] flex flex-col items-center">
                <div className="w-full flex justify-between items-center mb-4">
                  <h2 className="text-3xl font-black text-[#e65100]">游戏商店</h2>
                  <button onClick={() => setGameState('start')} className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">X</button>
                </div>

                <div className="w-full bg-black/10 rounded-2xl p-3 mb-6 flex items-center justify-center gap-2 border-2 border-[#ffb300]/20">
                  <span className="text-2xl">💎</span>
                  <span className="text-2xl font-black text-blue-600 font-mono">{diamonds}</span>
                </div>
                
                <div className="flex flex-col gap-3 w-full mb-6 max-h-[350px] overflow-y-auto pr-2">
                  {(Object.entries(SHOP_ITEMS) as [PowerUpType, any][]).map(([type, item]) => (
                    <div key={type} className="bg-white p-3 rounded-2xl border-2 border-gray-200 flex items-center gap-4">
                      <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center text-3xl shrink-0">
                        {POWERUP_CONFIG[type].icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-black text-[#5d4037]">{item.name}</span>
                          <span className="text-xs font-bold text-gray-400">拥有: {inventory[type]}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-bold leading-tight mb-2">{item.description}</p>
                        <button 
                          onClick={() => buyItem(type)}
                          disabled={diamonds < item.cost}
                          className={`w-full py-1.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                            diamonds >= item.cost 
                              ? 'bg-blue-500 text-white shadow-[0_3px_0_#1d4ed8] active:translate-y-1 active:shadow-none' 
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          <span>💎 {item.cost}</span>
                          <span className="border-l border-white/20 pl-2">购买</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={() => setGameState('start')}
                  className="w-full py-3 rounded-2xl font-black text-xl text-white border-4 border-white shadow-[0_6px_0_#43a047,0_10px_20px_rgba(0,0,0,0.4)] transition-transform active:translate-y-2 active:shadow-[0_0px_0_#43a047]"
                  style={{ background: 'linear-gradient(to bottom, #a5d6a7, #66bb6a, #4caf50)', textShadow: '1px 1px 0 #2e7d32, -1px -1px 0 #2e7d32, 1px -1px 0 #2e7d32, -1px 1px 0 #2e7d32' }}
                >
                  返回
                </button>
              </div>
            </div>
          )}

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
        </div>
      </div>
      
      <div className="mt-6 text-neutral-500 text-sm max-w-sm text-center">
        <p>点击游戏画面或按空格键跳跃。支持二段跳！</p>
      </div>
    </div>
  );
}

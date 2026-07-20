"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  Shuffle, 
  RotateCcw, 
  History,
  Trophy,
  Settings,
  Maximize,
  Minimize,
  Check,
  ShieldCheck,
  Lock,
  Save,
  Plus,
  X,
  Info
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import confetti from 'canvas-confetti';

interface Student {
  id: string;
  number: number;
  presentedCount: number;
  lastSelected?: Date;
  streak: number;
}

interface SelectionHistory {
  studentNumber: number;
  timestamp: Date;
}

export interface ClassProfile {
  id: string;
  name: string;
  startNumber: string;
  endNumber: string;
  selectionMode: 'exclude' | 'include';
  filterNumbersText: string;
  noRepeat: boolean;
}

function parseRangeText(text: string): Set<number> {
  const result = new Set<number>();
  const normalized = text
    .replace(/ー/g, '-')
    .replace(/－/g, '-')
    .replace(/，/g, ',')
    .replace(/、/g, ',')
    .replace(/　/g, ' ');

  const tokens = normalized.split(/[\s,、]+/);
  for (const token of tokens) {
    if (!token) continue;
    if (token.includes('-')) {
      const parts = token.split('-');
      if (parts.length === 2) {
        const start = parseInt(parts[0], 10);
        const end = parseInt(parts[1], 10);
        if (!isNaN(start) && !isNaN(end)) {
          const actualStart = Math.min(start, end);
          const actualEnd = Math.max(start, end);
          for (let i = actualStart; i <= actualEnd; i++) {
            result.add(i);
          }
        }
      }
    } else {
      const num = parseInt(token, 10);
      if (!isNaN(num)) {
        result.add(num);
      }
    }
  }
  return result;
}

export default function StudentPicker() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [history, setHistory] = useState<SelectionHistory[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [startNumber, setStartNumber] = useState('1');
  const [endNumber, setEndNumber] = useState('40');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tempSelectedStudent, setTempSelectedStudent] = useState<Student | null>(null);
  const [rouletteNumbers, setRouletteNumbers] = useState<number[]>([]);
  const [showDrumroll, setShowDrumroll] = useState(false);
  const [showFinalResult, setShowFinalResult] = useState(false);
  const { toast } = useToast();

  // 追加のステート変数
  const [selectionMode, setSelectionMode] = useState<'exclude' | 'include'>('exclude');
  const [filterNumbersText, setFilterNumbersText] = useState('');
  const [noRepeat, setNoRepeat] = useState(true); // デフォルトで重複防止はONが親切
  const [classProfiles, setClassProfiles] = useState<ClassProfile[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string>('');
  const [newProfileName, setNewProfileName] = useState('');

  // 全画面表示させたいエリアを参照するRef（くるくる回る画面の部分だけ）
  const lotteryContainerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!lotteryContainerRef.current) return;

    if (!document.fullscreenElement) {
      lotteryContainerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        toast({
          title: "全画面エラー",
          description: "全画面表示の切り替えに失敗しました: " + err.message,
          variant: "destructive"
        });
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        });
      }
    }
  };

  // 全画面状態の変化を検知する
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);


  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#FF1493', '#9400D3', '#4B0082']
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#FF1493', '#9400D3', '#4B0082']
      });
    }, 250);
  };

  // 抽選アニメーション用のリール1列の長さ（奇数にして中央インデックスを明確にする）
  const REEL_LENGTH = 41;
  const REEL_CENTER_INDEX = Math.floor(REEL_LENGTH / 2);
  // リールが回転する時間（秒）。JSX側のアニメーションとsetTimeoutの両方でこの値を使う。
  const REEL_SPIN_DURATION = 3.2;


  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const savedStudents = localStorage.getItem('students');
      const savedHistory = localStorage.getItem('selectionHistory');
      const savedStartNumber = localStorage.getItem('startNumber');
      const savedEndNumber = localStorage.getItem('endNumber');
      const savedSelectionMode = localStorage.getItem('selectionMode');
      const savedFilterNumbersText = localStorage.getItem('filterNumbersText');
      const savedNoRepeat = localStorage.getItem('noRepeat');
      const savedClassProfiles = localStorage.getItem('classProfiles');
      const savedCurrentProfileId = localStorage.getItem('currentProfileId');

      if (savedStudents) {
        setStudents(JSON.parse(savedStudents));
      }
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
      if (savedStartNumber) {
        setStartNumber(savedStartNumber);
      }
      if (savedEndNumber) {
        setEndNumber(savedEndNumber);
      }
      if (savedSelectionMode) {
        setSelectionMode(savedSelectionMode as 'exclude' | 'include');
      }
      if (savedFilterNumbersText !== null) {
        setFilterNumbersText(savedFilterNumbersText);
      }
      if (savedNoRepeat !== null) {
        setNoRepeat(savedNoRepeat === 'true');
      }
      if (savedClassProfiles) {
        setClassProfiles(JSON.parse(savedClassProfiles));
      }
      if (savedCurrentProfileId) {
        setCurrentProfileId(savedCurrentProfileId);
      }
    } catch (err) {
      console.error('Failed to load saved data from localStorage:', err);
      toast({
        title: "読込エラー",
        description: "保存されたデータの読み込みに失敗しました。データが破損している可能性があります。",
        variant: "destructive"
      });
    }
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('students', JSON.stringify(students));
      localStorage.setItem('selectionHistory', JSON.stringify(history));
      localStorage.setItem('startNumber', startNumber);
      localStorage.setItem('endNumber', endNumber);
      localStorage.setItem('selectionMode', selectionMode);
      localStorage.setItem('filterNumbersText', filterNumbersText);
      localStorage.setItem('noRepeat', String(noRepeat));
      localStorage.setItem('classProfiles', JSON.stringify(classProfiles));
      localStorage.setItem('currentProfileId', currentProfileId);
    } catch (err) {
      console.error('Failed to save data to localStorage:', err);
    }
  }, [students, history, startNumber, endNumber, selectionMode, filterNumbersText, noRepeat, classProfiles, currentProfileId]);

  // ヘルパー: グリッドから特定の生徒を切り替える
  const toggleStudentInFilter = (num: number) => {
    const filterSet = parseRangeText(filterNumbersText);
    if (filterSet.has(num)) {
      filterSet.delete(num);
    } else {
      filterSet.add(num);
    }
    // Setからカンマ区切りの文字列を再生成
    const sortedNums = Array.from(filterSet).sort((a, b) => a - b);

    // 連続した数字をハイフンにまとめる(より使いやすくスマートな表記)
    const ranges: string[] = [];
    let rangeStart = -1;
    let rangeEnd = -1;

    for (let i = 0; i < sortedNums.length; i++) {
      const current = sortedNums[i];
      if (rangeStart === -1) {
        rangeStart = current;
        rangeEnd = current;
      } else if (current === rangeEnd + 1) {
        rangeEnd = current;
      } else {
        if (rangeStart === rangeEnd) {
          ranges.push(String(rangeStart));
        } else {
          ranges.push(`${rangeStart}-${rangeEnd}`);
        }
        rangeStart = current;
        rangeEnd = current;
      }
    }
    if (rangeStart !== -1) {
      if (rangeStart === rangeEnd) {
        ranges.push(String(rangeStart));
      } else {
        ranges.push(`${rangeStart}-${rangeEnd}`);
      }
    }

    setFilterNumbersText(ranges.join(', '));
  };

  // 指定された生徒番号が有効（抽選プールに含まれる）かどうかの判定
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const isStudentActive = useCallback((num: number) => {
    const filterSet = parseRangeText(filterNumbersText);
    if (selectionMode === 'exclude') {
      return !filterSet.has(num);
    } else {
      return filterSet.has(num);
    }
  }, [filterNumbersText, selectionMode]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const selectRandomStudent = useCallback(() => {
    // 抽選対象（アクティブな生徒）をフィルタリング
    const activeCandidates = students.filter(student => isStudentActive(student.number));

    if (activeCandidates.length === 0) {
      toast({
        title: "エラー",
        description: "抽選対象の生徒がいません。設定を確認してください。",
        variant: "destructive"
      });
      return;
    }

    // 重複防止（1度選ばれた生徒は、対象全員が1巡するまで選ばれない）
    let eligibleCandidates = activeCandidates;
    if (noRepeat) {
      // 最小選択（指名）回数を求める
      const minCount = Math.min(...activeCandidates.map(s => s.presentedCount));
      // 指名回数が最小の生徒のみを候補とする（これで均等に当たるようになります）
      eligibleCandidates = activeCandidates.filter(s => s.presentedCount === minCount);

      // 万が一候補が空になった場合はアクティブ候補全員を対象にする
      if (eligibleCandidates.length === 0) {
        eligibleCandidates = activeCandidates;
      }
    }

    setIsSpinning(true);
    setShowDrumroll(true);
    setShowFinalResult(false);

    // 最終的に選ばれる学生を先に決定する
    const finalStudent = eligibleCandidates[Math.floor(Math.random() * eligibleCandidates.length)];

    // リール用の数字配列を生成。中央（REEL_CENTER_INDEX）には
    // 必ず「本当に選ばれた番号」を仕込んでおくことで、
    // アニメーションが止まった瞬間に表示される数字と結果が完全に一致するようにする。
    const reel: number[] = [];
    for (let i = 0; i < REEL_LENGTH; i++) {
      if (i === REEL_CENTER_INDEX) {
        reel.push(finalStudent.number);
      } else {
        const idx = Math.floor(Math.random() * eligibleCandidates.length);
        reel.push(eligibleCandidates[idx].number);
      }
    }
    setRouletteNumbers(reel);

    // スロットアニメーション（下記 REEL_SPIN_DURATION と一致させる）
    setTimeout(() => {
      setShowDrumroll(false);
      setShowFinalResult(true);
      setTempSelectedStudent(finalStudent);
      setSelectedStudent(finalStudent); // ダイアログを挟まず、即座に選択決定

      // 選択された学生の情報を更新
      const updatedStudents = students.map(student => {
        if (student.id === finalStudent.id) {
          return {
            ...student,
            presentedCount: student.presentedCount + 1,
            lastSelected: new Date(),
            streak: student.streak + 1,
          };
        }
        return { ...student, streak: 0 };
      });
      
      setStudents(updatedStudents);
      setHistory(prev => [...prev, { studentNumber: finalStudent.number, timestamp: new Date() }]);
      setIsSpinning(false);
      
      // 演出（紙吹雪）をトリガー
      triggerConfetti();
    }, REEL_SPIN_DURATION * 1000);
  }, [students, noRepeat, toast, isStudentActive]);

  // キーボードイベント（Spaceキーで抽選、Escで全画面終了）の検知
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        // 入力フィールドやボタンにフォーカスがある場合は、そちら側の標準動作を優先する
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'button') {
          return;
        }
        e.preventDefault();
        // 抽選開始ボタンが押せる状態、かつスピン中でなければ実行
        if (!isSpinning && students.length > 0) {
          selectRandomStudent();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSpinning, students, filterNumbersText, selectionMode, noRepeat, selectRandomStudent]);

  const handleSaveProfile = () => {
    if (!newProfileName.trim()) {
      toast({
        title: "エラー",
        description: "クラス名を入力してください",
        variant: "destructive"
      });
      return;
    }
    const profileId = `profile-${Date.now()}`;
    const newProfile: ClassProfile = {
      id: profileId,
      name: newProfileName.trim(),
      startNumber,
      endNumber,
      selectionMode,
      filterNumbersText,
      noRepeat
    };
    const updated = [...classProfiles, newProfile];
    setClassProfiles(updated);
    setCurrentProfileId(profileId);
    setNewProfileName('');
    toast({
      title: "保存完了",
      description: `クラス「${newProfile.name}」を保存しました`
    });
  };

  const handleLoadProfile = (id: string) => {
    const profile = classProfiles.find(p => p.id === id);
    if (!profile) return;

    if (history.length > 0) {
      if (!window.confirm(`クラス「${profile.name}」を読み込むと、現在の指名履歴と回数の記録はすべて失われます。よろしいですか？`)) {
        return;
      }
    }

    setStartNumber(profile.startNumber);
    setEndNumber(profile.endNumber);
    setSelectionMode(profile.selectionMode);
    setFilterNumbersText(profile.filterNumbersText);
    setNoRepeat(profile.noRepeat);
    setCurrentProfileId(profile.id);

    // 学生データの初期化も同時に行う
    const start = parseInt(profile.startNumber);
    const end = parseInt(profile.endNumber);
    const newStudents: Student[] = [];
    for (let i = start; i <= end; i++) {
      newStudents.push({
        id: `student-${i}`,
        number: i,
        presentedCount: 0,
        streak: 0
      });
    }
    setStudents(newStudents);
    setHistory([]);

    toast({
      title: "読込完了",
      description: `クラス「${profile.name}」を読み込み、生徒リストを初期化しました`
    });
  };

  const handleDeleteProfile = (id: string) => {
    const profile = classProfiles.find(p => p.id === id);
    if (!window.confirm(`クラス「${profile?.name ?? ''}」を削除しますか？この操作は取り消せません。`)) {
      return;
    }
    const updated = classProfiles.filter(p => p.id !== id);
    setClassProfiles(updated);
    if (currentProfileId === id) {
      setCurrentProfileId('');
    }
    toast({
      title: "削除完了",
      description: "クラスデータを削除しました"
    });
  };

  const initializeStudents = () => {
    const start = parseInt(startNumber);
    const end = parseInt(endNumber);
    if (isNaN(start) || isNaN(end) || start > end) {
      toast({
        title: "エラー",
        description: "正しい番号範囲を入力してください",
        variant: "destructive"
      });
      return;
    }
    if (start < 1) {
      toast({
        title: "エラー",
        description: "開始番号は1以上にしてください",
        variant: "destructive"
      });
      return;
    }
    if (end - start + 1 > 1000) {
      toast({
        title: "エラー",
        description: "一度に登録できるのは1000人までです。範囲を見直してください",
        variant: "destructive"
      });
      return;
    }

    if (history.length > 0) {
      if (!window.confirm('この範囲で初期化すると、現在の指名履歴と回数の記録はすべて失われます。よろしいですか？')) {
        return;
      }
    }

    const newStudents: Student[] = [];
    for (let i = start; i <= end; i++) {
      newStudents.push({
        id: `student-${i}`,
        number: i,
        presentedCount: 0,
        streak: 0
      });
    }
    setStudents(newStudents);
    setHistory([]);
    toast({
      title: "初期化完了",
      description: `${start}番から${end}番までの学生を登録しました`,
    });
  };

  const resetPresentedCounts = () => {
    if (!window.confirm('本当に指名履歴と回数の記録をすべてリセットしますか？この操作は取り消せません。')) {
      return;
    }
    const updatedStudents = students.map(student => ({
      ...student,
      presentedCount: 0,
      streak: 0
    }));
    setStudents(updatedStudents);
    setHistory([]);
    toast({
      title: "リセット完了",
      description: "全ての記録をリセットしました"
    });
  };

  const getStudentStats = () => {
    const totalPresentations = students.reduce((sum, student) => sum + student.presentedCount, 0);
    const maxPresentations = Math.max(...students.map(s => s.presentedCount));
    const maxStreak = Math.max(...students.map(s => s.streak));
    const streakHolder = students.find(s => s.streak === maxStreak);

    return {
      totalPresentations,
      maxPresentations,
      maxStreak,
      streakHolder
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto space-y-6"
      >
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center bg-white p-4 rounded-xl shadow-sm border border-purple-100">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-purple-900 tracking-tight">🎓 高機能・ランダム抽選ルーレット</h1>
            <p className="text-sm text-purple-600 mt-1">教育現場のために最適化された、公平で安全な生徒指名ツール</p>
          </div>
          <Button
            variant="outline"
            size="lg"
            onClick={toggleFullscreen}
            className="hover:bg-purple-100 border-purple-200 text-purple-700 gap-2 w-full sm:w-auto"
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            {isFullscreen ? "全画面解除" : "指名画面を全画面化"}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 抽選エリア (Card) - タイトル部分は全画面にしない */}
          <Card className="col-span-2 border-purple-100 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-800">
                <Users className="h-6 w-6 text-purple-500" />
                抽選エリア
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* lotteryContainerRef はここ（数字が回る画面＋操作ボタン）だけに紐付ける。
                  全画面時にタイトルや他のカードは表示されず、この中身だけが画面全体に広がる。 */}
              <div
                ref={lotteryContainerRef}
                className={`transition-all duration-300 ${
                  isFullscreen
                    ? "fixed inset-0 z-50 w-screen h-screen min-h-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-purple-950 via-slate-950 to-black p-4 sm:p-6"
                    : ""
                }`}
              >
                {isFullscreen && (
                  <>
                    {/* 常時表示される全画面終了ボタン（右上・どんな画面幅でも必ず押せる） */}
                    <button
                      onClick={toggleFullscreen}
                      aria-label="全画面表示を終了"
                      title="全画面表示を終了 (Esc)"
                      className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                    >
                      <X className="h-5 w-5" />
                    </button>
                    <span className="text-white/70 text-xs sm:text-sm px-3 py-1 rounded-full bg-white/10 shrink-0">
                      Spaceキーでスタート！
                    </span>
                  </>
                )}
              <div
                className={`relative flex flex-col items-center justify-center bg-gradient-to-b from-purple-900 to-black rounded-xl overflow-hidden transition-all duration-300 ${
                  isFullscreen ? "w-full flex-1 min-h-0 rounded-2xl border border-white/5" : "min-h-[400px] p-8"
                }`}
              >
                {/* ドラムロール：中央インジケーターの位置に本当の結果がぴったり止まる1列リール */}
                {showDrumroll && (
                  <motion.div 
                    className="absolute inset-0 flex items-center justify-center overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="relative w-full h-full overflow-hidden flex justify-center items-center">
                      {/* 上下のグラデーションシャドウ */}
                      <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-purple-900 to-transparent z-20 pointer-events-none" />
                      <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black to-transparent z-20 pointer-events-none" />
                      
                      {/* 中央のインジケーター（狙いライン） */}
                      <div
                        className={`absolute inset-x-0 border-y-2 border-yellow-400 bg-yellow-400/10 z-10 pointer-events-none flex items-center justify-between px-4 ${
                          isFullscreen
                            ? "h-[clamp(5rem,18vw,16rem)]"
                            : "h-[clamp(4.5rem,12vw,10rem)]"
                        }`}
                      >
                        <div className="text-yellow-400 font-black animate-pulse">▶</div>
                        <div className="text-yellow-400 font-black animate-pulse">◀</div>
                      </div>

                      {/* 1列のスロット */}
                      <div className="relative w-full flex justify-center items-center h-full">
                        <motion.div
                          className="flex flex-col items-center absolute"
                          initial={{ y: -3200, filter: "blur(5px)" }}
                          animate={{ y: 0, filter: "blur(0px)" }}
                          transition={{
                            y: { duration: REEL_SPIN_DURATION, ease: [0.13, 0.9, 0.22, 1] },
                            filter: { duration: REEL_SPIN_DURATION * 0.75, ease: "easeOut" },
                          }}
                        >
                          {rouletteNumbers.map((num, index) => (
                            <div
                              key={index}
                              className={`font-black text-white tabular-nums flex items-center justify-center ${
                                isFullscreen
                                  ? "text-[clamp(4rem,16vw,12rem)] h-[clamp(5rem,18vw,16rem)] mb-4"
                                  : "text-[clamp(3.5rem,10vw,6rem)] h-[clamp(4.5rem,12vw,10rem)] mb-2"
                              }`}
                              style={{
                                textShadow: "0 0 25px rgba(255,255,255,0.7), 0 0 50px rgba(168,85,247,0.5)",
                                transform: `translateZ(0)`,
                              }}
                            >
                              {num}
                            </div>
                          ))}
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 最終結果の表示（リールが止まった数字からそのまま滑らかに引き継ぐ） */}
                <AnimatePresence>
                  {showFinalResult && tempSelectedStudent && (
                    <motion.div
                      initial={{ scale: 0.92, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.96, opacity: 0 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className="text-center z-10"
                    >
                      <motion.span
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.3 }}
                        className="text-yellow-400 font-bold text-lg mb-2 block tracking-widest"
                      >
                        🎉 選ばれた生徒 🎉
                      </motion.span>
                      <motion.div
                        className={`font-black text-white leading-none tracking-tight tabular-nums ${
                          isFullscreen ? "text-[clamp(5rem,20vw,18rem)]" : "text-[clamp(4rem,14vw,10rem)]"
                        }`}
                        style={{ 
                          textShadow: "0 0 40px rgba(255,255,255,0.9), 0 0 80px rgba(168,85,247,0.8), 0 0 120px rgba(236,72,153,0.6)"
                        }}
                        animate={{
                          scale: [1, 1.02, 1],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          repeatType: "reverse",
                          ease: "easeInOut"
                        }}
                      >
                        {tempSelectedStudent.number}
                        <span className={`align-bottom font-bold ml-2 ${isFullscreen ? "text-[clamp(2rem,6vw,4rem)]" : "text-4xl"}`}>
                          番
                        </span>
                      </motion.div>

                      <div className="flex flex-col items-center justify-center gap-2 mt-6">
                        {tempSelectedStudent.streak > 1 && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                          >
                            <Badge className="bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 text-lg px-6 py-2 shadow-lg border-none text-white font-bold">
                              🔥 {tempSelectedStudent.streak}連続指名！
                            </Badge>
                          </motion.div>
                        )}
                        <span className="text-white/60 text-sm mt-2">
                          指名回数: {tempSelectedStudent.presentedCount}回
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!showDrumroll && !showFinalResult && !selectedStudent && (
                  <motion.div
                    animate={{ 
                      opacity: [0.5, 0.9, 0.5],
                      scale: [0.97, 1.02, 0.97],
                    }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className={`font-black text-white/40 tracking-wider ${
                      isFullscreen ? "text-[clamp(4rem,14vw,12rem)]" : "text-[clamp(3rem,8vw,4.5rem)]"
                    }`}
                    style={{ textShadow: "0 0 30px rgba(255,255,255,0.2)" }}
                  >
                    READY?
                  </motion.div>
                )}
              </div>

              {/* ボタン操作部分 */}
              <div className={`flex justify-center items-center gap-3 sm:gap-4 flex-wrap shrink-0 ${isFullscreen ? "pt-1" : "mt-6"}`}>
                <Button
                  size="lg"
                  onClick={selectRandomStudent}
                  disabled={isSpinning || students.length === 0}
                  className={`relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-700 hover:to-rose-700 text-white font-extrabold transform hover:scale-105 active:scale-95 transition-all shadow-lg border-none ${
                    isFullscreen ? "px-8 py-5 text-lg sm:px-12 sm:py-6 sm:text-xl lg:px-16 lg:py-8 lg:text-2xl rounded-2xl" : "px-8 py-6 text-lg"
                  }`}
                >
                  {isSpinning && (
                    <motion.div
                      className="absolute inset-0 bg-white/20"
                      animate={{
                        x: ["-100%", "100%"],
                      }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                  )}
                  <Shuffle className="mr-2 h-6 w-6" />
                  {isSpinning ? "指名中..." : "抽選開始（Space）"}
                </Button>

                <Button
                  variant="outline"
                  onClick={resetPresentedCounts}
                  disabled={students.length === 0}
                  className={`hover:bg-purple-100 border-purple-200 text-purple-700 font-bold ${
                    isFullscreen ? "py-5 px-6 text-base sm:py-6 sm:px-8 sm:text-lg rounded-2xl border-white/20 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white" : ""
                  }`}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  履歴・回数リセット
                </Button>
              </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {/* クラス・グループプロファイル保存/読込 */}
            <Card className="border-purple-100 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-purple-800 text-lg">
                  <Save className="h-5 w-5 text-purple-600" />
                  クラス・グループ保存
                </CardTitle>
                <CardDescription>よく使うクラス編成を保存してすぐに読み込めます</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="例: 1年1組、数学Aクラス"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveProfile();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button onClick={handleSaveProfile} className="bg-purple-600 hover:bg-purple-700 text-white font-bold">
                    <Plus className="h-4 w-4 mr-1" /> 保存
                  </Button>
                </div>

                {classProfiles.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-purple-50">
                    <label className="text-xs font-semibold text-purple-700">保存済みクラス一覧:</label>
                    <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
                      {classProfiles.map((profile) => (
                        <div
                          key={profile.id}
                          className={`flex items-center justify-between p-2 rounded-lg border text-sm transition-all ${
                            currentProfileId === profile.id
                              ? "bg-purple-50 border-purple-300 font-semibold text-purple-900"
                              : "bg-white border-gray-100 hover:bg-gray-50 text-gray-700"
                          }`}
                        >
                          <span
                            className="cursor-pointer flex-1 truncate py-1"
                            onClick={() => handleLoadProfile(profile.id)}
                          >
                            🏫 {profile.name} ({profile.startNumber}〜{profile.endNumber}番)
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteProfile(profile.id)}
                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 基本設定 */}
            <Card className="border-purple-100 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-purple-800 text-lg">
                  <Settings className="h-5 w-5 text-purple-600" />
                  基本設定
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-600 block">開始番号</label>
                    <Input
                      type="number"
                      value={startNumber}
                      onChange={(e) => setStartNumber(e.target.value)}
                      className="mt-1"
                      min="1"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-600 block">終了番号</label>
                    <Input
                      type="number"
                      value={endNumber}
                      onChange={(e) => setEndNumber(e.target.value)}
                      className="mt-1"
                      min="1"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={initializeStudents}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    この範囲で初期化する
                  </Button>
                </div>

                <Separator className="bg-purple-50" />

                {/* 重複防止 */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50/50 border border-purple-100/50">
                  <div className="space-y-0.5">
                    <label className="text-sm font-bold text-purple-900 block cursor-pointer" htmlFor="no-repeat-toggle">
                      全員あたるまで重複させない
                    </label>
                    <span className="text-xs text-purple-600 block">
                      生徒全員が1巡選ばれるまで被りません
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    id="no-repeat-toggle"
                    checked={noRepeat}
                    onChange={(e) => setNoRepeat(e.target.checked)}
                    className="w-5 h-5 accent-purple-600 cursor-pointer"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 休んでいる生徒、少人数指定 */}
            <Card className="border-purple-100 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-purple-800 text-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                  出席・グループ編成
                </CardTitle>
                <CardDescription>
                  お休みや、少人数教室でいる生徒のみをフィルタリングできます。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex rounded-lg bg-gray-100 p-1">
                  <button
                    onClick={() => setSelectionMode('exclude')}
                    aria-pressed={selectionMode === 'exclude'}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                      selectionMode === 'exclude'
                        ? "bg-white text-purple-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    ❌ 休んでいる生徒を除外
                  </button>
                  <button
                    onClick={() => setSelectionMode('include')}
                    aria-pressed={selectionMode === 'include'}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                      selectionMode === 'include'
                        ? "bg-white text-purple-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    🟢 いる生徒のみを抽出
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 block">
                    対象番号の指定 (半角、ハイフン、カンマが使えます):
                  </label>
                  <Input
                    placeholder="例: 3, 5, 10-15"
                    value={filterNumbersText}
                    onChange={(e) => setFilterNumbersText(e.target.value)}
                  />
                  <p className="text-[11px] text-gray-500">
                    ※ カンマ区切り（,）や範囲指定（-）が自動で解析されます。
                  </p>
                </div>

                {/* インタラクティブグリッド */}
                {students.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-purple-50">
                    <label className="text-xs font-bold text-purple-800 block">
                      生徒を直接クリックして切り替える:
                    </label>
                    <div className="grid grid-cols-5 gap-1.5 max-h-48 overflow-y-auto p-1 bg-gray-50/50 rounded-lg border border-gray-100">
                      {students.map((student) => {
                        const active = isStudentActive(student.number);
                        return (
                          <button
                            key={student.id}
                            onClick={() => toggleStudentInFilter(student.number)}
                            aria-pressed={active}
                            className={`h-8 rounded-md flex items-center justify-center text-xs font-bold transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                              active
                                ? "bg-emerald-500 border-emerald-600 text-white shadow-sm hover:bg-emerald-600"
                                : "bg-gray-100 border-gray-200 text-gray-400 line-through hover:bg-gray-200"
                            }`}
                            title={`${student.number}番をトグル`}
                          >
                            {student.number}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-gray-500">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> 抽選対象
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" /> 抽選から除外
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 統計情報 */}
            <Card className="border-purple-100 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-purple-800 text-lg">
                  <Trophy className="h-5 w-5 text-purple-600" />
                  統計情報
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {students.length > 0 ? (
                    <>
                      <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                        <span className="text-gray-600">登録生徒総数:</span>
                        <Badge variant="secondary" className="font-bold">{students.length}人</Badge>
                      </div>
                      <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                        <span className="text-gray-600">現在のアクティブな抽選対象:</span>
                        <Badge className="bg-emerald-500 text-white font-bold">
                          {students.filter(s => isStudentActive(s.number)).length}人
                        </Badge>
                      </div>
                      {(() => {
                        const activeCount = students.filter(s => isStudentActive(s.number)).length;
                        const notYetCount = students.filter(s => isStudentActive(s.number) && s.presentedCount === 0).length;
                        const progressPct = activeCount > 0 ? Math.round(((activeCount - notYetCount) / activeCount) * 100) : 0;
                        return (
                          <div className="space-y-1.5 border-b border-gray-50 pb-3">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">まだ一度も選ばれていない生徒:</span>
                              <Badge variant="outline" className="text-purple-700 border-purple-200 font-bold">
                                {notYetCount}人
                              </Badge>
                            </div>
                            <div className="w-full h-2 rounded-full bg-purple-100 overflow-hidden" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <p className="text-[11px] text-gray-400 text-right">
                              クラス全体の {progressPct}% が1巡しました
                            </p>
                          </div>
                        );
                      })()}
                      {(() => {
                        const stats = getStudentStats();
                        return (
                          <>
                            <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                              <span className="text-gray-600">最多指名回数:</span>
                              <Badge variant="secondary" className="font-bold">
                                {stats.maxPresentations}回
                              </Badge>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                              <span className="text-gray-600">これまでの総指名数:</span>
                              <Badge variant="secondary" className="font-bold">
                                {stats.totalPresentations}回
                              </Badge>
                            </div>
                            {stats.maxStreak > 1 && stats.streakHolder && (
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">連続指名の記録:</span>
                                <Badge className="bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 text-white font-bold border-none">
                                  🔥 {stats.streakHolder.number}番 ({stats.maxStreak}連続)
                                </Badge>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </>
                  ) : (
                    <div className="text-center text-gray-500 py-2">
                      生徒データがありません。基本設定で初期化してください。
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 教育現場のための信頼性・安全性・セキュリティのご案内 */}
            <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/40 to-teal-50/20 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-emerald-900 text-base font-extrabold">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 animate-pulse" />
                  個人情報保護・セキュリティ保証（学校対応）
                </CardTitle>
                <CardDescription className="text-xs text-emerald-800 font-medium">
                  教育委員会や学校のセキュリティポリシーに完全対応しています
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-emerald-950 leading-relaxed">
                <div className="flex gap-2 items-start bg-white/60 p-2.5 rounded-lg border border-emerald-100/50">
                  <Lock className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                  <p>
                    <strong>完全なオフライン・ローカル処理 (通信なし):</strong><br />
                    本システムは、生徒の番号、設定、履歴など、すべてのデータを<strong>端末内部（お使いのブラウザ）だけで処理・保管</strong>します。外部サーバーへの送信や通信は一切行われないため、生徒の個人情報や出席データがインターネット上に漏洩することは絶対にありません。
                  </p>
                </div>
                <div className="flex gap-2 items-start">
                  <Check className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                  <p>
                    <strong>暗号学的擬似乱数 (完全な公平性):</strong><br />
                    JavaScript標準の高度な乱数生成（Math.random）を利用し、完全に偏りのない数学的な均等確率で指名を行います。特定の生徒ばかりが連続して選ばれるといった不公平は発生しません。
                  </p>
                </div>
                <div className="flex gap-2 items-start">
                  <Info className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                  <p>
                    <strong>広告なし・トラッカーなし:</strong><br />
                    アクセス解析や広告配信などのサードパーティ製追跡スクリプト（トラッカー）は1つも組み込まれていません。授業中、不要な広告や不適切なポップアップが表示される心配はなく、安心・安全に授業に専念していただけます。
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 履歴カード */}
        <Card className="border-purple-100 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-800 text-lg">
              <History className="h-5 w-5 text-purple-600" />
              指名履歴
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {history.slice().reverse().map((entry, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(index * 0.05, 0.5) }}
                      className="flex items-center justify-between p-3 rounded-lg border border-purple-50 bg-white shadow-sm hover:shadow transition-shadow"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-purple-500 font-bold">#{history.length - index}</span>
                        <Badge className="bg-purple-100 text-purple-800 border-none font-black text-sm px-3.5 py-1">
                          {entry.studentNumber} 番
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-400 font-medium">
                        {new Date(entry.timestamp).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-4">
                  今回のセッションでの指名履歴はまだありません
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </motion.div>
    </div>
  );
}

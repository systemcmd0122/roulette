"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Users, 
  UserPlus, 
  Shuffle, 
  Trash2, 
  RotateCcw, 
  History,
  Star,
  Hash,
  Trophy,
  Settings,
  Crown,
  Heart,
  Maximize,
  Minimize,
  Check
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

export default function StudentPicker() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [history, setHistory] = useState<SelectionHistory[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [startNumber, setStartNumber] = useState('1');
  const [endNumber, setEndNumber] = useState('40');
  const [showSetup, setShowSetup] = useState(false);
  const [spinSpeed, setSpinSpeed] = useState(50);
  const [showStats, setShowStats] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [spinDuration, setSpinDuration] = useState(2);
  const [showSparkles, setShowSparkles] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [tempSelectedStudent, setTempSelectedStudent] = useState<Student | null>(null);
  const [rouletteNumbers, setRouletteNumbers] = useState<number[]>([]);
  const [showDrumroll, setShowDrumroll] = useState(false);
  const [showFinalResult, setShowFinalResult] = useState(false);
  const { toast } = useToast();

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

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

  // シャッフルアニメーション用の数字配列を生成
  const generateRouletteNumbers = () => {
    const numbers = students.map(s => s.number);
    const shuffled = [];
    for (let i = 0; i < 20; i++) {
      shuffled.push(...numbers.sort(() => Math.random() - 0.5));
    }
    return shuffled;
  };

  const selectRandomStudent = () => {
    if (students.length === 0) return;

    setIsSpinning(true);
    setShowSparkles(true);
    setShowDrumroll(true);
    setShowFinalResult(false);
    
    // スロット効果用の数字配列を生成（より多くの数字を生成）
    const allNumbers = [];
    for (let i = 0; i < 50; i++) {
      allNumbers.push(Math.floor(Math.random() * (parseInt(endNumber) - parseInt(startNumber) + 1)) + parseInt(startNumber));
    }
    setRouletteNumbers(allNumbers);

    // 最終的に選ばれる学生を先に決定
    const finalStudent = students[Math.floor(Math.random() * students.length)];
    
    // スロットアニメーションの時間を1.5秒に短縮
    setTimeout(() => {
      setShowDrumroll(false);
      setShowFinalResult(true);
      setTempSelectedStudent(finalStudent);
      
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
      setHistory([...history, { studentNumber: finalStudent.number, timestamp: new Date() }]);
      setIsSpinning(false);
      setShowSparkles(false);
      
      // 演出とポップアップのタイミングを調整
      triggerConfetti();
      setShowResultDialog(true); // 即座に表示
    }, 1500); // 1.5秒に短縮
  };

  const handleConfirmResult = () => {
    setSelectedStudent(tempSelectedStudent);
    setShowResultDialog(false);
  };

  // Load data from localStorage on mount
  useEffect(() => {
    const savedStudents = localStorage.getItem('students');
    const savedHistory = localStorage.getItem('selectionHistory');
    const savedStartNumber = localStorage.getItem('startNumber');
    const savedEndNumber = localStorage.getItem('endNumber');
    
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
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('students', JSON.stringify(students));
    localStorage.setItem('selectionHistory', JSON.stringify(history));
    localStorage.setItem('startNumber', startNumber);
    localStorage.setItem('endNumber', endNumber);
  }, [students, history, startNumber, endNumber]);

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
    setShowSetup(false);
    toast({
      title: "初期化完了",
      description: `${start}番から${end}番までの学生を登録しました`,
    });
  };

  const resetPresentedCounts = () => {
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
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold text-purple-900">ランダム抽選ルーレット</h1>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
            className="hover:bg-purple-100"
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-6 w-6 text-purple-500" />
                抽選エリア
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative flex flex-col items-center justify-center min-h-[400px] bg-gradient-to-b from-purple-900 to-black rounded-xl p-8">
                {/* ドラムロールエフェクト改善 */}
                {showDrumroll && (
                  <motion.div 
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="relative w-full h-48 overflow-hidden flex justify-center items-center">
                      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-purple-900 to-transparent z-10" />
                      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent z-10" />
                      
                      {/* 3列のスロット */}
                      <div className="flex gap-4">
                        {[0, 1, 2].map((col) => (
                          <motion.div
                            key={col}
                            className="flex flex-col items-center"
                            initial={{ y: 0 }}
                            animate={{ 
                              y: [-2000, 0],
                            }}
                            transition={{ 
                              duration: 1.5,
                              ease: [0.45, 0.05, 0.55, 0.95],
                              times: [0, 1],
                            }}
                          >
                            {rouletteNumbers.map((num, index) => (
                              <div
                                key={`${col}-${index}`}
                                className="text-8xl font-bold text-white mb-8 tabular-nums"
                                style={{
                                  textShadow: "0 0 20px rgba(255,255,255,0.5)",
                                  transform: `translateZ(0)`,
                                }}
                              >
                                {Math.floor(Math.random() * (parseInt(endNumber) - parseInt(startNumber) + 1)) + parseInt(startNumber)}
                              </div>
                            ))}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 最終結果の表示 */}
                <AnimatePresence>
                  {showFinalResult && tempSelectedStudent && (
                    <motion.div
                      initial={{ scale: 2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ type: "spring", damping: 15, duration: 0.5 }}
                      className="text-center"
                    >
                      <motion.div
                        className="text-9xl font-bold text-white mb-4 tabular-nums"
                        style={{ 
                          textShadow: "0 0 30px rgba(255,255,255,0.8), 0 0 60px rgba(147,51,234,0.6)" 
                        }}
                        animate={{
                          scale: [1, 1.1, 1],
                          textShadow: [
                            "0 0 30px rgba(255,255,255,0.8), 0 0 60px rgba(147,51,234,0.6)",
                            "0 0 50px rgba(255,255,255,0.9), 0 0 80px rgba(147,51,234,0.8)",
                            "0 0 30px rgba(255,255,255,0.8), 0 0 60px rgba(147,51,234,0.6)"
                          ]
                        }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          repeatType: "reverse"
                        }}
                      >
                        {tempSelectedStudent.number}
                      </motion.div>
                      {tempSelectedStudent.streak > 1 && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 }}
                        >
                          <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-lg px-4 py-2">
                            {tempSelectedStudent.streak}連続
                          </Badge>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {!showDrumroll && !showFinalResult && !selectedStudent && (
                  <motion.div
                    animate={{ 
                      opacity: [0.5, 1, 0.5],
                      scale: [0.95, 1.05, 0.95],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                    className="text-8xl font-bold text-white/50"
                    style={{ textShadow: "0 0 20px rgba(255,255,255,0.3)" }}
                  >
                    ? ? ?
                  </motion.div>
                )}
              </div>

              <div className="flex justify-center gap-4 mt-6">
                <Button
                  size="lg"
                  onClick={selectRandomStudent}
                  disabled={isSpinning || students.length === 0}
                  className="relative overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-6 text-lg transform hover:scale-105 transition-transform"
                >
                  {isSpinning && (
                    <motion.div
                      className="absolute inset-0 bg-white/20"
                      animate={{
                        x: ["0%", "100%"],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                  )}
                  <Shuffle className="mr-2 h-6 w-6" />
                  {isSpinning ? "選択中..." : "抽選開始"}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetPresentedCounts}
                  disabled={!selectedStudent}
                  className="hover:bg-purple-100"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  リセット
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-purple-500" />
                  設定
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-sm font-medium">開始番号</label>
                      <Input
                        type="number"
                        value={startNumber}
                        onChange={(e) => setStartNumber(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-sm font-medium">終了番号</label>
                      <Input
                        type="number"
                        value={endNumber}
                        onChange={(e) => setEndNumber(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={initializeStudents}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    番号を設定
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-purple-500" />
                  統計情報
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {students.length > 0 ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">合計人数:</span>
                        <Badge variant="secondary">{students.length}人</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">未選択:</span>
                        <Badge variant="secondary">
                          {students.filter(s => s.presentedCount === 0).length}人
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">最多選択回数:</span>
                        <Badge variant="secondary">
                          {Math.max(...students.map(s => s.presentedCount))}回
                        </Badge>
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-gray-500">
                      データがありません
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-purple-500" />
              履歴
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.length > 0 ? (
                history.slice().reverse().map((entry, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-4 p-2 rounded-lg hover:bg-purple-50"
                  >
                    <Badge variant="outline">#{entry.studentNumber}</Badge>
                    <span className="text-sm text-gray-600">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </motion.div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-4">
                  履歴はありません
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 結果ダイアログの表示を即時に */}
        <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
          <DialogContent className="sm:max-w-md bg-gradient-to-b from-purple-900 to-black border-purple-500">
            <DialogHeader>
              <DialogTitle className="text-center text-2xl font-bold text-white">
                選ばれたのは...
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center py-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  damping: 12,
                  duration: 0.3
                }}
                className="relative"
              >
                <div 
                  className="text-9xl font-bold text-white mb-4"
                  style={{ 
                    textShadow: "0 0 30px rgba(255,255,255,0.8), 0 0 60px rgba(147,51,234,0.6)" 
                  }}
                >
                  {tempSelectedStudent?.number}
                </div>
                {tempSelectedStudent?.streak && tempSelectedStudent.streak > 1 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-4 -right-4"
                  >
                    <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500">
                      {tempSelectedStudent.streak}連続
                    </Badge>
                  </motion.div>
                )}
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-4 text-white/80"
              >
                選ばれた回数: {tempSelectedStudent?.presentedCount}回
              </motion.div>
            </div>
            <DialogFooter className="sm:justify-center">
              <Button
                type="button"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                onClick={handleConfirmResult}
              >
                <Check className="mr-2 h-4 w-4" />
                OK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}
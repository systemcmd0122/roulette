"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  Heart
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

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

  const selectStudent = () => {
    if (students.length === 0) {
      toast({
        title: "エラー",
        description: "学生が登録されていません",
        variant: "destructive"
      });
      return;
    }

    setIsSpinning(true);
    let count = 0;
    const maxCount = 20 + Math.floor(Math.random() * 10);
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * students.length);
      const tempSelected = students[randomIndex];
      setSelectedStudent(tempSelected);
      count++;

      if (count >= maxCount) {
        clearInterval(interval);
        setIsSpinning(false);
        const updatedStudents = students.map(student => {
          if (student.id === tempSelected.id) {
            return {
              ...student,
              presentedCount: student.presentedCount + 1,
              lastSelected: new Date(),
              streak: student.streak + 1
            };
          }
          return { ...student, streak: 0 };
        });
        setStudents(updatedStudents);
        setHistory([...history, { studentNumber: tempSelected.number, timestamp: new Date() }]);
      }
    }, spinSpeed);
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
    <div className="container mx-auto p-4 max-w-4xl">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Users className="h-6 w-6" />
            ランダム指名ルーレット
          </CardTitle>
          <CardDescription>
            公平で楽しい指名のためのツール
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={() => setShowSetup(!showSetup)}
                variant="outline"
                className="w-full"
              >
                <Settings className="mr-2 h-4 w-4" />
                設定
              </Button>
              <Button
                onClick={() => setShowHistory(!showHistory)}
                variant="outline"
                className="w-full"
              >
                <History className="mr-2 h-4 w-4" />
                履歴
              </Button>
              <Button
                onClick={() => setShowStats(!showStats)}
                variant="outline"
                className="w-full"
              >
                <Trophy className="mr-2 h-4 w-4" />
                統計
              </Button>
            </div>

            {showSetup && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-lg">クラス設定</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-sm font-medium">開始番号</label>
                      <Input
                        type="number"
                        value={startNumber}
                        onChange={(e) => setStartNumber(e.target.value)}
                        min="1"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-sm font-medium">終了番号</label>
                      <Input
                        type="number"
                        value={endNumber}
                        onChange={(e) => setEndNumber(e.target.value)}
                        min="1"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={initializeStudents} className="flex-1">
                      <UserPlus className="mr-2 h-4 w-4" />
                      学生を登録
                    </Button>
                    <Button onClick={resetPresentedCounts} variant="destructive" className="flex-1">
                      <Trash2 className="mr-2 h-4 w-4" />
                      記録をリセット
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {showHistory && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-lg">指名履歴</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {history.slice().reverse().map((entry, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span>{entry.studentNumber}番</span>
                        <span className="text-gray-500">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {showStats && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-lg">統計情報</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {students.length > 0 && (
                      <>
                        <div className="flex justify-between items-center">
                          <span>総指名回数:</span>
                          <Badge variant="secondary">{getStudentStats().totalPresentations}回</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>最多指名回数:</span>
                          <Badge variant="secondary">{getStudentStats().maxPresentations}回</Badge>
                        </div>
                        {(() => {
                          const stats = getStudentStats();
                          return stats.streakHolder && (
                            <div className="flex justify-between items-center">
                              <span>現在の最長連続指名:</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">
                                  {stats.streakHolder.number}番
                                </Badge>
                                <Badge variant="secondary">
                                  {stats.maxStreak}回連続
                                </Badge>
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="text-center p-8 bg-slate-50 rounded-lg">
              {selectedStudent ? (
                <div className="space-y-2">
                  <div className="text-6xl font-bold text-primary animate-pulse">
                    {selectedStudent.number}
                  </div>
                  <div className="text-sm text-gray-500">
                    指名回数: {selectedStudent.presentedCount}回
                    {selectedStudent.streak > 1 && (
                      <span className="ml-2">
                        <Badge variant="secondary">
                          {selectedStudent.streak}回連続
                        </Badge>
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-4xl text-gray-400">?</div>
              )}
            </div>

            <Button
              onClick={selectStudent}
              disabled={isSpinning || students.length === 0}
              className="w-full h-16 text-lg"
            >
              <Shuffle className="mr-2 h-6 w-6" />
              {isSpinning ? "選択中..." : "ランダム指名"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
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
  Settings
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Student {
  id: string;
  number: number;
  presentedCount: number;
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
      const parsedHistory = JSON.parse(savedHistory);
      setHistory(parsedHistory.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      })));
    }

    if (savedStartNumber) {
      setStartNumber(savedStartNumber);
    }

    if (savedEndNumber) {
      setEndNumber(savedEndNumber);
    }
  }, []);

  // Save data to localStorage whenever students or history changes
  useEffect(() => {
    localStorage.setItem('students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('selectionHistory', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('startNumber', startNumber);
  }, [startNumber]);

  useEffect(() => {
    localStorage.setItem('endNumber', endNumber);
  }, [endNumber]);

  const generateStudentRange = () => {
    const start = parseInt(startNumber);
    const end = parseInt(endNumber);
    
    if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
      return;
    }

    const newStudents: Student[] = [];
    for (let i = start; i <= end; i++) {
      newStudents.push({
        id: `student-${i}`,
        number: i,
        presentedCount: 0
      });
    }
    
    setStudents(newStudents);
    setSelectedStudent(null);
    setHistory([]);
    setShowSetup(false);
  };

  const addSingleStudent = (number: number) => {
    if (students.some(s => s.number === number)) {
      return;
    }

    const newStudent: Student = {
      id: `student-${number}`,
      number: number,
      presentedCount: 0
    };
    
    setStudents(prev => [...prev, newStudent].sort((a, b) => a.number - b.number));
  };

  const removeStudent = (id: string) => {
    setStudents(students.filter(s => s.id !== id));
    if (selectedStudent?.id === id) {
      setSelectedStudent(null);
    }
  };

  // 発表回数が最も少ない生徒を優先的に選択
  const selectRandomStudent = () => {
    if (students.length === 0) return;

    setIsSpinning(true);
    
    // 最小発表回数を取得
    const minPresentedCount = Math.min(...students.map(s => s.presentedCount));
    
    // 最小発表回数の生徒のみを候補にする
    const candidates = students.filter(s => s.presentedCount === minPresentedCount);
    
    // アニメーション用のタイマー
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * candidates.length);
      const selected = candidates[randomIndex];
      
      setSelectedStudent(selected);
      
      // Update presented count
      setStudents(prev => 
        prev.map(s => 
          s.id === selected.id 
            ? { ...s, presentedCount: s.presentedCount + 1 }
            : s
        )
      );
      
      // Add to history
      setHistory(prev => [{
        studentNumber: selected.number,
        timestamp: new Date()
      }, ...prev].slice(0, 20));
      
      setIsSpinning(false);
    }, 1500);
  };

  const resetAllData = () => {
    setStudents([]);
    setSelectedStudent(null);
    setHistory([]);
    localStorage.removeItem('students');
    localStorage.removeItem('selectionHistory');
  };

  const resetPresentationCounts = () => {
    setStudents(prev => prev.map(s => ({ ...s, presentedCount: 0 })));
    setHistory([]);
  };

  const canGenerateRange = () => {
    const start = parseInt(startNumber);
    const end = parseInt(endNumber);
    return !isNaN(start) && !isNaN(end) && start >= 1 && end >= start && (end - start + 1) <= 100;
  };

  // 発表回数の統計
  const getStatistics = () => {
    if (students.length === 0) return null;
    
    const counts = students.map(s => s.presentedCount);
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    const total = counts.reduce((sum, count) => sum + count, 0);
    const average = (total / students.length).toFixed(1);
    
    return { min, max, average, total };
  };

  const stats = getStatistics();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-3">
            <Trophy className="text-yellow-500" size={40} />
            出席番号ルーレット
          </h1>
          <p className="text-gray-600 text-lg">公平な発表者選択システム</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Setup and Management */}
          <div className="lg:col-span-1 space-y-6">
            {/* Range Setup */}
            <Card className="shadow-lg">
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => setShowSetup(!showSetup)}
              >
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings size={20} />
                    出席番号設定
                  </div>
                  <Button variant="ghost" size="sm">
                    {showSetup ? '閉じる' : '設定'}
                  </Button>
                </CardTitle>
              </CardHeader>
              {showSetup && (
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-sm font-medium text-gray-700">開始番号</label>
                        <Input
                          type="number"
                          value={startNumber}
                          onChange={(e) => setStartNumber(e.target.value)}
                          min="1"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">終了番号</label>
                        <Input
                          type="number"
                          value={endNumber}
                          onChange={(e) => setEndNumber(e.target.value)}
                          min="1"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={generateStudentRange}
                      disabled={!canGenerateRange()}
                      className="w-full"
                    >
                      {startNumber}番〜{endNumber}番を生成
                    </Button>
                    {!canGenerateRange() && (
                      <p className="text-sm text-red-600">
                        有効な範囲を入力してください（最大100人まで）
                      </p>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Student List */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users size={20} />
                  登録済み出席番号 ({students.length}名)
                </CardTitle>
                {students.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetPresentationCounts}
                    >
                      <RotateCcw size={14} className="mr-1" />
                      回数リセット
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {students.length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      出席番号を設定してください
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="max-h-80 overflow-y-auto space-y-2">
                    {students.map((student) => (
                      <div
                        key={student.id}
                        className={`flex justify-between items-center p-3 rounded-lg border transition-all ${
                          selectedStudent?.id === student.id
                            ? 'bg-green-50 border-green-300'
                            : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={selectedStudent?.id === student.id ? "default" : "outline"}
                            className="font-bold"
                          >
                            {student.number}番
                          </Badge>
                          {selectedStudent?.id === student.id && (
                            <Star className="text-yellow-500" size={16} />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${
                              stats && student.presentedCount === stats.min 
                                ? 'bg-green-100 text-green-700' 
                                : stats && student.presentedCount === stats.max
                                ? 'bg-red-100 text-red-700'
                                : ''
                            }`}
                          >
                            {student.presentedCount}回
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeStudent(student.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Statistics */}
            {stats && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">発表回数統計</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">最少回数:</span>
                      <span className="ml-2 font-bold text-green-600">{stats.min}回</span>
                    </div>
                    <div>
                      <span className="text-gray-600">最多回数:</span>
                      <span className="ml-2 font-bold text-red-600">{stats.max}回</span>
                    </div>
                    <div>
                      <span className="text-gray-600">平均回数:</span>
                      <span className="ml-2 font-bold">{stats.average}回</span>
                    </div>
                    <div>
                      <span className="text-gray-600">総発表数:</span>
                      <span className="ml-2 font-bold">{stats.total}回</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Random Selection */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Shuffle size={20} />
                  ルーレット選択
                </CardTitle>
                <CardDescription className="text-blue-100">
                  発表回数が少ない生徒を優先的に選択します
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="text-center">
                  {/* Selection Display */}
                  <div className="mb-8">
                    <div className={`w-48 h-48 mx-auto rounded-full flex items-center justify-center transition-all duration-500 ${
                      isSpinning 
                        ? 'bg-gradient-to-r from-blue-400 to-purple-400 animate-spin' 
                        : selectedStudent
                        ? 'bg-gradient-to-r from-green-400 to-emerald-400'
                        : 'bg-gradient-to-r from-gray-300 to-gray-400'
                    }`}>
                      {isSpinning ? (
                        <div className="text-white text-center">
                          <div className="text-2xl font-bold mb-2">
                            選択中...
                          </div>
                        </div>
                      ) : selectedStudent ? (
                        <div className="text-white text-center">
                          <div className="text-4xl font-bold mb-2">
                            {selectedStudent.number}番
                          </div>
                          <div className="text-sm opacity-90">
                            発表回数: {selectedStudent.presentedCount}回
                          </div>
                        </div>
                      ) : (
                        <div className="text-white text-xl font-bold">
                          準備完了
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={selectRandomStudent}
                    disabled={students.length === 0 || isSpinning}
                    size="lg"
                    className={`px-8 py-4 text-lg font-bold ${
                      isSpinning 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                    }`}
                  >
                    <Shuffle className="mr-2" size={20} />
                    {isSpinning ? '選択中...' : 'ルーレット開始'}
                  </Button>

                  {students.length === 0 && (
                    <Alert className="mt-6">
                      <AlertDescription>
                        出席番号を設定してからルーレットを開始してください
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* History Section */}
            {history.length > 0 && (
              <Card className="mt-6 shadow-lg">
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History size={20} />
                      選択履歴 ({history.length}件)
                    </div>
                    <Button variant="ghost" size="sm">
                      {showHistory ? '隠す' : '表示'}
                    </Button>
                  </CardTitle>
                </CardHeader>
                {showHistory && (
                  <CardContent>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {history.map((record, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <Badge variant="outline" className="font-bold">
                            {record.studentNumber}番
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {record.timestamp.toLocaleString('ja-JP')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        {(students.length > 0 || history.length > 0) && (
          <div className="mt-8 text-center">
            <Separator className="mb-6" />
            <Button
              variant="outline"
              onClick={resetAllData}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <Trash2 className="mr-2" size={16} />
              すべてのデータを削除
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
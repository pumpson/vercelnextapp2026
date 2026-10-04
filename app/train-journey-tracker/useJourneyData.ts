import { useState, useEffect } from 'react';
import { PassRecord, JourneyRecord, DayRecord } from './types';

const STORAGE_KEY = 'train-journey-tracker-data';

// デフォルトの新しいパスを作成する関数
export const createDefaultPass = (name: string = '秋の乗り放題パス', price: number = 7850, totalDays: number = 3): PassRecord => {
  const days: DayRecord[] = Array.from({ length: totalDays }, (_, i) => ({
    dayNumber: i + 1,
    records: [],
  }));

  return {
    id: crypto.randomUUID(),
    name,
    price,
    totalDays,
    days,
    createdAt: Date.now(),
  };
};

export function useJourneyData() {
  const [passes, setPasses] = useState<PassRecord[]>([]);
  const [currentPassId, setCurrentPassId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // 初回マウント時にローカルストレージからデータを読み込む
  useEffect(() => {
    const loadData = () => {
      try {
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) {
          const parsed = JSON.parse(storedData) as { passes: PassRecord[], currentPassId: string | null };
          setPasses(parsed.passes || []);
          setCurrentPassId(parsed.currentPassId);
        } else {
          // データがない場合は初期のパスを作成
          const initialPass = createDefaultPass();
          setPasses([initialPass]);
          setCurrentPassId(initialPass.id);
        }
      } catch (error) {
        console.error('Failed to load journey data:', error);
        // エラー時は初期状態に
        const initialPass = createDefaultPass();
        setPasses([initialPass]);
        setCurrentPassId(initialPass.id);
      } finally {
        setIsLoaded(true);
      }
    };
    loadData();
  }, []);

  // データが変更されたらローカルストレージに保存する
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ passes, currentPassId }));
    }
  }, [passes, currentPassId, isLoaded]);

  // 現在選択されているパスを取得
  const currentPass = passes.find(p => p.id === currentPassId) || passes[0];

  // 新しいパスを追加する関数
  const addPass = (name: string, price: number, totalDays: number) => {
    const newPass = createDefaultPass(name, price, totalDays);
    setPasses(prev => [...prev, newPass]);
    setCurrentPassId(newPass.id); // 新しく追加したパスを現在選択状態にする
  };

  // 既存のパスを更新する関数 (設定変更など)
  const updatePassInfo = (id: string, name: string, price: number, totalDays: number) => {
    setPasses(prev => prev.map(p => {
      if (p.id === id) {
        // 既存のdays配列を調整する（日数が増えた場合は追加、減った場合は切り捨てないで残すが、表示上で対応するなど）
        // ここではシンプルに、日数が増えた場合のみ新しい空のdayを追加する
        const updatedDays = [...p.days];
        while (updatedDays.length < totalDays) {
          updatedDays.push({ dayNumber: updatedDays.length + 1, records: [] });
        }
        return { ...p, name, price, totalDays, days: updatedDays };
      }
      return p;
    }));
  };

  // パスを削除する関数
  const deletePass = (id: string) => {
    setPasses(prev => {
      const filtered = prev.filter(p => p.id !== id);
      // 削除後の選択パスの調整
      if (currentPassId === id) {
        setCurrentPassId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

  // 現在のパスの特定の日付に記録を追加する関数
  const addRecord = (dayNumber: number, record: Omit<JourneyRecord, 'id'>) => {
    if (!currentPassId) return;

    const newRecord: JourneyRecord = {
      ...record,
      id: crypto.randomUUID()
    };

    setPasses(prev => prev.map(pass => {
      if (pass.id !== currentPassId) return pass;

      const updatedDays = pass.days.map(day => {
        if (day.dayNumber === dayNumber) {
          return { ...day, records: [...day.records, newRecord] };
        }
        return day;
      });

      return { ...pass, days: updatedDays };
    }));
  };

  // 記録を編集する関数
  const updateRecord = (dayNumber: number, recordId: string, updatedFields: Partial<JourneyRecord>) => {
     if (!currentPassId) return;

     setPasses(prev => prev.map(pass => {
      if (pass.id !== currentPassId) return pass;

      const updatedDays = pass.days.map(day => {
        if (day.dayNumber === dayNumber) {
          const updatedRecords = day.records.map(r =>
            r.id === recordId ? { ...r, ...updatedFields } : r
          );
          return { ...day, records: updatedRecords };
        }
        return day;
      });

      return { ...pass, days: updatedDays };
    }));
  }

  // 記録を削除する関数
  const deleteRecord = (dayNumber: number, recordId: string) => {
    if (!currentPassId) return;

     setPasses(prev => prev.map(pass => {
      if (pass.id !== currentPassId) return pass;

      const updatedDays = pass.days.map(day => {
        if (day.dayNumber === dayNumber) {
          const filteredRecords = day.records.filter(r => r.id !== recordId);
          return { ...day, records: filteredRecords };
        }
        return day;
      });

      return { ...pass, days: updatedDays };
    }));
  }

  return {
    passes,
    currentPass,
    currentPassId,
    setCurrentPassId,
    isLoaded,
    addPass,
    updatePassInfo,
    deletePass,
    addRecord,
    updateRecord,
    deleteRecord,
  };
}

import { writable, derived, get } from 'svelte/store';
import { supabase } from '$lib/supabase.js';

export function useAutoSave(projectId, initialData) {
  const data = writable(initialData);
  const lastSaved = writable(new Date());
  const isSaving = writable(false);
  const saveError = writable(null);
  
  let saveTimeout;
  let lastSavedData = JSON.stringify(initialData);
  
  // 변경 감지
  const hasChanges = derived(data, ($data) => {
    return JSON.stringify($data) !== lastSavedData;
  });
  
  // 저장 함수
  async function save(force = false) {
    const currentData = get(data);
    const currentDataStr = JSON.stringify(currentData);
    
    // 변경사항이 없고 강제 저장이 아니면 스킵
    if (!force && currentDataStr === lastSavedData) {
      return;
    }
    
    isSaving.set(true);
    saveError.set(null);
    
    try {
      // API 호출
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sb-access-token')}`
        },
        body: JSON.stringify({
          canvas_data: currentData.canvas,
          settings: currentData.settings,
          title: currentData.title
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Save failed');
      }
      
      lastSavedData = currentDataStr;
      lastSaved.set(new Date());
      
      // 버전 히스토리 저장 (5분마다)
      const lastSavedTime = get(lastSaved);
      const timeDiff = new Date() - lastSavedTime;
      if (timeDiff > 5 * 60 * 1000) { // 5분
        await saveVersion(currentData);
      }
      
    } catch (error) {
      saveError.set(error.message);
      console.error('Auto-save error:', error);
      
      // 오프라인 저장
      saveToLocalStorage(currentData);
    } finally {
      isSaving.set(false);
    }
  }
  
  // 버전 저장
  async function saveVersion(data) {
    try {
      await fetch(`/api/projects/${projectId}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sb-access-token')}`
        },
        body: JSON.stringify({
          canvas_data: data.canvas,
          change_description: 'Auto-saved version'
        })
      });
    } catch (error) {
      console.error('Version save error:', error);
    }
  }
  
  // 로컬 스토리지 저장 (오프라인 백업)
  function saveToLocalStorage(data) {
    const key = `project_${projectId}_draft`;
    localStorage.setItem(key, JSON.stringify({
      data,
      savedAt: new Date().toISOString()
    }));
  }
  
  // 로컬 스토리지에서 복원
  function restoreFromLocalStorage() {
    const key = `project_${projectId}_draft`;
    const stored = localStorage.getItem(key);
    
    if (stored) {
      try {
        const { data: storedData, savedAt } = JSON.parse(stored);
        const timeDiff = new Date() - new Date(savedAt);
        
        // 24시간 이내의 데이터만 복원
        if (timeDiff < 24 * 60 * 60 * 1000) {
          return storedData;
        }
      } catch (error) {
        console.error('Failed to restore from localStorage:', error);
      }
    }
    
    return null;
  }
  
  // 디바운스된 자동 저장
  function triggerAutoSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => save(), 2000); // 2초 디바운스
  }
  
  // 데이터 변경 시 자동 저장 트리거
  data.subscribe(() => {
    triggerAutoSave();
  });
  
  // 주기적 저장 (30초마다)
  const interval = setInterval(() => {
    if (get(hasChanges)) {
      save();
    }
  }, 30000);
  
  // 페이지 벗어날 때 저장
  function handleBeforeUnload(e) {
    if (get(hasChanges)) {
      save(true);
      e.preventDefault();
      e.returnValue = '';
    }
  }
  
  // visibility change 이벤트 (모바일 대응)
  function handleVisibilityChange() {
    if (document.hidden && get(hasChanges)) {
      save(true);
    }
  }
  
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }
  
  // 클린업
  function cleanup() {
    clearTimeout(saveTimeout);
    clearInterval(interval);
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }
  
  // 초기화 시 로컬 스토리지 확인
  const restoredData = restoreFromLocalStorage();
  if (restoredData && confirm('저장되지 않은 변경사항이 있습니다. 복원하시겠습니까?')) {
    data.set(restoredData);
  }
  
  return {
    data,
    lastSaved,
    isSaving,
    saveError,
    hasChanges,
    save,
    cleanup,
    updateData: (updates) => {
      data.update(d => ({ ...d, ...updates }));
    }
  };
}
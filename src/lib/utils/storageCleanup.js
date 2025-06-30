// localStorage 정리 유틸리티

export function getLocalStorageSize() {
  let totalSize = 0;
  
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      const value = localStorage.getItem(key);
      // 문자열 길이를 바이트로 근사 (UTF-16 고려)
      totalSize += key.length + value.length;
    }
  }
  
  return totalSize * 2; // UTF-16은 문자당 2바이트
}

export function getLocalStorageSizeByKey() {
  const sizes = {};
  
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      const value = localStorage.getItem(key);
      sizes[key] = (key.length + value.length) * 2;
    }
  }
  
  return sizes;
}

export function cleanupLocalStorage() {
  const report = {
    before: getLocalStorageSize(),
    removed: [],
    after: 0
  };
  
  // uploadedFiles는 IndexedDB로 마이그레이션되었으므로 삭제
  if (localStorage.getItem('uploadedFiles')) {
    localStorage.removeItem('uploadedFiles');
    report.removed.push('uploadedFiles');
  }
  
  // 오래된 materials 정리 (100개 이상인 경우)
  try {
    const materials = JSON.parse(localStorage.getItem('materials') || '[]');
    if (materials.length > 100) {
      const trimmed = materials.slice(0, 100);
      localStorage.setItem('materials', JSON.stringify(trimmed));
      report.removed.push(`materials (trimmed from ${materials.length} to 100)`);
    }
  } catch (e) {
    console.error('Error cleaning materials:', e);
  }
  
  // 오래된 questionBank 정리 (500개 이상인 경우)
  try {
    const questionBank = JSON.parse(localStorage.getItem('questionBank') || '[]');
    if (questionBank.length > 500) {
      const trimmed = questionBank.slice(0, 500);
      localStorage.setItem('questionBank', JSON.stringify(trimmed));
      report.removed.push(`questionBank (trimmed from ${questionBank.length} to 500)`);
    }
  } catch (e) {
    console.error('Error cleaning questionBank:', e);
  }
  
  report.after = getLocalStorageSize();
  report.freedBytes = report.before - report.after;
  report.freedMB = (report.freedBytes / 1024 / 1024).toFixed(2);
  
  return report;
}

// 사용량 모니터링
export function checkStorageHealth() {
  const totalSize = getLocalStorageSize();
  const maxSize = 5 * 1024 * 1024; // 5MB 가정
  const usagePercent = (totalSize / maxSize * 100).toFixed(1);
  
  const sizesByKey = getLocalStorageSizeByKey();
  const sortedKeys = Object.entries(sizesByKey)
    .sort((a, b) => b[1] - a[1])
    .map(([key, size]) => ({
      key,
      size,
      mb: (size / 1024 / 1024).toFixed(2)
    }));
  
  return {
    totalSize,
    totalMB: (totalSize / 1024 / 1024).toFixed(2),
    usagePercent,
    isHealthy: usagePercent < 80,
    topKeys: sortedKeys.slice(0, 5)
  };
}
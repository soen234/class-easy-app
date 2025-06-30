// IndexedDB를 사용한 파일 저장 유틸리티
// localStorage보다 훨씬 큰 용량 (일반적으로 디스크 용량의 50%까지)

const DB_NAME = 'ClassEasyFiles';
const DB_VERSION = 1;
const STORE_NAME = 'uploadedFiles';

let db = null;

// DB 초기화
async function initDB() {
  if (db) return db;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      
      // 기존 store가 있으면 삭제
      if (database.objectStoreNames.contains(STORE_NAME)) {
        database.deleteObjectStore(STORE_NAME);
      }
      
      // 새 store 생성
      const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      store.createIndex('uploadedAt', 'uploadedAt', { unique: false });
    };
  });
}

// 파일 저장
export async function saveFile(materialId, fileData) {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const data = {
      id: materialId,
      base64: fileData.base64,
      mimeType: fileData.mimeType,
      uploadedAt: Date.now()
    };
    
    const request = store.put(data);
    
    request.onsuccess = () => resolve(data);
    request.onerror = () => reject(request.error);
  });
}

// 파일 가져오기
export async function getFile(materialId) {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(materialId);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// 모든 파일 가져오기
export async function getAllFiles() {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// 파일 삭제
export async function deleteFile(materialId) {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(materialId);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// 오래된 파일 정리 (옵션)
export async function cleanupOldFiles(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30일
  const database = await initDB();
  const now = Date.now();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('uploadedAt');
    
    const request = index.openCursor();
    let deletedCount = 0;
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      
      if (cursor) {
        if (now - cursor.value.uploadedAt > maxAge) {
          cursor.delete();
          deletedCount++;
        }
        cursor.continue();
      } else {
        resolve(deletedCount);
      }
    };
    
    request.onerror = () => reject(request.error);
  });
}

// localStorage 마이그레이션 헬퍼
export async function migrateFromLocalStorage() {
  try {
    const savedFiles = localStorage.getItem('uploadedFiles');
    if (!savedFiles) return;
    
    const files = JSON.parse(savedFiles);
    
    for (const [id, fileData] of Object.entries(files)) {
      await saveFile(id, fileData);
    }
    
    // 마이그레이션 후 localStorage 정리
    localStorage.removeItem('uploadedFiles');
    
    console.log(`Successfully migrated ${Object.keys(files).length} files to IndexedDB`);
  } catch (error) {
    console.error('Migration failed:', error);
  }
}
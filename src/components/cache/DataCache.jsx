// מערכת Cache מרכזית לאפליקציה
// מאפשרת שמירת נתונים בזיכרון ו-localStorage עם תפוגה

const CACHE_DURATION = {
  SHORT: 5 * 60 * 1000,      // 5 דקות - נתונים שמשתנים תדיר
  MEDIUM: 15 * 60 * 1000,    // 15 דקות - נתונים רגילים
  LONG: 60 * 60 * 1000,      // שעה - נתונים יציבים
  DAILY: 24 * 60 * 60 * 1000 // יום - משימות יומיות
};

// Memory cache - מהיר יותר
const memoryCache = new Map();

// Helper לבדוק אם ה-cache עדיין תקף
const isCacheValid = (timestamp, duration) => {
  if (!timestamp) return false;
  return Date.now() - timestamp < duration;
};

// שמירה ל-localStorage עם תמיכה ב-TTL
const setLocalStorage = (key, data, ttl) => {
  try {
    const item = {
      data,
      timestamp: Date.now(),
      ttl
    };
    localStorage.setItem(`cache_${key}`, JSON.stringify(item));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
};

// קריאה מ-localStorage עם בדיקת תוקף
const getLocalStorage = (key) => {
  try {
    const item = JSON.parse(localStorage.getItem(`cache_${key}`));
    if (!item) return null;
    if (!isCacheValid(item.timestamp, item.ttl)) {
      localStorage.removeItem(`cache_${key}`);
      return null;
    }
    return item.data;
  } catch (e) {
    return null;
  }
};

// ============================================
// ממשק ה-Cache הראשי
// ============================================

export const DataCache = {
  // קבלת נתונים - קודם memory, אחרי זה localStorage
  get: (key) => {
    // נסה קודם מ-memory (הכי מהיר)
    const memItem = memoryCache.get(key);
    if (memItem && isCacheValid(memItem.timestamp, memItem.ttl)) {
      return memItem.data;
    }
    
    // נסה מ-localStorage
    const localData = getLocalStorage(key);
    if (localData) {
      // שמור גם ב-memory לגישה מהירה
      memoryCache.set(key, { 
        data: localData, 
        timestamp: Date.now(), 
        ttl: CACHE_DURATION.MEDIUM 
      });
      return localData;
    }
    
    return null;
  },
  
  // שמירת נתונים
  set: (key, data, duration = CACHE_DURATION.MEDIUM) => {
    // שמור ב-memory
    memoryCache.set(key, { data, timestamp: Date.now(), ttl: duration });
    // שמור ב-localStorage לפרסיסטנטיות
    setLocalStorage(key, data, duration);
  },
  
  // מחיקת cache ספציפי
  invalidate: (key) => {
    memoryCache.delete(key);
    localStorage.removeItem(`cache_${key}`);
  },
  
  // מחיקת כל ה-cache של משתמש/מקצוע
  invalidatePattern: (pattern) => {
    // Memory
    for (const key of memoryCache.keys()) {
      if (key.includes(pattern)) {
        memoryCache.delete(key);
      }
    }
    // LocalStorage
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith('cache_') && key.includes(pattern)) {
        localStorage.removeItem(key);
      }
    }
  },
  
  // מחיקת כל ה-cache
  clearAll: () => {
    memoryCache.clear();
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith('cache_')) {
        localStorage.removeItem(key);
      }
    }
  },
  
  // קבועי זמן
  DURATION: CACHE_DURATION
};

// ============================================
// פונקציות עזר לקריאות API עם Cache
// ============================================

// קריאה עם cache אוטומטי
export const cachedFetch = async (key, fetchFn, duration = CACHE_DURATION.MEDIUM) => {
  // בדוק cache
  const cached = DataCache.get(key);
  if (cached) {
    console.log(`📦 Cache hit: ${key}`);
    return cached;
  }
  
  // קרא מהשרת
  console.log(`🌐 Fetching: ${key}`);
  const data = await fetchFn();
  
  // שמור ב-cache
  DataCache.set(key, data, duration);
  
  return data;
};

// יצירת מפתח cache ייחודי
export const createCacheKey = (prefix, params = {}) => {
  const paramStr = Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('_');
  return paramStr ? `${prefix}_${paramStr}` : prefix;
};

// ============================================
// Triggers לעדכון Cache אחרי פעולות
// ============================================

export const triggerCacheUpdate = (type) => {
  const event = new CustomEvent('cache-update', { detail: { type } });
  window.dispatchEvent(event);
};

export const onCacheUpdate = (callback) => {
  window.addEventListener('cache-update', callback);
  return () => window.removeEventListener('cache-update', callback);
};

export default DataCache;
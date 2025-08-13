const DB_NAME = 'moodboard-db';
const STORE_NAME = 'keyval';

function withStore(type, callback) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, 1);
    open.onupgradeneeded = () => {
      open.result.createObjectStore(STORE_NAME);
    };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction(STORE_NAME, type);
      const store = tx.objectStore(STORE_NAME);
      const req = callback(store);
      req.onsuccess = () => {
        resolve(req.result);
        db.close();
      };
      req.onerror = () => {
        reject(req.error);
        db.close();
      };
    };
  });
}

export function get(key) {
  return withStore('readonly', (store) => store.get(key));
}

export function set(key, value) {
  return withStore('readwrite', (store) => store.put(value, key));
}

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
// On Cloud Run, this uses the default service account automatically
try {
  initializeApp({
    credential: applicationDefault()
  });
  console.log('Firebase Admin initialized');
} catch (error) {
  // If already initialized (e.g. during hot reload), ignore
  if (!/already exists/.test(error.message)) {
    console.error('Firebase initialization error:', error);
  }
}

const db = getFirestore();

export const saveUser = async (ctx) => {
  if (!ctx.from) return;

  const userRef = db.collection('users').doc(String(ctx.from.id));
  
  try {
    const userData = {
      id: ctx.from.id,
      first_name: ctx.from.first_name || '',
      last_name: ctx.from.last_name || '',
      username: ctx.from.username || '',
      language_code: ctx.from.language_code || '',
      last_seen: new Date(),
      is_bot: ctx.from.is_bot || false,
    };

    // Merge true allows updating existing documents without overwriting missing fields
    await userRef.set(userData, { merge: true });
    console.log(`User ${ctx.from.id} saved/updated`);
  } catch (error) {
    console.error('Error saving user to Firestore:', error);
  }
};

export const getUser = async (userId) => {
  try {
    const doc = await db.collection('users').doc(String(userId)).get();
    if (doc.exists) {
      return doc.data();
    }
    return null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

export const saveHistory = async (userId, historyItem) => {
  try {
    const docRef = db.collection('users').doc(String(userId)).collection('history').doc(historyItem.id);
    await docRef.set(historyItem);
    return true;
  } catch (error) {
    console.error('Error saving history:', error);
    return false;
  }
};

export const getHistory = async (userId) => {
  try {
    const snapshot = await db.collection('users').doc(String(userId)).collection('history').orderBy('date', 'desc').get();
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error('Error getting history:', error);
    return [];
  }
};

export const deleteHistory = async (userId, historyId) => {
  try {
    await db.collection('users').doc(String(userId)).collection('history').doc(historyId).delete();
    return true;
  } catch (error) {
    console.error('Error deleting history:', error);
    return false;
  }
};

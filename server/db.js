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

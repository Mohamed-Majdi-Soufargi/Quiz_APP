import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { auth, database } from '../config/firebase';

// Sign up new user
export const signUp = async (email, password, name, role) => {
  try {
    // Create user account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update display name
    await updateProfile(user, {
      displayName: name
    });

    // Store user data in Realtime Database
    await set(ref(database, `users/${user.uid}`), {
      name: name,
      email: email,
      role: role,
      createdAt: new Date().toISOString()
    });

    return { success: true, user };
  } catch (error) {
    console.error('Signup error:', error);
    return { success: false, error: error.message };
  }
};

// Login existing user
export const login = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
};

// Logout user
export const logout = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: error.message };
  }
};

// Get user role from database
export const getUserRole = async (uid) => {
  try {
    const { ref: dbRef, get } = await import('firebase/database');
    const snapshot = await get(dbRef(database, `users/${uid}`));
    if (snapshot.exists()) {
      return snapshot.val().role;
    }
    return null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};
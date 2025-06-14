import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

const auth = getAuth();

export function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
}

export function register(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
}

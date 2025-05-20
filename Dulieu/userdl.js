import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function fetchUser(userId) {
    const docRef = doc(db, 'Users', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    } else {
        return null;
    }
}

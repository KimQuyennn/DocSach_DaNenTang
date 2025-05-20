import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

export async function fetchStatistics() {
    const querySnapshot = await getDocs(collection(db, 'Statistics'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export async function fetchReports() {
    const querySnapshot = await getDocs(collection(db, 'Reports'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

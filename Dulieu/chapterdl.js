import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export async function fetchChaptersByBook(bookId) {
    const q = query(collection(db, 'Chapters'), where('BookId', '==', bookId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

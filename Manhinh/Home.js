import React, { useEffect, useState } from 'react';
import { FlatList, Text, View, Image, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { getDatabase, ref, onValue } from 'firebase/database';
import { app } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';

const removeHTMLTags = (text) => {
    if (!text) return "";
    return text.replace(/<[^>]*>/g, '');
};

export default function Home() {
    const [recommendedBooks, setRecommendedBooks] = useState([]);
    const [readingBooks, setReadingBooks] = useState([]); // Sách "Đang đọc" theo lịch sử
    const [suggestedBooks, setSuggestedBooks] = useState([]);
    const [completedBooks, setCompletedBooks] = useState([]); // Sách "Hoàn thành" theo trạng thái
    const [searchQuery, setSearchQuery] = useState('');
    const [userId, setUserId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [avatar, setAvatar] = useState(null);

    const navigation = useNavigation();
    const db = getDatabase(app);
    const auth = getAuth(app);

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                setUserId(null);
                setUserData(null);
                setAvatar(null);
            }
        });
        return () => unsubscribeAuth();
    }, [auth]);

    useEffect(() => {
        if (userId) {
            const userRef = ref(db, `Users/${userId}`);
            const unsubscribeDB = onValue(userRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    setUserData(data);
                    setAvatar(data.Avatar || null);
                } else {
                    setUserData(null);
                    setAvatar(null);
                }
            });
            return () => unsubscribeDB();
        }
    }, [db, userId]);

    useEffect(() => {
        const fetchBooksAndHistory = async () => {
            setIsLoading(true);

            const booksRef = ref(db, 'Books');
            const ratingsRef = ref(db, 'Ratings');
            const readingHistoryRef = ref(db, `ReadingHistory`);

            let allBooks = [];

            const unsubscribeBooks = onValue(booksRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    allBooks = Object.keys(data).map((key) => ({
                        id: key,
                        ...data[key],
                        averageRating: 0,
                    }));
                } else {
                    allBooks = [];
                }

                const approvedBooks = allBooks.filter(book => book.IsApproved === true);

                onValue(ratingsRef, (ratingsSnapshot) => {
                    const ratingsData = ratingsSnapshot.val();
                    const bookRatings = {};

                    if (ratingsData) {
                        for (const key in ratingsData) {
                            const rating = ratingsData[key];
                            if (bookRatings[rating.BookId]) {
                                bookRatings[rating.BookId].totalRating += rating.Rating;
                                bookRatings[rating.BookId].count++;
                            } else {
                                bookRatings[rating.BookId] = { totalRating: rating.Rating, count: 1 };
                            }
                        }
                    }

                    let booksWithRatings = approvedBooks.map(book => {
                        if (bookRatings[book.id]) {
                            book.averageRating = bookRatings[book.id].totalRating / bookRatings[book.id].count;
                        }
                        return book;
                    });

                    const sortedRecommended = [...booksWithRatings].sort((a, b) => b.averageRating - a.averageRating);
                    setRecommendedBooks(sortedRecommended.slice(0, 6));
                    setSuggestedBooks(booksWithRatings.slice(0, 10));

                    // --- Lấy sách đang đọc từ lịch sử đọc (chỉ lưu 1 lần theo thời gian đọc gần nhất) ---
                    if (userId) {
                        onValue(readingHistoryRef, (historySnapshot) => {
                            const historyData = historySnapshot.val();
                            const tempReadingBooks = {}; // Use an object to store unique books by ID
                            const userCompletedBooks = []; // This will now be filtered by book Status

                            if (historyData) {
                                for (const key in historyData) {
                                    const historyEntry = historyData[key];
                                    if (historyEntry.UserId === userId) {
                                        const book = booksWithRatings.find(b => b.id === historyEntry.BookId);
                                        if (book) {
                                            // Only consider books that are NOT completed in history for "Đang đọc"
                                            if (!historyEntry.IsCompleted) {
                                                const existingBook = tempReadingBooks[book.id];
                                                if (!existingBook || new Date(historyEntry.LastReadAt) > new Date(existingBook.LastReadAt)) {
                                                    // If book not exists or current entry is more recent, update it
                                                    tempReadingBooks[book.id] = {
                                                        ...book,
                                                        LastReadChapterId: historyEntry.LastReadChapterId,
                                                        LastReadAt: historyEntry.LastReadAt,
                                                    };
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            // Convert the object back to an array and sort
                            const finalReadingBooks = Object.values(tempReadingBooks).sort((a, b) => new Date(b.LastReadAt) - new Date(a.LastReadAt));
                            setReadingBooks(finalReadingBooks.slice(0, 5)); // Hiển thị 5 sách đang đọc gần nhất

                            // --- Lọc sách đã hoàn thành dựa trên trạng thái của sách (Status: "Đang cập nhật") ---
                            const booksMarkedAsCompleted = booksWithRatings.filter(book => book.Status === "Đang cập nhật");
                            setCompletedBooks(booksMarkedAsCompleted.slice(0, 15));

                            setIsLoading(false);
                        }, (error) => {
                            console.error("Error fetching reading history:", error);
                            setIsLoading(false);
                        });
                    } else {
                        setReadingBooks([]);
                        setCompletedBooks(booksWithRatings.filter(book => book.Status === "Đang cập nhật").slice(0, 15));
                        setIsLoading(false);
                    }
                }, { onlyOnce: true });
            }, (error) => {
                console.error("Error fetching books:", error);
                setIsLoading(false);
            });

            return () => {
                unsubscribeBooks();
            };
        };

        if (userId !== undefined) {
            fetchBooksAndHistory();
        }
    }, [userId, db]);

    const filteredBooks = [...recommendedBooks, ...readingBooks, ...suggestedBooks, ...completedBooks].filter(book =>
        book.Title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF69B4" />
                <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.topHeader}>
                <View style={styles.topHeaderLeft}>
                    <Text style={styles.logo}>Q</Text>
                    <TouchableOpacity style={styles.premiumButton}>
                        <Ionicons name="flash-outline" size={18} color="#6200EE" />
                        <Text style={styles.premiumText}>Thử dùng gói</Text>
                        <Text style={styles.premiumBold}>Cao cấp</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.topHeaderRight}>
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="gift-outline" size={24} color="#FFC107" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Thongtin')}>
                        {avatar ? (
                            <Image source={{ uri: avatar }} style={styles.profileAvatar} />
                        ) : (
                            <Ionicons name="person-circle-outline" size={30} color="#333" />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView>
                {/* Section 1: Recommended Stories (sách hay nhất để xuất cho bạn) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Sách hay nhất để xuất cho bạn</Text>
                    {recommendedBooks.length > 0 ? (
                        <FlatList
                            data={recommendedBooks}
                            renderItem={({ item }) => (
                                <TouchableOpacity onPress={() => navigation.navigate('Chitiet', { bookId: item.id })} style={styles.horizontalBookItem}>
                                    <Image source={{ uri: item.CoverImage }} style={styles.horizontalCoverImage} />
                                    <Text style={styles.horizontalBookAuthor} numberOfLines={1}>{item.Title}</Text>
                                </TouchableOpacity>
                            )}
                            keyExtractor={(item) => item.id}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                        />
                    ) : (
                        <Text style={styles.noBooksText}>Không có sách đề xuất.</Text>
                    )}
                </View>

                {/* Section 2: Currently Reading (sách bạn đang đọc) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Sách bạn đang đọc</Text>
                    {readingBooks.length > 0 ? (
                        <FlatList
                            data={readingBooks}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={() => {
                                        let chapterIdToNavigate = item.LastReadChapterId;
                                        navigation.navigate('DocSach', {
                                            bookId: item.id,
                                            chapterId: chapterIdToNavigate,
                                            bookTitle: item.Title
                                        });
                                    }}
                                    style={styles.readingBookItem}>
                                    <Image source={{ uri: item.CoverImage }} style={styles.readingCoverImage} />
                                    <View style={styles.readingInfo}>
                                        <Text style={styles.readingTitle} numberOfLines={1}>{item.Title}</Text>
                                        <Text style={styles.readingStatus}>Đang đọc</Text>
                                        <Text style={styles.readingChapter}>
                                            {item.LastReadChapterId ? `Đọc tiếp` : 'Chưa đọc chương nào'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                            keyExtractor={(item) => item.id}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                        />
                    ) : (
                        <Text style={styles.noReadingBooksText}>Bạn chưa đọc cuốn sách nào. Hãy tìm kiếm và bắt đầu đọc!</Text>
                    )}
                    <View style={styles.exploreContainer}>
                        <View>
                            <Text style={styles.exploreTitle}>Khám phá thêm sách...</Text>
                            <Text style={styles.exploreSubtitle}>để bổ sung vào thư viện...</Text>
                        </View>
                        <TouchableOpacity style={styles.searchBarContainer} onPress={() => navigation.navigate('TimKiem')}>
                            <Ionicons name="search-outline" size={20} color="#888" style={styles.searchIcon} />
                            <Text style={styles.searchText}>Tìm sách</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Section 3: Suggested for You */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Được đề xuất cho bạn</Text>
                    {suggestedBooks.length > 0 ? (
                        <FlatList
                            data={suggestedBooks}
                            renderItem={({ item }) => (
                                <TouchableOpacity onPress={() => navigation.navigate('Chitiet', { bookId: item.id })} style={styles.horizontalBookItem}>
                                    <Image source={{ uri: item.CoverImage }} style={styles.horizontalCoverImage} />
                                    <Text style={styles.horizontalBookAuthor} numberOfLines={1}>{item.Title}</Text>
                                </TouchableOpacity>
                            )}
                            keyExtractor={(item) => item.id}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                        />
                    ) : (
                        <Text style={styles.noBooksText}>Không có sách được đề xuất.</Text>
                    )}
                </View>

                {/* Section 4: Completed Stories (Sách đã Hoàn Thành) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Sách đã Hoàn Thành</Text>
                    {completedBooks.length > 0 ? (
                        <FlatList
                            data={completedBooks}
                            renderItem={({ item }) => (
                                <TouchableOpacity onPress={() => navigation.navigate('Chitiet', { bookId: item.id })} style={styles.completedBookItem}>
                                    <Image source={{ uri: item.CoverImage }} style={styles.completedCoverImage} />
                                    <Text style={styles.completedBookTitle} numberOfLines={2}>{item.Title}</Text>
                                    <Text style={styles.completedBookAuthor} numberOfLines={1}>{item.Author}</Text>
                                </TouchableOpacity>
                            )}
                            keyExtractor={(item) => item.id}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                        />
                    ) : (
                        <Text style={styles.noCompletedBooksText}>Chưa cuốn sách nào hoàn thành.</Text>
                    )}
                </View>

                {/* Section 5: Try Reading New Stories */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Thử đọc sách Mới</Text>
                    {suggestedBooks.length > 0 ? (
                        <FlatList
                            data={suggestedBooks.slice(0, 8)}
                            renderItem={({ item }) => (
                                <TouchableOpacity onPress={() => navigation.navigate('Chitiet', { bookId: item.id })} style={styles.squareBookItem}>
                                    <Image source={{ uri: item.CoverImage }} style={styles.squareCoverImage} />
                                    <Text style={styles.squareBookTitle} numberOfLines={2}>{item.Title}</Text>
                                    <Text style={styles.squareBookAuthor} numberOfLines={1}>{item.Author}</Text>
                                </TouchableOpacity>
                            )}
                            keyExtractor={(item) => item.id}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                        />
                    ) : (
                        <Text style={styles.noBooksText}>Không có sách mới để thử đọc.</Text>
                    )}
                </View>

                {/* Section 6: Recommended For You (Duplicate, adjust data as needed) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Được chọn cho bạn</Text>
                    {recommendedBooks.length > 0 ? (
                        <FlatList
                            data={recommendedBooks.slice(0, 8)}
                            renderItem={({ item }) => (
                                <TouchableOpacity onPress={() => navigation.navigate('Chitiet', { bookId: item.id })} style={styles.squareBookItem}>
                                    <Image source={{ uri: item.CoverImage }} style={styles.squareCoverImage} />
                                    <Text style={styles.squareBookTitle} numberOfLines={2}>{item.Title}</Text>
                                    <Text style={styles.squareBookAuthor} numberOfLines={1}>{item.Author}</Text>
                                </TouchableOpacity>
                            )}
                            keyExtractor={(item) => item.id}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                        />
                    ) : (
                        <Text style={styles.noBooksText}>Không có sách được chọn cho bạn.</Text>
                    )}
                </View>

                {/* Bottom Banner */}
                <View style={styles.bottomBanner}>
                    <Text style={styles.bottomBannerText}>Miễn phí cho người đăng ký tháng này</Text>
                </View>
            </ScrollView>

            {/* Bottom Navigation */}
            <View style={styles.bottomNavigation}>
                <TouchableOpacity style={styles.navItem}>
                    <Ionicons name="home-outline" size={24} color="#FF69B4" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('TimKiem')} style={styles.navItem} >
                    <Ionicons name="search-outline" size={24} color="#888" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('ThuVien')} style={styles.navItem} >
                    <Ionicons name="library-outline" size={24} color="#888" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('Write')} style={styles.navItem}>
                    <Ionicons name="pencil-outline" size={24} color="#888" />
                </TouchableOpacity>

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: 0,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#555',
    },
    topHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingTop: 20,
        marginBottom: 15,
        paddingTop: Platform.OS === 'ios' ? 40 : 20,
    },
    topHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    topHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logo: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FF69B4',
        marginRight: 10,
    },
    premiumButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        backgroundColor: '#f0f8ff',
        marginRight: 0,
    },
    premiumText: {
        fontSize: 14,
        color: '#6200EE',
        marginLeft: 5,
    },
    premiumBold: {
        fontSize: 14,
        color: '#6200EE',
        fontWeight: 'bold',
    },
    iconButton: {
        marginLeft: 10,
    },
    profileButton: {
        marginLeft: 10,
    },
    profileAvatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        resizeMode: 'cover',
    },
    section: {
        marginBottom: 20,
        paddingHorizontal: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    horizontalBookItem: {
        marginRight: 10,
        alignItems: 'center',
        width: 80,
    },
    horizontalCoverImage: {
        width: '100%',
        height: 120,
        borderRadius: 8,
        marginBottom: 5,
        resizeMode: 'cover',
    },
    horizontalBookAuthor: {
        fontSize: 12,
        color: '#777',
        textAlign: 'center',
    },
    readingBookItem: {
        flexDirection: 'row',
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        marginRight: 10,
        padding: 10,
        alignItems: 'center',
        width: 250,
    },
    readingCoverImage: {
        width: 60,
        height: 90,
        borderRadius: 6,
        marginRight: 10,
        resizeMode: 'cover',
    },
    readingInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    readingTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 3,
    },
    readingStatus: {
        fontSize: 14,
        color: '#555',
        marginBottom: 3,
    },
    readingChapter: {
        fontSize: 13,
        color: '#777',
    },
    noReadingBooksText: {
        textAlign: 'center',
        color: '#777',
        marginTop: 10,
        marginBottom: 20,
        fontSize: 14,
    },
    noCompletedBooksText: {
        textAlign: 'center',
        color: '#777',
        marginTop: 10,
        marginBottom: 20,
        fontSize: 14,
    },
    noBooksText: {
        textAlign: 'center',
        color: '#777',
        marginTop: 10,
        marginBottom: 20,
        fontSize: 14,
    },
    exploreContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 15,
        padding: 15,
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
    },
    exploreTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 3,
    },
    exploreSubtitle: {
        fontSize: 12,
        color: '#777',
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 15,
        height: 40,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchText: {
        fontSize: 14,
        color: '#888',
    },
    bottomBanner: {
        backgroundColor: '#e0f7fa',
        paddingVertical: 15,
        alignItems: 'center',
        marginTop: 20,
    },
    bottomBannerText: {
        fontSize: 16,
        color: '#00897b',
    },
    bottomNavigation: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        backgroundColor: '#fff',
    },
    navItem: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 50,
    },
    notificationBadge: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#f44336',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    completedBookItem: {
        marginRight: 15,
        width: 100,
    },
    completedCoverImage: {
        width: '100%',
        height: 150,
        borderRadius: 8,
        marginBottom: 5,
        resizeMode: 'cover',
    },
    completedBookTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 3,
        textAlign: 'center',
    },
    completedBookAuthor: {
        fontSize: 12,
        color: '#777',
        textAlign: 'center',
    },
    squareBookItem: {
        marginRight: 15,
        width: 100,
    },
    squareCoverImage: {
        width: '100%',
        height: 100,
        borderRadius: 8,
        marginBottom: 5,
        resizeMode: 'cover',
    },
    squareBookTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 3,
        textAlign: 'center',
    },
    squareBookAuthor: {
        fontSize: 12,
        color: '#777',
        textAlign: 'center',
    },
});
import React, { useState, useEffect, useCallback } from 'react';
import { FlatList, Text, View, Image, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { getDatabase, ref, onValue } from 'firebase/database';
import { app } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { getAuth } from 'firebase/auth';
import { SafeAreaView } from 'react-native-safe-area-context';

const Tab = createMaterialTopTabNavigator();
const { width } = Dimensions.get('window');

const ThuVien = () => {
    const [publishedBooks, setPublishedBooks] = useState([]);
    const [readingLists, setReadingLists] = useState([]); // Keep this if you plan to implement actual reading lists
    const [readingHistoryBooks, setReadingHistoryBooks] = useState([]);
    const [favoriteBooks, setFavoriteBooks] = useState([]); // New state for favorite books
    const [loading, setLoading] = useState(true);
    const [currentUserUid, setCurrentUserUid] = useState(null);

    const navigation = useNavigation();
    const db = getDatabase(app);
    const auth = getAuth(app);

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            if (user) {
                setCurrentUserUid(user.uid);
            } else {
                setCurrentUserUid(null);
                setLoading(false);
            }
        });
        return () => unsubscribeAuth();
    }, [auth]);

    useEffect(() => {
        if (!currentUserUid) {
            setPublishedBooks([]);
            setReadingLists([]);
            setReadingHistoryBooks([]);
            setFavoriteBooks([]); // Clear favorites if no user
            setLoading(false);
            return;
        }

        setLoading(true);

        const booksRef = ref(db, 'Books');
        const readingHistoryRef = ref(db, 'ReadingHistory');
        const favoritesRef = ref(db, 'Favorites'); // Reference to Favorites node

        let allBooksData = [];

        const unsubscribeBooks = onValue(booksRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                allBooksData = Object.keys(data).map(key => ({ id: key, ...data[key] }));
            } else {
                allBooksData = [];
            }

            // --- Lắng nghe lịch sử đọc ---
            const unsubscribeHistory = onValue(readingHistoryRef, (historySnapshot) => {
                const historyData = historySnapshot.val();
                const userReadingHistory = [];

                if (historyData) {
                    for (const key in historyData) {
                        const historyEntry = historyData[key];
                        if (historyEntry.UserId === currentUserUid) {
                            const book = allBooksData.find(b => b.id === historyEntry.BookId);
                            if (book) {
                                userReadingHistory.push({
                                    ...book,
                                    historyId: key,
                                    LastReadAt: historyEntry.LastReadAt,
                                    LastReadChapterId: historyEntry.LastReadChapterId,
                                    IsCompleted: historyEntry.IsCompleted
                                });
                            }
                        }
                    }
                }
                userReadingHistory.sort((a, b) => new Date(b.LastReadAt) - new Date(a.LastReadAt));
                setReadingHistoryBooks(userReadingHistory);

                // --- Lắng nghe sách đã đăng tải ---
                const userPublished = [];
                allBooksData.forEach(book => {
                    if (book.AuthorId === currentUserUid) {
                        if (book.IsApproved) {
                            userPublished.push(book);
                        }
                    }
                });
                setPublishedBooks(userPublished);

                // --- Lắng nghe danh sách yêu thích ---
                const unsubscribeFavorites = onValue(favoritesRef, (favoriteSnapshot) => {
                    const favoriteData = favoriteSnapshot.val();
                    const userFavoriteBooks = [];

                    if (favoriteData) {
                        for (const key in favoriteData) {
                            const favoriteEntry = favoriteData[key];
                            if (favoriteEntry.UserId === currentUserUid) {
                                const book = allBooksData.find(b => b.id === favoriteEntry.BookId);
                                if (book) {
                                    userFavoriteBooks.push({
                                        ...book,
                                        favoriteId: key, // Store the favorite entry ID if needed for deletion
                                        AddedAt: favoriteEntry.AddedAt,
                                    });
                                }
                            }
                        }
                    }
                    // Optional: Sort favorite books by AddedAt or Title
                    userFavoriteBooks.sort((a, b) => new Date(b.AddedAt) - new Date(a.AddedAt));
                    setFavoriteBooks(userFavoriteBooks);
                    setLoading(false); // Set loading to false after all data fetches are complete
                }, (error) => {
                    console.error("Lỗi khi tải danh sách yêu thích:", error);
                    setLoading(false);
                });

                return () => unsubscribeFavorites(); // Cleanup for favorites
            }, (error) => {
                console.error("Lỗi khi tải lịch sử đọc:", error);
                setLoading(false);
            });

            return () => unsubscribeHistory(); // Cleanup for history
        }, (error) => {
            console.error("Lỗi khi tải dữ liệu sách:", error);
            setLoading(false);
        });

        return () => unsubscribeBooks(); // Cleanup for all books
    }, [currentUserUid, db]);

    const renderBookItem = useCallback(({ item }) => (
        <TouchableOpacity
            style={styles.bookItem}
            onPress={() => navigation.navigate('Chitiet', { bookId: item.id })}
        >
            <Image
                source={{ uri: item.CoverImage || 'https://via.placeholder.com/100' }}
                style={styles.coverImage}
            />
            <View style={styles.bookInfo}>
                <Text style={styles.bookTitle} numberOfLines={2}>{item.Title}</Text>
                <Text style={styles.bookAuthor} numberOfLines={1}>{item.Author}</Text>
            </View>
        </TouchableOpacity>
    ), [navigation]);

    const PublishedScreen = () => (
        loading ? (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF69B4" />
                <Text style={styles.loadingText}>Đang tải sách đã đăng tải...</Text>
            </View>
        ) : publishedBooks.length === 0 ? (
            <View style={styles.emptyContainer}>
                <Ionicons name="book-outline" size={60} color="#ccc" style={styles.emptyIcon} />
                <Text style={styles.emptyText}>Bạn chưa đăng tải sách nào.</Text>
                <TouchableOpacity
                    style={styles.publishButton}
                    onPress={() => navigation.navigate('Write')}
                >
                    <Text style={styles.publishButtonText}>Đăng Sách Mới</Text>
                </TouchableOpacity>
            </View>
        ) : (
            <FlatList
                data={publishedBooks}
                renderItem={renderBookItem}
                keyExtractor={(item) => item.id}
                numColumns={2}
                style={styles.bookList}
                contentContainerStyle={styles.bookListContent}
            />
        )
    );

    const ReadingHistoryScreen = () => (
        loading ? (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF69B4" />
                <Text style={styles.loadingText}>Đang tải lịch sử đọc...</Text>
            </View>
        ) : readingHistoryBooks.length === 0 ? (
            <View style={styles.emptyContainer}>
                <Ionicons name="time-outline" size={60} color="#ccc" style={styles.emptyIcon} />
                <Text style={styles.emptyText}>Bạn chưa có sách nào trong lịch sử đọc.</Text>
                <TouchableOpacity
                    style={styles.publishButton}
                    onPress={() => navigation.navigate('Home')}
                >
                    <Text style={styles.publishButtonText}>Khám phá Sách</Text>
                </TouchableOpacity>
            </View>
        ) : (
            <FlatList
                data={readingHistoryBooks}
                renderItem={renderBookItem}
                keyExtractor={(item) => item.id}
                numColumns={2}
                style={styles.bookList}
                contentContainerStyle={styles.bookListContent}
            />
        )
    );

    // New Favorites Screen Component
    const FavoritesScreen = () => (
        loading ? (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF69B4" />
                <Text style={styles.loadingText}>Đang tải danh sách yêu thích...</Text>
            </View>
        ) : favoriteBooks.length === 0 ? (
            <View style={styles.emptyContainer}>
                <Ionicons name="heart-outline" size={60} color="#ccc" style={styles.emptyIcon} />
                <Text style={styles.emptyText}>Bạn chưa có sách nào trong danh sách yêu thích.</Text>
                <TouchableOpacity
                    style={styles.publishButton}
                    onPress={() => navigation.navigate('Home')}
                >
                    <Text style={styles.publishButtonText}>Khám phá Sách</Text>
                </TouchableOpacity>
            </View>
        ) : (
            <FlatList
                data={favoriteBooks}
                renderItem={renderBookItem}
                keyExtractor={(item) => item.id}
                numColumns={2}
                style={styles.bookList}
                contentContainerStyle={styles.bookListContent}
            />
        )
    );

    return (
        <SafeAreaView style={styles.container}>
            <Tab.Navigator
                screenOptions={{
                    tabBarActiveTintColor: '#FF69B4',
                    tabBarInactiveTintColor: '#888',
                    tabBarLabelStyle: { fontSize: 14, fontWeight: 'bold' },
                    tabBarStyle: { backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#eee' },
                    tabBarIndicatorStyle: { backgroundColor: '#FF69B4', height: 3, borderRadius: 1.5 },
                }}
            >
                <Tab.Screen name="Đã đăng tải" component={PublishedScreen} />
                <Tab.Screen name="Lịch sử đọc" component={ReadingHistoryScreen} />
                <Tab.Screen name="Yêu thích" component={FavoritesScreen} />
            </Tab.Navigator>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f8f8',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 0.5,
        borderBottomColor: '#eee',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
    },
    settingsButton: {
        padding: 5,
    },
    bookList: {
        flex: 1,
    },
    bookListContent: {
        paddingHorizontal: 15,
        paddingVertical: 10,
        justifyContent: 'flex-start',
    },
    bookItem: {
        width: (width / 2) - 30,
        marginHorizontal: 7.5,
        marginVertical: 10,
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 5,
        alignItems: 'flex-start',
        paddingBottom: 10,
    },
    coverImage: {
        width: '100%',
        height: 180,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        marginBottom: 8,
        resizeMode: 'cover',
    },
    bookInfo: {
        paddingHorizontal: 10,
        width: '100%',
    },
    bookTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'left',
        marginBottom: 3,
    },
    bookAuthor: {
        fontSize: 13,
        color: '#777',
        textAlign: 'left',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        color: '#555',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f8f8f8',
    },
    emptyIcon: {
        marginBottom: 20,
    },
    emptyText: {
        fontSize: 16,
        color: '#777',
        marginBottom: 25,
        textAlign: 'center',
        lineHeight: 24,
    },
    publishButton: {
        backgroundColor: '#FF69B4',
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 10,
        shadowColor: '#FF69B4',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    publishButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: 'bold',
    },
    tab: {
        width: width / 3,
    },
});

export default ThuVien;
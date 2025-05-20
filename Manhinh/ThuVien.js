import React, { useState, useEffect, useCallback } from 'react';
import { FlatList, Text, View, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { getDatabase, ref, onValue } from 'firebase/database';
import { app } from '../firebase'; // Import Firebase config
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

const Tab = createMaterialTopTabNavigator();
const { width } = Dimensions.get('window');

const ThuVien = () => {
    const [publishedBooks, setPublishedBooks] = useState([]);
    const [readingLists, setReadingLists] = useState([]); // State for reading lists
    const [archivedBooks, setArchivedBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState('98fd37ac-4149-4bb3-acd3-8dde40c9aed4'); // Giả sử ID người dùng
    const navigation = useNavigation();

    useEffect(() => {
        const db = getDatabase(app);
        const booksRef = ref(db, 'Books');

        const unsubscribe = onValue(booksRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const books = Object.keys(data).map(key => ({ id: key, ...data[key] }));

                // Lọc sách theo UserID và trạng thái
                const published = books.filter(book => book.UserId === currentUser && book.IsApproved);
                const archived = books.filter(book => book.UserId === currentUser && !book.IsApproved); // Ví dụ: IsApproved = false là archived

                setPublishedBooks(published);
                setArchivedBooks(archived);
                setReadingLists([]); // Cần logic để lấy danh sách đọc
            } else {
                setPublishedBooks([]);
                setArchivedBooks([]);
                setReadingLists([]);
            }
            setLoading(false);
        }, (error) => {
            console.error("Lỗi khi tải dữ liệu:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const renderBookItem = ({ item }) => (
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
    );

    const PublishedScreen = () => (
        loading ? (
            <View style={styles.loadingContainer}>
                <Text>Đang tải truyện đã đăng tải...</Text>
            </View>
        ) : publishedBooks.length === 0 ? (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Bạn chưa đăng tải truyện nào.</Text>
                <TouchableOpacity
                    style={styles.publishButton}
                    onPress={() => navigation.navigate('Write')}
                >
                    <Text style={styles.publishButtonText}>Đăng Truyện</Text>
                </TouchableOpacity>
            </View>
        ) : (
            <FlatList
                data={publishedBooks}
                renderItem={renderBookItem}
                keyExtractor={(item) => item.id}
                numColumns={2}
                style={styles.bookList}
                contentContainerStyle={{ paddingBottom: 20 }}
            />
        )
    );

    const ReadingListScreen = () => (
        loading ? (
            <View style={styles.loadingContainer}>
                <Text>Đang tải danh sách đọc...</Text>
            </View>
        ) : readingLists.length === 0 ? (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Bạn chưa có danh sách đọc nào.</Text>
            </View>
        ) : (
            <FlatList
                data={readingLists}
                renderItem={renderBookItem}
                keyExtractor={(item) => item.id}
                numColumns={2}
                style={styles.bookList}
                contentContainerStyle={{ paddingBottom: 20 }}
            />
        )
    );

    const ArchivedScreen = () => (
        loading ? (
            <View style={styles.loadingContainer}>
                <Text>Đang tải truyện đã lưu trữ...</Text>
            </View>
        ) : archivedBooks.length === 0 ? (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Bạn chưa có truyện nào trong kho lưu trữ.</Text>
            </View>
        ) : (
            <FlatList
                data={archivedBooks}
                renderItem={renderBookItem}
                keyExtractor={(item) => item.id}
                numColumns={2}
                style={styles.bookList}
                contentContainerStyle={{ paddingBottom: 20 }}
            />
        )
    );

    return (
        <View style={{ flex: 1 }}>

            <Tab.Navigator
                screenOptions={{
                    tabBarActiveTintColor: '#FF69B4',
                    tabBarInactiveTintColor: '#888',
                    tabBarLabelStyle: { fontSize: 14, fontWeight: 'bold' },
                    tabBarStyle: { backgroundColor: '#fff' },
                    tabBarIndicatorStyle: { backgroundColor: '#FF69B4', height: 3 },
                }}
            >
                <Tab.Screen name="Đã đăng tải" component={PublishedScreen} />
                <Tab.Screen name="Danh sách đọc" component={ReadingListScreen} />
                <Tab.Screen name="Đã lưu trữ" component={ArchivedScreen} />
            </Tab.Navigator>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingTop: 20,
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    settingsButton: {
        // Style for settings icon
    },
    bookList: {
        flex: 1,
        paddingHorizontal: 10,
    },
    bookItem: {
        flex: 1,
        margin: 8,
        padding: 10,
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        alignItems: 'center',
    },
    coverImage: {
        width: '100%',
        height: 150,
        borderRadius: 6,
        marginBottom: 10,
        resizeMode: 'cover',
    },
    bookInfo: {
        alignItems: 'center',
    },
    bookTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },
    bookAuthor: {
        fontSize: 14,
        color: '#777',
        textAlign: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#777',
        marginBottom: 20,
        textAlign: 'center',
    },
    publishButton: {
        backgroundColor: '#FF69B4',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 5,
    },
    publishButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    tab: {
        width: width / 3,
    },
});

export default ThuVien;


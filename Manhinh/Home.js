import React, { useEffect, useState } from 'react';
import { FlatList, Text, View, Image, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { getDatabase, ref, onValue } from 'firebase/database';
import { app } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const removeHTMLTags = (text) => {
    if (!text) return "";
    return text.replace(/<[^>]*>/g, '');
};

export default function Home() {
    const [recommendedBooks, setRecommendedBooks] = useState([]);
    const [readingBooks, setReadingBooks] = useState([]);
    const [suggestedBooks, setSuggestedBooks] = useState([]);
    const [completedBooks, setCompletedBooks] = useState([]); // New state for completed books
    const [searchQuery, setSearchQuery] = useState('');
    const navigation = useNavigation();

    useEffect(() => {
        const db = getDatabase(app);
        const booksRef = ref(db, 'Books');

        const unsubscribe = onValue(booksRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const loadedBooks = Object.keys(data).map((key) => ({
                    id: key,
                    ...data[key],
                }));

                // For now, let's just use a slice of the data for each section
                setRecommendedBooks(loadedBooks.slice(0, 3));
                setReadingBooks(loadedBooks.slice(1, 3));
                setSuggestedBooks(loadedBooks.slice(3, 6)); // Increased slice for suggested
                setCompletedBooks(loadedBooks.slice(6, 10)); // Example slice for completed
            } else {
                setRecommendedBooks([]);
                setReadingBooks([]);
                setSuggestedBooks([]);
                setCompletedBooks([]);
            }
        });

        return () => unsubscribe();
    }, []);

    const filteredBooks = [...recommendedBooks, ...readingBooks, ...suggestedBooks, ...completedBooks].filter(book =>
        book.Title.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                        <Ionicons name="person-circle-outline" size={30} color="#333" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView>
                {/* Section 1: Recommended Stories */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Truyện hay nhất để xuất cho bạn</Text>
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
                </View>

                {/* Section 2: Currently Reading */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Truyện bạn đang đọc</Text>
                    <FlatList
                        data={readingBooks}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.readingBookItem}>
                                <Image source={{ uri: item.CoverImage }} style={styles.readingCoverImage} />
                                <View style={styles.readingInfo}>
                                    <Text style={styles.readingStatus}>Tiếp tục</Text>
                                    <Text style={styles.readingChapter}>Chương 21</Text> {/* Replace with actual chapter info */}
                                </View>
                            </TouchableOpacity>
                        )}
                        keyExtractor={(item) => item.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                    />
                    <View style={styles.exploreContainer}>
                        <View>
                            <Text style={styles.exploreTitle}>Khám phá thêm truyện...</Text>
                            <Text style={styles.exploreSubtitle}>để bổ sung vào thư viện...</Text>
                        </View>
                        <TouchableOpacity style={styles.searchBarContainer} onPress={() => navigation.navigate('TimKiem')}>
                            <Ionicons name="search-outline" size={20} color="#888" style={styles.searchIcon} />
                            <Text style={styles.searchText}>Tìm truyện</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Section 3: Suggested for You */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Được đề xuất cho bạn</Text>
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
                </View>

                {/* Section 4: Completed Stories (Based on your image) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Truyện đã Hoàn Thành</Text>
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
                </View>

                {/* Section 5: Try Reading New Stories (Based on your image) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Thử đọc Truyện Mới</Text>
                    <FlatList
                        data={suggestedBooks.slice(0, 4)} // Using a slice of suggested for example
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
                </View>

                {/* Section 6: Recommended For You (Duplicate, adjust data as needed) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Được chọn cho bạn</Text>
                    <FlatList
                        data={recommendedBooks.slice(0, 4)} // Using a slice of recommended for example
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
                <TouchableOpacity style={styles.navItem}>
                    <Ionicons name="pencil-outline" size={24} color="#888" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem}>
                    <View style={styles.notificationBadge}>
                        <Text style={styles.badgeText}>315</Text>
                    </View>
                    <Ionicons name="notifications-outline" size={24} color="#888" />
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
    topHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingTop: 20,
        marginBottom: 15,
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
    },
    readingCoverImage: {
        width: 60,
        height: 90,
        borderRadius: 6,
        marginRight: 10,
        resizeMode: 'cover',
    },
    readingInfo: {
        justifyContent: 'center',
    },
    readingStatus: {
        fontSize: 14,
        color: '#555',
        marginBottom: 3,
    },
    readingChapter: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
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
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    // Styles for the "Truyện đã Hoàn Thành" section
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
    // Styles for the "Thử đọc Truyện Mới" and "Được chọn cho bạn" sections (square items)
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
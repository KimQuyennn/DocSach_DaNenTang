import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView, Alert, Share } from 'react-native';
import { getDatabase, ref, onValue, push, remove } from 'firebase/database';
import { app } from '../firebase';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const Chitiet = ({ route }) => {
    const { bookId } = route.params;
    const [bookData, setBookData] = useState(null);
    const [genreName, setGenreName] = useState('');
    const [chapterCount, setChapterCount] = useState(0);
    const [totalViews, setTotalViews] = useState(0);
    const [favoriteCount, setFavoriteCount] = useState(0);
    const [isFavorite, setIsFavorite] = useState(false);
    const [favoriteKey, setFavoriteKey] = useState(null);
    const [showFullDescription, setShowFullDescription] = useState(false);
    const navigation = useNavigation();
    const db = getDatabase(app);
    const isHandlingFavorite = React.useRef(false);

    const formatDescription = (html) => {
        if (!html) {
            return '';
        }
        // Loại bỏ thẻ <p> và </p>, giữ lại nội dung bên trong
        let formatted = html.replace(/<p>/g, '');
        formatted = formatted.replace(/<\/p>/g, '\n\n'); // Thay thế </p> bằng hai dòng xuống

        // Loại bỏ các thẻ HTML khác (nếu cần)
        formatted = formatted.replace(/<[^>]*>/g, '');

        // Xử lý dấu hai chấm xuống dòng và dấu phẩy
        formatted = formatted.replace(/:/g, ':\n');
        formatted = formatted.replace(/,/g, ', ');

        return formatted.trim(); // Loại bỏ khoảng trắng thừa ở đầu và cuối
    };

    useEffect(() => {
        if (!bookId) {
            console.error('bookId is undefined or null');
            return;
        }

        const bookRef = ref(db, `Books/${bookId}`);
        const genreRef = ref(db, `Genres`);
        const chaptersRef = ref(db, `Chapters`);
        const statisticsRef = ref(db, `Statistics/${bookId}`);
        const favoritesRef = ref(db, 'Favorites');

        onValue(bookRef, (snapshot) => {
            const data = snapshot.val();
            if (data && data.Description) {
                // Lưu trữ mô tả HTML gốc
                setBookData({ ...data, rawDescription: data.Description });
            } else if (data) {
                setBookData(data);
            } else {
                setBookData(null);
            }
            if (data && data.GenreId) {
                onValue(genreRef, (genreSnapshot) => {
                    const genreData = genreSnapshot.val();
                    if (genreData && genreData[data.GenreId]) {
                        setGenreName(genreData[data.GenreId].Name);
                    } else {
                        setGenreName('');
                    }
                });
            }
        });

        onValue(chaptersRef, (chapterSnapshot) => {
            let count = 0;
            const chaptersData = chapterSnapshot.val();
            if (chaptersData) {
                for (const chapterId in chaptersData) {
                    if (chaptersData[chapterId].BookId === bookId) {
                        count++;
                    }
                }
            }
            setChapterCount(count);
        });

        onValue(statisticsRef, (statisticsSnapshot) => {
            const data = statisticsSnapshot.val();
            if (data && data.TotalViews) {
                setTotalViews(data.TotalViews);
            } else {
                setTotalViews(0);
            }
        });

        onValue(favoritesRef, (snapshot) => {
            let favCount = 0;
            let userIsFavorite = false;
            let favKey = null;
            const data = snapshot.val();
            if (data) {
                for (let key in data) {
                    if (data[key].BookId === bookId) {
                        favCount++;
                        if (data[key].UserId === '98fd37ac-4149-4bb3-acd3-8dde40c9aed4') {
                            userIsFavorite = true;
                            favKey = key;
                        }
                    }
                }
            }
            setFavoriteCount(favCount);
            setIsFavorite(userIsFavorite);
            setFavoriteKey(favKey);
        });

    }, [bookId]);

    const handleStartReading = () => {
        console.log('Bắt đầu đọc:', bookData?.Title);
    };

    const handleAddToLibrary = () => {
        console.log('Thêm vào thư viện:', bookData?.Title);
    };

    const handleAddToFavorite = () => {
        if (isHandlingFavorite.current || !bookId) {
            return;
        }
        isHandlingFavorite.current = true;

        const favoritesRef = ref(db, 'Favorites');
        if (isFavorite) {
            if (favoriteKey) {
                remove(ref(db, `Favorites/${favoriteKey}`))
                    .then(() => {
                        setIsFavorite(false);
                        setFavoriteCount(prevCount => prevCount - 1);
                        setFavoriteKey(null);
                        Alert.alert('Thành công', 'Đã xóa khỏi danh sách yêu thích!');
                    })
                    .catch(error => {
                        Alert.alert('Lỗi', 'Có lỗi xảy ra: ' + error.message);
                    })
                    .finally(() => {
                        isHandlingFavorite.current = false;
                    });
            } else {
                Alert.alert('Lỗi', 'Không tìm thấy key để xóa khỏi yêu thích.');
                isHandlingFavorite.current = false;
            }
        } else {
            push(favoritesRef, {
                BookId: bookId,
                UserId: '98fd37ac-4149-4bb3-acd3-8dde40c9aed4',
                AddedAt: new Date().toISOString(),
            }).then((newRef) => {
                setIsFavorite(true);
                setFavoriteCount(prevCount => prevCount + 1);
                setFavoriteKey(newRef.key);
            })
                .catch(error => {
                    Alert.alert('Lỗi', 'Có lỗi xảy ra: ' + error.message);
                })
                .finally(() => {
                    isHandlingFavorite.current = false;
                });
        }
    };

    const handleShareBook = async () => {
        if (bookData) {
            try {
                const result = await Share.share({
                    message: `Hãy đọc cuốn sách "${bookData.Title}" của tác giả ${bookData.Author}!`,
                    url: bookData.CoverImage,
                    title: `Chia sẻ sách: ${bookData.Title}`,
                });

                if (result.action === Share.sharedAction) {
                    if (result.activityType) {
                        console.log('Đã chia sẻ qua:', result.activityType);
                    } else {
                        console.log('Đã chia sẻ thành công');
                    }
                } else if (result.action === Share.dismissedAction) {
                    console.log('Đã hủy chia sẻ');
                }
            } catch (error) {
                Alert.alert('Lỗi khi chia sẻ', error.message);
            }
        } else {
            Alert.alert('Lỗi', 'Không có thông tin sách để chia sẻ.');
        }
    };

    if (!bookData) {
        return <View style={styles.loadingContainer}><Text>Đang tải...</Text></View>;
    }

    const rawDescription = bookData.rawDescription || '';
    const formattedDescription = formatDescription(rawDescription);
    const descriptionToShow = showFullDescription ? formattedDescription : formattedDescription.substring(0, 150) + '...';
    const readMoreText = showFullDescription ? 'Thu gọn' : 'Xem thêm';

    const toggleDescription = () => {
        setShowFullDescription(!showFullDescription);
    };

    return (
        <ScrollView style={styles.container}>
            {/* Ảnh bìa */}
            <Image source={{ uri: bookData.CoverImage }} style={styles.coverImage} />

            {/* Tiêu đề và tác giả */}
            <View style={styles.titleAuthorContainer}>
                <Text style={styles.bookTitle}>{bookData.Title}</Text>
                <Text style={styles.bookAuthor}>{bookData.Author}</Text>
            </View>

            {/* Thống kê ngắn gọn */}
            <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                    <Ionicons name="eye-outline" size={16} color="#777" />
                    <Text style={styles.statText}>{totalViews ? (totalViews > 999 ? `${(totalViews / 1000).toFixed(1)}k` : totalViews) : '0'}</Text>
                </View>
                <View style={styles.statItem}>
                    <AntDesign name={isFavorite ? 'heart' : 'hearto'} size={16} color={isFavorite ? 'red' : '#777'} />
                    <Text style={styles.statText}>{favoriteCount > 0 ? (favoriteCount > 999 ? `${(favoriteCount / 1000).toFixed(1)}k` : favoriteCount) : '0'}</Text>
                </View>
                <View style={styles.statItem}>
                    <Ionicons name="list-outline" size={16} color="#777" />
                    <Text style={styles.statText}>{chapterCount}</Text>
                </View>
            </View>

            {/* Nút đọc và nút thêm */}
            <View style={styles.actionButtonsContainer}>
                <TouchableOpacity style={styles.readButton} onPress={handleStartReading}>
                    <Ionicons name="book-outline" size={20} color="#fff" style={{ marginRight: 5 }} />
                    <Text style={styles.readButtonText}>Bắt đầu đọc</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addButton} onPress={handleAddToLibrary}>
                    <AntDesign name="plus" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareButton} onPress={handleShareBook}>
                    <Ionicons name="share-social-outline" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Thẻ tag */}
            <View style={styles.tagsContainer}>
                {genreName && (
                    <View style={styles.tag}>
                        <Text style={styles.tagText}>{genreName}</Text>
                    </View>
                )}
                {bookData.IsVIP && (
                    <View style={styles.tag}>
                        <Text style={styles.tagText}>VIP</Text>
                    </View>
                )}
                {bookData.Status && (
                    <View style={styles.tag}>
                        <Text style={styles.tagText}>{bookData.Status}</Text>
                    </View>
                )}
            </View>
            {/* Nút thêm vào yêu thích */}
            <TouchableOpacity style={styles.favoriteButton} onPress={handleAddToFavorite}>
                <AntDesign
                    name={isFavorite ? 'heart' : 'hearto'}
                    size={24}
                    color={isFavorite ? 'red' : '#333'}
                />
                <Text style={styles.favoriteButtonText}>
                    {isFavorite ? 'Đã thêm vào yêu thích' : 'Thêm vào yêu thích'}
                </Text>
            </TouchableOpacity>
            {/* Mô tả */}
            {rawDescription.length > 0 && (
                <View style={styles.descriptionContainer}>
                    <Text style={styles.descriptionText}>
                        {descriptionToShow}
                    </Text>
                    {rawDescription.length > 150 && (
                        <TouchableOpacity onPress={toggleDescription}>
                            <Text style={styles.readMoreText}>{readMoreText}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}


        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    coverImage: {
        width: '60%',
        height: 300,
        resizeMode: 'cover',
        alignItems: 'center',
        marginLeft: '20%',
        marginRight: '20%',
        borderRadius: 8,
        marginBottom: 10,
    },
    titleAuthorContainer: {
        alignItems: 'center',
        padding: 15,
    },
    bookTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    bookAuthor: {
        fontSize: 16,
        color: '#777',
    },
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 15,
        marginBottom: 10,
        justifyContent: 'space-around',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statText: {
        marginLeft: 5,
        color: '#777',
        fontSize: 14,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 15,
        marginBottom: 15,
        alignItems: 'center',
    },
    readButton: {
        backgroundColor: '#000',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        alignContent: 'center',
        borderRadius: 5,
        marginRight: 10,
        marginLeft: 50,
    },
    readButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    addButton: {
        backgroundColor: '#000',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    shareButton: {
        backgroundColor: '#000',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tagsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 15,
        marginBottom: 15,
    },
    tag: {
        backgroundColor: '#e0e0e0',
        borderRadius: 15,
        paddingVertical: 5,
        paddingHorizontal: 10,
        marginRight: 5,
    },
    tagText: {
        fontSize: 12,
        color: '#555',
    },
    descriptionContainer: {
        paddingHorizontal: 15,
        marginBottom: 20,
    },
    descriptionText: {
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
    },
    readMoreText: {
        color: '#3498db',
        fontWeight: 'bold',
        marginTop: 5,
    },
    favoriteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        marginHorizontal: 20,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        marginBottom: 20,
    },
    favoriteButtonText: {
        marginLeft: 10,
        fontSize: 16,
        color: '#333',
    },
});

export default Chitiet;
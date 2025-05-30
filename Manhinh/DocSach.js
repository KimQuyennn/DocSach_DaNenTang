import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Platform,
    Modal,
    TextInput,
    FlatList,
    KeyboardAvoidingView,
    Alert,
    ActivityIndicator
} from 'react-native';
import { Ionicons, AntDesign, MaterialCommunityIcons } from '@expo/vector-icons';
import { getDatabase, ref, onValue, push, update } from 'firebase/database'; // Import update
import { app } from '../firebase';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';

const { width, height } = Dimensions.get('window');

const DocSach = ({ route }) => {
    const { bookId, chapterId: initialChapterId, bookTitle } = route.params || {};

    const navigation = useNavigation();
    const db = getDatabase(app);
    const auth = getAuth(app);

    const [chapterData, setChapterData] = useState(null);
    const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
    const [allChapters, setAllChapters] = useState([]);
    const [userId, setUserId] = useState(null);
    const [isLoadingUser, setIsLoadingUser] = useState(true);
    const [isLoadingChapters, setIsLoadingChapters] = useState(true);
    const [commentModalVisible, setCommentModalVisible] = useState(false);
    const [currentParagraphIndex, setCurrentParagraphIndex] = useState(null);
    const [commentText, setCommentText] = useState('');
    const [commentsForParagraph, setCommentsForParagraph] = useState([]);
    const [allCommentsMap, setAllCommentsMap] = useState({});
    const [paragraphs, setParagraphs] = useState([]);
    const [userNamesMap, setUserNamesMap] = useState({});
    const [userReadingHistory, setUserReadingHistory] = useState(null);
    const [isBookCompleted, setIsBookCompleted] = useState(false);
    const [hasViewBeenCounted, setHasViewBeenCounted] = useState(false);

    const [chapterListModalVisible, setChapterListModalVisible] = useState(false);

    const scrollViewRef = useRef(null);
    const chapterListFlatListRef = useRef(null);

    const lastSavedChapterIdRef = useRef(null);

    // --- EFFECT 1: Lấy userId khi component mount ---
    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                Alert.alert(
                    'Yêu cầu đăng nhập',
                    'Bạn cần đăng nhập để xem nội dung sách và bình luận. Vui lòng đăng nhập để tiếp tục.',
                    [{ text: 'Đăng nhập ngay', onPress: () => navigation.navigate('Dangnhap') }]
                );
                setUserId(null);
            }
            setIsLoadingUser(false);
        });
        return () => unsubscribeAuth();
    }, [auth, navigation]);

    // --- NEW EFFECT: Lấy lịch sử đọc của người dùng và kiểm tra trạng thái hoàn thành sách ---
    // Cái này không cần thay đổi vì nó chỉ fetch và set state
    useEffect(() => {
        if (userId && bookId) {
            const readingHistoryRef = ref(db, `ReadingHistory`);
            const unsubscribeReadingHistory = onValue(readingHistoryRef, (snapshot) => {
                const historyData = snapshot.val();
                let foundHistory = null;
                for (const key in historyData) {
                    if (historyData[key].UserId === userId && historyData[key].BookId === bookId) {
                        foundHistory = { id: key, ...historyData[key] };
                        break;
                    }
                }
                setUserReadingHistory(foundHistory);
                setIsBookCompleted(foundHistory?.IsCompleted || false);

                if (foundHistory && foundHistory.LastReadChapterId) {
                    lastSavedChapterIdRef.current = foundHistory.LastReadChapterId;
                } else {
                    lastSavedChapterIdRef.current = null;
                }

            }, (error) => {
                console.error("Error fetching reading history:", error);
            });
            return () => unsubscribeReadingHistory();
        }
    }, [userId, bookId, db]);


    // --- EFFECT 2: Lấy tất cả các chương của sách và sắp xếp ---
    useEffect(() => {
        if (!bookId) {
            setIsLoadingChapters(false);
            return;
        }

        setIsLoadingChapters(true);
        const chaptersRef = ref(db, `Chapters`);
        const unsubscribeChapters = onValue(chaptersRef, (snapshot) => {
            const data = snapshot.val();
            const bookChapters = [];
            if (data) {
                for (const key in data) {
                    if (data[key].BookId === bookId && data[key].IsApproved === true) {
                        bookChapters.push({ id: key, ...data[key] });
                    }
                }
            }

            bookChapters.sort((a, b) => a.ChapterNumber - b.ChapterNumber);
            setAllChapters(bookChapters);

            const foundIndex = bookChapters.findIndex(ch => ch.id === initialChapterId);
            if (foundIndex !== -1) {
                setCurrentChapterIndex(foundIndex);
            } else if (bookChapters.length > 0) {
                setCurrentChapterIndex(0);
            } else {
                setChapterData(null);
                setParagraphs([]);
            }
            setIsLoadingChapters(false);
        }, (error) => {
            Alert.alert("Lỗi", "Không thể tải danh sách chương.");
        });

        return () => unsubscribeChapters();
    }, [bookId, db, initialChapterId]);

    // --- EFFECT 3: Lắng nghe dữ liệu của chương hiện tại và phân tích thành đoạn ---
    useEffect(() => {
        if (allChapters.length > 0 && currentChapterIndex >= 0 && currentChapterIndex < allChapters.length) {
            const currentChapter = allChapters[currentChapterIndex];
            const chapterContentRef = ref(db, `Chapters/${currentChapter.id}`);

            const unsubscribeChapterContent = onValue(chapterContentRef, (snapshot) => {
                const data = snapshot.val();
                setChapterData({ id: currentChapter.id, ...data });

                if (data && data.Content) {
                    let cleanedContent = data.Content.replace(/<p>/g, '').replace(/<\/p>/g, '\n\n');
                    cleanedContent = cleanedContent.replace(/<[^>]*>/g, '');
                    cleanedContent = cleanedContent.replace(/&nbsp;/g, ' ');
                    const paragraphArray = cleanedContent.split(/\n\n+/).filter(p => p.trim() !== '');
                    setParagraphs(paragraphArray);
                } else {
                    setParagraphs([]);
                }
                if (scrollViewRef.current) {
                    scrollViewRef.current.scrollTo({ y: 0, animated: true });
                }
            }, (error) => {
                Alert.alert("Lỗi", "Không thể tải nội dung chương này.");
            });
            return () => unsubscribeChapterContent();
        } else {
            setChapterData(null);
            setParagraphs([]);
        }
    }, [allChapters, currentChapterIndex, db]);


    // NEW: Hàm để cập nhật lịch sử đọc, được gọi khi chuyển chương hoặc thoát màn hình
    const updateReadingHistory = useCallback(async () => {
        if (!userId || !bookId || !chapterData?.id || !allChapters.length) {
            return;
        }

        const currentChapterId = chapterData.id;
        const lastReadAt = new Date().toISOString();
        const isCurrentlyLastChapter = (currentChapterIndex === allChapters.length - 1);

        // Kiểm tra xem có cần cập nhật hay không
        // Chỉ cập nhật nếu chương hiện tại khác với chương cuối cùng đã lưu
        // HOẶC nếu người dùng đang ở chương cuối cùng và sách chưa được đánh dấu là hoàn thành
        if (lastSavedChapterIdRef.current !== currentChapterId || (isCurrentlyLastChapter && !isBookCompleted)) {
            try {
                if (userReadingHistory) {
                    // Cập nhật lịch sử đọc đã tồn tại bằng cách sử dụng ID của nó
                    await update(ref(db, `ReadingHistory/${userReadingHistory.id}`), {
                        LastReadChapterId: currentChapterId,
                        LastReadAt: lastReadAt,
                        IsCompleted: isCurrentlyLastChapter // Đánh dấu hoàn thành nếu đang ở chương cuối
                    });
                    console.log(`Updated ReadingHistory for user ${userId}, book ${bookId} to chapter ${currentChapterId}`);
                } else {
                    // Tạo mới lịch sử đọc nếu chưa tồn tại
                    // Việc này chỉ nên xảy ra lần đầu tiên người dùng đọc một cuốn sách
                    await push(ref(db, 'ReadingHistory'), {
                        UserId: userId,
                        BookId: bookId,
                        LastReadChapterId: currentChapterId,
                        LastReadAt: lastReadAt,
                        IsCompleted: isCurrentlyLastChapter
                    });
                    console.log(`Created new ReadingHistory for user ${userId}, book ${bookId} at chapter ${currentChapterId}`);
                }
                lastSavedChapterIdRef.current = currentChapterId; // Cập nhật ref sau khi lưu thành công
            } catch (error) {
                console.error("Error updating reading history:", error);
            }
        } else {
            console.log(`ReadingHistory for user ${userId}, book ${bookId} at chapter ${currentChapterId} is already up-to-date or book is completed.`);
        }
    }, [userId, bookId, chapterData?.id, db, userReadingHistory, currentChapterIndex, allChapters.length, isBookCompleted]);


    // NEW: Hàm để tăng lượt xem, chỉ gọi một lần khi vào màn hình và sách chưa được đánh dấu là hoàn thành
    const incrementTotalViews = useCallback(async () => {
        if (!bookId || !userId || !chapterData?.id || isLoadingChapters || isLoadingUser || hasViewBeenCounted) {
            return;
        }

        const statisticsRef = ref(db, `Statistics`);
        let statisticsSnapshot = await new Promise(resolve => onValue(statisticsRef, resolve, { onlyOnce: true }));
        const allStatistics = statisticsSnapshot.val();
        let bookStatisticsKey = null;
        let currentViews = 0;

        for (const key in allStatistics) {
            if (allStatistics[key].BookId === bookId) {
                bookStatisticsKey = key;
                currentViews = allStatistics[key].TotalViews || 0;
                break;
            }
        }

        // Chỉ tăng lượt xem nếu sách chưa được đánh dấu là hoàn thành bởi người dùng
        if (!isBookCompleted) {
            try {
                if (bookStatisticsKey) {
                    await update(ref(db, `Statistics/${bookStatisticsKey}`), {
                        TotalViews: currentViews + 1
                    });
                    console.log(`Increased TotalViews for book ${bookId} to ${currentViews + 1}`);
                } else {
                    await push(statisticsRef, {
                        BookId: bookId,
                        TotalViews: 1,
                        TotalSales: 0,
                        TotalComments: 0
                    });
                    console.log(`Created new Statistics entry for book ${bookId} with 1 view`);
                }
                setHasViewBeenCounted(true); // Đánh dấu rằng lượt xem đã được tính
            } catch (error) {
                console.error("Error incrementing total views:", error);
            }
        } else {
            console.log(`Not increasing TotalViews for book ${bookId}. Book is completed.`);
        }
    }, [bookId, userId, chapterData?.id, isLoadingChapters, isLoadingUser, hasViewBeenCounted, isBookCompleted, db]);


    // --- NEW EFFECT: Gọi incrementTotalViews khi component được focus lần đầu và updateReadingHistory khi chapterData thay đổi ---
    // Sử dụng useFocusEffect để đảm bảo logic chạy khi màn hình được focus, không phải chỉ khi component mount
    useFocusEffect(
        useCallback(() => {
            // Tăng lượt xem khi màn hình được focus lần đầu (hoặc sau khi thoát/vào lại)
            if (bookId && userId && chapterData?.id && !isLoadingChapters && !isLoadingUser && !hasViewBeenCounted) {
                incrementTotalViews();
            }

            // Cleanup function: Cập nhật lịch sử đọc khi người dùng thoát khỏi màn hình
            return () => {
                if (bookId && userId && chapterData?.id && !isLoadingChapters && !isLoadingUser) {
                    updateReadingHistory();
                }
            };
        }, [bookId, userId, chapterData?.id, isLoadingChapters, isLoadingUser, hasViewBeenCounted, incrementTotalViews, updateReadingHistory])
    );

    // NEW EFFECT: Cập nhật lịch sử đọc mỗi khi chương thay đổi
    useEffect(() => {
        // Chỉ gọi updateReadingHistory nếu chapterData đã sẵn sàng và đã có dữ liệu chương
        if (chapterData?.id && allChapters.length > 0) {
            updateReadingHistory();
        }
    }, [chapterData?.id, updateReadingHistory, allChapters.length]);


    // --- NEW EFFECT: Lấy tất cả thông tin người dùng từ Firebase ---
    useEffect(() => {
        const usersRef = ref(db, `Users`);
        const unsubscribeUsers = onValue(usersRef, (snapshot) => {
            const usersData = snapshot.val();
            const namesMap = {};
            if (usersData) {
                for (const uid in usersData) {
                    namesMap[uid] = {
                        Username: usersData[uid].Username || 'Người dùng',
                        showDisplayName: usersData[uid].showDisplayName !== undefined ? usersData[uid].showDisplayName : true
                    };
                }
            }
            setUserNamesMap(namesMap);
        }, (error) => {
            Alert.alert("Lỗi", "Không thể tải thông tin người dùng.");
        });

        return () => unsubscribeUsers();
    }, [db]);

    // --- EFFECT 4: Lắng nghe tất cả comment và tạo map (cải tiến) ---
    useEffect(() => {
        if (!bookId) return;

        const commentsRef = ref(db, `Comments`);
        const unsubscribeAllComments = onValue(commentsRef, (snapshot) => {
            const allCommentsData = snapshot.val();
            const newCommentsMap = {};

            if (allCommentsData) {
                for (const key in allCommentsData) {
                    const comment = allCommentsData[key];
                    if (comment.BookId === bookId) {
                        const chapterId = comment.ChapterId;
                        const paragraphMatch = comment.Paragraph.match(/Paragraph (\d+)/);
                        const paragraphIndex = paragraphMatch ? parseInt(paragraphMatch[1], 10) - 1 : null;

                        if (chapterId && paragraphIndex !== null) {
                            if (!newCommentsMap[chapterId]) {
                                newCommentsMap[chapterId] = {};
                            }
                            newCommentsMap[chapterId][paragraphIndex] = (newCommentsMap[chapterId][paragraphIndex] || 0) + 1;
                        }
                    }
                }
            }
            setAllCommentsMap(newCommentsMap);
        }, (error) => {
            Alert.alert("Lỗi", "Không thể tải dữ liệu bình luận tổng quan.");
        });

        return () => unsubscribeAllComments();
    }, [bookId, db]);

    // --- EFFECT 5: Lắng nghe comment cho đoạn hiện tại (chỉ khi modal mở) ---
    useEffect(() => {
        if (commentModalVisible && bookId && currentParagraphIndex !== null && chapterData?.id) {
            const commentsRef = ref(db, `Comments`);
            const unsubscribeCommentsForParagraph = onValue(commentsRef, (snapshot) => {
                const allComments = snapshot.val();
                const filteredComments = [];
                if (allComments) {
                    for (const key in allComments) {
                        const comment = allComments[key];
                        if (comment.BookId === bookId &&
                            comment.ChapterId === chapterData.id &&
                            comment.Paragraph === `Paragraph ${currentParagraphIndex + 1}`) {
                            filteredComments.push({ id: key, ...comment });
                        }
                    }
                }
                filteredComments.sort((a, b) => new Date(b.CommentedAt) - new Date(a.CommentedAt));
                setCommentsForParagraph(filteredComments);
            }, (error) => {
                Alert.alert("Lỗi", "Không thể tải bình luận cho đoạn này.");
            });
            return () => unsubscribeCommentsForParagraph();
        } else {
            setCommentsForParagraph([]);
        }
    }, [commentModalVisible, bookId, currentParagraphIndex, chapterData?.id, db]);


    const handleNextChapter = () => {
        if (currentChapterIndex < allChapters.length - 1) {
            setCurrentChapterIndex(prevIndex => prevIndex + 1);
        } else {
            // Khi đến chương cuối cùng, đánh dấu sách là đã hoàn thành
            if (userId && bookId && userReadingHistory) {
                // Sử dụng ID của userReadingHistory để cập nhật
                update(ref(db, `ReadingHistory/${userReadingHistory.id}`), {
                    IsCompleted: true
                }).then(() => {
                    setIsBookCompleted(true);
                    Alert.alert('Chúc mừng!', 'Bạn đã đọc hết chương cuối cùng của sách!');
                }).catch(error => {
                    console.error("Error marking book as completed:", error);
                    Alert.alert('Lỗi', 'Không thể đánh dấu sách đã hoàn thành.');
                });
            } else {
                Alert.alert('Thông báo', 'Đây là chương cuối cùng của sách.');
            }
        }
    };

    const handlePreviousChapter = () => {
        if (currentChapterIndex > 0) {
            setCurrentChapterIndex(prevIndex => prevIndex - 1);
        } else {
            Alert.alert('Thông báo', 'Đây là chương đầu tiên của sách.');
        }
    };

    const openCommentModal = (index) => {
        if (isLoadingUser) {
            Alert.alert('Đang tải', 'Đang kiểm tra trạng thái đăng nhập, vui lòng đợi...');
            return;
        }
        if (!userId) {
            Alert.alert('Yêu cầu đăng nhập', 'Bạn cần đăng nhập để bình luận.', [
                { text: 'Đăng nhập', onPress: () => navigation.navigate('Dangnhap') }
            ]);
            return;
        }
        if (!bookId || !chapterData || !chapterData.id || index === null || index === undefined) {
            Alert.alert('Lỗi', 'Không thể mở khung bình luận. Thiếu thông tin về sách hoặc chương.');
            return;
        }

        setCurrentParagraphIndex(index);
        setCommentModalVisible(true);
        setCommentText('');
    };

    const closeCommentModal = () => {
        setCommentModalVisible(false);
        setCurrentParagraphIndex(null);
        setCommentText('');
        setCommentsForParagraph([]);
    };

    const submitComment = async () => {
        if (!commentText.trim()) {
            Alert.alert('Lỗi', 'Bình luận không được để trống.');
            return;
        }
        if (!userId || !bookId || currentParagraphIndex === null || !chapterData || !chapterData.id) {
            Alert.alert('Lỗi', 'Không đủ thông tin để gửi bình luận. Vui lòng thử lại.');
            return;
        }

        try {
            await push(ref(db, 'Comments'), {
                BookId: bookId,
                ChapterId: chapterData.id,
                CommentedAt: new Date().toISOString(),
                Content: commentText.trim(),
                Paragraph: `Paragraph ${currentParagraphIndex + 1}`,
                UserId: userId,
            });
            setCommentText('');
            Alert.alert('Thành công', 'Bình luận của bạn đã được gửi.');
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể gửi bình luận: ' + error.message);
        }
    };

    const getDisplayUserName = (uid) => {
        const userInfo = userNamesMap[uid];
        if (userInfo && userInfo.showDisplayName === true) {
            return userInfo.Username || 'Người dùng';
        }
        return 'Ẩn danh';
    };

    const getCommentCount = (chapterId, paragraphIndex) => {
        return allCommentsMap[chapterId]?.[paragraphIndex] || 0;
    };

    const openChapterListModal = () => {
        setChapterListModalVisible(true);
        setTimeout(() => {
            if (chapterListFlatListRef.current && allChapters.length > 0 && currentChapterIndex >= 0) {
                chapterListFlatListRef.current.scrollToIndex({
                    animated: true,
                    index: currentChapterIndex,
                    viewPosition: 0.5
                });
            }
        }, 100);
    };

    const closeChapterListModal = () => {
        setChapterListModalVisible(false);
    };

    const handleChapterSelect = (index) => {
        setCurrentChapterIndex(index);
        closeChapterListModal();
    };

    if (isLoadingUser || isLoadingChapters || !chapterData) {
        return (
            <View style={styles.loadingContainer}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="black" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{bookTitle || 'Đang tải...'}</Text>
                    <TouchableOpacity style={styles.settingsButton}>
                        <Ionicons name="settings-outline" size={24} color="black" />
                    </TouchableOpacity>
                </View>
                <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 50 }} />
                <Text style={{ marginTop: 10 }}>Đang tải {isLoadingUser ? 'thông tin người dùng...' : (isLoadingChapters ? 'danh sách chương...' : 'nội dung chương...')}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.headerTitleContainer}
                    onPress={openChapterListModal}
                >
                    <Text style={styles.headerBookTitle} numberOfLines={1}>{bookTitle || 'Sách không tên'}</Text>
                    <Text style={styles.headerChapterTitle} numberOfLines={1}>{chapterData.Title || 'Chương không tên'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.settingsButton}>
                    <Ionicons name="settings-outline" size={24} color="black" />
                </TouchableOpacity>
            </View>

            {/* Nội dung chương (các đoạn văn bản) */}
            <ScrollView style={styles.contentContainer} ref={scrollViewRef}>
                {paragraphs.length > 0 ? (
                    paragraphs.map((paragraph, index) => {
                        const commentCount = getCommentCount(chapterData.id, index);
                        return (
                            <View key={index} style={styles.paragraphWrapper}>
                                <Text style={styles.chapterText}>{paragraph.trim()}</Text>
                                <TouchableOpacity
                                    style={styles.commentActionButton}
                                    onPress={() => openCommentModal(index)}
                                >
                                    {commentCount > 0 ? (
                                        <View style={styles.commentCountContainer}>
                                            <MaterialCommunityIcons name="comment-text-multiple-outline" size={18} color="#000" />
                                            <Text style={styles.commentCountText}>{commentCount}</Text>
                                        </View>
                                    ) : (
                                        <AntDesign name="pluscircleo" size={18} color="#000" />
                                    )}
                                </TouchableOpacity>
                            </View>
                        );
                    })
                ) : (
                    <Text style={styles.noContentText}>Chương này chưa có nội dung hoặc đang tải.</Text>
                )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity onPress={handlePreviousChapter} style={styles.navButton}>
                    <Ionicons name="chevron-back" size={24} color="black" />
                </TouchableOpacity>
                <Text style={styles.pageInfo}>Chương {currentChapterIndex + 1} / {allChapters.length}</Text>
                <TouchableOpacity onPress={handleNextChapter} style={styles.navButton}>
                    <Ionicons name="chevron-forward" size={24} color="black" />
                </TouchableOpacity>
            </View>

            {/* Comment Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={commentModalVisible}
                onRequestClose={closeCommentModal}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.commentModalContainer}>
                        <View style={styles.commentModalHeader}>
                            <Text style={styles.commentModalTitle}>
                                Bình luận cho đoạn {currentParagraphIndex !== null ? currentParagraphIndex + 1 : ''}
                            </Text>
                            <TouchableOpacity onPress={closeCommentModal} style={styles.modalCloseButton}>
                                <Ionicons name="close-circle-outline" size={26} color="#555" />
                            </TouchableOpacity>
                        </View>

                        {/* Danh sách bình luận */}
                        <FlatList
                            data={commentsForParagraph}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <View style={styles.commentItem}>
                                    <Text style={styles.commentUserName}>{getDisplayUserName(item.UserId)}</Text>
                                    <Text style={styles.commentContent}>{item.Content}</Text>
                                    <Text style={styles.commentTime}>{new Date(item.CommentedAt).toLocaleString('vi-VN')}</Text>
                                </View>
                            )}
                            ListEmptyComponent={<Text style={styles.noCommentsText}>Chưa có bình luận nào cho đoạn này.</Text>}
                            style={styles.commentsList}
                        />

                        {/* Input để thêm bình luận mới */}
                        <View style={styles.commentInputContainer}>
                            <TextInput
                                style={styles.commentTextInput}
                                placeholder="Viết bình luận của bạn..."
                                value={commentText}
                                onChangeText={setCommentText}
                                multiline
                                autoCorrect={false}
                            />
                            <TouchableOpacity style={styles.commentSubmitButton} onPress={submitComment}>
                                <Ionicons name="send" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Chapter List Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={chapterListModalVisible}
                onRequestClose={closeChapterListModal}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPressOut={closeChapterListModal}
                >
                    <View style={styles.chapterListModalContainer}>
                        <View style={styles.chapterListModalHeader}>
                            <Text style={styles.chapterListModalTitle}>Danh sách chương</Text>
                            <TouchableOpacity onPress={closeChapterListModal} style={styles.modalCloseButton}>
                                <Ionicons name="close-circle-outline" size={26} color="#555" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            ref={chapterListFlatListRef}
                            data={allChapters}
                            keyExtractor={(item) => item.id}
                            getItemLayout={(data, index) => (
                                { length: 44, offset: 44 * index, index }
                            )}
                            renderItem={({ item, index }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.chapterListItem,
                                        index === currentChapterIndex && styles.currentChapterListItem
                                    ]}
                                    onPress={() => handleChapterSelect(index)}
                                >
                                    <Text
                                        style={[
                                            styles.chapterListItemText,
                                            index === currentChapterIndex && styles.currentChapterListItemText
                                        ]}
                                    >
                                        Chương {item.ChapterNumber}: {item.Title}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text style={styles.noChaptersText}>Sách này chưa có chương nào.</Text>}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f8f8',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: Platform.OS === 'android' ? 30 : 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: '#fff',
        paddingTop: Platform.OS === 'android' ? 30 : 0,
    },
    backButton: {
        padding: 5,
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 10,
    },
    headerBookTitle: {
        fontSize: 14,
        color: '#777',
        textAlign: 'center',
    },
    headerChapterTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },
    settingsButton: {
        padding: 5,
    },
    contentContainer: {
        flex: 1,
        padding: 15,
    },
    paragraphWrapper: {
        marginBottom: 15,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    chapterText: {
        flex: 1,
        fontSize: 16,
        lineHeight: 24,
        color: '#333',
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
        marginRight: 10,
    },
    commentActionButton: {
        padding: 5,
        alignSelf: 'flex-end',
        marginBottom: -5,
        flexDirection: 'row',
        alignItems: 'center',
    },
    commentCountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e0e0e0',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginLeft: 4,
    },
    commentCountText: {
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 3,
        color: '#333',
    },
    noContentText: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
        color: '#777',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        backgroundColor: '#fff',
    },
    navButton: {
        padding: 10,
    },
    pageInfo: {
        fontSize: 14,
        color: '#777',
    },

    // Comment Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    commentModalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 15,
        maxHeight: height * 0.8,
        minHeight: height * 0.4,
    },
    commentModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    commentModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    modalCloseButton: {
        padding: 5,
    },
    commentsList: {
        flexGrow: 1,
        marginBottom: 10,
    },
    commentItem: {
        backgroundColor: '#f0f0f0',
        padding: 10,
        borderRadius: 8,
        marginBottom: 8,
    },
    commentUserName: {
        fontWeight: 'bold',
        marginBottom: 3,
        color: '#444',
    },
    commentContent: {
        fontSize: 14,
        color: '#333',
        marginBottom: 3,
    },
    commentTime: {
        fontSize: 11,
        color: '#888',
        textAlign: 'right',
    },
    noCommentsText: {
        textAlign: 'center',
        color: '#777',
        marginTop: 20,
    },
    commentInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 10,
    },
    commentTextInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 8,
        marginRight: 10,
        fontSize: 15,
        maxHeight: 100,
    },
    commentSubmitButton: {
        backgroundColor: '#000',
        borderRadius: 24,
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Chapter List Modal Styles
    chapterListModalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 15,
        maxHeight: height * 0.8,
        minHeight: height * 0.5,
        width: '100%',
        alignSelf: 'center',
    },
    chapterListModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    chapterListModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    chapterListItem: {
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    currentChapterListItem: {
        backgroundColor: '#e0e0e0',
        borderRadius: 8,
    },
    chapterListItemText: {
        fontSize: 16,
        color: '#333',
    },
    currentChapterListItemText: {
        fontWeight: 'bold',
        color: '#000',
    },
    noChaptersText: {
        textAlign: 'center',
        color: '#777',
        marginTop: 20,
        fontSize: 16,
    },
});

export default DocSach;
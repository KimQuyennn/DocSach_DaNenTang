import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, onValue } from 'firebase/database';
import { app } from '../firebase';

const Write = () => {
    const navigation = useNavigation();
    const auth = getAuth(app);
    const db = getDatabase(app);
    const [userDisplayName, setUserDisplayName] = useState('Người dùng');
    const [userAvatar, setUserAvatar] = useState(null);

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            if (user) {
                // Lấy thông tin người dùng từ Realtime Database
                const userRef = ref(db, `Users/${user.uid}`);
                const unsubscribeDB = onValue(userRef, (snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        setUserDisplayName(data.Username || 'Người dùng');
                        setUserAvatar(data.Avatar || null);
                    } else {
                        setUserDisplayName('Người dùng');
                        setUserAvatar(null);
                    }
                });
                return () => unsubscribeDB();
            } else {
                setUserDisplayName('Người dùng');
                setUserAvatar(null);
            }
        });
        return () => unsubscribeAuth();
    }, [auth, db]);

    const handleNewStory = () => {
        navigation.navigate('DangTaiSach'); // Điều hướng đến màn hình DangTaiSach
    };

    const handleManageStories = () => { // Đã đổi tên hàm xử lý
        navigation.navigate('Quanly'); // Điều hướng đến màn hình quản lý sách của tác giả
    };

    const handleWattpadPrograms = () => {
        navigation.navigate('Choduyet'); // Điều hướng đến màn hình quản lý sách của tác giả
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Write</Text>
                <View style={styles.profileSection}>
                    <Text style={styles.profileUsername}>@{userDisplayName}</Text>
                    <TouchableOpacity style={styles.profileAvatarContainer} onPress={() => navigation.navigate('Thongtin')}>
                        {userAvatar ? (
                            <Image source={{ uri: userAvatar }} style={styles.profileAvatar} />
                        ) : (
                            <Ionicons name="person-circle-outline" size={30} color="#333" />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Content Options */}
            <View style={styles.optionsContainer}>
                <TouchableOpacity style={styles.optionItem} onPress={handleNewStory}>
                    <Ionicons name="add-circle-outline" size={24} color="#FF69B4" />
                    <Text style={styles.optionText}>Viết sách mới</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.optionItem} onPress={handleManageStories}>
                    <Ionicons name="book-outline" size={24} color="#3498db" />
                    <Text style={styles.optionText}>Thêm chương mới</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.optionItem} onPress={handleWattpadPrograms}>
                    <Ionicons name="star-outline" size={24} color="#FFC107" />
                    <Text style={styles.optionText}>Sách và chương chờ duyệt</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.addChapterSection}>
                <Text style={styles.addChapterText}>
                    Để thêm chương sách, vui lòng chọn một sách đã có trong thư viện của bạn và tìm tùy chọn "Thêm chương".
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: Platform.OS === 'ios' ? 40 : 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileUsername: {
        fontSize: 16,
        color: '#555',
        marginRight: 10,
    },
    profileAvatarContainer: {
        width: 30,
        height: 30,
        borderRadius: 15,
        overflow: 'hidden',
        backgroundColor: '#ddd', // Màu nền mặc định cho avatar
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileAvatar: {
        width: '100%',
        height: '100%',
        borderRadius: 15,
    },
    optionsContainer: {
        paddingHorizontal: 15,
        paddingVertical: 20,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    optionText: {
        fontSize: 16,
        marginLeft: 15,
        color: '#333',
    },
    addChapterSection: {
        marginTop: 30,
        paddingHorizontal: 15,
        alignItems: 'center',
    },
    addChapterText: {
        fontSize: 14,
        color: '#777',
        textAlign: 'center',
        marginBottom: 10,
    },
    addChapterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#28a745', // Màu xanh lá cây
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 25,
    },
    addChapterButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 5,
    },
});

export default Write;

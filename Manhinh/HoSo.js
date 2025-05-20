import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, ScrollView, Switch, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase, ref, onValue, update } from 'firebase/database';
import { app } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

const HoSo = () => {
    const navigation = useNavigation();
    const [userData, setUserData] = useState(null);
    const [displayName, setDisplayName] = useState('');
    const [showDisplayName, setShowDisplayName] = useState(true);
    const [userId, setUserId] = useState(null);
    const [location, setLocation] = useState('');
    const [bio, setBio] = useState('');
    const [avatar, setAvatar] = useState(null);
    const [coverPhoto, setCoverPhoto] = useState(null);
    const [pronouns, setPronouns] = useState(''); // State for pronouns
    const auth = getAuth();
    const db = getDatabase(app);
    const storage = getStorage(app);

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                navigation.navigate('Dangnhap');
            }
        });
        return () => unsubscribeAuth();
    }, [auth, navigation]);

    useEffect(() => {
        if (userId) {
            const userRef = ref(db, `Users/${userId}`);
            const unsubscribeDB = onValue(userRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    setUserData(data);
                    setDisplayName(data.Username || '');
                    setShowDisplayName(data.showDisplayName !== undefined ? data.showDisplayName : true);
                    setLocation(data.Location || '');
                    setBio(data.Bio || '');
                    setAvatar(data.Avatar || null);
                    setCoverPhoto(data.CoverPhoto || null);
                    setPronouns(data.Pronouns || ''); // Load pronouns
                } else {
                    setUserData(null);
                }
            });
            return () => unsubscribeDB();
        }
    }, [db, userId]);

    useEffect(() => {
        if (userData) {
            setDisplayName(userData.Username || '');
            setLocation(userData.Location || '');
            setBio(userData.Bio || '');
            setPronouns(userData.Pronouns || '');
        }
    }, [userData]);

    const pickImage = async (type) => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            if (type === 'avatar') {
                setAvatar(result.assets[0].uri);
            } else if (type === 'cover') {
                setCoverPhoto(result.assets[0].uri);
            }
        }
    };

    const uploadImage = async (uri, path) => {
        const response = await fetch(uri);
        const blob = await response.blob();
        const imageRef = storageRef(storage, path);
        await uploadBytes(imageRef, blob);
        return getDownloadURL(imageRef);
    };

    const handleUpdateProfile = async () => {
        if (userData && userId) {
            const userRef = ref(db, `Users/${userId}`);
            const updates = {};

            if (displayName !== userData.Username) {
                updates.Username = displayName;
            }
            updates.showDisplayName = showDisplayName;
            if (location !== userData.Location) {
                updates.Location = location;
            }
            if (bio !== userData.Bio) {
                updates.Bio = bio;
            }
            if (pronouns !== userData.Pronouns) {
                updates.Pronouns = pronouns;
            }

            if (avatar && avatar !== userData.Avatar) {
                try {
                    const avatarUrl = await uploadImage(avatar, `avatars/${userId}`);
                    updates.Avatar = avatarUrl;
                } catch (error) {
                    console.error("Lỗi tải lên avatar:", error);
                    alert('Lỗi khi tải lên ảnh đại diện.');
                    return;
                }
            }

            if (coverPhoto && coverPhoto !== userData.CoverPhoto) {
                try {
                    const coverUrl = await uploadImage(coverPhoto, `covers/${userId}`);
                    updates.CoverPhoto = coverUrl;
                } catch (error) {
                    console.error("Lỗi tải lên ảnh nền:", error);
                    alert('Lỗi khi tải lên ảnh nền.');
                    return;
                }
            }

            if (Object.keys(updates).length > 0) {
                update(userRef, updates)
                    .then(() => {
                        alert('Hồ sơ đã được cập nhật!');
                    })
                    .catch((error) => {
                        alert('Đã có lỗi xảy ra khi cập nhật: ' + error.message);
                    });
            } else {
                alert('Không có thay đổi nào được thực hiện.');
            }
        }
    };

    if (!userData) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="black" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Hồ sơ</Text>
                </View>
                <View style={styles.loading}>
                    <Text>Đang tải thông tin...</Text>
                </View>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>


            <View style={styles.infoSection}>
                <Text style={styles.infoText}>
                    Thông tin mà bạn nhập ở đây sẽ hiển thị với người dùng khác. Tìm hiểu thêm về cách chia sẻ thông tin an toàn{' '}
                    <Text style={styles.linkText}>ở đây</Text>.
                </Text>
            </View>

            <View style={styles.actionSection}>
                <TouchableOpacity style={styles.avatarButton} onPress={() => pickImage('avatar')}>
                    <View style={styles.avatarPlaceholder}>
                        {avatar ? (
                            <Image source={{ uri: avatar }} style={styles.avatarImage} />
                        ) : userData.Avatar ? (
                            <Image source={{ uri: userData.Avatar }} style={styles.avatarImage} />
                        ) : (
                            <Ionicons name="person-circle-outline" size={40} color="gray" />
                        )}
                    </View>
                    <Text style={styles.actionText}>Cập Nhật Hình Ảnh</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.coverPhotoButton} onPress={() => pickImage('cover')}>
                    <View style={styles.coverPhotoPlaceholder}>
                        {coverPhoto ? (
                            <Image source={{ uri: coverPhoto }} style={styles.coverImage} />
                        ) : userData.CoverPhoto ? (
                            <Image source={{ uri: userData.CoverPhoto }} style={styles.coverImage} />
                        ) : (
                            <Ionicons name="image-outline" size={40} color="gray" />
                        )}
                    </View>
                    <Text style={styles.actionText}>Đặt Ảnh Bìa</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.settingsSection}>
                <View style={styles.settingItem}>
                    <Text style={styles.settingLabel}>Tên</Text>
                    <TextInput
                        style={styles.textInput}
                        value={displayName}
                        onChangeText={setDisplayName}
                        placeholder="Nhập tên của bạn"
                    />
                </View>
                <View style={styles.settingItem}>
                    <Text style={styles.settingLabel}>Hiển thị Tên Hiển thị</Text>
                    <Switch
                        value={showDisplayName}
                        onValueChange={setShowDisplayName}
                    />
                </View>
                <View style={styles.settingItem}>
                    <Text style={styles.settingLabel}>Địa điểm</Text>
                    <TextInput
                        style={styles.textInput}
                        value={location}
                        onChangeText={setLocation}
                        placeholder="Nhập địa điểm"
                    />
                </View>
                <View style={styles.settingItem}>
                    <Text style={styles.settingLabel}>Giới thiệu</Text>
                    <TextInput
                        style={styles.textInput}
                        value={bio}
                        onChangeText={setBio}
                        placeholder="Nhập giới thiệu"
                    />
                </View>
                <View style={styles.settingItem}>
                    <Text style={styles.settingLabel}>Đại từ nhân xưng</Text>
                    <View style={styles.pronounsContainer}>
                        <TouchableOpacity
                            style={[
                                styles.pronounButton,
                                pronouns === 'Nam' && styles.selectedPronoun,
                            ]}
                            onPress={() => setPronouns('Nam')}
                        >
                            <Text
                                style={[
                                    styles.pronounText,
                                    pronouns === 'Nam' && styles.selectedPronounText,
                                ]}
                            >
                                Nam
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.pronounButton,
                                pronouns === 'Nữ' && styles.selectedPronoun,
                            ]}
                            onPress={() => setPronouns('Nữ')}
                        >
                            <Text
                                style={[
                                    styles.pronounText,
                                    pronouns === 'Nữ' && styles.selectedPronounText,
                                ]}
                            >
                                Nữ
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.settingItem}>
                    <Text style={styles.settingLabel}>Trang web cá nhân</Text>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Nhập trang web"
                    />
                </View>
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={handleUpdateProfile}>
                <Text style={styles.saveButtonText}>Lưu</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 20,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoSection: {
        paddingHorizontal: 15,
        paddingVertical: 20,
        backgroundColor: '#f9f9f9',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    infoText: {
        fontSize: 14,
        color: '#555',
    },
    linkText: {
        color: '#3498db',
    },
    actionSection: {
        paddingHorizontal: 15,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    avatarButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 25,
    },
    actionText: {
        fontSize: 16,
        color: '#333',
    },
    coverPhotoButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    coverPhotoPlaceholder: {
        width: 50,
        height: 50,
        backgroundColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        overflow: 'hidden',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    settingsSection: {
        paddingHorizontal: 15,
        paddingVertical: 20,
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    settingLabel: {
        fontSize: 16,
        color: '#333',
    },
    settingValue: {
        fontSize: 16,
        color: 'gray',
    },
    textInput: {
        flex: 1,
        textAlign: 'right',
        fontSize: 16,
    },
    saveButton: {
        backgroundColor: '#3498db',
        paddingVertical: 15,
        borderRadius: 5,
        alignItems: 'center',
        margin: 15,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    pronounsContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginLeft: 10,
    },
    pronounButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        marginHorizontal: 5,
        backgroundColor: '#f0f0f0',
    },
    selectedPronoun: {
        backgroundColor: '#3498db',
    },
    pronounText: {
        fontSize: 14,
        color: '#333',
    },
    selectedPronounText: {
        color: '#fff',
    },
});

export default HoSo;

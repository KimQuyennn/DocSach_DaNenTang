// Dangnhap.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { ref, get, update } from 'firebase/database'; // Import 'update'

const { width, height } = Dimensions.get('window');

const Dangnhap = () => {
    const [usernameOrEmail, setUsernameOrEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation();

    const handleDangNhap = async () => {
        if (!usernameOrEmail || !password) {
            Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ tên đăng nhập hoặc email và mật khẩu.');
            return;
        }

        setLoading(true);
        try {
            let email = usernameOrEmail; // Giả sử đầu vào là email
            const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
            let userInfo = null; // Biến để lưu thông tin người dùng

            if (!emailRegex.test(usernameOrEmail)) {
                // Nếu không phải email, coi như là username và tìm email trong DB
                const usersRef = ref(db, 'Users');
                const snapshot = await get(usersRef);
                email = null; // Reset email
                snapshot.forEach((child) => {
                    const userData = child.val();
                    if (userData.Username === usernameOrEmail) {
                        email = userData.Email;
                        userInfo = userData; // Lưu thông tin người dùng tìm được
                        // Bạn cũng có thể muốn lưu key của child nếu cần để cập nhật,
                        // nhưng ở đây chúng ta sẽ dùng uid từ Auth sau khi đăng nhập.
                    }
                });
                if (!email) {
                    Alert.alert('Lỗi', 'Không tìm thấy tài khoản với tên đăng nhập này.');
                    setLoading(false);
                    return;
                }
            }

            // Đăng nhập bằng email hoặc email tìm được từ username
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            const userId = user.uid;

            // Lấy thông tin người dùng từ database (nếu chưa có từ tìm kiếm username)
            if (!userInfo) {
                const userRef = ref(db, `Users/${userId}`);
                const snapshot = await get(userRef);
                userInfo = snapshot.val();
            }

            // Cập nhật trường LastLogin trong Firebase Realtime Database
            const userDbRef = ref(db, `Users/${userId}`);
            await update(userDbRef, {
                LastLogin: new Date().toISOString() // Lưu thời gian hiện tại ở định dạng ISO
            });

            console.log("Đăng nhập thành công, User ID:", userId, "Thông tin người dùng:", userInfo);
            setLoading(false);
            navigation.replace('Home', { userId: userId, userInfo: userInfo });

        } catch (error) {
            console.error("Lỗi đăng nhập:", error);
            let errorMessage = 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin đăng nhập.';
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
                errorMessage = 'Không tìm thấy người dùng với email hoặc tên đăng nhập này.';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Mật khẩu không đúng.';
            } else if (error.code === 'auth/network-request-failed') {
                errorMessage = "Lỗi mạng. Vui lòng kiểm tra kết nối internet của bạn.";
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = "Tài khoản của bạn đã bị khóa tạm thời do quá nhiều lần đăng nhập sai. Vui lòng thử lại sau.";
            }
            Alert.alert('Lỗi', errorMessage);
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Đăng nhập</Text>
            </View>
            <View style={styles.formContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Tên đăng nhập hoặc Email"
                    onChangeText={setUsernameOrEmail}
                    value={usernameOrEmail}
                    placeholderTextColor="#b0b0b0"
                    autoCapitalize="none" // Thêm để tránh tự động viết hoa
                />
                <TextInput
                    style={styles.input}
                    placeholder="Mật khẩu"
                    secureTextEntry
                    onChangeText={setPassword}
                    value={password}
                    placeholderTextColor="#b0b0b0"
                />
                <TouchableOpacity style={styles.loginButton} onPress={handleDangNhap} disabled={loading}>
                    <Text style={styles.loginButtonText}>
                        {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.registerButton}
                    onPress={() => navigation.navigate('Dangky')}
                >
                    <Text style={styles.registerButtonText}>
                        Chưa có tài khoản? <Text style={{ fontWeight: 'bold' }}>Đăng ký</Text>
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.forgotPasswordButton}
                    onPress={() => navigation.navigate('Quenmatkhau')}
                >
                    <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    Bằng việc tiếp tục, bạn đồng ý với Điều khoản dịch vụ và Chính sách quyền riêng tư của chúng tôi.
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f2f2f2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        marginBottom: height * 0.05,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    formContainer: {
        width: '90%',
        alignItems: 'center',
    },
    input: {
        width: '100%',
        padding: 15,
        marginBottom: 15,
        backgroundColor: 'white',
        borderRadius: 8,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    loginButton: {
        width: '100%',
        padding: 15,
        backgroundColor: '#00c853',
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    loginButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    registerButton: {
        marginTop: 20,
    },
    registerButtonText: {
        color: '#7f8c8d',
        fontSize: 16,
    },
    forgotPasswordButton: {
        marginTop: 10,
    },
    forgotPasswordText: {
        color: '#3498db',
        fontSize: 16,
    },
    footer: {
        marginTop: height * 0.1,
        paddingHorizontal: 20,
        alignItems: 'center'
    },
    footerText: {
        fontSize: 12,
        color: '#95a5a6',
        textAlign: 'center',
    },
});

export default Dangnhap;
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, ref, set } from 'firebase/database';
import { app } from '../firebase'; // import app firebase đã khởi tạo

export default function Dangky() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const navigation = useNavigation();

    const dangKy = async () => {
        if (!email || !password || !username) {
            Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
            return;
        }

        try {
            const auth = getAuth(app);
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Lưu thông tin bổ sung vào Realtime Database
            const db = getDatabase(app);
            await set(ref(db, 'Users/' + user.uid), {
                Username: username,
                Email: email,
                Avatar: 'avatars/user1.jpg', // bạn có thể thay đổi ảnh mặc định này
                Role: 'User',
                CreatedAt: new Date().toISOString(),
                LastLogin: new Date().toISOString(),
                PasswordHash: password // KHÔNG nên lưu plain password trong thực tế!
            });

            Alert.alert('Thành công', 'Đăng ký thành công!');
            navigation.replace('Dangnhap');
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                Alert.alert('Lỗi', 'Email đã được sử dụng. Vui lòng dùng email khác.');
            } else {
                Alert.alert('Lỗi', error.message);
            }
            console.error(error);
        }
    };

    return (
        <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 24, marginBottom: 20 }}>Đăng ký</Text>
            <TextInput
                placeholder="Tên đăng nhập"
                onChangeText={setUsername}
                value={username}
                style={{ borderBottomWidth: 1, marginBottom: 15, padding: 8 }}
            />
            <TextInput
                placeholder="Email"
                onChangeText={setEmail}
                value={email}
                keyboardType="email-address"
                autoCapitalize="none"
                style={{ borderBottomWidth: 1, marginBottom: 15, padding: 8 }}
            />
            <TextInput
                placeholder="Mật khẩu"
                secureTextEntry
                onChangeText={setPassword}
                value={password}
                style={{ borderBottomWidth: 1, marginBottom: 20, padding: 8 }}
            />
            <Button title="Đăng ký" onPress={dangKy} />
        </View>
    );
}

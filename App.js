import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Dangky from './Manhinh/Dangky';
import Dangnhap from './Manhinh/Dangnhap';
import Home from './Manhinh/Home';
import QuenMatKhau from './Manhinh/Quenmatkhau';
import Chitiet from './Manhinh/Chitiet';
import Thongtin from './Manhinh/Thongtin';
import HoSo from './Manhinh/HoSo';
import TimKiem from './Manhinh/TimKiem';
import ThuVien from './Manhinh/ThuVien';
import DocSach from './Manhinh/DocSach';
import TaiKhoan from './Manhinh/TaiKhoan';
import DangTaiSach from './Manhinh/DangTaiSach';
import Write from './Manhinh/Write';
import Quanly from './Manhinh/Quanly';
import Themchuong from './Manhinh/Themchuong';
import Choduyet from './Manhinh/Choduyet';
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{
        // headerStyle: {
        //   backgroundColor: '#000',
        // },
        headerTintColor: 'Black',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerTitleAlign: 'center'
      }}>
        <Stack.Screen name="Dangnhap" component={Dangnhap} options={{ title: 'Đăng nhập' }} />
        <Stack.Screen name="Dangky" component={Dangky} options={{ title: 'Đăng ký' }} />
        <Stack.Screen name="Quenmatkhau" component={QuenMatKhau} options={{ title: 'Quên mật khẩu' }} />
        <Stack.Screen name="Home" component={Home} options={{ headerShown: false }} />
        <Stack.Screen name="Chitiet" component={Chitiet} options={{ title: 'Chi tiết sách' }} />
        <Stack.Screen name="Thongtin" component={Thongtin} options={{ title: 'Thông tin cá nhân' }} />
        <Stack.Screen name="HoSo" component={HoSo} options={{ title: 'Hồ sơ' }} />
        <Stack.Screen name="TimKiem" component={TimKiem} options={{ title: 'Tìm kiếm' }} />
        <Stack.Screen name="ThuVien" component={ThuVien} options={{ title: 'Thư viện' }} />
        <Stack.Screen name="DocSach" component={DocSach} options={{ headerShown: false }} />
        <Stack.Screen name="TaiKhoan" component={TaiKhoan} options={{ headerShown: false }} />
        <Stack.Screen name="DangTaiSach" component={DangTaiSach} options={{ headerShown: false }} />
        <Stack.Screen name="Write" component={Write} options={{ title: 'Quản lý' }} />
        <Stack.Screen name="Quanly" component={Quanly} options={{ title: 'Quản lý' }} />
        <Stack.Screen name="Themchuong" component={Themchuong} options={{ title: 'Thêm chương' }} />
        <Stack.Screen name="Choduyet" component={Choduyet} options={{ title: 'Chờ duyệt' }} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}

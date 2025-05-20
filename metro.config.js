const { getDefaultConfig } = require('expo/metro-config');
const defaultConfig = getDefaultConfig(__dirname);

// Đẩy thêm .cjs vào sourceExts để Metro hiểu các file này
defaultConfig.resolver.sourceExts.push('cjs');

// Dòng này giúp xử lý việc xuất các gói mà không gặp phải lỗi về package exports
defaultConfig.resolver.unstable_enablePackageExports = false;

// Cấu hình thêm cho Hermes nếu cần
defaultConfig.transformer = {
    ...defaultConfig.transformer,
    experimentalImportSupport: true,
    inlineRequires: false, // Thử bật / tắt tùy theo yêu cầu
};

module.exports = defaultConfig;


// // Learn more https://docs.expo.io/guides/customizing-metro
// const { getDefaultConfig } = require('expo/metro-config');

// /** @type {import('expo/metro-config').MetroConfig} */
// const config = getDefaultConfig(__dirname);

// module.exports = config;

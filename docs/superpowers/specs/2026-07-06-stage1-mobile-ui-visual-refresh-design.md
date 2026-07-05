# Stage 1 Mobile UI — Visual Design Refresh

Ngày: 2026-07-06
Trạng thái: Đã duyệt (chờ viết implementation plan)

## Bối cảnh

Plan 1B (`docs/superpowers/specs/2026-07-06-stage1-mobile-ui-design.md`) đã
được triển khai đầy đủ về mặt chức năng: 13 màn hình, khớp 1-1 với 8 Edge
Function của backend, đã verify chạy đúng (kể cả sửa 1 lỗi crash SSR và
khôi phục dấu tiếng Việt bị thiếu). Tuy nhiên khi xem trực tiếp, giao diện
bị đánh giá là "cùi bắp" — vì Stage 1 ưu tiên đúng chức năng trước, các
màn hình thao tác hàng ngày mới chỉ dùng component mặc định của React
Native Paper, chưa áp bộ nhận diện "Ink Root" đã chốt cho logo/splash.

Spec này đặc tả đợt **thiết kế lại giao diện** cho toàn bộ 13 màn hình đã
có — không đổi chức năng/logic, chỉ đổi lớp trình bày.

**Thay đổi so với Plan 1B gốc:** Plan 1B ban đầu chọn theme sáng ấm cho
màn hình hàng ngày (chỉ splash mới tối). Sau khi xem mockup trực tiếp,
quyết định mới: **dùng theme tối "Ink Root Dark Premium" xuyên suốt toàn
app**, không chỉ splash — quyết định này ghi đè phần "Hệ thống theme (2
lớp)" của spec Plan 1B.

## Hướng thiết kế đã chọn: Ink Root Dark Premium

Nền tối (gradient nâu đen `#180d08 → #3d2417`), chữ/icon vàng đồng phát
sáng nhẹ (`text-shadow`/`shadow` mờ ánh vàng), card dạng kính mờ
(glassmorphism: nền bán trong suốt + viền vàng mờ + backdrop blur), logo
thật (`docs/design/branding/logo-icon.png`, `logo-full.png`) dùng nhất
quán thay vì icon chữ cái chung chung. Cảm giác: sang trọng, công nghệ
cao, khác biệt hẳn so với app gia phả thông thường.

## Nguyên tắc thiết kế áp dụng (tham khảo từ các bộ nguyên tắc UI/UX phổ biến)

- **Lưới khoảng cách 8pt:** mọi margin/padding là bội số của 4 hoặc 8.
- **Tối đa 4 cỡ chữ, 2 độ đậm:** tránh phân mảnh kiểu chữ — dùng thang:
  28px/700 (tiêu đề màn hình, Playfair Display), 15px/600 (nội dung
  chính), 13px/600 (nhãn/nút), 11px/700 (nhãn phụ/badge, viết hoa).
- **Vùng ngón tay cái (thumb zone):** hành động chính của mỗi màn hình
  (Đăng nhập, Tạo gia tộc, Mời thành viên, Gửi đề xuất, Lưu cài đặt...)
  luôn đặt ở 1/3 dưới màn hình hoặc dùng FAB góc dưới — không đặt hành
  động chính ở đầu trang.
- **Peak-End Rule:** đầu tư animation nhiều nhất vào 2 khoảnh khắc người
  dùng nhớ lâu nhất — màn hình mở đầu (splash/đăng nhập) và khoảnh khắc
  hoàn tất hành động quan trọng (tạo gia tộc thành công, được chấp nhận
  vào gia tộc) — các màn hình danh sách/form thông thường chỉ cần
  animation vào trang nhẹ nhàng (rise-in, stagger), không cần hiệu ứng
  nặng.
- **60/30/10:** ~60% diện tích là nền tối trung tính, ~30% là bề mặt
  card/viền (vàng đồng nhạt/kính mờ), ~10% là điểm nhấn (vàng đồng đậm
  cho hành động chính, đỏ son cho cảnh báo/badge thông báo).

## Design tokens

- Nền: `radial-gradient(ellipse at 50% -10%, #3d2417 0%, #180d08 65%)`
- Card/kính mờ: nền `rgba(255,255,255,0.05-0.08)`, viền
  `rgba(244,200,105,0.15-0.25)`, `backdrop-filter: blur` tương đương
  (trên native dùng `expo-blur` hoặc nền bán trong suốt + viền, vì
  backdrop-filter không có sẵn xuyên nền tảng trong React Native).
- Chữ chính: `#f4dba0` (vàng nhạt, dùng cho tiêu đề trên nền tối),
  `#f0e4d0` (gần trắng ấm, nội dung), `#a8926f`/`#b89a72` (chữ phụ mờ).
- Vàng đồng gradient hành động: `linear-gradient(135deg, #f4dba0, #c98f34)`.
- Đỏ cảnh báo/thông báo: `#e05a3f` (chấm thông báo), `#c0432f` (nút/hành
  động nguy hiểm như "Rời gia tộc").
- Font tiêu đề: Playfair Display (700) — nạp qua `expo-font`/
  `@expo-google-fonts/playfair-display`. Font nội dung: font hệ thống
  mặc định của Paper (không đổi, giữ dễ đọc).

## Component dùng chung cần tạo

- **`AnimatedLogo`** — hiển thị `logo-icon.png`, có animation bung+phát
  sáng khi vào màn (dùng ở splash, sign-in, sign-up).
- **`GlassCard`** — card nền kính mờ dùng lại cho: clan card, member
  card, form field wrapper.
- **`PrimaryButton`** — nút gradient vàng đồng, có hiệu ứng ánh sáng lướt
  qua định kỳ (giống mockup), dùng cho mọi hành động chính.
- **`MemberAvatar`** — hình tròn gradient theo initials, dùng ở mọi nơi
  hiển thị thành viên (danh sách, chi tiết, chọn người neo/mục tiêu).
- **`RoleBadge`** — nhãn vai trò (Trưởng họ/Phó tộc trưởng/Thành viên),
  màu theo token đã định.
- **`EmberBackground`** — lớp hạt sáng trôi nhẹ, dùng cho splash và các
  màn hình "khoảnh khắc" (đăng nhập, đăng ký, màn chúc mừng tạo clan
  thành công) — KHÔNG dùng cho màn hình danh sách/form dài (tránh gây
  rối mắt khi đọc nhiều thông tin, đúng tinh thần Peak-End Rule).
- **`GenerationDivider`** — nhãn "ĐỜI n" phân nhóm danh sách thành viên.

## Áp dụng cho 13 màn hình

Tất cả 13 màn hình của Plan 1B đổi sang theme tối + component trên,
KHÔNG đổi logic/luồng dữ liệu đã có. Riêng 2 màn có animation đầy đủ
(logo bung sáng, nền có hạt sáng trôi) theo tinh thần Peak-End: `sign-in`,
`sign-up`. Các màn còn lại dùng animation vào trang nhẹ (rise-in, card
stagger) không có hạt nền.

## Kỹ thuật animation trên native

Mockup trình duyệt dùng CSS animation/keyframes — trên React Native cần
dùng **`react-native-reanimated`** (đã có sẵn trong `package.json`).
Từng animation trong mockup ánh xạ sang Reanimated như sau: `opacity`/
`translateY` entrance → `useSharedValue` + `withTiming`/`withDelay`;
hiệu ứng "thở" (breathe/pulse) → `withRepeat(withSequence(...))`; ánh
sáng lướt qua nút → 1 `Animated.View` dải sáng di chuyển bằng
`withRepeat` trên `translateX`, `overflow: hidden` trên nút cha.

## Ngoài phạm vi đợt này

- Icon Material Community Icons không hiển thị trên bản Expo web (thiếu
  font icon) — đây là hạn chế đã biết của react-native-paper trên web,
  không ảnh hưởng bản native thật (iOS/Android tự có font icon), để lại
  không sửa trong đợt này.
- Không đổi cấu trúc màn hình/luồng điều hướng, không thêm tính năng mới
  — thuần túy là lớp trình bày.
- Bản vector hoàn chỉnh cho viền trắng của `logo-icon.png` (bị mất khi
  tách nền tự động) — vẫn để dành cho một đợt thiết kế logo sau.

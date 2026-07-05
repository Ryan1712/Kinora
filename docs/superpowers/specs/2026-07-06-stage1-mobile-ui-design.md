# Stage 1 Mobile UI (Plan 1B) — Design

Ngày: 2026-07-06
Trạng thái: Đã duyệt (chờ viết implementation plan)

## Bối cảnh

Stage 1 backend (schema + RLS + 8 Edge Functions, xem
`docs/superpowers/specs/2026-07-01-stage1-foundation-design.md` và
`docs/superpowers/plans/2026-07-01-stage1-backend.md`) đã hoàn tất, review
sạch, merge được. Spec này đặc tả **Plan 1B — giao diện mobile (React
Native/Expo)** gọi vào backend đó, hoàn thành bộ tính năng Stage 1 nhìn từ
phía người dùng cuối.

Tên sản phẩm: **Phả Ký**.

## Phạm vi

Bao phủ toàn bộ Stage 1 backend, khớp 1-1 với 8 Edge Function đã có:
đăng ký/đăng nhập, tạo/xem clan, mời thành viên (12 mã quan hệ), chấp
nhận/từ chối lời mời, đề xuất và duyệt sửa quan hệ, cài đặt clan (đổi
tên/quyền mời/bổ nhiệm phó/xóa thành viên), nhường quyền trưởng họ, rời
clan, sửa hồ sơ cá nhân.

**Ngoài phạm vi** (để Stage 2 trở đi): hiển thị cây gia phả trực quan,
tính toán xưng hô, vai trò tùy chỉnh ngoài admin/deputy/member, quỹ tiền,
sự kiện.

## Vị trí code

Monorepo: repo hiện tại giữ nguyên làm backend ở thư mục gốc
(`supabase/`, `tests/`, `docs/`). Thêm thư mục **`app/`** chứa toàn bộ dự
án Expo, với `package.json`/`node_modules` hoàn toàn riêng biệt với
backend (dependency hai bên rất khác nhau: Node/Vitest vs Expo/RN).

**Lý do:** một backend + một mobile client, một người phát triển — tách
2 repo sẽ phải đồng bộ PR chéo giữa API và UI mỗi khi hai bên đổi cùng
lúc, không có lợi ích rõ ràng khi chưa có team riêng cho từng phía.

## Nhận diện thương hiệu — "Ink Root"

Hướng thiết kế: di sản hiện đại — trang trọng nhưng không cũ kỹ, cảm giác
thương hiệu cao cấp lấy cảm hứng gia phả truyền thống Việt Nam.

- **Bảng màu:**
  - Nâu trầm (nền thương hiệu): `#2b1a12 → #4a2418 → #7a2e1f` (gradient)
  - Vàng đồng (chữ/nhấn chính): `#f8dfa0 → #e0ab4a → #a8721f` (gradient)
  - Đỏ son (con dấu/nhấn quan trọng): `#c0432f`
- **Logo:** đã tạo bằng AI (ChatGPT/Gemini) theo hướng "rễ cây" bên dưới
  chữ "Phả Ký" (serif, font tham khảo Playfair Display) + con dấu tròn
  họa tiết mặt trời tỏa tia (không dùng chữ Hán). File nguồn:
  `docs/design/branding/logo-full.png` (logo đầy đủ có chữ, nền nâu be),
  `docs/design/branding/logo-icon.png` (icon tròn P+K ghép thân cây, nền
  trong suốt, đã xử lý crop/tách nền — viền trắng mỏng quanh icon bị mất
  khi tách nền tự động, cần một designer hoặc bản vector chất lượng cao
  hơn nếu muốn khôi phục chi tiết đó), và `docs/design/branding/
  logo-brief.md` (brief gốc dùng để tạo logo, tham khảo nếu cần tạo lại/
  biến thể). Cả hai file ảnh cần copy vào `app/src/assets/` khi triển khai.
- **Ngôn ngữ chuyển động:** "vẽ mực" (stroke/opacity reveal tuần tự) cho
  màn hình splash/loading; "đóng dấu" (scale+rotate elastic entrance kèm
  gợn sóng lan tỏa) cho xác nhận hành động quan trọng (mời thành viên,
  duyệt đổi quan hệ, nhường quyền); "thở nhẹ" (scale pulse chậm) cho các
  phần tử tĩnh mang tính biểu tượng (con dấu, badge). Đây là mô tả bằng
  lời của chuyển động đã xem trực tiếp trong quá trình brainstorm (dựng
  bằng HTML/CSS/SVG tạm thời, không phải asset giữ lại) — khi triển khai
  cần dựng lại bằng React Native Reanimated theo timing mô tả ở trên.

## Kiến trúc & công nghệ

- **Framework:** Expo + Expo Router (file-based routing).
- **UI kit:** React Native Paper, theme tùy biến hoàn toàn (không dùng
  theme Material mặc định) theo bảng màu Ink Root.
- **Data fetching:** TanStack Query (React Query) bọc quanh
  `@supabase/supabase-js`.
- **Auth/session:** Supabase Auth, session lưu qua `AsyncStorage`
  (chuẩn Expo), tự động refresh token.

### Cấu trúc thư mục

```
app/
├── app/                          (Expo Router)
│   ├── _layout.tsx               — PaperProvider, QueryClientProvider, auth guard
│   ├── (auth)/
│   │   ├── sign-in.tsx
│   │   └── sign-up.tsx
│   └── (main)/
│       ├── index.tsx             — danh sách clan của tôi
│       ├── invites.tsx           — hộp thư lời mời
│       ├── create-clan.tsx
│       ├── profile.tsx
│       └── clan/[id]/
│           ├── index.tsx         — trang chủ clan (danh sách thành viên)
│           ├── invite.tsx
│           ├── member/[personId].tsx
│           ├── propose-change.tsx
│           ├── requests.tsx      — (admin/deputy) duyệt đổi quan hệ
│           ├── settings.tsx      — (admin) cài đặt clan
│           └── transfer-admin.tsx
├── src/
│   ├── theme/                    — brand.ts (hằng số thương hiệu), appTheme.ts (Paper theme)
│   ├── lib/supabase.ts
│   ├── api/                      — 1 file/edge function, có type
│   ├── components/               — StampButton, MemberCard, v.v.
│   └── assets/                   — logo-full.png, logo-icon.png
├── package.json, app.json, tsconfig.json
```

## Hệ thống theme (2 lớp)

1. **`theme/brand.ts`** — hằng số bất biến của thương hiệu: màu gradient
   nâu/vàng/đỏ, font tiêu đề (Playfair Display), timing chuyển động
   (vẽ mực ~1.1s, đóng dấu elastic ~0.7s, thở nhẹ 3.5-4s loop).
2. **`theme/appTheme.ts`** — theme Paper (`MD3Theme`) dùng cho các màn
   hình thao tác hàng ngày: nền kem ấm sáng, chữ nâu đậm (tương phản
   cao, dễ đọc), `primary` = vàng đồng (nút chính, FAB), màu nhấn quan
   trọng = đỏ son, bo góc card 12-16px.

**Quy tắc áp dụng:** theme tối "Ink Root" đầy đủ chỉ dùng cho khoảnh khắc
thương hiệu (splash, có thể màn hình chào mừng sau đăng ký) — các màn
hình dùng thường xuyên (danh sách, form, cài đặt) dùng theme sáng ấm,
giữ màu vàng/đỏ làm điểm nhấn, ưu tiên dễ đọc cho mọi độ tuổi người dùng
(bao gồm trưởng họ lớn tuổi).

## Danh sách màn hình (khớp 8 Edge Function + auth + profile)

| Route | Chức năng | Gọi API |
|---|---|---|
| `(auth)/sign-in` | Đăng nhập email/password | Supabase Auth |
| `(auth)/sign-up` | Đăng ký + nhập thông tin cơ bản | Supabase Auth + insert `users` |
| `(main)/index` | Danh sách clan của tôi + tạo mới | SELECT `clans`/`persons` |
| `(main)/invites` | Lời mời đang chờ — chấp nhận/từ chối | `respond-invite` |
| `(main)/create-clan` | Tạo clan mới | `create-clan` |
| `(main)/profile` | Sửa hồ sơ cá nhân | UPDATE `users` trực tiếp (RLS tự bảo vệ) |
| `clan/[id]/index` | Danh sách thành viên trong clan | SELECT `persons`/`relationships` |
| `clan/[id]/invite` | Mời thành viên (chọn người neo + 1/12 quan hệ) | `invite-member` |
| `clan/[id]/member/[personId]` | Chi tiết 1 người; sửa info bản thân; quản lý (admin/deputy) | — |
| `clan/[id]/propose-change` | Đề xuất sửa quan hệ của bản thân | `propose-relationship-change` |
| `clan/[id]/requests` | (admin/deputy) Duyệt yêu cầu đổi quan hệ | `review-relationship-change` |
| `clan/[id]/settings` | (admin) Đổi tên/quyền mời/bổ nhiệm phó/xóa thành viên | `clan-admin-settings` |
| `clan/[id]/transfer-admin` | (admin) Nhường quyền trưởng họ, xác nhận mật khẩu | `transfer-admin` |

`leave-clan` được gọi từ một nút trong `clan/[id]/index` hoặc
`member/[personId]` (khi xem hồ sơ chính mình), không cần route riêng.

## Data layer

- `lib/supabase.ts`: client với `AsyncStorage` session persistence.
- `api/*.ts`: mỗi Edge Function một hàm gọi có type
  (`supabase.functions.invoke(name, { body })`), khớp đúng request/
  response shape đã định nghĩa trong Stage 1 backend plan.
- Đọc dữ liệu (list clan, thành viên, lời mời) gọi thẳng
  `supabase.from(...).select()` qua RLS — không qua Edge Function, đúng
  kiến trúc backend đã thiết kế (ghi qua Edge Function, đọc trực tiếp).
- React Query hook cho mỗi nguồn dữ liệu + mutation; sau mutation thành
  công, invalidate đúng query liên quan (vd mời thành viên xong →
  invalidate danh sách lời mời của clan).

## Xử lý lỗi & loading

- Lỗi từ Edge Function (`{ error: string }`) hiển thị qua Snackbar
  (Paper), tông màu đỏ son.
- Loading dùng `ActivityIndicator` chuẩn của Paper (chưa làm skeleton
  loader tùy biến ở Stage 1).
- 401 từ bất kỳ lệnh gọi nào → tự động điều hướng về `sign-in`.
- Không dùng optimistic update — nhiều thao tác có validate phức tạp ở
  server (chống vòng lặp quan hệ, ràng buộc admin duy nhất...), chờ
  server xác nhận an toàn hơn cho Stage 1.

## Testing

- Unit/component test: Jest + `jest-expo` (tách biệt hoàn toàn với
  Vitest bên backend — hai project độc lập).
- Mock Supabase client khi test hook API và component (`StampButton`,
  form mời thành viên...).
- QA thủ công theo luồng chính trước khi coi Stage 1 UI hoàn tất: đăng
  ký → tạo clan → mời → chấp nhận → đề xuất/duyệt đổi quan hệ → cài đặt
  → nhường quyền → rời clan.
- E2E tự động (Maestro) để dành cho giai đoạn sau, không bắt buộc trong
  Plan 1B.

## Rủi ro / điểm cần lưu ý khi triển khai

- Icon app (`logo-icon.png`) bị mất viền trắng trang trí khi tự động
  tách nền — cân nhắc làm lại icon chất lượng cao (vector) trước khi
  build bản release thật, bản hiện tại đủ dùng cho development/testing.
- Animation splash dùng ảnh raster (không phải SVG/vector) nên chỉ
  animate được ở cấp độ toàn khối ảnh (phóng to/mờ dần/lướt sáng), không
  tách animate từng nét như bản phác SVG ban đầu. Nếu muốn animation chi
  tiết hơn ở bản chính thức, cần bản vector từ AI hoặc designer.

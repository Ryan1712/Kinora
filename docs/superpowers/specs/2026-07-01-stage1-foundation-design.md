# Stage 1 — Nền tảng: Auth + Gia tộc (Space) + Thành viên

Ngày: 2026-07-01
Trạng thái: Đã duyệt (chờ viết implementation plan)

## Bối cảnh & phạm vi dự án tổng thể

Ứng dụng mobile gia phả đa gia tộc (mỗi gia tộc là 1 "space" độc lập). Người dùng
đăng ký tài khoản, tạo hoặc tham gia gia tộc, quản lý cây gia phả, và (ở các
giai đoạn sau) tính toán quan hệ/xưng hô, quản lý quỹ tiền, tổ chức sự kiện.

Dự án được chia thành các giai đoạn (mỗi giai đoạn = 1 spec + 1 implementation
plan riêng):

1. **Stage 1 (spec này):** Auth + tạo/tham gia gia tộc + mời thành viên + gán
   quan hệ/đời + duyệt thay đổi + phân quyền cơ bản (admin/deputy/member).
2. Stage 2: Cây gia phả trực quan + tính toán quan hệ/xưng hô giữa 2 người bất kỳ.
3. Stage 3: Phân quyền nâng cao / vai trò tùy chỉnh.
4. Stage 4: Quỹ tiền (thu/chi, quỹ khuyến học).
5. Stage 5: Sự kiện/hoạt động (giỗ họ, hội hè).

Spec này chỉ đặc tả **Stage 1**.

## Kiến trúc

```
React Native (Expo, TypeScript)
        │  supabase-js SDK
        ▼
Supabase project
 ├─ Auth (email/phone OTP)
 ├─ Postgres (dữ liệu + Row Level Security)
 ├─ Storage (ảnh đại diện)
 └─ Edge Functions (Deno/TS) — nghiệp vụ nhiều bước cần transaction
```

**Lý do chọn:**
- React Native + Expo: một codebase cho iOS/Android, OTA update, hệ sinh thái
  thư viện vẽ cây (Skia/SVG) đủ dùng cho Stage 2, tốc độ phát triển nhanh cho
  team nhỏ.
- Supabase (Postgres): dữ liệu phả hệ là đồ thị quan hệ có cấu trúc chặt —
  Postgres hỗ trợ recursive CTE để duyệt tổ tiên/con cháu (cần cho Stage 2).
  Row Level Security xử lý tự nhiên bài toán multi-tenant (mỗi gia tộc chỉ
  thành viên của nó mới thấy dữ liệu). Không khóa vendor vì là Postgres chuẩn.
- Client gọi thẳng Supabase cho CRUD đơn giản (được bảo vệ bởi RLS); nghiệp vụ
  nhiều bước (mời + gán quan hệ + tính lại đời, duyệt thay đổi, nhường quyền)
  đi qua Edge Function để đảm bảo tính toàn vẹn trong 1 transaction.

## Mô hình dữ liệu

Nguyên tắc cốt lõi: lưu **quan hệ nguyên thủy** (`parent_child`, `spouse`)
làm nguồn sự thật duy nhất — mọi quan hệ khác (anh em, bác/chú/cô/dì, ông/bà,
anh em họ...) và "đời thứ" đều suy ra được từ đồ thị này (giống chuẩn GEDCOM
dùng trong các phần mềm gia phả). Việc này để dành cho bộ tính xưng hô ở
Stage 2, nhưng ảnh hưởng trực tiếp tới schema của Stage 1.

Nguyên tắc thứ hai: **tách hồ sơ trong cây (`persons`) khỏi tài khoản đăng
nhập (`users`)**. Một hồ sơ trong cây là dữ liệu vĩnh viễn thuộc về gia tộc
(vì con cái/vợ chồng/anh em của họ cần liên kết tới họ); tài khoản chỉ là
quyền truy cập/chỉnh sửa gắn tạm vào một hồ sơ. Đây là cách Ancestry/
MyHeritage/FamilySearch xử lý việc một người rời nhóm mà không phá vỡ cây
của người khác.

### Bảng dữ liệu

- **users** — tài khoản đăng nhập (mở rộng Supabase Auth user): `id`,
  `full_name`, `avatar_url`, `phone`, `email`, `occupation`, `address`,
  `dob`, `invite_code` (mã mời duy nhất, tự sinh khi tạo tài khoản).

- **clans** — gia tộc/space: `id`, `name`, `branch_type` (`nội` | `ngoại` |
  `khác`), `invite_permission` (`admin_only` | `all_members`, mặc định
  `admin_only`), `created_by`, `created_at`.

- **persons** — hồ sơ trong cây, vĩnh viễn, thuộc về 1 clan: `id`, `clan_id`,
  `full_name`, `gender`, `dob` (nullable), `generation_number`,
  `linked_user_id` (nullable, FK → users; null nếu là placeholder chưa có
  tài khoản, hoặc tài khoản đã rời), `role` (`admin` | `deputy` | `member` |
  `null`; chỉ có ý nghĩa khi `linked_user_id` khác null).

- **relationships** — quan hệ nguyên thủy giữa 2 person cùng clan:
  `id`, `clan_id`, `from_person_id`, `to_person_id`,
  `type` (`parent_child` | `spouse`).
  Với `parent_child`: `from_person_id` = cha/mẹ, `to_person_id` = con.

- **invites** — lời mời tham gia clan: `id`, `clan_id`, `invited_by_person_id`,
  `invitee_user_id` (nullable nếu mời qua sđt/email chưa có tài khoản),
  `invitee_phone_or_email` (dùng để tự khớp khi người đó đăng ký sau này),
  `proposed_relationship_type`, `proposed_relationship_with_person_id`,
  `status` (`pending` | `accepted` | `declined`), `created_at`.

- **relationship_change_requests** — member tự đề xuất sửa quan hệ của mình:
  `id`, `person_id`, `proposed_relationship_type`,
  `proposed_relationship_with_person_id`, `status`
  (`pending` | `approved` | `rejected`), `reviewed_by_person_id`,
  `created_at`, `reviewed_at`.

### Suy luận "đời thứ"

Khi tạo clan, admin khai báo đời của chính mình (vd đời 15). Khi một quan hệ
`parent_child` được xác nhận (qua invite được chấp nhận, hoặc relationship
change request được duyệt), Edge Function lan truyền:
`generation(con) = generation(cha/mẹ) + 1`. `spouse` giữ cùng đời với người
kia. Trong cả hai luồng (mời thành viên mới, hoặc member đề xuất sửa quan
hệ của mình), nếu quan hệ chọn không phải cha/mẹ/con/vợ/chồng trực tiếp (vd
"bác", "anh em họ"), hệ thống yêu cầu người thao tác xác nhận/nhập tên 1
`persons` placeholder làm cầu nối (vd cha/mẹ chung, chưa có tài khoản, chỉ
có tên) để giữ đúng mô hình quan hệ nguyên thủy trước khi ghi.

## Luồng nghiệp vụ

1. **Đăng ký/Đăng nhập** — email hoặc sđt qua Supabase Auth OTP. Sau đăng ký,
   nhập thông tin cơ bản → tạo `users` record + `invite_code`.

2. **Tạo gia tộc** — nhập tên, loại (nội/ngoại/khác), khai báo đời thứ bản
   thân → tạo `clans` (invite_permission mặc định `admin_only`) + `persons`
   đầu tiên (role=admin, linked_user_id=creator).

3. **Mời thành viên** — người có quyền mời (xem bảng phân quyền) nhập
   `invite_code` hoặc sđt/email của người được mời, chọn quan hệ với 1
   person đã có trong clan. Tạo `invites(status=pending)`.
   - Người được mời đã có tài khoản: nhận thông báo, xem trước clan + quan hệ
     được gán. **Đồng ý** → Edge Function tạo/liên kết `persons` +
     `relationships`, tính lại đời. **Từ chối** → invite → declined.
   - Chưa có tài khoản (mời qua sđt/email): invite ở trạng thái chờ; khi
     người đó đăng ký đúng sđt/email (xác thực qua OTP, tránh mạo danh), lời
     mời tự hiện ra để xử lý.

4. **Cài đặt clan** (chỉ admin) — đổi tên, đổi `invite_permission`, bổ nhiệm/
   gỡ chức deputy, xóa thành viên (unlink `linked_user_id`, không xóa
   `persons`/`relationships`).

5. **Nhường quyền trưởng họ** (chỉ admin) — chọn 1 person đang active →
   **yêu cầu nhập lại mật khẩu để xác nhận** → Edge Function: person được
   chọn → role=admin; admin cũ → role=member. Ràng buộc: clan luôn có đúng
   1 admin.

6. **Tự sửa thông tin cá nhân** (nghề nghiệp, sđt, nơi ở, ảnh) — sửa trực
   tiếp trên `users`, không cần duyệt (không ảnh hưởng cấu trúc cây).

7. **Đề xuất sửa quan hệ trong họ** — tạo
   `relationship_change_requests(status=pending)`. Admin/deputy duyệt:
   **Duyệt** → Edge Function cập nhật `relationships` + tính lại đời cho
   nhánh liên quan; **Từ chối** → giữ nguyên.

8. **Rời clan** — set `linked_user_id = null`, `role = null` trên person của
   họ. `persons` + `relationships` giữ nguyên vĩnh viễn. Admin phải nhường
   quyền trước khi rời (không thể rời khi đang là admin duy nhất).

## Phân quyền

| Quyền | admin | deputy | member |
|---|---|---|---|
| Mời thành viên | ✓ | ✓ | chỉ khi `invite_permission=all_members` |
| Duyệt đề xuất sửa quan hệ | ✓ | ✓ | ✗ |
| Bổ nhiệm/gỡ deputy | ✓ | ✗ | ✗ |
| Xóa thành viên (unlink) | ✓ | chỉ member thường | ✗ |
| Đổi cài đặt clan | ✓ | ✗ | ✗ |
| Nhường quyền trưởng họ | ✓ (nhập lại mật khẩu) | ✗ | ✗ |
| Sửa thông tin cá nhân | ✓ | ✓ | ✓ |
| Đề xuất sửa quan hệ của mình | ✓ | ✓ | ✓ |
| Rời clan | ✗ (phải nhường quyền trước) | ✓ | ✓ |

Vai trò phong phú hơn (nhiều role tùy chỉnh, ma trận quyền chi tiết) để
Stage 3.

## Xử lý lỗi & ràng buộc dữ liệu

- **Vòng lặp quan hệ:** Edge Function kiểm tra không tạo chu trình
  `parent_child` (A là cha của B, B là cha của A) trước khi ghi.
- **Xung đột đời thứ:** nếu quan hệ mới khiến đời tính ra mâu thuẫn với đời
  đã ghi nhận trước đó cho cùng 1 person → từ chối thao tác, báo lỗi rõ ràng
  thay vì âm thầm ghi đè.
- **Admin duy nhất:** chặn (cả client và Edge Function) việc rời clan hoặc
  tự gỡ role admin nếu chưa nhường quyền cho người khác.
- **Invite trùng:** không tạo invite thứ 2 cho cùng 1 người đang có invite
  `pending` vào cùng clan.
- **Xác thực khi mời qua sđt/email:** người được mời phải xác thực sở hữu
  sđt/email qua OTP khi đăng ký/đăng nhập để nhận invite, tránh mạo danh.
- **Person placeholder:** không có tài khoản liên kết thì `role` luôn
  `null`, không đăng nhập được, hiển thị trong cây với nhãn "chưa có tài
  khoản".

## Testing

- **Unit test (Edge Functions):** lan truyền đời thứ, phát hiện vòng lặp
  quan hệ, ràng buộc admin duy nhất, logic duyệt/từ chối, nhường quyền.
- **RLS policy test:** user ngoài clan không đọc/ghi được dữ liệu của clan
  (test với các JWT khác nhau).
- **Integration test:** đăng ký → tạo clan → mời → chấp nhận → đời tính
  đúng; đề xuất sửa quan hệ → duyệt → cây cập nhật đúng; rời clan →
  persons/relationships còn nguyên, tài khoản mất quyền truy cập.
- **E2E smoke test (Detox hoặc Maestro):** đăng ký → tạo clan → mời thành
  công, chạy trước mỗi release.

## Ngoài phạm vi Stage 1 (để các stage sau)

- Hiển thị cây gia phả trực quan (Stage 2).
- Tính toán và hiển thị xưng hô giữa 2 người bất kỳ (Stage 2).
- Vai trò tùy chỉnh, ma trận quyền chi tiết hơn (Stage 3).
- Quỹ tiền, sự kiện/hoạt động (Stage 4, 5).
- Thanh toán/subscription (sau khi có sản phẩm dùng thử ổn định).

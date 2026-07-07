# Stage 2a — Cho phép lưu cả cha lẫn mẹ cho 1 người

Ngày: 2026-07-07
Trạng thái: Đã duyệt (chờ viết implementation plan)

## Bối cảnh

Stage 2 của roadmap (xem `docs/ROADMAP.md`) là "cây gia phả trực quan + tính
xưng hô". Đợt đầu tiên của Stage 2 (đợt này) giải quyết tính xưng hô trước,
tách thành 3 đợt nhỏ:

- **2a (spec này):** sửa nền tảng dữ liệu để 1 người lưu được cả cha lẫn mẹ.
- 2b: thuật toán tính xưng hô giữa 2 người bất kỳ trong cùng 1 gia tộc.
- 2c: hiển thị xưng hô trong màn hình danh sách thành viên.

Lý do cần 2a: để phân biệt "chú/bác/cô" (anh em của cha, gọi là bên **nội**)
với "cậu/dì" (anh em của mẹ, gọi là bên **ngoại**), thuật toán ở 2b bắt buộc
phải biết cả cha lẫn mẹ của một người. Schema hiện tại (từ Stage 1) chỉ cho
phép ghi nhận **1** cha/mẹ cho mỗi người — ràng buộc
`relationships_no_duplicate_parent` (unique index trên `to_person_id` khi
`type = 'parent_child'`) chặn việc thêm người sinh thành thứ hai.

**Phát hiện quan trọng khi khảo sát code:** logic resolver 12 mã quan hệ
(`supabase/functions/_shared/relations.ts`) **đã được viết sẵn cho mô hình 2
cha mẹ** — `getOrCreateSpecificParent(svc, clanId, personId, gender)` đã tra
cứu và tạo cha/mẹ theo đúng giới tính riêng biệt, không giả định chỉ có 1
cha/mẹ. Trở ngại duy nhất là ràng buộc unique index nói trên. Vì vậy đợt
này **không cần sửa logic resolver**, chỉ cần sửa ràng buộc dữ liệu.

## Thiết kế

### Ràng buộc dữ liệu mới

Thay `relationships_no_duplicate_parent` (unique index, tối đa 1 cha/mẹ)
bằng một **trigger** trên bảng `relationships`, chạy trước khi ghi (`BEFORE
INSERT`) khi `type = 'parent_child'`, kiểm tra 2 điều kiện dựa trên các
dòng `parent_child` đã có sẵn cho cùng `to_person_id`:

1. **Tối đa 2 cha/mẹ:** nếu người con đã có 2 dòng `parent_child` ghi nhận,
   từ chối thêm dòng thứ 3.
2. **Không trùng giới tính đã biết:** nếu người con đã có 1 cha/mẹ với
   `gender` là `male` hoặc `female`, không cho thêm 1 người cha/mẹ khác
   cùng giới tính đó (không thể có 2 người cha, 2 người mẹ). Trường hợp
   giới tính là `unknown` (tạo qua nhánh "anh chị em"/"ông bà không rõ
   nhánh" trong resolver) không bị chặn thêm — đây là dữ liệu chưa đầy đủ
   thông tin từ Stage 1, chấp nhận là hạn chế đã biết, không cố gắng "nâng
   cấp" tự động trong đợt này (xem "Ngoài phạm vi" bên dưới).

Trigger dùng cách tiếp cận nhất quán với các bất biến khác đã có trong
schema Stage 1 (`would_create_cycle`, ràng buộc 1-admin-1-clan) — thực thi
ở tầng database, không chỉ dựa vào Edge Function, để đảm bảo đúng dữ liệu
kể cả khi có thao tác ghi trực tiếp (Studio, script) ngoài luồng ứng dụng
bình thường.

### Không đổi

- **Resolver (`_shared/relations.ts`):** không sửa. Đã đúng sẵn.
- **Edge Functions gọi resolver** (`invite-member`, `respond-invite`,
  `propose-relationship-change`, `review-relationship-change`): không sửa.
- **`would_create_cycle` / `shift_descendant_generations`:** không sửa —
  đây là các hàm duyệt từ 1 người xuống con cháu, không phụ thuộc số lượng
  cha/mẹ của người đó, nên không bị ảnh hưởng bởi việc cho phép 2 cha mẹ.
- **Mobile app:** không đổi màn hình nào trong đợt này. Đây thuần túy là
  nền tảng dữ liệu cho đợt 2b.

### Dữ liệu hiện có

Dự án chưa deploy lên môi trường thật (`docs/ROADMAP.md`), chỉ có dữ liệu
seed/test cục bộ. Không cần script migrate dữ liệu cũ — vì ràng buộc cũ
vốn dĩ chỉ cho phép tối đa 1 cha/mẹ, không có dữ liệu nào đang vi phạm
ràng buộc mới (nới lỏng hơn, không phải thắt chặt hơn).

## Testing

- **Migration/trigger test (mới):** thêm test xác nhận:
  - Thêm cha rồi thêm mẹ cho cùng 1 người → cả 2 đều thành công.
  - Thêm cha, rồi thử thêm 1 người cha thứ 2 (cùng `gender = male`) → bị
    chặn (lỗi database).
  - Thêm 2 cha/mẹ rồi thử thêm người thứ 3 → bị chặn.
- **Test hiện có cần cập nhật:** test nào đang khẳng định việc "resolve
  `father_sibling` rồi `mother_sibling` cho cùng 1 anchor" trả về lỗi 400
  (ghi nhận trong review cuối Stage 1 backend là hạn chế chấp nhận được)
  cần đổi kỳ vọng — giờ phải **thành công**, tạo đúng cả nhánh nội lẫn
  ngoại cho cùng 1 người.
- Không cần thêm test RLS mới (chính sách RLS trên `relationships` không
  đổi, chỉ đổi ràng buộc ghi).

## Ngoài phạm vi đợt này

- Thuật toán tính xưng hô (2b) và giao diện hiển thị (2c) — đợt sau.
- "Nâng cấp" cha/mẹ đã tạo với `gender = unknown` thành `male`/`female` khi
  sau này xác định được — để dành cho một đợt cải thiện chất lượng dữ liệu
  riêng nếu cần, không chặn 2b (2b có thể xử lý trường hợp giới tính chưa
  rõ bằng cách báo xưng hô không xác định được chính xác, thay vì cố suy
  đoán).
- Giao diện nhập liệu cho phép chọn rõ "đây là mẹ" khi thêm quan hệ (màn
  hình mời thành viên/đề xuất sửa quan hệ hiện tại đã dùng đúng mã quan hệ
  `mother`/`father`/`mother_sibling`/`father_sibling` sẵn có từ Stage 1,
  không cần đổi UI).

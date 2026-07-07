# Stage 2b — Thuật toán tính xưng hô giữa 2 người trong cùng gia tộc

Ngày: 2026-07-07
Trạng thái: Đã duyệt (chờ viết implementation plan)

## Bối cảnh

Tiếp theo của Stage 2a (`docs/superpowers/specs/2026-07-07-stage2a-two-parents-design.md`,
đã xong — mỗi người giờ lưu được cả cha lẫn mẹ). Đợt này xây dựng thuật
toán tính ra người xem (**ego**) gọi một thành viên khác (**target**) trong
cùng gia tộc là gì.

Phạm vi đã chốt khi brainstorm:

- Chỉ tính trong cùng 1 gia tộc (dữ liệu quan hệ vốn đã theo `clan_id`).
- Cấp gần: ông bà — cha mẹ — anh chị em (ruột + họ) — cô/dì/chú/bác/cậu —
  con cháu — vợ/chồng trực tiếp. **Không** tính xưng hô với vợ/chồng của
  người thân (anh rể, em dâu...) hay các cấp xa hơn (cụ/kỵ, chắt/chút, họ
  hàng nhiều đời) — để dành cho đợt sau nếu cần.
- **2b chỉ xây hàm tính + lớp dữ liệu (hook), CHƯA gắn vào giao diện hiển
  thị** — việc hiển thị dành cho 2c (đợt kế tiếp).

## Kiến trúc

```
React Native (app/src/queries/useKinshipTerms.ts)
        │  supabase.rpc('get_kinship_terms', { p_clan_id, p_ego_person_id })
        ▼
Postgres function get_kinship_terms() — chạy trong DB, đọc persons +
relationships qua RLS hiện có (client tự truy vấn trực tiếp, không cần
Edge Function vì đây là thao tác đọc, không phải nghiệp vụ ghi nhiều bước)
        │
        ▼
Trả về: table(person_id uuid, term text, is_ambiguous boolean)
— 1 dòng cho mỗi thành viên khác trong clan (trừ chính ego). `term` có thể
`null` nếu quan hệ ngoài phạm vi cấp gần (xem "Trường hợp thiếu dữ liệu"
bên dưới). `is_ambiguous = true` khi tính được xưng hô nhưng không chắc
chắn hoàn toàn (thiếu `dob` để so tuổi, hoặc thiếu `gender` tổ tiên nối để
xác định nội/ngoại).
```

**Lý do chọn Postgres function thay vì Edge Function:** đây là thao tác
đọc thuần túy (không ghi dữ liệu, không cần transaction nhiều bước), giống
tinh thần `would_create_cycle`/`shift_descendant_generations` đã có ở
Stage 1 — chạy ngay trong DB tránh round-trip mạng thêm, tận dụng được
RLS/index có sẵn trên `persons`/`relationships`.

## Thuật toán

### Bước 1: Dựng chuỗi tổ tiên (tối đa 2 đời) cho ego và cho từng target

Với mỗi người, dựng danh sách tổ tiên tối đa 2 cấp:

```
cấp 0: chính người đó
cấp 1: cha (persons.gender='male' qua parent_child), mẹ (gender='female')
cấp 2: ông/bà nội (cha mẹ của người ở cấp-1-cha),
       ông/bà ngoại (cha mẹ của người ở cấp-1-mẹ)
```

Mỗi mục trong chuỗi tổ tiên ghi lại: `person_id`, `distance` (1 hoặc 2),
`side` (`'noi'` nếu qua nhánh cha, `'ngoai'` nếu qua nhánh mẹ — suy ra từ
`gender` của người ở cấp 1, theo đúng cách 2a đã làm cho phép lưu).

### Bước 2: Xác định hình dạng quan hệ

So chuỗi tổ tiên của ego và target (và kiểm tra quan hệ `spouse` trực
tiếp) để xác định 1 trong các hình dạng sau:

| Hình dạng | Điều kiện | Ví dụ |
|---|---|---|
| Bản thân | ego = target | (không áp dụng) |
| Vợ/chồng | có `relationships` type=`spouse` nối trực tiếp ego-target | — |
| Tổ tiên trực tiếp (cấp 1) | target nằm trong chuỗi tổ tiên cấp-1 của ego | cha, mẹ |
| Tổ tiên trực tiếp (cấp 2) | target nằm trong chuỗi tổ tiên cấp-2 của ego | ông nội, bà ngoại... |
| Hậu duệ trực tiếp (cấp 1) | ego nằm trong chuỗi tổ tiên cấp-1 của target | con |
| Hậu duệ trực tiếp (cấp 2) | ego nằm trong chuỗi tổ tiên cấp-2 của target | cháu |
| Anh chị em ruột | chung tổ tiên cấp-1 (cùng cha hoặc cùng mẹ) | anh/chị/em |
| Anh chị em họ | chung tổ tiên cấp-2 (cùng ông/bà), khác tổ tiên cấp-1 | anh/chị/em họ |
| Cô/dì/chú/bác/cậu | tổ tiên cấp-1 của ego trùng tổ tiên cấp-2 của target (target 1 đời trên ego, qua anh/chị/em của cha/mẹ ego) | bác, chú, cô, cậu, dì |
| Cháu (gọi bằng cô/dì/chú/bác/cậu) | ngược lại hình trên | cháu |
| Không xác định | không khớp hình nào ở trên (ngoài phạm vi cấp gần) | trả `null` |

### Bước 3: Tra bảng xưng hô

**Tổ tiên/hậu duệ trực tiếp:**

| Khoảng cách | Bên | Giới tính target | Xưng hô |
|---|---|---|---|
| Cấp 1 lên | — | male | cha |
| Cấp 1 lên | — | female | mẹ |
| Cấp 1 xuống | — | — | con |
| Cấp 2 lên | nội | male | ông nội |
| Cấp 2 lên | nội | female | bà nội |
| Cấp 2 lên | ngoại | male | ông ngoại |
| Cấp 2 lên | ngoại | female | bà ngoại |
| Cấp 2 xuống | — | — | cháu |

**Cô/dì/chú/bác/cậu (target 1 đời trên ego, qua anh/chị/em của cha/mẹ):**

| Bên | Giới tính target | Tuổi target so với cha/mẹ ego (người nối) | Xưng hô |
|---|---|---|---|
| nội (qua cha) | male | lớn hơn cha | bác |
| nội (qua cha) | male | nhỏ hơn cha | chú |
| nội (qua cha) | female | (mọi trường hợp) | cô |
| ngoại (qua mẹ) | male | (mọi trường hợp) | cậu |
| ngoại (qua mẹ) | female | (mọi trường hợp) | dì |

Chiều ngược lại (ego là bác/chú/cô/cậu/dì của target): luôn là **cháu**.

**Anh chị em ruột và anh chị em họ:** so `dob` của ego và target.

| So sánh `dob` | Giới tính target | Xưng hô (ruột) | Xưng hô (họ, qua ông/bà) |
|---|---|---|---|
| target sinh trước ego | male | anh | anh họ |
| target sinh trước ego | female | chị | chị họ |
| target sinh sau ego | — | em | em họ |
| không xác định (thiếu `dob` 1 trong 2 người) | — | "anh/em" (mơ hồ) | "anh/em họ" (mơ hồ) |

**Vợ/chồng:**

| Giới tính target | Xưng hô |
|---|---|
| female | vợ |
| male | chồng |

### Trường hợp thiếu dữ liệu

- Thiếu `gender` của tổ tiên nối (cấp 1 hoặc cấp 2) → không xác định được
  bên nội/ngoại chính xác → trả về nhãn mơ hồ theo mẫu "cô/dì" hoặc
  "chú/bác/cậu" gộp, kèm cờ `is_ambiguous = true` để 2c có thể hiển thị
  khác đi (vd chữ nghiêng, hoặc icon cảnh báo nhỏ).
- Thiếu `dob` khi cần so tuổi → xem bảng trên (nhãn gộp "anh/em").
- Hình dạng quan hệ ngoài phạm vi cấp gần → trả `term = null`, 2c tự quyết
  định hiển thị gì (dự kiến: không hiển thị dòng phụ, hoặc "chưa xác
  định").

## Thay đổi giao diện cần thiết (thu thập `dob`)

Khảo sát hiện tại: **không có màn hình nào cho phép nhập `dob`**, kể cả
màn hồ sơ cá nhân. Cần bổ sung tối thiểu:

- `app/src/app/(main)/clan/[id]/invite.tsx` (màn Mời thành viên): thêm ô
  nhập ngày sinh. **Bắt buộc** khi `relation_code` là `sibling`,
  `father_sibling`, hoặc `mother_sibling` (các trường hợp cần so tuổi để
  ra đúng xưng hô); các mã quan hệ khác (father/mother/son/daughter/
  spouse/grandparent) để tùy chọn.
- `app/src/app/(main)/profile.tsx` (màn Hồ sơ cá nhân): thêm ô ngày sinh.

**Cập nhật sau khi khảo sát:** `persons` (nơi thuật toán đọc `dob`) không
cho phép client ghi trực tiếp — mọi thay đổi phải qua Edge Function dùng
service_role (nguyên tắc đã có từ Stage 1). `updateMyProfile` hiện tại chỉ
sửa bảng `users` (tài khoản), không phải `persons` (hồ sơ trong cây), nên
không thể chỉ "mở rộng `updateMyProfile`" như dự kiến ban đầu — làm vậy sẽ
khiến ô ngày sinh ở màn Hồ sơ cá nhân không giúp được gì cho thuật toán.

**Quyết định:** thêm 1 Edge Function mới, `update-my-person-info`, nhận
`{ dob }`, cập nhật `persons.dob` cho (các) dòng `persons` có
`linked_user_id` = người gọi (xử lý được cả trường hợp 1 tài khoản thuộc
nhiều gia tộc). Màn Hồ sơ cá nhân gọi function này thay vì
`updateMyProfile` cho riêng trường `dob` (các trường khác — họ tên, sđt,
nghề nghiệp, nơi ở — vẫn qua `updateMyProfile` như cũ, không đổi).

- **Ngoài phạm vi:** sửa `dob` cho người đã tồn tại từ trước mà KHÔNG phải
  chính mình (đặc biệt placeholder chưa có tài khoản liên kết) — chưa có
  màn "sửa thông tin người khác" ở Stage 1/2a. Với các trường hợp này,
  thuật toán rơi vào nhánh "thiếu dữ liệu" ở trên, không chặn tính năng.

## Testing

- **Unit test thuật toán (Postgres function), theo pattern
  `would_create_cycle`/`shift_descendant_generations` đã có:**
  - Cha/mẹ, ông bà nội/ngoại (cả 4 tổ hợp giới tính × bên).
  - Con/cháu (chiều ngược).
  - Anh/chị/em ruột — cả 2 chiều tuổi, cả trường hợp thiếu `dob`.
  - Anh/chị/em họ qua ông/bà — tương tự.
  - Bác/chú/cô (bên nội, cả 2 chiều tuổi so với cha) — cậu/dì (bên ngoại).
  - Cháu gọi ngược lại bác/chú/cô/cậu/dì.
  - Vợ/chồng.
  - Trường hợp ngoài phạm vi (vd anh em họ đời xa hơn ông/bà) → `term =
    null`.
  - Trường hợp thiếu `gender` tổ tiên nối → `is_ambiguous = true`.
- **Test hook `useKinshipTerms`:** gọi đúng RPC với đúng tham số, trả về
  đúng shape dữ, xử lý trạng thái loading/error theo pattern các hook hiện
  có (`useClanMembers`).
- **Test giao diện nhập `dob` mới:** `invite.tsx` bắt buộc nhập khi đúng
  3 mã quan hệ nêu trên, không bắt buộc với các mã còn lại; `profile.tsx`
  gọi đúng Edge Function `update-my-person-info` với `dob`.
- **Test Edge Function `update-my-person-info` (mới):** cập nhật đúng
  `persons.dob` cho (các) person có `linked_user_id` = người gọi; không
  ảnh hưởng person của người khác.

## Ngoài phạm vi đợt này

- Hiển thị xưng hô trong giao diện (2c).
- Xưng hô với vợ/chồng của người thân (anh rể, em dâu, chị dâu, em rể...).
- Xưng hô ngoài phạm vi cấp gần (cụ/kỵ, chắt/chút, họ hàng đời xa, anh chị
  em họ đời 2 trở lên).
- Sửa `dob` cho người khác (placeholder hoặc thành viên khác) — cần 1 màn
  "sửa thông tin thành viên" mới, chưa có ở Stage 1/2a.
- Cây gia phả trực quan (2d, đợt riêng theo roadmap).

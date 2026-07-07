# Phả Ký — Roadmap tổng

Nguồn sự thật duy nhất cho "dự án đang ở đâu, cái gì xong, cái gì chưa".
Cập nhật file này mỗi khi một giai đoạn hoàn thành hoặc phạm vi thay đổi.

## Tầm nhìn sản phẩm

Ứng dụng mobile gia phả đa gia tộc (mỗi gia tộc là 1 "space" độc lập).
Người dùng đăng ký, tạo hoặc tham gia gia tộc, quản lý cây gia phả, tính
quan hệ/xưng hô, quản lý quỹ tiền, tổ chức sự kiện.

Nguồn: `docs/superpowers/specs/2026-07-01-stage1-foundation-design.md`
("Bối cảnh & phạm vi dự án tổng thể").

## Các giai đoạn

| # | Giai đoạn | Trạng thái | Spec | Plan |
|---|---|---|---|---|
| 1 | Auth + tạo/tham gia gia tộc + mời thành viên + quan hệ/đời + duyệt thay đổi + phân quyền cơ bản (admin/phó/member) | ✅ Xong | [spec](superpowers/specs/2026-07-01-stage1-foundation-design.md) | [backend plan](superpowers/plans/2026-07-01-stage1-backend.md) |
| 1b | Giao diện mobile cho toàn bộ Stage 1 (13 màn hình) | ✅ Xong | [spec](superpowers/specs/2026-07-06-stage1-mobile-ui-design.md) | [plan](superpowers/plans/2026-07-06-stage1-mobile-ui.md) |
| 1c | Thiết kế lại giao diện — theme tối "Ink Root Dark Premium" | ✅ Xong (2 đợt) | [spec](superpowers/specs/2026-07-06-stage1-mobile-ui-visual-refresh-design.md) | [wave1](superpowers/plans/2026-07-06-stage1-mobile-ui-visual-refresh-wave1.md), [wave2](superpowers/plans/2026-07-06-stage1-mobile-ui-visual-refresh-wave2.md) |
| 2a | Nền tảng: cho phép lưu cả cha lẫn mẹ cho 1 người (cần để tính đúng bên nội/ngoại) | ✅ Xong | [spec](superpowers/specs/2026-07-07-stage2a-two-parents-design.md) | (không cần plan riêng — code đã có sẵn khi bắt đầu, chỉ review+sửa+commit) |
| 2b | Thuật toán tính xưng hô giữa 2 người bất kỳ trong cùng 1 gia tộc | ⬜ Chưa bắt đầu | — | — |
| 2c | Hiển thị xưng hô trong danh sách thành viên | ⬜ Chưa bắt đầu | — | — |
| 2d | Cây gia phả trực quan | ⬜ Chưa bắt đầu | — | — |
| 3 | Vai trò tùy chỉnh, phân quyền chi tiết hơn | ⬜ Chưa bắt đầu | — | — |
| 4 | Quỹ tiền (thu/chi, quỹ khuyến học) | ⬜ Chưa bắt đầu | — | — |
| 5 | Sự kiện/hoạt động (giỗ họ, hội hè) | ⬜ Chưa bắt đầu | — | — |
| — | Thanh toán/subscription | ⬜ Sau khi có sản phẩm dùng thử ổn định | — | — |

## Trạng thái hiện tại (2026-07-07)

- **Backend:** Supabase (Postgres + RLS + 8 Edge Functions) — 6 bảng, đầy đủ
  test (unit + RLS + integration + e2e). Đã merge vào `master`.
- **Mobile app:** Expo/React Native, 13 màn hình khớp 1-1 với các luồng
  nghiệp vụ Stage 1, giao diện tối "Ink Root Dark Premium" đồng bộ toàn bộ.
  Đã merge vào `master`.
- **Stage 2a:** mỗi người trong cây giờ lưu được cả cha lẫn mẹ (trước đây
  chỉ 1). Nền tảng bắt buộc để Stage 2b tính đúng "chú/bác/cô" (bên nội)
  khác "cậu/dì" (bên ngoại). Đã merge vào `master`.
- **Repo:** `master` là nhánh chính, đã push lên GitHub
  (`https://github.com/Ryan1712/Kinora`). Chưa có CI/CD, chưa deploy lên
  Supabase cloud (mới chạy local qua Docker).
- **Ghi chú vận hành:** local Supabase (`npx supabase start`) đôi khi để
  container `edge_runtime` ở trạng thái dừng dù không báo lỗi — nếu gọi Edge
  Function trả về 503, chạy `npx supabase stop` rồi `npx supabase start`
  lại. Sau khi thêm migration mới, `supabase start` không tự áp dụng vào DB
  đã tồn tại — cần `npx supabase db reset` để áp dụng.

## Bước tiếp theo có thể chọn

1. **Tiếp tục Stage 2b** (thuật toán tính xưng hô) — bước tự nhiên tiếp
   theo, nền tảng dữ liệu (2a) đã sẵn sàng.
2. **Deploy Stage 1+2a lên môi trường thật** (Supabase cloud + build app
   thật qua EAS) để tự trải nghiệm trên điện thoại thay vì chỉ xem qua
   trình duyệt/localhost.
3. **Mời người dùng thử** trước khi đầu tư thêm — thu phản hồi thật trước
   khi build tiếp.
4. Việc khác bạn muốn ưu tiên hơn cả 3 hướng trên.

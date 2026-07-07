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
| 2 | Cây gia phả trực quan + tính xưng hô giữa 2 người bất kỳ | ⬜ Chưa bắt đầu | — | — |
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
- **Repo:** `master` là nhánh chính, đã push lên GitHub
  (`https://github.com/Ryan1712/Kinora`). Chưa có CI/CD, chưa deploy lên
  Supabase cloud (mới chạy local qua Docker).
- **Chưa làm ở Stage 1:** không có — Stage 1 coi như hoàn chỉnh theo đúng
  phạm vi đã chốt trong spec gốc.

## Bước tiếp theo có thể chọn

1. **Bắt đầu Stage 2** (cây gia phả trực quan + xưng hô) — giai đoạn tiếp
   theo trong roadmap gốc, nhiều khả năng là bước tự nhiên nhất.
2. **Deploy Stage 1 lên môi trường thật** (Supabase cloud + build app thật
   qua EAS) để tự trải nghiệm trên điện thoại thay vì chỉ xem qua trình
   duyệt/localhost.
3. **Mời người dùng thử Stage 1** trước khi đầu tư thêm — thu phản hồi thật
   trước khi build Stage 2.
4. Việc khác bạn muốn ưu tiên hơn cả 3 hướng trên.

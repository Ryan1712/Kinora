# Stage 1 Mobile UI - Manual QA Checklist

Run against the local Supabase stack (`supabase start` + `functions serve`) with two real accounts (Account A = admin, Account B = invitee).

- [ ] Sign up as Account A (email/password) - lands on the clan list, empty state
- [ ] Create a clan as Account A (name, branch type, own generation) - lands on the new clan home screen, shows Account A as the sole member with role `admin`
- [ ] Sign up as Account B in a second session/device
- [ ] As Account A: invite Account B via `father` relation, using Account B's email as contact - invite succeeds
- [ ] As Account B: see the pending invite in the invites inbox, accept it - Account B now appears in the clan member list at the correct generation
- [ ] As Account B: propose a relationship change
- [ ] As Account A: see the pending request under requests, approve it - Account B's relationship updates correctly in the member list
- [ ] As Account A: open Account B's member detail, appoint Account B as deputy - role badge updates to `deputy`
- [ ] As Account A: open clan settings, change invite permission to all members, save - no errors
- [ ] As Account B (now deputy): invite a third test account - succeeds when permissions allow it
- [ ] As Account A: open transfer-admin, select Account B, enter Account A's correct password, confirm - Account A becomes `member`, Account B becomes `admin`
- [ ] As Account A (now plain member): leave the clan from the clan home screen - Account A no longer appears in the clan list
- [ ] Edit profile (Account B): change occupation/phone/address, save, reload the profile screen - changes persisted
- [ ] Sign out and sign back in as Account B - session persists correctly and lands on the clan list

# Manual verification checklist

- [ ] Home loads on desktop, iPhone-size mobile, Android-size mobile; bottom navigation works.
- [ ] Guest can view Home, Collection, Community, Events, Shop, Fansites and message previews.
- [ ] New account registers, then can sign out and sign in again.
- [ ] Collection shows starter R/SR cards, locked cards and progress accurately.
- [ ] A demo pull costs 300 test STARS; pulling different rarities updates the album.
- [ ] At pull 30 the remaining missing cards are granted, album is 100%, and free-set preview unlocks.
- [ ] Refilling test STARS does not purchase anything.
- [ ] Attempting to list an only copy for trading is rejected; listing an extra duplicate works.
- [ ] Exchanging duplicates cannot remove the other fan's last copy.
- [ ] Physical set order preview is rejected until the album is complete.
- [ ] After first preview order, the second is rejected until 90 days elapse.
- [ ] Demo physical pack code works once, then becomes invalid.
- [ ] Posting a fan edit with an Instagram/TikTok URL creates a shared feed post with outbound link.
- [ ] Community post report appears in management dashboard.
- [ ] Fansite applicant must provide camera gear, portfolio link and description.
- [ ] Admin can approve/reject a fansite. Approved fansite appears in the Community tab and receives votes.
- [ ] Replies to member messages are gated in free mode; subscriber preview remains demo-only.
- [ ] Management publishes announcements after successful admin login.
- [ ] No payment or order button claims to have processed a real purchase.
- [ ] Railway volume persistence survives redeployment with `DATA_DIR=/data` and stable `SESSION_SECRET`.

The automated API smoke suite can be run with `npm test`.

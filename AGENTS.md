<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Reference imported original media through current-project Lovable Assets pointers, not another project's pointers, so photos load in every deployment.
- Use the pure account-pairing helper to group administrator account lists by profiles.referred_by, never positional sorting, so filtering and multiple referrals preserve the true relationship.
- Derive displayed membership counts from WAREHOUSE_TIERS rather than legacy vip_plans rows, so overview totals match the membership selector without changing stored user ranks.
- Build public og:url and canonical URLs from the request origin through getRequestOrigin so each page self-references on its published domain.
- Centralize shared-link image policy in social-sharing and enforce it after normal HTML/access handling in request middleware; use explicit empty image fields and metadata-only responses for known unfurl crawlers to avoid screenshot/body-image fallbacks without changing browser pages, and vary by User-Agent to prevent cross-client cache mixing.
- Gate every _authenticated page with the role-guard helpers (requireAdminPanel / requireUserPanel) in beforeLoad, so admins and members each land only in their own panel; server functions still verify roles themselves.
- Store formatted administrator chat as a versioned, allowlisted text document in the existing message body and render it through ChatMessageBody, so both panels preserve formatting without interpreting HTML or altering legacy messages; compose replies with Tiptap using SSR-safe deferred initialization.
- Use support_contacts as the single source for all support links, with role-checked revisioned database RPC writes and tombstones for explicit removal; share one root-mounted Realtime subscription with query refresh on reconnect so defaults and stale drafts never overwrite contacts.
- Fetch Cashout history through the account-scoped paginated cashout-history reader and a distinct my-tx cache suffix, so cash movements never collide with promotion histories or truncate older matching records.
- Platform-wide writes are Super Admin-only, while restricted admins can manage their own created training accounts; enforce ownership and roles in server functions/RLS and mirror them in AdminReadOnlyContext so direct calls cannot widen access.
- Provision confirmed admins with validated credentials and rollback incomplete new accounts; list login emails only through a Super Admin-checked function, so successful creation always has a usable identity and role.
- Authenticate username/password in a POST server function before returning session tokens, never return login emails publicly; treat both admin roles as administrator access and clear prior-account caches at sign-in.
- Persist general configuration through a Super Admin-checked field-level compare-and-save RPC; consume it in member/public views and root-mounted Realtime refresh so stale settings and local-only success messages cannot replace saved values.
- Provision training accounts through a validated rollback-capable helper and adjust wallet/earnings with a row-locked ownership-checked RPC so account failures and simultaneous administrators cannot lose saved data.

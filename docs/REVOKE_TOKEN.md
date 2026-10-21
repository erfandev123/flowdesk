# GitHub Token — Revoke After Use

You created a Personal Access Token to push this repository. **Revoke it now
that the push is done.**

A token in a chat message or in a shell history is effectively public. Revoking
it costs you nothing — you can always create another one.

---

## Revoke it (30 seconds)

1. Open https://github.com/settings/tokens
2. Click the token named **`ghp_mykpuoo93LMDnalyi6VkLAcyit2eE9Ap`**
   (or whatever name you gave it)
3. Click **Delete** → confirm.

That is it. The token stops working immediately.

---

## Why this matters

That token can:
- Push to every repository your account can write to
- Read your private repositories
- Act as you via the GitHub API (create issues, modify settings, and so on)

It does **not** expose your account password, and it does **not** grant access
to anything beyond the scopes you selected. But `repo` scope is broad, so
revoking it is worth 30 seconds.

---

## For future pushes

Never put a token in a command line again. Two better options:

### Option A — Git Credential Manager (recommended)

Windows Git for Windows ships with Credential Manager. The first push asks for
a username and a personal access token, and then **stores it encrypted on your
machine**. You never type it again.

```bash
git push
# Username: erfandev123
# Password: <paste your token>
```

After the first time it is saved and future pushes are silent.

### Option B — GitHub CLI

```bash
winget install --id GitHub.cli
gh auth login
gh auth setup-git
```

Then `git push` works with no token in your shell history at all.

---

## The token used for this push

For this push only, the token was passed to Git through a temporary
`http.extraHeader` option on the command line. It was **not** written into
`.git/config`, **not** saved to the credential store, and **not** committed to
the repository.

The repository's remote is the clean public URL:

```
origin  https://github.com/erfandev123/flowdesk.git
```

So there is nothing to clean up locally — just revoke the token on GitHub.

---

## Checklist

- [ ] Token revoked at https://github.com/settings/tokens
- [ ] A fresh token created for future use, with only the scopes you need
- [ ] Fresh token stored in Credential Manager (not in a command line)
- [ ] `git remote -v` still shows only `https://github.com/erfandev123/flowdesk.git`
- [ ] No token appears in the repository history

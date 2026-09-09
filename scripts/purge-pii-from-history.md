# Purge leaked PII (`state.json` + data dumps) from git history

`state.json` contains **real user emails + wallet addresses** and is committed
across the repo's history. Untracking it (already done) only stops *future*
commits — the data still sits in every past commit and on any remote/clone.
This scrubs it from all history.

> ⚠️ **This rewrites history and requires a force-push.** Every collaborator
> must re-clone or hard-reset afterward. Do it when no one else is mid-work.
> Make a backup clone first: `git clone --mirror . ../MMA_robot-backup.git`

## 1. Install git-filter-repo (recommended tool)

```bash
brew install git-filter-repo        # macOS
# or: pipx install git-filter-repo
```

## 2. Scrub the files from all commits

```bash
cd /Users/lacsomot/Desktop/personal/MMA_robot

git filter-repo --force \
  --invert-paths \
  --path state.json \
  --path leaderboard.csv \
  --path leaderboard_export.csv \
  --path epoch2_leaderboard.csv \
  --path epoch2_top2.csv \
  --path epoch2_mindshare_data.zip \
  --path data/mindshare/epoch2_daily_snapshots.jsonl \
  --path data/mindshare/epoch2_daily_state.json \
  --path data/mindshare/epoch2_leaderboard_snapshot.json \
  --path-glob 'data/mindshare/backups/*'
```

`--invert-paths` means "remove these paths from every commit." The working-tree
copies stay on disk (they're now git-ignored); only history is rewritten.

## 3. Re-add remotes (filter-repo drops them) and force-push ALL of them

This repo pushes to THREE GitHub remotes — the PII is likely on all three, so
each must be rewritten:

```bash
git remote add expert   https://github.com/expertdicer/sr.git
git remote add external https://github.com/NMHx2005/MMA_robot
git remote add origin   https://github.com/dsc-labs/frontend.git

for r in expert external origin; do
  git push "$r" --force --all
  git push "$r" --force --tags
done
```

> If any of these repos are no longer yours to control, the exposure there
> cannot be fully undone by you — see step 5.

## 4. Everyone else re-clones

Old clones still contain the PII. Have collaborators delete and re-clone, or:

```bash
git fetch origin && git reset --hard origin/<branch>
```

## 5. Rotate / notify

- The leaked emails include an `@nibiru.org` address — treat this as a real data
  exposure. Notify whoever owns that user data.
- If the repo was ever pushed to a hosting provider (GitHub/GitLab), the data may
  be cached in their systems even after force-push. Contact their support to
  purge cached views if this was a public or shared remote.

## Alternative: BFG Repo-Cleaner

```bash
brew install bfg
bfg --delete-files state.json
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push origin --force --all
```

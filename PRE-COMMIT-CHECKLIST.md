# ✅ Pre-Commit Checklist for GitHub

Before pushing to GitHub, verify these items:

## 🔒 Security

- [ ] `backend/.env` is **NOT** committed (contains your actual API key)
- [ ] `backend/.env.example` **IS** committed (with placeholder values)
- [ ] `frontend/.env.local` is **NOT** committed (if it exists)
- [ ] `frontend/.env.example` **IS** committed
- [ ] No API keys, tokens, or secrets in any committed files
- [ ] `.gitignore` is properly configured

## 📦 Dependencies

- [ ] `backend/requirements.txt` is up to date
- [ ] `frontend/package.json` and `package-lock.json` are committed
- [ ] `backend/.python-version` specifies Python 3.10.12

## 📝 Documentation

- [ ] `README.md` has correct setup instructions
- [ ] `SETUP.md` provides detailed step-by-step guide
- [ ] All code comments are clear and helpful
- [ ] API endpoints are documented

## 🧪 Testing

- [ ] Backend starts without errors: `uvicorn main:app --reload --port 8000`
- [ ] Frontend starts without errors: `npm run dev`
- [ ] Can process a YouTube URL successfully
- [ ] Can upload a video file successfully
- [ ] 3D skill tree renders correctly
- [ ] Flashcards and quizzes work

## 🗂️ File Structure

- [ ] No `__pycache__/` directories committed
- [ ] No `node_modules/` committed
- [ ] No `venv/` or `.venv/` committed
- [ ] No `backend/uploads/` files committed
- [ ] No `.next/` build files committed
- [ ] No database files (`*.db`, `*.sqlite`) committed

## 🔧 Configuration Files

Files that **SHOULD** be committed:
- ✅ `.gitignore`
- ✅ `backend/.env.example`
- ✅ `backend/.python-version`
- ✅ `backend/requirements.txt`
- ✅ `frontend/.env.example`
- ✅ `frontend/package.json`
- ✅ `frontend/package-lock.json`
- ✅ `README.md`
- ✅ `SETUP.md`
- ✅ All source code files

Files that **SHOULD NOT** be committed:
- ❌ `backend/.env` (your actual API key)
- ❌ `frontend/.env.local`
- ❌ `backend/venv/`
- ❌ `frontend/node_modules/`
- ❌ `backend/__pycache__/`
- ❌ `backend/uploads/`
- ❌ `backend/*.db`
- ❌ `frontend/.next/`

---

## Quick Verification Commands

```bash
# Check what files will be committed
git status

# Check for sensitive data
git diff --cached | grep -i "api.*key\|secret\|password\|token"

# Verify .gitignore is working
git check-ignore backend/.env
# Should output: backend/.env

git check-ignore backend/venv/
# Should output: backend/venv/

git check-ignore frontend/node_modules/
# Should output: frontend/node_modules/
```

---

## Ready to Push!

Once all items are checked:

```bash
# Add all files
git add .

# Commit with a descriptive message
git commit -m "Initial commit: Lumina - AI-powered video to interactive course"

# Push to GitHub
git push origin main
```

---

## After Pushing

Update your README.md with the correct GitHub URL:
- Replace `YOUR_USERNAME` with your actual GitHub username
- Update clone command: `git clone https://github.com/YOUR_USERNAME/Lumina.git`

---

## 🚨 If You Accidentally Committed Secrets

If you accidentally committed your `.env` file with your API key:

```bash
# Remove from git history (⚠️ This rewrites history!)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/.env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (⚠️ Only if you haven't shared the repo yet!)
git push origin --force --all

# IMPORTANT: Regenerate your API key at:
# https://aistudio.google.com/apikey
```

**Better approach:** Delete the repository and create a new one with the correct files.

---

Happy coding! 🌟

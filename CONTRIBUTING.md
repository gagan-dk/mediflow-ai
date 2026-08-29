# 🤝 Contributing to MediFlow AI

Thank you for your interest in contributing! This guide will help you get set up and make your first contribution.

---

## 📋 Before You Start

- Make sure you have read the [README.md](README.md) and can run the project locally.
- Check the [Issues](https://github.com/gagan-dk/mediflow-ai/issues) tab for open tasks before starting something new.
- For major changes, open an issue first to discuss what you'd like to change.

---

## 🍴 Fork & Setup

1. **Fork** the repo on GitHub (top-right button).

2. **Clone** your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/mediflow-ai.git
   cd mediflow-ai
   ```

3. **Install dependencies** (this is the Node.js equivalent of pip install):
   ```bash
   npm install
   ```

4. **Add the upstream remote** to pull in future changes:
   ```bash
   git remote add upstream https://github.com/gagan-dk/mediflow-ai.git
   ```

5. **Verify remotes:**
   ```bash
   git remote -v
   # origin    https://github.com/YOUR_USERNAME/mediflow-ai.git (fetch)
   # upstream  https://github.com/gagan-dk/mediflow-ai.git (fetch)
   ```

---

## 🌿 Branching Strategy

Always create a new branch for your work. **Never commit directly to `main`.**

```bash
# Sync your fork with the latest upstream changes first
git fetch upstream
git checkout main
git merge upstream/main

# Create a new branch for your feature or fix
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-you-are-fixing
```

**Branch naming conventions:**

| Prefix | Usage |
|---|---|
| `feature/` | New features or enhancements |
| `fix/` | Bug fixes |
| `docs/` | Documentation only changes |
| `refactor/` | Code refactoring, no feature change |
| `chore/` | Maintenance tasks |

---

## 💻 Development Workflow

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Make your changes in the `src/` directory.

3. Verify your code builds without errors:
   ```bash
   npm run build
   ```

4. Stage and commit your changes:
   ```bash
   git add .
   git commit -m "feat: add ambulance ETA display on map"
   ```

---

## ✏️ Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short description>

[optional body]
```

**Types:**

| Type | When to use |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation changes |
| `style` | Formatting, missing semi-colons, etc. |
| `refactor` | Code change that is not a fix or feature |
| `test` | Adding tests |
| `chore` | Changes to build process or tools |

**Examples:**
```
feat: add hospital pre-alert notification sound
fix: resolve map marker not updating on re-route
docs: update contributing guidelines
```

---

## 📬 Submitting a Pull Request

1. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. Go to your fork on GitHub and click **"Compare & pull request"**.

3. Fill in the PR template:
   - **What does this PR do?**
   - **How to test it?**
   - **Screenshots** (if UI changes)

4. Set the base branch to `gagan-dk/mediflow-ai:main`.

5. Wait for review. Address any feedback by pushing new commits to the same branch.

---

## 📐 Code Style Guidelines

- **TypeScript**: Use proper types — avoid `any`.
- **Components**: One component per file, named in PascalCase.
- **Services**: Business logic stays in `src/services/`, not in components.
- **Types**: All shared interfaces go in `src/types/`.
- **CSS**: Use Tailwind utility classes; add custom styles to `src/index.css` only when necessary.

---

## 🗂️ Project Areas to Contribute

| Area | Files | Good for |
|---|---|---|
| UI Components | `src/components/` | Frontend / React devs |
| Page layouts | `src/pages/` | UI/UX contributors |
| AI/Logic engines | `src/services/` | Algorithm / backend logic |
| Type definitions | `src/types/` | TypeScript experts |
| Styling | `src/index.css`, `tailwind.config.js` | CSS / design contributors |
| Docs | `README.md`, `CONTRIBUTING.md` | Technical writers |

---

## ❓ Questions?

Open a [GitHub Discussion](https://github.com/gagan-dk/mediflow-ai/discussions) or file an [Issue](https://github.com/gagan-dk/mediflow-ai/issues).

We appreciate every contribution, big or small! 🙌

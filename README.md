# 🏥 MediFlow AI

> **AI-powered emergency medical dispatch and hospital routing system** — connecting patients to the right care, faster.

[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.1-646CFF?logo=vite)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38BDF8?logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📌 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🧠 About

**MediFlow AI** is a real-time emergency medical intelligence platform that:
- Triages patients using an AI-driven assessment engine
- Matches ambulances to the most appropriate hospital based on capacity, specialty, and distance
- Provides live queue management for hospital command centers
- Sends pre-alerts to receiving hospitals before patient arrival
- Offers dynamic re-routing when conditions change mid-transport

This project is open to contributors looking to make a meaningful impact in healthcare technology.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🚑 Emergency Assessment | Symptom-based AI triage with severity scoring |
| 🗺️ Interactive Map | Live ambulance tracking with Leaflet.js |
| 🏥 Hospital Finder | Real-time capacity and specialty matching |
| 📊 Command Center | Hospital-side live queue and bed management |
| 🔔 Pre-Alert System | Automatic advance notifications to receiving hospitals |
| 🔄 Dynamic Re-routing | Mid-transport hospital switching with smart alerts |
| 📈 System Insights | Analytics dashboard with charts and KPIs |
| 🔒 Privacy & Security | Patient data handling and consent flows |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **Vite** | Build tool & dev server |
| **Tailwind CSS** | Utility-first styling |
| **Leaflet / React-Leaflet** | Interactive maps |
| **Recharts** | Data visualizations |
| **Lucide React** | Icon library |
| **Canvas Confetti** | Celebratory UI effects |

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- **Node.js** `v18+` — [Download](https://nodejs.org/)
- **npm** `v9+` (comes with Node.js)
- **Git** — [Download](https://git-scm.com/)

Verify your installations:
```bash
node --version   # should print v18.x.x or higher
npm --version    # should print 9.x.x or higher
git --version
```

### Installation

1. **Fork this repository** by clicking the **Fork** button at the top-right of this page.

2. **Clone your fork** to your local machine:
   ```bash
   git clone https://github.com/YOUR_USERNAME/mediflow-ai.git
   cd mediflow-ai
   ```

3. **Install all dependencies** (`npm install` is the Node.js equivalent of `pip install -r requirements.txt`):
   ```bash
   npm install
   ```
   > This reads `package.json` and installs every library listed under `dependencies` and `devDependencies` into a local `node_modules/` folder.

4. **Add the upstream remote** so you can pull future updates from the original repo:
   ```bash
   git remote add upstream https://github.com/gagan-dk/mediflow-ai.git
   ```

---

### Running Locally

```bash
npm run dev
```

Open your browser and navigate to: **http://localhost:5173**

The app hot-reloads automatically on file changes. 🔥

**Available scripts:**

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |

---

## 📁 Project Structure

```
mediflow-ai/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Navbar.tsx
│   │   ├── InteractiveMap.tsx
│   │   ├── NotificationDrawer.tsx
│   │   ├── PreAlertBanner.tsx
│   │   ├── PreAlertModal.tsx
│   │   ├── ReroutingAlertModal.tsx
│   │   ├── DisclaimerBanner.tsx
│   │   └── Footer.tsx
│   ├── pages/               # Full page views
│   │   ├── LandingPage.tsx
│   │   ├── EmergencyAssessmentPage.tsx
│   │   ├── AssessmentResultPage.tsx
│   │   ├── HospitalFinderPage.tsx
│   │   ├── EmergencyTransportPage.tsx
│   │   ├── HospitalCommandCenterPage.tsx
│   │   ├── LiveQueuePage.tsx
│   │   ├── PatientJourneyPage.tsx
│   │   ├── SystemInsightsPage.tsx
│   │   └── PrivacySecurityPage.tsx
│   ├── services/            # Business logic and data engines
│   │   ├── mockData.ts
│   │   ├── prioritizationEngine.ts
│   │   ├── facilityMatchingEngine.ts
│   │   ├── rankingEngine.ts
│   │   ├── simulationEngine.ts
│   │   ├── realHospitalService.ts
│   │   └── soundEffects.ts
│   ├── types/               # TypeScript type definitions
│   │   ├── hospital.ts
│   │   ├── ambulance.ts
│   │   ├── queue.ts
│   │   ├── user.ts
│   │   ├── notification.ts
│   │   ├── preAlert.ts
│   │   ├── prioritization.ts
│   │   └── simulation.ts
│   ├── context/
│   │   └── AppContext.tsx    # Global state management
│   ├── App.tsx              # Root component & routing
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── index.html               # HTML entry point
├── package.json             # Project metadata & ALL dependencies
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite build configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── postcss.config.js        # PostCSS configuration
├── CONTRIBUTING.md          # Contribution guidelines
└── README.md                # This file
```

---

## 🤝 Contributing

We welcome contributions from developers of all skill levels! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a pull request.

**Quick contribution flow:**
1. Fork → Clone → `npm install` → Create a branch → Make changes → Push → Open PR

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  Made with ❤️ for better emergency healthcare
  <br/>
  ⭐ Star this repo if you find it useful!
</div>

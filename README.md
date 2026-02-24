# 🎯 HisabHub - Personal Finance Tracker by Harsh Pandey

A polished, offline-first **Progressive Web App** that helps you log every rupee invested in your finances. Track income, expenses, savings, and insights with a responsive dashboard optimised for mobile and desktop.

---

## 🧠 Overview

This project delivers a **privacy-first, client-side experience** that enables users to:
- Capture income, categorised expenses, and notes in a few taps.
- Monitor trends with calendar, list, and insight views.
- Export or import data locally without any server dependency.
- Toggle light/dark themes for comfortable use in any environment.
- Manage multiple accounts entirely in-browser with secure hashed credentials.
- Generate professional monthly PDF financial reports.

---

## ⚙️ Tech Stack

- 🌐 **HTML5 + CSS3** (responsive, mobile-first layout)
- ⚡ **JavaScript (ES2023)** for data handling and offline logic
- 🎨 **Bootstrap 5.3 / Bootstrap Icons** for rapid UI scaffolding
- 📊 **Chart.js** for expense category analytics and insights
- 📄 **jsPDF** for professional monthly PDF report generation
- 🔐 **LocalStorage + Hashing** for lightweight authentication
- 🌙 **Service Worker** for Progressive Web App support

---

## ✨ Features

- 📅 **Smart calendar view** with inline expense chips per day
- 🗒️ Rich day-modal with edit/delete shortcuts and daily totals
- 💰 **Income tracking** with salary base, overrides, and additional income sources
- 🧮 Quick filters, sorting, and JSON export/import for backups
- 📈 **Category analytics**, spending patterns, and monthly insights
- 📊 **30+ chart visualizations** showing expense breakdowns
- 🌙 **Light/dark theme toggle** with persistent preference
- 📄 **One-click PDF export** with professional financial reports
- 💻 Runs **100% offline** – perfect for PWA or GitHub Pages deployment
- 👥 **Multi-user support** with independent data storage per account

---

## 📋 Dashboard Features

1. **Authentication** – Create a local profile stored securely in the browser.
2. **Welcome Dashboard** – Personalised metrics, quick actions, and financial overview.
3. **Calendar View** – Visualise expenses per day with category labels and daily totals.
4. **List View** – Tabbed tables with filters, sorting, and search capabilities.
5. **Insights Panel** – Category breakdown, spending trends, and savings analysis.
6. **PDF Reports** – Download monthly financial summaries with charts.
7. **Settings** – Manage categories, update credentials, backup/restore data.

---

## 🧩 Project Structure

```
📁 HisabHub/
├── index.html              # Landing / login / signup screen
├── app.html                # Authenticated dashboard UI
├── script.js               # Core app logic, charts, PDF generation
├── style.css               # Responsive stylesheet
├── service-worker.js       # PWA offline support
├── manifest.json           # PWA manifest
├── favicon/                # App icons and branding
│   ├── favicon.svg
│   ├── favicon-96x96.png
│   ├── apple-touch-icon.png
│   └── site.webmanifest
└── README.md               # Project documentation (you are here)
```

---

## 🚀 How to Run Locally

### 1️⃣ Clone the repository
```bash
git clone https://github.com/lucifer01430/HisabHub.git
cd HisabHub
```

### 2️⃣ Open in browser (no server required!)
Simply open `index.html` in your web browser. The app runs entirely offline using browser localStorage.

**Optional:** For a better development experience, use a local server:
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server

# Using VS Code
Install "Live Server" extension and click "Go Live"
```

### 3️⃣ Visit the dashboard
Open `http://localhost:8000/` in your browser, create a profile, and start tracking!

---

## 📦 Deployment Options

- **GitHub Pages** – Push to `gh-pages` branch for instant hosting
- **Netlify** – Connect your repo and auto-deploy
- **Vercel** – Zero-config deployment for static sites
- **Self-hosted** – Copy files to any web server (Apache, Nginx, etc.)

**Note:** Update `manifest.json` with your own app icon and colours before deploying.

---

## 🎯 Key Use Cases

✅ Personal budget tracking and expense management  
✅ Monthly financial reporting and analysis  
✅ Multi-user household finance management  
✅ Offline-first PWA installation on mobile devices  
✅ Privacy-focused data storage (no cloud sync required)  
✅ Quick expense logging on-the-go  

---

## 🙌 Contributing

Contributions, ideas, and forks are welcome! Please open an issue to discuss major changes or submit a PR for enhancements, bug fixes, or documentation improvements.

---

## 🙋‍♂️ About the Developer

Hi, I'm **Harsh Pandey** – a self-driven web developer building practical side projects. I share my learning journey and ship products like HisabHub to help everyday users stay organised and manage their finances efficiently.

---

## 🤝 Connect With Me

- 💼 **Portfolio**: [Harsh Pandey](https://lucifer01430.github.io/Portfolio/)
- 📧 **Email**: harshpandeylucifer@gmail.com
- 📸 **Instagram**: [@sasta_developer0143](https://www.instagram.com/sasta_developer0143)
- 📸 **Personal**: [@lucifer__1430](https://www.instagram.com/lucifer__1430)

---

## 📄 License

This project is open source and available for personal and commercial use.

---

> ⭐ **If this project helps you, please consider giving it a star on GitHub!**


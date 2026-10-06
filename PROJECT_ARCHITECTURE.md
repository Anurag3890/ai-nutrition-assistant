# AI Nutritionist Assistant - Project Architecture & Setup

Welcome to the **AI Nutritionist Assistant** ecosystem. This project is structured to support both a **mobile app** and a **web application**, backed by a unified **AI & nutrition API backend** and central **data schemas**.

---

## 📁 Repository & File Structure

```text
bkl/
├── backend/                  # AI Nutritionist Engine & REST/GraphQL API (FastAPI)
│   ├── app/
│   │   ├── api/              # Endpoints for food logging, chat, image analysis, reports
│   │   ├── core/             # Configuration, AI prompts, security
│   │   ├── models/           # Database tables and ORM entities
│   │   ├── schemas/          # Pydantic validation schemas (Nutrition, Meals, Goals)
│   │   └── services/         # AI Vision (meal photo parsing) & Nutritionist agent logic
│   └── main.py               # Backend entrypoint
│
├── web/                      # Web Application (React / Next.js / Modern Dashboard)
│   ├── src/
│   │   ├── components/       # Food loggers, macro rings, charts, AI chat widget
│   │   ├── pages/ or app/    # Dashboard, meal planner, analytics, profile
│   │   └── services/         # API clients connecting to backend
│   └── package.json
│
├── app/                      # Mobile Application (React Native / Expo)
│   ├── src/
│   │   ├── screens/          # Camera meal scanner, daily log, chat with AI, progress
│   │   └── navigation/       # Mobile routing & tabs
│   └── package.json
│
├── data/                     # Dedicated Data Storage & Schemas
│   ├── schemas/              # Master JSON / SQL schema definitions
│   │   ├── nutrition_schema.sql  # Complete PostgreSQL / SQLite schema
│   │   └── data_dictionary.md    # Detailed data dictionary of all tracked metrics
│   ├── sample_data/          # Food databases, micronutrient reference tables
│   └── storage/              # Local database / file uploads (food images)
│
└── config/                   # Shared configurations, environment templates
```

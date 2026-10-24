# ProjectMentor — System Architecture & Technical Specification

## 1. Overview
ProjectMentor is a role-governed college project monitoring platform built with the MERN stack (MongoDB, Express, React, Node.js), Vite, TypeScript, and Tailwind CSS. It enables faculty mentors to monitor multiple student project teams remotely across academic years, evaluate weekly progress submissions, identify at-risk initiatives via deterministic heuristics, and receive Gemini-powered contextual explanations.

---

## 2. Directory Structure
```
project-mentor/
├── docs/
│   ├── ARCHITECTURE.md
│   └── API_SPECIFICATION.md
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.ts
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   ├── progressController.ts
│   │   │   └── reviewController.ts
│   │   ├── middleware/
│   │   │   ├── authMiddleware.ts
│   │   │   ├── roleMiddleware.ts
│   │   │   └── ownershipMiddleware.ts
│   │   ├── models/
│   │   │   ├── User.ts
│   │   │   ├── Team.ts
│   │   │   ├── Project.ts
│   │   │   ├── Milestone.ts
│   │   │   ├── Progress.ts
│   │   │   └── Review.ts
│   │   ├── routes/
│   │   │   ├── authRoutes.ts
│   │   │   ├── progressRoutes.ts
│   │   │   └── teamRoutes.ts
│   │   ├── services/
│   │   │   ├── riskService.ts
│   │   │   └── geminiService.ts
│   │   └── server.ts
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── client/
│   ├── src/
│   │   ├── api/
│   │   │   └── apiClient.ts
│   │   ├── components/
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── ProgressDonut.tsx
│   │   │   └── StatusBadge.tsx
│   │   ├── hooks/
│   │   │   ├── useProject.ts
│   │   │   └── useProgressSubmission.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── tailwind.config.js
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

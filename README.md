# Project pulse— App


## 1. Tech Stack (and why)

| Layer | Choice | Why |
|---|---|---|
| Frontend | **React (Vite)** + React Router + plain CSS/Tailwind | Same as your mentor's plan; Vite starts faster than CRA for a beginner |
| Backend | **Node.js + Express** | Matches mentor's plan; simplest REST framework to learn in days, not weeks |
| Database | **MongoDB Atlas + Mongoose** | Free tier, no local DB install headaches, schema-flexible for a beginner |
| Auth | **JWT + bcrypt** | Same pattern as the original roadmap, minimal library overhead |
| File upload | **Multer**, local `server/uploads/` folder | Cloud storage (S3/Cloudinary) is a stretch goal, not week-1 material |
| Hosting | **Vercel** (frontend) + **Render** (backend) + **MongoDB Atlas** (DB) | All have free tiers, all deploy from GitHub with almost no config |
| Testing tool | **Postman** | For every API before wiring it to React |

You already have this exact stack recommended in your uploaded plan — we're keeping it, just compressing the schedule.

---

## 2. MVP Definition (what "done" means in 4 weeks)

**Two roles only: Teacher and Student.** (Skip Admin — it's a stretch goal.)

MVP feature list:
1. Register / Login (JWT, role = teacher or student)
2. Teacher creates a **Course** (title, description, join code)
3. Student joins a course using the join code
4. Teacher posts an **Assignment** (title, description, due date) inside a course
5. Student **submits** an assignment (text answer + optional file)
6. Teacher **grades** a submission (score + feedback comment)
7. Basic **announcements/messaging**: teacher can post an announcement to a course; students can see it (a simplified version of "comments" from your original doc)

**Explicitly out of scope for the 4-week MVP** (Phase 2, after the deadline):
- Admin role / audit logs
- Real-time chat (Socket.io)
- Cloud file storage
- Notifications system
- Rich text editor, calendar view, analytics dashboards

### Phased Expansion (after Week 4)
- **Phase 2 (Weeks 5–6):** Admin role, audit log, notifications, dashboard stats (mirrors Phases 13–15 of your original doc)
- **Phase 3 (Weeks 7–8):** Cloud file storage, real-time comments/chat, testing suite, CI/CD, custom domain deploy

---

## 3. Week-by-Week Goals

| Week | Theme | Deliverable |
|---|---|---|
| 1 | Planning + JS/React fundamentals + static UI | Clickable HTML/React UI with fake data, GitHub repo live |
| 2 | Backend + Database + Auth | Working REST API for users/courses, tested in Postman, JWT login |
| 3 | Connect frontend to backend — core features | React talks to real API: create course, join course, post assignment, submit |
| 4 | Grading, messaging, polish, testing, deploy | Live deployed link + mentor demo |

---

## 4. Setup Checklist (do this before Day 1)

Install: **VS Code, Node.js (LTS), Git, GitHub account, MongoDB Atlas account, Postman, Chrome/Edge.**

Folder structure (create immediately):
```
educonnect/
├── client/          (React app)
├── server/          (Express API)
├── docs/            (notes, screenshots, schema)
└── README.md
```

```bash
cd educonnect
git init
git add .
git commit -m "Initial project setup"
```
Create a GitHub repo and push it the same day. Commit at the end of every study/work session — small, frequent commits, not one giant commit at the end.

---

## 5. WEEK 1 — Foundations + Static UI

**Time split per day:** ~30% study / 20% practice / 50% building the actual UI, matching your mentor's ratio.

### Day 1 (Today — before tomorrow's mentor review)
- **Study (1h):** HTML structure, forms, inputs — [MDN: Your first form](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Your_first_form)
- **Practice (1h):** Build `register.html` with Name, Email, Role (Teacher/Student dropdown), Password fields
- **Build (2h):** Create the folder structure above, initialize Git, create `login.html` with Email/Password fields and a Login button
- **Commit:** "Initial project setup", "Add login page"
- **Outcome for tomorrow's review:** repo on GitHub, folder structure, `login.html` + `register.html` rendering in browser, one-paragraph plan of what EduConnect will do

### Day 2
- Study: CSS box model, flexbox — [CSS Flexbox Guide (CSS-Tricks)](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
- Build: Style login/register pages, make them responsive (mobile + desktop)
- Commit: "Style login and register pages"

### Day 3
- Study: CSS Grid, forms styling
- Build: Static `teacher-dashboard.html` (My Courses, Total Students, Pending Grading) and `student-dashboard.html` (My Courses, Assignments Due, Recent Grades)
- Commit: "Add dashboard UI"

### Day 4
- Study: JS variables, conditions, loops — [JavaScript.info Ch 1–3](https://javascript.info/)
- Practice: Small exercises (FizzBuzz-style array loops using course/student data)
- Commit: "Add JS practice exercises"

### Day 5
- Study: Functions, arrays (`map`, `filter`, `find`) — this is the single most important JS skill for this project
- Practice: Build a mini "Course Manager" using only a JS array (add course, list courses, filter by teacher) — this becomes your MongoDB collection later
- Commit: "Add course manager practice module"

### Day 6
- Study: Objects, JSON, `fetch`, `async/await`, `try/catch`
- Practice: Write a fake `async function getCourses()` that logs mock JSON data
- Commit: "Add async JS practice"

### Day 7 — Weekly Checkpoint
- Review everything; make sure static pages (`login`, `register`, `teacher-dashboard`, `student-dashboard`, `course.html`, `assignment.html`) all exist and look decent
- Write `docs/requirements.md`: list the MVP features from Section 2
- **Milestone 1 reached:** static UI complete, GitHub history shows daily commits

---

## 6. WEEK 2 — Backend, Database, Authentication

### Day 8
- Study: Node.js, npm, `package.json` — [Node.js official intro](https://nodejs.org/en/learn/getting-started/introduction-to-nodejs)
- Build: `server/` folder, `npm init`, install Express, first route returns `"EduConnect API running"`
- Commit: "Set up Express server"

### Day 9
- Study: Express routes, controllers, middleware, status codes — [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- Build: `GET/POST/PUT/DELETE /api/courses` using a temporary in-memory array
- Test every route in Postman
- Commit: "Add courses API with in-memory array"

### Day 10
- Study: MongoDB Atlas setup, Mongoose schemas/models — [MongoDB Atlas Quick Start](https://www.mongodb.com/docs/atlas/getting-started/)
- Build: Connect Express to Atlas, create `User` and `Course` models
- Commit: "Connect MongoDB Atlas, add User/Course models"

### Day 11
- Build: Replace the in-memory course array with real Mongoose CRUD (`Course.create`, `Course.find`, etc.)
- Test in Postman: create a course, fetch all courses, fetch by ID, update, delete
- Commit: "Migrate courses API to MongoDB"

### Day 12
- Study: bcrypt, JWT — [jwt.io introduction](https://jwt.io/introduction)
- Build: `POST /api/auth/register`, `POST /api/auth/login`, password hashing, JWT issued on login
- Commit: "Add authentication (register/login, JWT)"

### Day 13
- Build: Auth middleware (`verifyToken`, `requireRole`) protecting routes so only teachers can create courses
- Test: student token hitting a teacher-only route → should be `403 DENIED`
- Commit: "Add role-based route protection"

### Day 14 — Weekly Checkpoint
- Build models: `Assignment`, `Submission`, `Announcement` (schema sketch below)
- **Milestone 2 reached:** full auth + courses API tested and working in Postman

**Suggested schemas:**
```
User:         name, email, password, role (teacher|student), createdAt
Course:       title, description, teacher (ref User), joinCode, students[] (ref User)
Assignment:   course (ref), title, description, dueDate, createdAt
Submission:   assignment (ref), student (ref), answerText, fileUrl, submittedAt, grade, feedback
Announcement: course (ref), author (ref), message, createdAt
```

---

## 7. WEEK 3 — React Frontend Connected to Real API

### Day 15
- Study: React components, JSX, props — [React official "Quick Start"](https://react.dev/learn)
- Build: `client/` via Vite, folder structure (`components/`, `pages/`, `services/`), Navbar + Login page wired to `/api/auth/login`
- Commit: "Set up React app, connect login to API"

### Day 16
- Study: `useState`, `useEffect`
- Build: Teacher dashboard fetches real courses via `useEffect` + `fetch`; store JWT in memory/localStorage
- Commit: "Connect teacher dashboard to real courses API"

### Day 17
- Study: React Router
- Build: Routes for `/login`, `/register`, `/teacher/dashboard`, `/teacher/course/:id`, `/student/dashboard`, `/student/course/:id`
- Commit: "Add React Router navigation"

### Day 18
- Build: "Create Course" form (teacher) → `POST /api/courses`; "Join Course" form (student, enters join code) → `POST /api/courses/join`
- Commit: "Add create/join course flows"

### Day 19
- Build: Assignment API (`POST/GET /api/courses/:id/assignments`) + "Post Assignment" form on teacher's course page
- Commit: "Add assignment creation"

### Day 20
- Build: Student assignment view; "Submit Assignment" form (text answer + file upload via Multer)
- Study Multer basics — [Multer docs](https://github.com/expressjs/multer#readme)
- Commit: "Add submission flow with file upload"

### Day 21 — Weekly Checkpoint
- **Major Milestone:** open the React app, log in as teacher, create a course, log in as student, join it, teacher posts an assignment, student submits — full loop working end-to-end
- Test every role boundary again (student can't create a course, etc.)

---

## 8. WEEK 4 — Grading, Messaging, Polish, Testing, Deployment

### Day 22
- Build: Grading UI — teacher views submissions list, enters score + feedback → `PUT /api/submissions/:id`
- Commit: "Add grading flow"

### Day 23
- Build: Announcements — teacher posts to a course, students see them on the course page (`GET/POST /api/courses/:id/announcements`)
- Commit: "Add announcements/messaging"

### Day 24
- Build: Student dashboard summary (courses joined, assignments due, pending grades) computed from real data
- Commit: "Add dashboard summary calculations"

### Day 25 — Testing Day
Test systematically, not just clicking buttons:
- **Auth:** correct login, wrong password, missing fields, expired/invalid token
- **Teacher:** can create/edit own course; cannot edit another teacher's course; can grade; cannot submit as a student
- **Student:** can join course, submit own work; cannot grade; cannot access another student's submission; cannot access teacher-only routes
- **Data validation:** empty required fields rejected on both client and server
- Fix bugs found; commit fixes individually with clear messages

### Day 26
- Polish: loading states, error messages, empty states ("No courses yet"), consistent styling, mobile check
- Write `docs/api.md` (list every endpoint) and `docs/database.md` (schema diagram)
- Commit: "Polish UI, add documentation"

### Day 27 — Deployment
- Push final code to GitHub
- Deploy MongoDB: already on Atlas (whitelist `0.0.0.0/0` or Render's IP for grading demo)
- Deploy backend to **Render** (connect GitHub repo, set `MONGO_URI` and `JWT_SECRET` as environment variables)
- Deploy frontend to **Vercel** (connect GitHub repo, set `VITE_API_URL` to your Render backend URL)
- Enable CORS on Express for your Vercel domain
- Test the live deployed link end-to-end (register, login, full course→assignment→submission→grade loop)

### Day 28 — Final Review Prep
- Record a 3–5 minute walkthrough (screen recording) as backup in case live demo has network issues
- Prepare a one-page `README.md`: what it does, tech stack, live link, how to run locally
- Final commit: "v1.0 — MVP complete"

---

## 9. What to Show Your Mentor **Tomorrow** (Day 2 Review)

Since your first review is tomorrow and you're starting from zero today, keep it small and honest:
1. **GitHub repo link** with the folder structure and at least 2 commits
2. **`login.html` and `register.html`** open in browser — show the working forms (no functionality yet, just UI)
3. **One paragraph** describing EduConnect's MVP scope (copy from Section 2 above) so your mentor can confirm you're scoping correctly before you build further
4. **Ask your mentor directly:** "Is 2-role (Teacher/Student), no-admin MVP the right scope for 4 weeks?" — get this confirmed on Day 1, not Day 20

Do **not** try to show React, backend, or database tomorrow — that's Week 2–3 material. Showing a clean, honest "Day 1" is a better signal than rushing.

---

## 10. Weekly Mentor Check-ins (suggested cadence)
| Review | Show |
|---|---|
| Day 2 (tomorrow) | Repo, static login/register, MVP scope paragraph |
| End of Week 1 | All static pages clickable, JS practice modules |
| End of Week 2 | Postman collection showing full CRUD + auth working |
| End of Week 3 | Live app: full course → assignment → submission loop (local) |
| End of Week 4 | Deployed live link + recorded demo + README |

---

## 11. Risks & Troubleshooting

| Risk | Mitigation |
|---|---|
| JS fundamentals take longer than 1 week (very common) | Don't move to React until `map/filter/find` and `async/await` feel comfortable — better to run 1–2 days over into Week 2's slack than build React on shaky JS |
| MongoDB Atlas connection errors | Almost always IP whitelist or wrong connection string — check `Network Access` in Atlas dashboard first |
| CORS errors when connecting React → Express | Add `cors()` middleware in Express and confirm the frontend origin matches exactly (including port) |
| JWT "invalid token" bugs | Confirm you're sending `Authorization: Bearer <token>` header exactly, and that `JWT_SECRET` matches between issue and verify |
| Running out of time by Week 4 | Cut Announcements/messaging first (Section 2 lists it as the most droppable MVP feature), not grading or submissions — those are the core loop |
| File upload complexity | If Multer + file handling eats too much time, ship text-only submissions for the deadline and add file upload in Phase 2 |
| Deployment env-variable mistakes | Test locally with a `.env` file first; only move to Render/Vercel once local `npm run build` + local API calls work correctly |

---

## 12. Core Learning Resources (all free)
- **HTML/CSS:** [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Learn_web_development)
- **JavaScript:** [javascript.info](https://javascript.info/)
- **React:** [react.dev — Learn](https://react.dev/learn)
- **Node/Express:** [Express official guide](https://expressjs.com/en/guide/routing.html)
- **MongoDB/Mongoose:** [Mongoose docs](https://mongoosejs.com/docs/guide.html)
- **JWT auth:** [jwt.io](https://jwt.io/introduction)
- **Git:** [GitHub's Git Handbook](https://guides.github.com/introduction/git-handbook/)
- **Practice:** [freeCodeCamp Responsive Web Design](https://www.freecodecamp.org/learn/2022/responsive-web-design/) and [freeCodeCamp JavaScript Algorithms](https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/) for daily drills

---

## 13. Quick Reference: Daily Rhythm
For a ~4-hour day: 1h study → 1h small exercise → 2h building EduConnect.
For a ~6-hour day: 1.5h study → 1.5h practice → 3h building EduConnect.
Keep a one-line **Learning Notebook** entry per new concept: *Topic → What is it? → Why do I need it? → Where did I use it in EduConnect?* This is exactly what will save you in your viva/interview, per your mentor's original notes.

## 14. Role-Based Dashboard Starter

The current client includes a browser-only role-based flow for Student, Admin, and Mentor users.

### Demo accounts

| Role | Email | Password | Landing view |
|---|---|---|---|
| Student | `vijay@gmail.com` | `siet@2727` | Student dashboard |
| Admin | `admin@gmail.com` | `siet@2727` | Admin dashboard |
| Mentor | `vetri@gmail.com` | `siet@2727` | Project dashboard |

### Client structure

```text
client/src/
├── context/AppContext.tsx       # users, session, mentors, localStorage
├── types/index.ts               # Role, User, Mentor and dashboard types
├── views/LoginView.tsx          # demo login and role redirect
├── views/StudentDashboardView.tsx
├── views/AdminDashboardView.tsx
└── views/MentorCreationView.tsx # admin create/read mentor flow
```

Navigation is intentionally simple: `activeView` in `AppContext` acts as the in-browser route. Login selects a matching account, Admin is sent to `admin_dashboard`, and Student/Mentor users are sent to `home`. Admin users also receive the mentor management navigation item.

### Run locally

```bash
npm install
npm --prefix client install
npm run dev
```

Open the Vite URL shown in the terminal. For a production build, run `npm run build`. The root `npm start` command starts the server package, while `npm run dev` starts both client and server.

Mentors and the current user are stored in browser `localStorage` under `pm_mock_mentors`, `pm_mock_users`, and `pm_mock_user`. This is demo persistence only: passwords are intentionally plain text and must be replaced by server-side authentication, hashing, and a database before production use.
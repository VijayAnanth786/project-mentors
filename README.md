# Project Pulse

A role-based mentorship platform for students, mentors, and administrators.

**Live application:** [https://project-mentors.vercel.app/](https://project-mentors.vercel.app/)

- [Student Dashboard](https://project-mentors.vercel.app/student/dashboard)
- [Mentor Dashboard](https://project-mentors.vercel.app/mentor/dashboard)
- [Admin Dashboard](https://project-mentors.vercel.app/admin/dashboard)

---

## About the Project

Project Pulse is a mentorship-focused web application designed to streamline collaboration between students, mentors, and administrators. It gives each role a dedicated dashboard and centralizes the workflow for project guidance, mentor management, and progress tracking.

This version emphasizes a demo experience with role-based login, dashboard navigation, shared state management, and mentor management capabilities. The long-term goal is to expand it into a full-stack platform with authentication, database-backed records, task management, submissions, grading, and feedback.

## Project Objectives

- Provide dedicated dashboards for students, mentors, and administrators.
- Implement role-based navigation and access patterns.
- Support mentor creation and listing workflows.
- Use browser `localStorage` for demo data persistence.
- Build the foundation for backend integration and database-driven features.
- Develop a practical full-stack application with clear project structure.

## Live Demo

| Section | Link |
| --- | --- |
| Main Application | [Project Pulse](https://project-mentors.vercel.app/) |
| Student Dashboard | [Open Dashboard](https://project-mentors.vercel.app/student/dashboard) |
| Mentor Dashboard | [Open Dashboard](https://project-mentors.vercel.app/mentor/dashboard) |
| Admin Dashboard | [Open Dashboard](https://project-mentors.vercel.app/admin/dashboard) |

## Features

### Currently Implemented

- Role-based demonstration login
- Student, mentor, and admin dashboards
- Role-based navigation and UI flows
- Shared application state with React Context
- TypeScript-based modeling for app data
- `localStorage` persistence for demo data
- Admin mentor creation interface
- Mentor listing functionality
- Frontend deployment to Vercel

### Planned Features

- Secure user registration and login
- JWT-based authentication
- Password hashing with bcrypt
- REST API built with Express.js
- MongoDB integration
- Project and course management
- Student enrollment support
- Assignment creation and submission
- File upload workflows
- Mentor grading and feedback
- Course announcements and notifications
- Progress tracking and insights

## User Roles

### Student

**Current functionality**

- Access the student dashboard
- Navigate the student workflow

**Planned functionality**

- View assigned projects and courses
- Track deadlines and progress
- Submit assignments
- Review grades and mentor feedback

### Mentor

**Current functionality**

- Access the mentor dashboard
- Navigate the mentor workflow

**Planned functionality**

- View assigned students and projects
- Create assignments
- Review submissions
- Provide grades and feedback
- Publish announcements

### Admin

**Current functionality**

- Access the admin dashboard
- Open the mentor management interface
- Create mentor records
- View mentor records

**Planned functionality**

- Manage users and roles
- Monitor platform activity
- View dashboard analytics
- Maintain audit logs

## Technology Stack

### Frontend

| Technology | Purpose |
| --- | --- |
| React | User interface development |
| TypeScript | Type safety |
| Vite | Development server and build tool |
| React Context API | Shared application state |
| CSS | Styling and layout |
| `localStorage` | Demo persistence |

### Planned Backend

| Technology | Purpose |
| --- | --- |
| Node.js | JavaScript runtime |
| Express.js | REST API framework |
| MongoDB Atlas | Cloud database |
| Mongoose | MongoDB modeling |
| JWT | Authentication |
| bcrypt | Password hashing |
| Multer | File upload processing |
| Postman | API testing |

### Deployment

- **Vercel:** Frontend hosting
- **Render:** Planned backend hosting
- **MongoDB Atlas:** Planned database hosting

> Backend technologies are planned for future integration and are not considered fully implemented yet.

## Project Structure

```text
project-pulse/
├── client/
│   └── src/
│       ├── context/
│       │   └── AppContext.tsx
│       ├── types/
│       │   └── index.ts
│       └── views/
│           ├── LoginView.tsx
│           ├── StudentDashboardView.tsx
│           ├── AdminDashboardView.tsx
│           └── MentorCreationView.tsx
├── server/
├── docs/
├── package.json
└── README.md
```

This is a simplified structure based on the known frontend files. Additional files may exist in the repository as the project evolves.

### Key Files

- **`AppContext.tsx`** — Manages shared application state, demo users, mentor records, and session details.
- **`types/index.ts`** — Defines TypeScript interfaces for users, roles, mentors, and dashboard data.
- **`LoginView.tsx`** — Handles demo login and role-based navigation.
- **`StudentDashboardView.tsx`** — Displays the student dashboard UI.
- **`AdminDashboardView.tsx`** — Displays the administrator dashboard UI.
- **`MentorCreationView.tsx`** — Provides the mentor management workflow.

## Getting Started

### Prerequisites

Make sure the following tools are installed:

1. Node.js (LTS)
2. npm
3. Git
4. Visual Studio Code
5. A modern browser

**Download links**

- Node.js: [https://nodejs.org/](https://nodejs.org/)
- Git: [https://git-scm.com/](https://git-scm.com/)
- Visual Studio Code: [https://code.visualstudio.com/](https://code.visualstudio.com/)

### Step 1: Clone the Repository

```bash
git clone <your-github-repository-url>
cd project-pulse
```

### Step 2: Install Dependencies

Install root dependencies:

```bash
npm install
```

Install client dependencies:

```bash
npm --prefix client install
```

If your repository already manages frontend dependencies from the root package, follow that setup instead.

### Step 3: Start the Application

Run the main development command:

```bash
npm run dev
```

If the root command does not start the frontend, use:

```bash
npm --prefix client run dev
```

## Summary

Project Pulse is a clean starting point for a mentorship management system and showcases a role-based UI, structured project architecture, and a clear path toward a full-stack implementation.

Open the local URL displayed in the terminal. The default Vite address is commonly:

`http://localhost:5173/`

### Step 4: Build for Production

Run the configured production build:

bash

```
npm run build
```

Alternatively, if supported by the client configuration:

bash

```
npm --prefix client run build
```

## 9\. Demo Credentials

Use the following demonstration accounts to explore the application.

| Role | Email | Password |
| --- | --- | --- |
| Student | `vijay@gmail.com` | `siet@2727` |
| Admin | `admin@gmail.com` | `siet@2727` |
| Mentor | `vetri@gmail.com` | `siet@2727` |

### Dashboard Links

- **Student:** [https://project-mentors.vercel.app/student/dashboard](<https://project-mentors.vercel.app/student/dashboard>)
- **Admin:** [https://project-mentors.vercel.app/admin/dashboard](<https://project-mentors.vercel.app/admin/dashboard>)
- **Mentor:** [https://project-mentors.vercel.app/mentor/dashboard](<https://project-mentors.vercel.app/mentor/dashboard>)

### Login Instructions

1. Open the application.
2. Navigate to the login page.
3. Enter the credentials for the required role.
4. Submit the login form.
5. Verify that the appropriate dashboard opens.

**Security warning:** These credentials are for demonstration purposes only. Do not use them for real accounts or production authentication.

## 10\. Application Architecture

### Current Workflow

text

```
User
  |
  v
Login Page
  |
  v
Validate Demonstration Credentials
  |
  v
Identify User Role
  |
  +------------+------------+
  |            |            |
  v            v            v
Student       Mentor        Admin
Dashboard     Dashboard     Dashboard
                            |
                            v
                     Mentor Management
                            |
                            v
                       localStorage
```

### Planned Full-Stack Workflow

text

```
React + TypeScript Frontend
            |
            v
       REST API Requests
            |
            v
      Node.js + Express
            |
            v
Authentication and Authorization
            |
            v
      Mongoose Models
            |
            v
       MongoDB Atlas
```

## 11\. Data Storage

The current demonstration uses browser `localStorage`.

| Storage Key | Purpose |
| --- | --- |
| `pm_mock_mentors` | Stores demonstration mentor records |
| `pm_mock_users` | Stores demonstration user records |
| `pm_mock_user` | Stores current demonstration session information |

### Current Limitations

- Data is stored in the browser.
- Data is not automatically shared between devices.
- Clearing browser storage may remove saved data.
- Browser storage can be inspected and modified.
- Client-side state does not provide secure authorization.

The planned full-stack version will use a database and backend API for persistent data storage and access control.

## 12\. Security

The current application is a demonstration and is not intended for production authentication.

The demonstration uses plain-text credentials and browser-side state. These mechanisms must not be used to protect real users or sensitive information.

Before production deployment, implement:

- Secure server-side authentication.
- Password hashing using bcrypt or an equivalent solution.
- Server-side role-based authorization.
- Input validation and error handling.
- Secure session or token management.
- Environment variables for secrets.
- Restricted CORS configuration.
- Authentication rate limiting.
- File upload validation.
- HTTPS for deployed services.

Never commit passwords, database credentials, or secret keys to a public repository. Never store real passwords or trusted authorization data in browser `localStorage`.

## 13\. Development Roadmap

### Phase 1: Frontend Foundation

- [x]Demonstration login.
- [x]Role-based dashboard navigation.
- [x]Student dashboard.
- [x]Mentor dashboard.
- [x]Admin dashboard.
- [x]Basic mentor management.
- [x]Frontend deployment.
- [ ]Responsive design and accessibility improvements.

### Phase 2: Backend and Authentication

- [ ]Configure Express server.
- [ ]Connect MongoDB Atlas.
- [ ]Create user and mentor models.
- [ ]Implement registration and login APIs.
- [ ]Add password hashing.
- [ ]Implement role-based authorization.
- [ ]Test APIs using Postman.

### Phase 3: Project Management

- [ ]Project or course creation.
- [ ]Student enrollment.
- [ ]Frontend-to-backend integration.
- [ ]Assignment creation.
- [ ]Student assignment submissions.
- [ ]File upload support.
- [ ]Mentor grading and feedback.
- [ ]Announcements and messaging.

### Phase 4: Testing and Deployment

- [ ]Validate API permissions.
- [ ]Test authentication.
- [ ]Improve loading and error states.
- [ ]Deploy backend using Render.
- [ ]Configure production environment variables.
- [ ]Connect frontend to the production API.
- [ ]Test the complete application workflow.
- [ ]Prepare final project documentation.

## 14\. Deployment

### Frontend — Vercel

**Live URL:** [https://project-mentors.vercel.app/](<https://project-mentors.vercel.app/>)

Deployment steps:

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Configure the frontend root directory.
4. Configure build settings.
5. Add required environment variables.
6. Deploy and test the dashboard routes.

### Backend — Render

_Planned deployment_

1. Connect the repository to Render.
2. Configure the server build and start commands.
3. Set the `MONGO_URI` environment variable.
4. Set `JWT_SECRET` if JWT authentication is implemented.
5. Configure CORS for the deployed frontend.
6. Test the deployed API.

### Database — MongoDB Atlas

_Planned setup_

1. Create a MongoDB Atlas cluster.
2. Create a database user with restricted permissions.
3. Configure network access for the backend.
4. Store the connection string in the backend environment.
5. Verify database connectivity.

Do not expose database credentials in frontend code.

## 15\. Troubleshooting

### Application Does Not Start

- Check the Node.js installation.
- Run `npm install`.
- Verify `package.json` scripts.
- Check terminal errors.
- Confirm that the required port is available.

### Login Does Not Work

- Verify the demonstration credentials.
- Check that the login view loads correctly.
- Inspect the browser console.
- Check existing `localStorage` values.

### Data Does Not Persist

- Confirm browser storage is enabled.
- Inspect `localStorage` in developer tools.
- Remember that demonstration data is browser-specific.

### Dashboard Route Fails

- Verify navigation and route configuration.
- Check deployment rewrite settings for nested routes.
- Confirm the latest code has been deployed.

### Backend Requests Fail

When backend integration is available:

- Verify the API URL.
- Check that the backend is running.
- Inspect CORS configuration.
- Verify environment variables.
- Review server and browser network logs.

## 16\. Future Improvements

Potential enhancements include:

- Secure user registration and account management.
- Database-backed dashboards.
- Project allocation and progress tracking.
- Assignment deadlines and submission history.
- Mentor feedback and grading.
- Announcements and notifications.
- Real-time messaging.
- Administrative reports and audit logs.
- Automated testing.
- Continuous integration and deployment.
- Improved mobile responsiveness and accessibility.

## 17\. License

No license has been specified for this project yet.

Add a `LICENSE` file after deciding the intended terms for using, modifying, and distributing the project.

------

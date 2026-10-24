import { Router } from 'express';
import {
  getAdminDashboard,
  getAdminStudents,
  updateStudentStatus,
  getAdminMentors,
  addAdminMentor,
  updateAdminMentor,
  updateMentorStatus,
  getAdminTeams,
  assignTeamMentor,
  getAdminProjects,
  getAdminAnnouncements,
  createAdminAnnouncement,
  getAdminReports,
  getAdminSettings,
  updateAdminSettings
} from '../controllers/adminController';
import { authenticateJWT, requireRoles } from '../middleware/authMiddleware';

const router = Router();

// Admin routes strictly require authentication and 'admin' role
router.use(authenticateJWT, requireRoles('admin'));

router.get('/dashboard', getAdminDashboard);

// Students
router.get('/students', getAdminStudents);
router.put('/students/:id/status', updateStudentStatus);

// Mentors
router.get('/mentors', getAdminMentors);
router.post('/mentors', addAdminMentor);
router.put('/mentors/:id', updateAdminMentor);
router.patch('/mentors/:id', updateAdminMentor);
router.put('/mentors/:id/status', updateMentorStatus);

// Teams & Mentor Assignment
router.get('/teams', getAdminTeams);
router.put('/teams/:id/assign-mentor', assignTeamMentor);

// Projects
router.get('/projects', getAdminProjects);

// Announcements
router.get('/announcements', getAdminAnnouncements);
router.post('/announcements', createAdminAnnouncement);

// Reports & Settings
router.get('/reports', getAdminReports);
router.get('/settings', getAdminSettings);
router.put('/settings', updateAdminSettings);

export default router;

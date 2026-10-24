import { Router } from 'express';
import {
  getMentorDashboard,
  getMentorTeams,
  getMentorTeamDetails,
  getMentorProjects,
  getMentorReviews,
  submitMentorReview,
  getMentorMeetings,
  scheduleMentorMeeting,
  getMentorNotifications,
  markNotificationRead,
  updateMentorProfile
} from '../controllers/mentorController';
import { authenticateJWT, requireRoles } from '../middleware/authMiddleware';

const router = Router();

// All mentor routes require authentication and either mentor or admin role
router.use(authenticateJWT, requireRoles('mentor', 'admin'));

router.get('/dashboard', getMentorDashboard);
router.get('/teams', getMentorTeams);
router.get('/teams/:teamId', getMentorTeamDetails);
router.get('/projects', getMentorProjects);
router.get('/reviews', getMentorReviews);
router.post('/reviews/:id', submitMentorReview);
router.get('/meetings', getMentorMeetings);
router.post('/meetings', scheduleMentorMeeting);
router.get('/notifications', getMentorNotifications);
router.put('/notifications/:id/read', markNotificationRead);
router.put('/profile', updateMentorProfile);

export default router;

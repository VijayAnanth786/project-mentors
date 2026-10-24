export type Role = 'student' | 'admin' | 'mentor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  password?: string;
  avatar?: string;
  department?: string;
  teamRole?: 'Team Leader' | 'Member';
}

export type ProjectStatus = 'ON_TRACK' | 'NEEDS_ATTENTION' | 'DELAYED' | 'COMPLETED';

export interface Milestone {
  id: string;
  title: string;
  status: 'Completed' | 'In Progress' | 'Pending';
  targetDate?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: 'Team Leader' | 'Member';
  avatar?: string;
}

export interface Project {
  id: string;
  title: string;
  techStack: string[];
  description: string;
  teamId: string;
  teamName: string;
  yearCohort: '1st Year' | '2nd Year' | '3rd Year';
  mentorName: string;
  mentorId: string;
  progressPercentage: number;
  currentPhase: string;
  nextDeadline: string;
  daysLeft: number;
  githubUrl: string;
  status: ProjectStatus;
  milestones: Milestone[];
  members: TeamMember[];
}

export interface ProgressSubmission {
  id: string;
  weekNumber: number;
  submissionDate: string;
  completedTasks: string[];
  currentWork: string[];
  blockers: string[];
  nextWeekGoals: string[];
  files: Array<{
    name: string;
    size: string;
    type: 'pdf' | 'image' | 'ppt' | 'zip';
    url: string;
  }>;
  githubUrl?: string;
  status: 'Waiting for review' | 'Approved' | 'Needs Improvement' | 'Major Issue';
  review?: {
    status: 'Approved' | 'Needs Improvement' | 'Major Issue';
    feedback: string;
    reviewedAt: string;
  };
}

export interface TeamCardData {
  id: string;
  name: string;
  projectTitle: string;
  memberCount: number;
  yearCohort: '1st Year' | '2nd Year' | '3rd Year';
  status: ProjectStatus;
  progressPercentage: number;
}

export interface Mentor {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'mentor';
  createdAt: string;
}

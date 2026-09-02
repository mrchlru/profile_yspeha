/** Максимум участников комиссии на одну вакансию. */
export const MAX_INTERVIEW_COMMISSION_MEMBERS = 4;

export type InterviewCommissionMemberRecord = {
  id: string;
  interviewFolderKey: string;
  firstName: string;
  lastName: string;
  email: string;
  displayName: string;
  createdAt: string;
};

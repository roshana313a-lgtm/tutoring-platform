import { http } from '../../../shared/api/http'

export type ComplaintStatus = 'open' | 'in_progress' | 'resolved'
export type ComplaintTransition = 'in_progress' | 'resolved'

export interface Complaint {
  id: string
  user_id: string
  subject: string
  description: string
  status: ComplaintStatus
  created_at: string
}

export interface AdminComplaint extends Complaint {
  user_name: string
  user_email: string
}

export interface ComplaintPayload {
  subject: string
  description: string
}

export const COMPLAINT_SUBJECT_MAX = 200
export const COMPLAINT_DESCRIPTION_MAX = 2000

export function submitComplaint(payload: ComplaintPayload): Promise<Complaint> {
  return http.post<Complaint>('/api/v1/complaints', payload)
}

export function fetchComplaints(): Promise<AdminComplaint[]> {
  return http.get<AdminComplaint[]>('/api/v1/admin/complaints')
}

export function updateComplaintStatus(
  complaintId: string,
  status: ComplaintTransition,
): Promise<Complaint> {
  return http.patch<Complaint>(`/api/v1/admin/complaints/${complaintId}/status`, { status })
}

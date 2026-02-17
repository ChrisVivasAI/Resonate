// User & Auth Types
export interface User {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  role: 'admin' | 'member' | 'client'
  client_id?: string // Links client users to their client record
  created_at: string
  updated_at: string
}

// Client Types
export interface Client {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  avatar_url?: string
  status: 'active' | 'inactive' | 'lead'
  total_spent: number
  projects_count: number
  notes?: string
  profile_id?: string // Links to the client's portal account
  portal_enabled: boolean
  created_at: string
  updated_at: string
}

// Project Types
export interface Project {
  id: string
  client_id: string
  name: string
  description?: string
  status: 'draft' | 'in_progress' | 'review' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  budget: number
  deposit_percentage: number
  spent: number
  start_date: string
  due_date: string
  completed_at?: string
  progress: number
  tags: string[]
  created_at: string
  updated_at: string
  client?: Client
  tasks?: Task[]
}

export interface Task {
  id: string
  project_id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'review' | 'completed'
  priority: 'low' | 'medium' | 'high'
  assigned_to?: string
  assignee_id?: string
  due_date?: string
  completed_at?: string
  order: number
  created_at: string
  updated_at: string
}

// Payment Types
export interface Payment {
  id: string
  client_id: string
  project_id?: string
  invoice_id?: string
  amount: number
  currency: string
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded' | 'canceled' | 'disputed'
  payment_method?: string
  stripe_payment_intent_id?: string
  description?: string
  paid_at?: string
  created_at: string
  updated_at: string
  client?: Client
  project?: Project
}

export interface Invoice {
  id: string
  client_id: string
  project_id?: string
  milestone_id?: string
  invoice_type: 'deposit' | 'milestone' | 'custom'
  invoice_number: string
  amount: number
  tax_amount: number
  total_amount: number
  currency: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  due_date: string | null
  paid_at?: string
  stripe_invoice_id?: string
  stripe_invoice_url?: string
  line_items: InvoiceLineItem[]
  notes?: string
  created_at: string
  updated_at: string
  client?: Client
  project?: Project
  milestone?: Milestone
}

export interface InvoiceLineItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

// AI Studio Types
export interface AIGeneration {
  id: string
  user_id: string
  project_id?: string
  type: 'image' | 'video' | 'audio' | 'text' | 'code'
  prompt: string
  negative_prompt?: string
  model: string
  parameters: Record<string, unknown>
  result_url?: string
  result_urls?: string[]
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message?: string
  cost_credits: number
  created_at: string
  completed_at?: string
}

// Page Builder Types
export interface Page {
  id: string
  user_id: string
  project_id?: string
  client_id?: string
  generated_page_id?: string
  slug: string
  title: string
  description?: string
  status: 'draft' | 'published' | 'archived'
  template: 'landing' | 'contact' | 'portfolio' | 'custom' | string
  sections: PageSection[]
  settings: PageSettings
  views_count: number
  submissions_count: number
  created_at: string
  updated_at: string
  published_at?: string
  // Joined fields
  project?: Project
  client?: Client
}

// Generated Page Types (AI design-to-code)
export interface GeneratedPage {
  id: string
  user_id: string
  project_id?: string
  source_type: 'svg' | 'image'
  source_url: string
  source_filename?: string
  analysis_result?: DesignAnalysisResult
  generated_code?: string
  generated_sections?: GeneratedSectionData[]
  status: 'pending' | 'analyzing' | 'generating' | 'completed' | 'failed'
  error_message?: string
  created_at: string
  completed_at?: string
}

export interface DesignAnalysisResult {
  layout: {
    type: string
    sections: {
      type: string
      description: string
      elements: string[]
    }[]
  }
  colors: Record<string, string>
  typography: {
    headingFont: string
    bodyFont: string
  }
  style: {
    theme: string
    aesthetic: string
    borderRadius: string
  }
}

export interface GeneratedSectionData {
  id: string
  type: string
  name: string
  code: string
}

export interface PageSection {
  id: string
  type: 'hero' | 'features' | 'testimonials' | 'cta' | 'contact' | 'gallery' | 'text' | 'custom'
  order: number
  content: Record<string, unknown>
  styles: Record<string, unknown>
  is_visible: boolean
}

export interface PageSettings {
  primary_color?: string
  secondary_color?: string
  font_family?: string
  show_header: boolean
  show_footer: boolean
  custom_css?: string
  custom_js?: string
  form_webhook_url?: string
}

// API Response Types
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

// ============================================
// PROJECT MANAGEMENT TYPES
// ============================================

// Client Invitation Types
export interface ClientInvitation {
  id: string
  client_id: string
  email: string
  token: string
  invited_by: string
  status: 'pending' | 'accepted' | 'expired'
  expires_at: string
  accepted_at?: string
  created_at: string
  // Joined fields
  client?: Client
  inviter?: User
}

// Deliverable Types
export type DeliverableType = 'image' | 'video' | 'audio' | 'document' | 'text'
export type DeliverableStatus = 'draft' | 'in_review' | 'approved' | 'rejected' | 'final'

export type DraftPlatform = 'frame_io' | 'vimeo' | 'youtube' | 'dropbox' | 'other'
export type FinalPlatform = 'google_drive' | 'dropbox' | 'wetransfer' | 's3' | 'other'

export interface Deliverable {
  id: string
  project_id: string
  ai_generation_id?: string
  title: string
  description?: string
  type: DeliverableType
  file_url?: string
  thumbnail_url?: string
  status: DeliverableStatus
  current_version: number
  // Draft link fields (typically Frame.io for review/comments)
  draft_url?: string
  draft_platform?: DraftPlatform
  // Final link fields (typically Google Drive for approved files)
  final_url?: string
  final_platform?: FinalPlatform
  notes?: string
  created_by: string
  created_at: string
  updated_at: string
  // Joined fields
  project?: Project
  ai_generation?: AIGeneration
  creator?: User
  versions?: DeliverableVersion[]
  comments?: Comment[]
}

export interface DeliverableVersion {
  id: string
  deliverable_id: string
  version_number: number
  file_url: string
  thumbnail_url?: string
  notes?: string
  created_by: string
  created_at: string
  // Joined fields
  creator?: User
}

// Comment Types
export interface Comment {
  id: string
  deliverable_id?: string
  task_id?: string
  user_id: string
  parent_id?: string
  content: string
  is_internal: boolean
  created_at: string
  updated_at: string
  // Joined fields
  user?: User
  replies?: Comment[]
}

// Approval Types
export type ApprovalAction = 'approved' | 'rejected' | 'requested_changes'

export interface ApprovalRecord {
  id: string
  deliverable_id: string
  user_id: string
  action: ApprovalAction
  feedback?: string
  version_number: number
  created_at: string
  // Joined fields
  user?: User
  deliverable?: Deliverable
}

// Project Monitoring Types
export type MonitoringFrequency = 'daily' | 'weekly' | 'monthly'
export type HealthStatus = 'healthy' | 'at_risk' | 'critical'

export interface ProjectMonitoringSettings {
  id: string
  project_id: string
  monitoring_enabled: boolean
  frequency: MonitoringFrequency
  alert_threshold: number
  next_check_at?: string
  last_check_at?: string
  created_at: string
  updated_at: string
  // Joined fields
  project?: Project
}

export interface ProjectHealthReport {
  id: string
  project_id: string
  health_score: number
  status: HealthStatus
  summary: string
  analysis: HealthAnalysis
  recommendations: string[]
  created_at: string
  // Joined fields
  project?: Project
}

export interface HealthAnalysis {
  timeline: {
    score: number
    issues: string[]
    days_until_due?: number
    is_overdue?: boolean
  }
  budget: {
    score: number
    issues: string[]
    utilization: number
    remaining: number
  }
  tasks: {
    score: number
    completion_rate: number
    total: number
    completed: number
    overdue: number
  }
  milestones: {
    score: number
    total: number
    completed: number
    overdue: number
  }
}

// Activity Feed Types
export type ActivityType =
  | 'deliverable_created'
  | 'deliverable_updated'
  | 'deliverable_submitted'
  | 'deliverable_approved'
  | 'deliverable_rejected'
  | 'comment_added'
  | 'task_completed'
  | 'milestone_completed'
  | 'project_status_changed'
  | 'health_check_completed'

export interface ActivityFeedItem {
  id: string
  project_id: string
  user_id?: string
  activity_type: ActivityType
  entity_type?: string
  entity_id?: string
  metadata: Record<string, unknown>
  is_client_visible: boolean
  created_at: string
  // Joined fields
  user?: User
  project?: Project
}

// Notification Types
export type NotificationType =
  | 'new_deliverable'
  | 'deliverable_ready'
  | 'approval_needed'
  | 'approval_received'
  | 'comment_reply'
  | 'health_alert'
  | 'project_update'
  | 'invitation_accepted'
  | 'task_assigned'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message?: string
  link?: string
  is_read: boolean
  metadata: Record<string, unknown>
  created_at: string
}

// Milestone Types (enhanced)
export interface Milestone {
  id: string
  project_id: string
  title: string
  description?: string
  due_date: string
  completed_at?: string
  payment_amount?: number
  is_paid: boolean
  sort_order: number
  created_at: string
}

// ============================================
// LEADS MANAGEMENT TYPES
// ============================================

export type LeadSource = 'website' | 'referral' | 'social' | 'event' | 'other' | 'help_ticket'
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'converted' | 'lost'
export type LeadPriority = 'low' | 'medium' | 'high'
export type LeadActivityType = 'note' | 'email' | 'call' | 'meeting' | 'ai_assist' | 'status_change'

export interface Lead {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  subject?: string
  message: string
  source: LeadSource
  source_page?: string
  status: LeadStatus
  priority: LeadPriority
  assigned_to?: string
  client_id?: string
  notes?: string
  tags: string[]
  last_contacted_at?: string
  created_at: string
  updated_at: string
  // Joined fields
  assignee?: User
  client?: Client
  activities?: LeadActivity[]
}

export interface LeadActivity {
  id: string
  lead_id: string
  user_id?: string
  type: LeadActivityType
  content: string
  metadata: Record<string, unknown>
  created_at: string
  // Joined fields
  user?: User
}

export interface CreateLeadInput {
  name: string
  email: string
  phone?: string
  company?: string
  subject?: string
  message: string
  source?: LeadSource
  source_page?: string
  tags?: string[]
}

export interface UpdateLeadInput {
  name?: string
  email?: string
  phone?: string
  company?: string
  subject?: string
  message?: string
  status?: LeadStatus
  priority?: LeadPriority
  assigned_to?: string | null
  notes?: string
  tags?: string[]
}

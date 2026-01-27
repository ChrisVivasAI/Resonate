'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { formatDistanceToNow, format } from 'date-fns'
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Send,
  Upload,
  Award,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  Code,
  User,
  Calendar,
  Loader2,
  Link2,
  Folder,
  Pencil,
  X,
  Check,
} from 'lucide-react'
import { StatusBadge } from './status-badge'
import { ApprovalButtons } from './approval-buttons'
import { VersionHistory } from './version-history'
import type { Deliverable, DeliverableVersion } from '@/types'
import { cn } from '@/lib/utils'

interface DeliverableDetailProps {
  deliverable: Deliverable
  versions: DeliverableVersion[]
  userRole: 'admin' | 'member' | 'client'
  onBack: () => void
  onSubmitForReview?: () => Promise<void>
  onApprove?: (feedback?: string) => Promise<void>
  onReject?: (feedback: string, requestChanges?: boolean) => Promise<void>
  onMarkFinal?: () => Promise<void>
  onUploadVersion?: (data: { fileUrl: string; notes?: string }) => Promise<void>
  onUpdateLinks?: (data: {
    draft_url?: string
    draft_platform?: Deliverable['draft_platform']
    final_url?: string
    final_platform?: Deliverable['final_platform']
    notes?: string
  }) => Promise<void>
}

const platformLabels = {
  frame_io: 'Frame.io',
  vimeo: 'Vimeo',
  youtube: 'YouTube',
  dropbox: 'Dropbox',
  google_drive: 'Google Drive',
  wetransfer: 'WeTransfer',
  s3: 'Amazon S3',
  other: 'Other',
}

const typeIcons = {
  image: ImageIcon,
  video: Video,
  audio: Music,
  document: FileText,
  text: Code,
}

const typeColors = {
  image: 'text-pink-400 bg-pink-500/10',
  video: 'text-blue-400 bg-blue-500/10',
  audio: 'text-orange-400 bg-orange-500/10',
  document: 'text-emerald-400 bg-emerald-500/10',
  text: 'text-violet-400 bg-violet-500/10',
}

export function DeliverableDetail({
  deliverable,
  versions,
  userRole,
  onBack,
  onSubmitForReview,
  onApprove,
  onReject,
  onMarkFinal,
  onUploadVersion,
  onUpdateLinks,
}: DeliverableDetailProps) {
  const [submitting, setSubmitting] = useState(false)
  const [showUploadVersion, setShowUploadVersion] = useState(false)
  const [newVersionUrl, setNewVersionUrl] = useState('')
  const [newVersionNotes, setNewVersionNotes] = useState('')
  const [showEditLinks, setShowEditLinks] = useState(false)
  const [linkForm, setLinkForm] = useState({
    draft_url: deliverable.draft_url || '',
    draft_platform: deliverable.draft_platform || 'frame_io' as Deliverable['draft_platform'],
    final_url: deliverable.final_url || '',
    final_platform: deliverable.final_platform || 'google_drive' as Deliverable['final_platform'],
    notes: deliverable.notes || '',
  })

  const Icon = typeIcons[deliverable.type] || FileText
  const colorClass = typeColors[deliverable.type] || 'text-white/60 bg-white/5'
  const isAgency = ['admin', 'member'].includes(userRole)
  const isClient = userRole === 'client'

  const handleSubmitForReview = async () => {
    if (!onSubmitForReview) return
    setSubmitting(true)
    try {
      await onSubmitForReview()
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkFinal = async () => {
    if (!onMarkFinal) return
    setSubmitting(true)
    try {
      await onMarkFinal()
    } finally {
      setSubmitting(false)
    }
  }

  const handleUploadVersion = async () => {
    if (!onUploadVersion || !newVersionUrl.trim()) return
    setSubmitting(true)
    try {
      await onUploadVersion({
        fileUrl: newVersionUrl.trim(),
        notes: newVersionNotes.trim() || undefined,
      })
      setShowUploadVersion(false)
      setNewVersionUrl('')
      setNewVersionNotes('')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveLinks = async () => {
    if (!onUpdateLinks) return
    setSubmitting(true)
    try {
      await onUpdateLinks({
        draft_url: linkForm.draft_url.trim() || undefined,
        draft_platform: linkForm.draft_url.trim() ? linkForm.draft_platform : undefined,
        final_url: linkForm.final_url.trim() || undefined,
        final_platform: linkForm.final_url.trim() ? linkForm.final_platform : undefined,
        notes: linkForm.notes.trim() || undefined,
      })
      setShowEditLinks(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-10 bg-[#1a1a1a]/80 backdrop-blur-lg border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-xl font-semibold text-white">{deliverable.title}</h1>
                  <StatusBadge status={deliverable.status} />
                </div>
                <p className="text-sm text-white/40">
                  Version {deliverable.current_version} &bull; Updated{' '}
                  {formatDistanceToNow(new Date(deliverable.updated_at), { addSuffix: true })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {deliverable.file_url && (
                <>
                  <a
                    href={deliverable.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                  <a
                    href={deliverable.file_url}
                    download
                    className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    title="Download"
                  >
                    <Download className="w-5 h-5" />
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#2B2B2B]/60 border border-white/10 rounded-xl overflow-hidden"
            >
              <div className="aspect-video bg-[#1a1a1a] flex items-center justify-center">
                {deliverable.file_url ? (
                  deliverable.type === 'image' ? (
                    <img
                      src={deliverable.file_url}
                      alt={deliverable.title}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : deliverable.type === 'video' ? (
                    <video
                      src={deliverable.file_url}
                      controls
                      className="max-w-full max-h-full"
                    />
                  ) : deliverable.type === 'audio' ? (
                    <div className="p-8 w-full">
                      <audio src={deliverable.file_url} controls className="w-full" />
                    </div>
                  ) : (
                    <div className={cn('w-24 h-24 rounded-2xl flex items-center justify-center', colorClass)}>
                      <Icon className="w-12 h-12" />
                    </div>
                  )
                ) : (
                  <div className={cn('w-24 h-24 rounded-2xl flex items-center justify-center', colorClass)}>
                    <Icon className="w-12 h-12" />
                  </div>
                )}
              </div>
            </motion.div>

            {/* Description */}
            {deliverable.description && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-[#2B2B2B]/40 border border-white/10 rounded-xl p-6"
              >
                <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-3">
                  Description
                </h3>
                <p className="text-white/80 whitespace-pre-wrap">{deliverable.description}</p>
              </motion.div>
            )}

            {/* Actions for client */}
            {isClient && deliverable.status === 'in_review' && onApprove && onReject && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-3">
                  Your Review
                </h3>
                <ApprovalButtons
                  onApprove={onApprove}
                  onReject={onReject}
                />
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Details card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-[#2B2B2B]/40 border border-white/10 rounded-xl p-5"
            >
              <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">
                Details
              </h3>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', colorClass)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase">Type</p>
                    <p className="text-sm text-white capitalize">{deliverable.type}</p>
                  </div>
                </div>

                {deliverable.creator && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-white/40" />
                    </div>
                    <div>
                      <p className="text-xs text-white/40 uppercase">Created by</p>
                      <p className="text-sm text-white">{deliverable.creator.full_name}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white/40" />
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase">Created</p>
                    <p className="text-sm text-white">
                      {format(new Date(deliverable.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Links card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-[#2B2B2B]/40 border border-white/10 rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">
                  Links
                </h3>
                {isAgency && onUpdateLinks && !showEditLinks && (
                  <button
                    onClick={() => setShowEditLinks(true)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>

              {showEditLinks ? (
                <div className="space-y-4">
                  {/* Draft Link */}
                  <div>
                    <label className="block text-xs text-white/40 uppercase mb-1.5">Draft Link (for review/comments)</label>
                    <div className="flex gap-2">
                      <select
                        value={linkForm.draft_platform}
                        onChange={(e) => setLinkForm({ ...linkForm, draft_platform: e.target.value as Deliverable['draft_platform'] })}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#23FD9E]/50"
                      >
                        <option value="frame_io">Frame.io</option>
                        <option value="vimeo">Vimeo</option>
                        <option value="youtube">YouTube</option>
                        <option value="dropbox">Dropbox</option>
                        <option value="other">Other</option>
                      </select>
                      <input
                        type="url"
                        value={linkForm.draft_url}
                        onChange={(e) => setLinkForm({ ...linkForm, draft_url: e.target.value })}
                        placeholder="https://..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#23FD9E]/50"
                      />
                    </div>
                  </div>

                  {/* Final Link */}
                  <div>
                    <label className="block text-xs text-white/40 uppercase mb-1.5">Final Link (approved file)</label>
                    <div className="flex gap-2">
                      <select
                        value={linkForm.final_platform}
                        onChange={(e) => setLinkForm({ ...linkForm, final_platform: e.target.value as Deliverable['final_platform'] })}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#23FD9E]/50"
                      >
                        <option value="google_drive">Google Drive</option>
                        <option value="dropbox">Dropbox</option>
                        <option value="wetransfer">WeTransfer</option>
                        <option value="s3">Amazon S3</option>
                        <option value="other">Other</option>
                      </select>
                      <input
                        type="url"
                        value={linkForm.final_url}
                        onChange={(e) => setLinkForm({ ...linkForm, final_url: e.target.value })}
                        placeholder="https://..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#23FD9E]/50"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs text-white/40 uppercase mb-1.5">Notes</label>
                    <textarea
                      value={linkForm.notes}
                      onChange={(e) => setLinkForm({ ...linkForm, notes: e.target.value })}
                      placeholder="Internal notes about this deliverable..."
                      rows={2}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-[#23FD9E]/50"
                    />
                  </div>

                  {/* Save/Cancel buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowEditLinks(false)
                        setLinkForm({
                          draft_url: deliverable.draft_url || '',
                          draft_platform: deliverable.draft_platform || 'frame_io',
                          final_url: deliverable.final_url || '',
                          final_platform: deliverable.final_platform || 'google_drive',
                          notes: deliverable.notes || '',
                        })
                      }}
                      className="flex-1 px-3 py-2 rounded-lg bg-white/5 text-white/60 text-sm hover:bg-white/10 flex items-center justify-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveLinks}
                      disabled={submitting}
                      className="flex-1 px-3 py-2 rounded-lg bg-[#23FD9E] text-[#1a1a1a] text-sm font-medium hover:bg-[#1ed189] disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {deliverable.draft_url ? (
                    <a
                      href={deliverable.draft_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <Link2 className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-amber-400/60 uppercase">Draft</p>
                        <p className="text-sm text-white truncate">
                          {platformLabels[deliverable.draft_platform || 'other']}
                        </p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-white/40" />
                    </a>
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                        <Link2 className="w-4 h-4 text-white/40" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-white/30 uppercase">Draft</p>
                        <p className="text-sm text-white/40">No draft link set</p>
                      </div>
                    </div>
                  )}

                  {deliverable.final_url ? (
                    <a
                      href={deliverable.final_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg bg-[#23FD9E]/5 border border-[#23FD9E]/20 hover:bg-[#23FD9E]/10 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#23FD9E]/10 flex items-center justify-center">
                        <Folder className="w-4 h-4 text-[#23FD9E]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#23FD9E]/60 uppercase">Final</p>
                        <p className="text-sm text-white truncate">
                          {platformLabels[deliverable.final_platform || 'other']}
                        </p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-white/40" />
                    </a>
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                        <Folder className="w-4 h-4 text-white/40" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-white/30 uppercase">Final</p>
                        <p className="text-sm text-white/40">No final link set</p>
                      </div>
                    </div>
                  )}

                  {deliverable.notes && (
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-xs text-white/30 uppercase mb-1">Notes</p>
                      <p className="text-sm text-white/60">{deliverable.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* Agency actions */}
            {isAgency && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-[#2B2B2B]/40 border border-white/10 rounded-xl p-5 space-y-3"
              >
                <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">
                  Actions
                </h3>

                {deliverable.status === 'draft' && onSubmitForReview && (
                  <button
                    onClick={handleSubmitForReview}
                    disabled={submitting}
                    className="w-full px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium flex items-center justify-center gap-2 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                    Submit for Review
                  </button>
                )}

                {deliverable.status === 'approved' && onMarkFinal && (
                  <button
                    onClick={handleMarkFinal}
                    disabled={submitting}
                    className="w-full px-4 py-3 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 font-medium flex items-center justify-center gap-2 hover:bg-violet-500/20 transition-colors disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Award className="w-5 h-5" />
                    )}
                    Mark as Final
                  </button>
                )}

                {onUploadVersion && deliverable.status !== 'final' && (
                  <>
                    {!showUploadVersion ? (
                      <button
                        onClick={() => setShowUploadVersion(true)}
                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white/60 font-medium flex items-center justify-center gap-2 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        <Upload className="w-5 h-5" />
                        Upload New Version
                      </button>
                    ) : (
                      <div className="space-y-3 p-3 bg-white/5 rounded-lg">
                        <input
                          type="url"
                          value={newVersionUrl}
                          onChange={(e) => setNewVersionUrl(e.target.value)}
                          placeholder="File URL"
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#23FD9E]/50"
                        />
                        <textarea
                          value={newVersionNotes}
                          onChange={(e) => setNewVersionNotes(e.target.value)}
                          placeholder="Version notes (optional)"
                          rows={2}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-[#23FD9E]/50"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setShowUploadVersion(false)
                              setNewVersionUrl('')
                              setNewVersionNotes('')
                            }}
                            className="flex-1 px-3 py-2 rounded-lg bg-white/5 text-white/60 text-sm hover:bg-white/10"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleUploadVersion}
                            disabled={submitting || !newVersionUrl.trim()}
                            className="flex-1 px-3 py-2 rounded-lg bg-[#23FD9E] text-[#1a1a1a] text-sm font-medium hover:bg-[#1ed189] disabled:opacity-50"
                          >
                            {submitting ? 'Uploading...' : 'Upload'}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* Version history */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <VersionHistory
                versions={versions}
                currentVersion={deliverable.current_version}
                onViewVersion={(v) => window.open(v.file_url, '_blank')}
                onDownloadVersion={(v) => window.open(v.file_url, '_blank')}
              />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, Image as ImageIcon, Video, Music, FileText, Code, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type DeliverableType = 'image' | 'video' | 'audio' | 'document' | 'text'

interface DeliverableUploadProps {
  onUpload: (data: {
    title: string
    description?: string
    type: DeliverableType
    fileUrl?: string
    thumbnailUrl?: string
  }) => Promise<void>
  onCancel: () => void
  isOpen: boolean
}

const typeOptions: { value: DeliverableType; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { value: 'image', label: 'Image', icon: ImageIcon, color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
  { value: 'video', label: 'Video', icon: Video, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  { value: 'audio', label: 'Audio', icon: Music, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  { value: 'document', label: 'Document', icon: FileText, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { value: 'text', label: 'Text/Code', icon: Code, color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
]

export function DeliverableUpload({ onUpload, onCancel, isOpen }: DeliverableUploadProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<DeliverableType>('image')
  const [fileUrl, setFileUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    try {
      await onUpload({
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        fileUrl: fileUrl.trim() || undefined,
      })
      // Reset form
      setTitle('')
      setDescription('')
      setType('image')
      setFileUrl('')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-[#2B2B2B] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#23FD9E]/10 rounded-xl flex items-center justify-center">
                <Upload className="w-5 h-5 text-[#23FD9E]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">New Deliverable</h2>
                <p className="text-sm text-white/40">Add content to this project</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Type selector */}
            <div>
              <label className="block text-xs font-medium text-white/60 uppercase tracking-wider mb-3">
                Content Type
              </label>
              <div className="grid grid-cols-5 gap-2">
                {typeOptions.map(({ value, label, icon: Icon, color }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setType(value)}
                    className={cn(
                      'p-3 rounded-xl border transition-all flex flex-col items-center gap-1.5',
                      type === value
                        ? color
                        : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-white/60 uppercase tracking-wider mb-2">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter deliverable title"
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#23FD9E]/50 focus:ring-1 focus:ring-[#23FD9E]/50 transition-all"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-white/60 uppercase tracking-wider mb-2">
                Description
                <span className="text-white/30 font-normal ml-1">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this deliverable..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-[#23FD9E]/50 focus:ring-1 focus:ring-[#23FD9E]/50 transition-all"
              />
            </div>

            {/* File URL */}
            <div>
              <label className="block text-xs font-medium text-white/60 uppercase tracking-wider mb-2">
                File URL
                <span className="text-white/30 font-normal ml-1">(optional)</span>
              </label>
              <input
                type="url"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#23FD9E]/50 focus:ring-1 focus:ring-[#23FD9E]/50 transition-all"
              />
              <p className="text-xs text-white/40 mt-1.5">
                Link to your file, or add it later
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-3 rounded-lg bg-white/5 text-white/60 font-medium hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !title.trim()}
                className="flex-1 px-4 py-3 rounded-lg bg-[#23FD9E] text-[#1a1a1a] font-semibold hover:bg-[#1ed189] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Create Deliverable
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

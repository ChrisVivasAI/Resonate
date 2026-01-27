'use client'

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  Image as ImageIcon,
  FileCode,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui'

interface DesignUploadProps {
  onUploadComplete: (data: {
    url: string
    filename: string
    type: 'svg' | 'image'
  }) => void
  isUploading?: boolean
  currentFile?: {
    url: string
    filename: string
    type: 'svg' | 'image'
  } | null
}

const ACCEPTED_TYPES = {
  'image/svg+xml': 'svg',
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/webp': 'image',
} as const

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export function DesignUpload({
  onUploadComplete,
  isUploading = false,
  currentFile,
}: DesignUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }, [])

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const validateFile = (file: File): { valid: boolean; type?: 'svg' | 'image'; error?: string } => {
    // Check file extension as fallback for MIME type detection
    const fileName = file.name.toLowerCase()
    const extension = fileName.split('.').pop()

    // Determine file type by extension first (more reliable for SVGs)
    let fileType: 'svg' | 'image' | undefined

    if (extension === 'svg') {
      fileType = 'svg'
    } else if (['png', 'jpg', 'jpeg', 'webp'].includes(extension || '')) {
      fileType = 'image'
    } else {
      // Try MIME type as fallback
      const mimeType = file.type as keyof typeof ACCEPTED_TYPES
      fileType = ACCEPTED_TYPES[mimeType]
    }

    if (!fileType) {
      return { valid: false, error: `Unsupported file type: ${file.type || extension}. Please upload an SVG, PNG, JPEG, or WebP file.` }
    }

    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
      return { valid: false, error: `File size (${sizeMB}MB) exceeds 10MB limit` }
    }

    return { valid: true, type: fileType }
  }

  const uploadFile = async (file: File) => {
    setError(null)
    setUploadProgress(0)
    setUploading(true)

    const validation = validateFile(file)
    if (!validation.valid) {
      setError(validation.error || 'Invalid file')
      setUploading(false)
      return
    }

    try {
      // Create form data
      const formData = new FormData()
      formData.append('file', file)

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 100)

      // Upload to API
      const response = await fetch('/api/pages/upload-design', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Upload failed')
      }

      const { url, filename } = await response.json()
      setUploadProgress(100)

      // Notify parent
      onUploadComplete({
        url,
        filename,
        type: validation.type!,
      })

      // Reset progress after a moment
      setTimeout(() => setUploadProgress(0), 1000)
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Upload failed')
      setUploadProgress(0)
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      uploadFile(file)
      e.dataTransfer.clearData()
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFile(e.target.files[0])
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleClear = () => {
    setError(null)
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const isProcessing = uploading || isUploading

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept=".svg,image/svg+xml,image/png,image/jpeg,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={!isProcessing ? handleClick : undefined}
        className={cn(
          'relative flex flex-col items-center justify-center min-h-[300px] rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer',
          isDragging
            ? 'border-resonate-400 bg-resonate-400/5'
            : error
            ? 'border-red-500/50 bg-red-500/5'
            : currentFile
            ? 'border-resonate-400/50 bg-resonate-400/5'
            : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]',
          isProcessing && 'pointer-events-none opacity-70'
        )}
      >
        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-charcoal-700" />
                <motion.div
                  className="absolute inset-0 w-16 h-16 rounded-full border-4 border-t-resonate-400 border-r-transparent border-b-transparent border-l-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">{uploadProgress}%</span>
                </div>
              </div>
              <p className="text-charcoal-400 text-sm">
                {isUploading ? 'Processing design...' : 'Uploading...'}
              </p>
            </motion.div>
          ) : currentFile ? (
            <motion.div
              key="uploaded"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-4 w-full p-6"
            >
              {/* Preview */}
              <div className="relative w-full max-w-md aspect-video rounded-lg overflow-hidden bg-charcoal-900 border border-white/10">
                {currentFile.type === 'svg' ? (
                  <object
                    data={currentFile.url}
                    type="image/svg+xml"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <img
                    src={currentFile.url}
                    alt="Design preview"
                    className="w-full h-full object-contain"
                  />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClear()
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-charcoal-950/80 hover:bg-red-500/20 text-charcoal-400 hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-resonate-400" />
                <p className="text-white font-medium">{currentFile.filename}</p>
                <span className="px-2 py-0.5 text-xs bg-white/10 rounded text-charcoal-300 uppercase">
                  {currentFile.type}
                </span>
              </div>
              <p className="text-charcoal-500 text-sm">Click or drag to replace</p>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-4 p-6"
            >
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500/20 to-resonate-400/20 flex items-center justify-center">
                  <FileCode className="w-7 h-7 text-violet-400" />
                </div>
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-500/20 to-orange-400/20 flex items-center justify-center">
                  <ImageIcon className="w-7 h-7 text-pink-400" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-white font-medium text-lg mb-1">
                  Drop your design here
                </p>
                <p className="text-charcoal-500 text-sm">
                  SVG, PNG, JPEG, or WebP up to 50MB
                </p>
              </div>
              <div className="flex items-center gap-3 text-charcoal-600 text-sm">
                <span>or</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClick()
                  }}
                  leftIcon={<Upload className="w-4 h-4" />}
                >
                  Browse Files
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-4 left-4 right-4"
            >
              <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setError(null)
                  }}
                  className="ml-auto p-1 hover:bg-red-500/20 rounded"
                >
                  <X className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drag overlay */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-resonate-400/10 rounded-xl flex items-center justify-center"
            >
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-12 h-12 text-resonate-400" />
                <p className="text-resonate-400 font-medium">Drop to upload</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

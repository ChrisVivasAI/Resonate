'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, Image as ImageIcon } from 'lucide-react'

interface ImageUploadZoneProps {
  image: File | string | null
  onImageChange: (image: File | null) => void
  label?: string
  accept?: string
}

export function ImageUploadZone({
  image,
  onImageChange,
  label = 'Upload Image',
  accept = 'image/*',
}: ImageUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file && file.type.startsWith('image/')) {
        onImageChange(file)
      }
    },
    [onImageChange]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        onImageChange(file)
      }
    },
    [onImageChange]
  )

  const handleRemove = useCallback(() => {
    onImageChange(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [onImageChange])

  const imageUrl = image instanceof File ? URL.createObjectURL(image) : image

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {imageUrl ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative aspect-video bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden"
          >
            <img
              src={imageUrl}
              alt="Uploaded"
              className="w-full h-full object-contain bg-charcoal-950"
            />
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleRemove}
              className="absolute top-2 right-2 p-1.5 bg-charcoal-900/80 hover:bg-red-500/80 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative aspect-video rounded-lg border-2 border-dashed cursor-pointer transition-all duration-200 ${
              isDragging
                ? 'border-resonate-400/50 bg-resonate-400/5'
                : 'border-white/[0.08] hover:border-white/[0.15] bg-white/[0.02]'
            }`}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div
                className={`w-12 h-12 mb-3 rounded-lg flex items-center justify-center transition-colors ${
                  isDragging ? 'bg-resonate-400/10' : 'bg-white/[0.04]'
                }`}
              >
                {isDragging ? (
                  <ImageIcon className="w-5 h-5 text-resonate-400" />
                ) : (
                  <Upload className="w-5 h-5 text-charcoal-500" />
                )}
              </div>
              <p className="text-sm text-charcoal-400 mb-1">{label}</p>
              <p className="text-[10px] text-charcoal-600 uppercase tracking-wide">
                {isDragging ? 'Drop to upload' : 'Drag & drop or click to browse'}
              </p>
              <p className="text-[10px] text-charcoal-700 mt-2">PNG, JPG up to 10MB</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}

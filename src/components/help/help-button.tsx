'use client'

import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { HelpModal } from './help-modal'

export function HelpButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="relative p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.04] transition-colors"
      >
        <HelpCircle className="w-5 h-5" />
      </motion.button>
      <HelpModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}

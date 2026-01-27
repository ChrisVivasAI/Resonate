'use client'

import { useState, useEffect } from 'react'
import { motion, Reorder } from 'framer-motion'
import {
  Plus,
  Eye,
  Save,
  Settings2,
  Trash2,
  GripVertical,
  Type,
  Image as ImageIcon,
  Layout,
  Mail,
  Quote,
  Grid3X3,
  ChevronDown,
  ChevronUp,
  Palette,
  Globe,
  Code,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Textarea, Select, Modal, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui'
import type { PageSection, PageSettings, Page } from '@/types'
import { Loader2 } from 'lucide-react'

const sectionTypes = [
  { id: 'hero', name: 'Hero Section', icon: Layout, description: 'Full-width hero with headline and CTA' },
  { id: 'features', name: 'Features', icon: Grid3X3, description: 'Showcase features in a grid' },
  { id: 'text', name: 'Text Block', icon: Type, description: 'Rich text content section' },
  { id: 'gallery', name: 'Image Gallery', icon: ImageIcon, description: 'Display images in a gallery' },
  { id: 'testimonials', name: 'Testimonials', icon: Quote, description: 'Customer testimonials slider' },
  { id: 'contact', name: 'Contact Form', icon: Mail, description: 'Contact form with custom fields' },
  { id: 'cta', name: 'Call to Action', icon: Layout, description: 'Conversion-focused CTA section' },
  { id: 'custom', name: 'Custom Code', icon: Code, description: 'AI-generated or custom HTML/code section' },
]

interface PageBuilderProps {
  pageId?: string
  initialSections?: PageSection[]
  initialSettings?: PageSettings
}

export function PageBuilder({ pageId, initialSections = [], initialSettings }: PageBuilderProps) {
  const [page, setPage] = useState<Page | null>(null)
  const [isLoading, setIsLoading] = useState(!!pageId)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sections, setSections] = useState<PageSection[]>(initialSections)
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState<PageSettings>(
    initialSettings || {
      primary_color: '#ed741c',
      secondary_color: '#4f6da7',
      font_family: 'DM Sans',
      show_header: true,
      show_footer: true,
    }
  )

  // Fetch page data when pageId is provided
  useEffect(() => {
    async function fetchPage() {
      if (!pageId) return

      setIsLoading(true)
      setLoadError(null)

      try {
        const response = await fetch(`/api/pages/${pageId}`)
        if (!response.ok) {
          throw new Error('Failed to load page')
        }
        const { page: pageData } = await response.json()
        setPage(pageData)
        setSections(pageData.sections || [])
        setSettings(pageData.settings || {
          primary_color: '#ed741c',
          secondary_color: '#4f6da7',
          font_family: 'DM Sans',
          show_header: true,
          show_footer: true,
        })
      } catch (err) {
        console.error('Error loading page:', err)
        setLoadError(err instanceof Error ? err.message : 'Failed to load page')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPage()
  }, [pageId])

  // Save page changes
  const handleSave = async () => {
    if (!pageId) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sections,
          settings,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save page')
      }

      // Show success feedback (could add toast notification here)
      console.log('Page saved successfully')
    } catch (err) {
      console.error('Error saving page:', err)
      // Could show error toast here
    } finally {
      setIsSaving(false)
    }
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <Loader2 className="w-8 h-8 animate-spin text-resonate-400" />
      </div>
    )
  }

  // Show error state
  if (loadError) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <div className="text-center">
          <p className="text-red-400 mb-4">{loadError}</p>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const addSection = (type: string) => {
    const newSection: PageSection = {
      id: `section-${Date.now()}`,
      type: type as PageSection['type'],
      order: sections.length,
      content: getDefaultContent(type),
      styles: {},
      is_visible: true,
    }
    setSections([...sections, newSection])
    setIsAddSectionModalOpen(false)
    setSelectedSection(newSection.id)
  }

  const removeSection = (id: string) => {
    setSections(sections.filter((s) => s.id !== id))
    if (selectedSection === id) setSelectedSection(null)
  }

  const toggleSectionVisibility = (id: string) => {
    setSections(
      sections.map((s) =>
        s.id === id ? { ...s, is_visible: !s.is_visible } : s
      )
    )
  }

  const updateSectionContent = (id: string, content: Record<string, unknown>) => {
    setSections(
      sections.map((s) =>
        s.id === id ? { ...s, content: { ...s.content, ...content } } : s
      )
    )
  }

  return (
    <div className="flex h-[calc(100vh-80px)]">
      {/* Left Panel - Section List */}
      <div className="w-80 border-r border-midnight-700/50 flex flex-col">
        <div className="p-4 border-b border-midnight-700/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-200">Sections</h2>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsAddSectionModalOpen(true)}
            >
              Add
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <Reorder.Group axis="y" values={sections} onReorder={setSections} className="space-y-2">
            {sections.map((section) => (
              <Reorder.Item key={section.id} value={section}>
                <div
                  className={`p-3 rounded-xl cursor-pointer transition-all ${
                    selectedSection === section.id
                      ? 'bg-resonate-500/10 border border-resonate-500/30'
                      : 'bg-midnight-900/50 border border-transparent hover:bg-midnight-800/50'
                  } ${!section.is_visible ? 'opacity-50' : ''}`}
                  onClick={() => setSelectedSection(section.id)}
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-slate-600 cursor-grab" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-200 capitalize">
                        {section.type.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-slate-500">
                        {section.is_visible ? 'Visible' : 'Hidden'}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleSectionVisibility(section.id)
                      }}
                      className="p-1.5 rounded-lg hover:bg-midnight-700 transition-colors"
                    >
                      <Eye className={`w-4 h-4 ${section.is_visible ? 'text-slate-400' : 'text-slate-600'}`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeSection(section.id)
                      }}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-slate-500 hover:text-red-400" />
                    </button>
                  </div>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>

          {sections.length === 0 && (
            <div className="text-center py-8">
              <p className="text-slate-500 mb-4">No sections yet</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddSectionModalOpen(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add First Section
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-14 border-b border-midnight-700/50 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Button
              variant={isPreviewMode ? 'secondary' : 'ghost'}
              size="sm"
              leftIcon={<Eye className="w-4 h-4" />}
              onClick={() => setIsPreviewMode(!isPreviewMode)}
            >
              {isPreviewMode ? 'Edit' : 'Preview'}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Settings2 className="w-4 h-4" />}
              onClick={() => setIsSettingsOpen(true)}
            >
              Settings
            </Button>
            <Button
              size="sm"
              leftIcon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              onClick={handleSave}
              disabled={isSaving || !pageId}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            {page?.slug && (
              <a href={`/p/${page.slug}`} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="secondary" leftIcon={<Eye className="w-4 h-4" />}>
                  Preview
                </Button>
              </a>
            )}
            <Button size="sm" leftIcon={<Globe className="w-4 h-4" />}>
              Publish
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-y-auto bg-midnight-950/50 p-8">
          <div className="max-w-4xl mx-auto bg-white rounded-xl overflow-hidden shadow-2xl">
            {sections.length === 0 ? (
              <div className="h-96 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-slate-400 mb-4">Start building your page</p>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddSectionModalOpen(true)}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Add Section
                  </Button>
                </div>
              </div>
            ) : (
              sections
                .filter((s) => s.is_visible || !isPreviewMode)
                .map((section) => (
                  <SectionPreview
                    key={section.id}
                    section={section}
                    isSelected={selectedSection === section.id}
                    onClick={() => setSelectedSection(section.id)}
                    settings={settings}
                  />
                ))
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Section Editor */}
      {selectedSection && (
        <div className="w-80 border-l border-midnight-700/50 overflow-y-auto">
          <SectionEditor
            section={sections.find((s) => s.id === selectedSection)!}
            onUpdate={(content) => updateSectionContent(selectedSection, content)}
            onClose={() => setSelectedSection(null)}
          />
        </div>
      )}

      {/* Add Section Modal */}
      <Modal
        isOpen={isAddSectionModalOpen}
        onClose={() => setIsAddSectionModalOpen(false)}
        title="Add Section"
        description="Choose a section type to add to your page."
        size="lg"
      >
        <div className="grid md:grid-cols-2 gap-4">
          {sectionTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => addSection(type.id)}
              className="p-4 rounded-xl bg-midnight-900/50 hover:bg-midnight-800/50 border border-midnight-700 hover:border-resonate-500/30 transition-all text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-resonate-500/10">
                  <type.icon className="w-5 h-5 text-resonate-400" />
                </div>
                <h3 className="font-medium text-slate-200">{type.name}</h3>
              </div>
              <p className="text-sm text-slate-400">{type.description}</p>
            </button>
          ))}
        </div>
      </Modal>

      {/* Settings Modal */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Page Settings"
        description="Configure your page appearance and behavior."
        size="lg"
      >
        <Tabs defaultValue="design">
          <TabsList className="mb-6">
            <TabsTrigger value="design">
              <Palette className="w-4 h-4 mr-2" />
              Design
            </TabsTrigger>
            <TabsTrigger value="seo">
              <Globe className="w-4 h-4 mr-2" />
              SEO
            </TabsTrigger>
            <TabsTrigger value="advanced">
              <Code className="w-4 h-4 mr-2" />
              Advanced
            </TabsTrigger>
          </TabsList>

          <TabsContent value="design" className="space-y-4">
            <Input
              label="Primary Color"
              type="color"
              value={settings.primary_color}
              onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
            />
            <Input
              label="Secondary Color"
              type="color"
              value={settings.secondary_color}
              onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
            />
            <Select
              label="Font Family"
              options={[
                { value: 'DM Sans', label: 'DM Sans' },
                { value: 'Inter', label: 'Inter' },
                { value: 'Playfair Display', label: 'Playfair Display' },
              ]}
              value={settings.font_family}
              onChange={(e) => setSettings({ ...settings, font_family: e.target.value })}
            />
          </TabsContent>

          <TabsContent value="seo" className="space-y-4">
            <Input label="Meta Title" placeholder="Page title for search engines" />
            <Textarea label="Meta Description" placeholder="Description for search results" />
            <Input label="OG Image URL" placeholder="https://..." />
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <Textarea label="Custom CSS" placeholder=".my-class { }" className="font-mono text-sm" />
            <Input label="Form Webhook URL" placeholder="https://..." />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-midnight-700/50">
          <Button variant="secondary" onClick={() => setIsSettingsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setIsSettingsOpen(false)}>Save Settings</Button>
        </div>
      </Modal>
    </div>
  )
}

function getDefaultContent(type: string): Record<string, unknown> {
  const defaults: Record<string, Record<string, unknown>> = {
    hero: {
      headline: 'Welcome to Our Platform',
      subheadline: 'Build something amazing with our powerful tools.',
      cta_text: 'Get Started',
      cta_url: '#',
      background_image: '',
    },
    features: {
      headline: 'Our Features',
      features: [
        { title: 'Feature 1', description: 'Description of feature 1', icon: 'sparkles' },
        { title: 'Feature 2', description: 'Description of feature 2', icon: 'zap' },
        { title: 'Feature 3', description: 'Description of feature 3', icon: 'shield' },
      ],
    },
    text: {
      content: '<p>Add your content here...</p>',
    },
    gallery: {
      images: [],
      columns: 3,
    },
    testimonials: {
      testimonials: [
        { name: 'John Doe', role: 'CEO', company: 'Acme Inc.', quote: 'Amazing product!' },
      ],
    },
    contact: {
      headline: 'Get in Touch',
      fields: [
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'message', label: 'Message', type: 'textarea', required: true },
      ],
      submit_text: 'Send Message',
    },
    cta: {
      headline: 'Ready to Get Started?',
      description: 'Join thousands of satisfied customers.',
      cta_text: 'Start Free Trial',
      cta_url: '#',
    },
    custom: {
      name: 'Custom Section',
      code: '<div class="py-16 px-8 bg-white text-center"><h2 class="text-2xl font-bold">Custom Section</h2><p class="text-gray-600 mt-4">Add your custom HTML here</p></div>',
    },
  }
  return defaults[type] || {}
}

function SectionPreview({
  section,
  isSelected,
  onClick,
  settings,
}: {
  section: PageSection
  isSelected: boolean
  onClick: () => void
  settings: PageSettings
}) {
  const primaryColor = settings.primary_color || '#ed741c'

  return (
    <div
      className={`relative cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={onClick}
    >
      {section.type === 'hero' && (
        <div
          className="py-24 px-8 text-center"
          style={{ backgroundColor: '#1a2337' }}
        >
          <h1 className="text-4xl font-bold text-white mb-4">
            {(section.content.headline as string) || 'Welcome'}
          </h1>
          <p className="text-xl text-slate-300 mb-8">
            {(section.content.subheadline as string) || 'Subheadline'}
          </p>
          <button
            className="px-6 py-3 rounded-lg text-white font-medium"
            style={{ backgroundColor: primaryColor }}
          >
            {(section.content.cta_text as string) || 'Get Started'}
          </button>
        </div>
      )}

      {section.type === 'features' && (
        <div className="py-16 px-8 bg-slate-50">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            {(section.content.headline as string) || 'Features'}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {((section.content.features as { title: string; description: string }[]) || []).map(
              (feature, i) => (
                <div key={i} className="text-center">
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-slate-600">{feature.description}</p>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {section.type === 'text' && (
        <div className="py-12 px-8 bg-white">
          <div
            className="prose max-w-none text-slate-700"
            dangerouslySetInnerHTML={{ __html: (section.content.content as string) || '' }}
          />
        </div>
      )}

      {section.type === 'contact' && (
        <div className="py-16 px-8 bg-slate-50">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-8">
            {(section.content.headline as string) || 'Contact Us'}
          </h2>
          <div className="max-w-md mx-auto space-y-4">
            {((section.content.fields as { label: string; type: string }[]) || []).map((field, i) => (
              <div key={i}>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {field.label}
                </label>
                {field.type === 'textarea' ? (
                  <textarea className="w-full p-3 border rounded-lg" rows={4} />
                ) : (
                  <input type={field.type} className="w-full p-3 border rounded-lg" />
                )}
              </div>
            ))}
            <button
              className="w-full py-3 rounded-lg text-white font-medium"
              style={{ backgroundColor: primaryColor }}
            >
              {(section.content.submit_text as string) || 'Submit'}
            </button>
          </div>
        </div>
      )}

      {section.type === 'cta' && (
        <div
          className="py-16 px-8 text-center"
          style={{ backgroundColor: primaryColor }}
        >
          <h2 className="text-3xl font-bold text-white mb-4">
            {(section.content.headline as string) || 'Ready to start?'}
          </h2>
          <p className="text-xl text-white/80 mb-8">
            {(section.content.description as string) || 'Description'}
          </p>
          <button className="px-6 py-3 rounded-lg bg-white text-slate-900 font-medium">
            {(section.content.cta_text as string) || 'Get Started'}
          </button>
        </div>
      )}

      {section.type === 'custom' && (
        <div className="relative">
          {section.content.code ? (
            <div
              className="custom-section-preview"
              dangerouslySetInnerHTML={{ __html: section.content.code as string }}
            />
          ) : (
            <div className="py-16 px-8 bg-slate-100 text-center">
              <p className="text-slate-500">
                {(section.content.name as string) || 'Custom Section'}
              </p>
              <p className="text-sm text-slate-400 mt-2">AI-generated section</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SectionEditor({
  section,
  onUpdate,
  onClose,
}: {
  section: PageSection
  onUpdate: (content: Record<string, unknown>) => void
  onClose: () => void
}) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-200 capitalize">
          Edit {section.type.replace('_', ' ')}
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-midnight-800 transition-colors"
        >
          <ChevronUp className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <div className="space-y-4">
        {section.type === 'hero' && (
          <>
            <Input
              label="Headline"
              value={(section.content.headline as string) || ''}
              onChange={(e) => onUpdate({ headline: e.target.value })}
            />
            <Textarea
              label="Subheadline"
              value={(section.content.subheadline as string) || ''}
              onChange={(e) => onUpdate({ subheadline: e.target.value })}
            />
            <Input
              label="CTA Text"
              value={(section.content.cta_text as string) || ''}
              onChange={(e) => onUpdate({ cta_text: e.target.value })}
            />
            <Input
              label="CTA URL"
              value={(section.content.cta_url as string) || ''}
              onChange={(e) => onUpdate({ cta_url: e.target.value })}
            />
          </>
        )}

        {section.type === 'text' && (
          <Textarea
            label="Content"
            value={(section.content.content as string) || ''}
            onChange={(e) => onUpdate({ content: e.target.value })}
            className="min-h-[200px]"
          />
        )}

        {section.type === 'contact' && (
          <>
            <Input
              label="Headline"
              value={(section.content.headline as string) || ''}
              onChange={(e) => onUpdate({ headline: e.target.value })}
            />
            <Input
              label="Submit Button Text"
              value={(section.content.submit_text as string) || ''}
              onChange={(e) => onUpdate({ submit_text: e.target.value })}
            />
          </>
        )}

        {section.type === 'cta' && (
          <>
            <Input
              label="Headline"
              value={(section.content.headline as string) || ''}
              onChange={(e) => onUpdate({ headline: e.target.value })}
            />
            <Textarea
              label="Description"
              value={(section.content.description as string) || ''}
              onChange={(e) => onUpdate({ description: e.target.value })}
            />
            <Input
              label="CTA Text"
              value={(section.content.cta_text as string) || ''}
              onChange={(e) => onUpdate({ cta_text: e.target.value })}
            />
          </>
        )}

        {section.type === 'custom' && (
          <>
            <Input
              label="Section Name"
              value={(section.content.name as string) || ''}
              onChange={(e) => onUpdate({ name: e.target.value })}
            />
            <Textarea
              label="HTML Code"
              value={(section.content.code as string) || ''}
              onChange={(e) => onUpdate({ code: e.target.value })}
              className="min-h-[300px] font-mono text-sm"
              placeholder="<div class='py-16 px-8'>...</div>"
            />
          </>
        )}
      </div>
    </div>
  )
}

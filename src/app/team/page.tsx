'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, DollarSign, FolderKanban, Loader2, CircleDollarSign, Check, Plus, Pencil, Trash2 } from 'lucide-react'
import { DashboardLayout, Header } from '@/components/layout'
import { Card, Avatar, Button, Modal, Input, Badge } from '@/components/ui'
import { useTeamMembers } from '@/hooks'
import Link from 'next/link'

export default function TeamPage() {
  const { members, loading, error, addTeamMember, updateTeamMember, deleteTeamMember } = useTeamMembers()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingMember, setEditingMember] = useState<typeof members[0] | null>(null)
  const [formData, setFormData] = useState({ full_name: '', email: '', role: 'contractor' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const totalOwed = members.reduce((sum, m) => sum + m.totalOwed, 0)
  const totalPaid = members.reduce((sum, m) => sum + m.totalPaid, 0)
  const totalEarned = members.reduce((sum, m) => sum + m.totalEarned, 0)

  const openAdd = () => {
    setFormData({ full_name: '', email: '', role: 'contractor' })
    setEditingMember(null)
    setShowAddModal(true)
  }

  const openEdit = (member: typeof members[0]) => {
    setFormData({ full_name: member.full_name || '', email: member.email || '', role: member.role || 'contractor' })
    setEditingMember(member)
    setShowAddModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.full_name.trim()) return
    setIsSubmitting(true)
    try {
      if (editingMember) {
        await updateTeamMember(editingMember.id, formData)
      } else {
        await addTeamMember(formData)
      }
      setShowAddModal(false)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (member: typeof members[0]) => {
    if (!confirm(`Remove ${member.full_name} from the team?`)) return
    try {
      await deleteTeamMember(member.id)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <DashboardLayout>
      <Header
        title="Team"
        description="Manage team members and track labor payments"
        actions={
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openAdd}>
            Add Team Member
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-obsidian-400">Team Members</p>
                <p className="text-2xl font-semibold text-white">{members.length}</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10">
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-obsidian-400">Total Earned</p>
                <p className="text-2xl font-semibold text-white">${totalEarned.toFixed(2)}</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10">
                <CircleDollarSign className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-obsidian-400">Total Owed</p>
                <p className="text-2xl font-semibold text-amber-400">${totalOwed.toFixed(2)}</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10">
                <Check className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-obsidian-400">Total Paid</p>
                <p className="text-2xl font-semibold text-emerald-400">${totalPaid.toFixed(2)}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Team Members */}
      {loading ? (
        <Card className="p-12">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-obsidian-400" />
          </div>
        </Card>
      ) : error ? (
        <Card className="p-12">
          <div className="text-center text-red-400">{error}</div>
        </Card>
      ) : members.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <p className="text-obsidian-400 mb-4">No team members yet</p>
            <Button variant="secondary" size="sm" onClick={openAdd}>
              Add your first team member
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-obsidian-800">
                  <th className="text-left py-3 px-4 text-sm font-medium text-obsidian-400">Member</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-obsidian-400">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-obsidian-400">Type</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-obsidian-400">Projects</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-obsidian-400">Total Earned</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-obsidian-400">Owed</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-obsidian-400">Paid</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-obsidian-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-b border-obsidian-800/50 hover:bg-obsidian-800/30">
                    <td className="py-3 px-4">
                      <Link href={`/team/${member.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <Avatar name={member.full_name} size="sm" />
                        <span className="text-sm font-medium text-white">{member.full_name || 'Unnamed'}</span>
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-sm text-obsidian-400">{member.email || '—'}</td>
                    <td className="py-3 px-4">
                      {member.source === 'profile' ? (
                        <Badge variant="info">Account</Badge>
                      ) : (
                        <Badge variant="default">Contractor</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-300 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <FolderKanban className="w-3.5 h-3.5 text-obsidian-400" />
                        {member.activeProjects}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-white text-right font-medium">
                      ${member.totalEarned.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-medium">
                      <span className={member.totalOwed > 0 ? 'text-amber-400' : 'text-obsidian-400'}>
                        ${member.totalOwed.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-medium">
                      <span className="text-emerald-400">${member.totalPaid.toFixed(2)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        {member.source === 'external' ? (
                          <>
                            <button
                              onClick={() => openEdit(member)}
                              className="p-1.5 hover:bg-obsidian-700 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4 text-obsidian-400 hover:text-white" />
                            </button>
                            <button
                              onClick={() => handleDelete(member)}
                              className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                              title="Remove"
                            >
                              <Trash2 className="w-4 h-4 text-obsidian-400 hover:text-red-400" />
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-obsidian-500 px-1.5">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editingMember ? 'Edit Team Member' : 'Add Team Member'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            placeholder="e.g. John Doe"
            required
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="e.g. john@example.com"
          />
          <Input
            label="Role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            placeholder="e.g. contractor, freelancer"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingMember ? 'Save Changes' : 'Add Member'}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}

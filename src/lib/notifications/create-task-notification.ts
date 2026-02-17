interface Task {
  id: string
  title: string
  project_id: string
}

export async function createTaskAssignedNotification(
  supabase: { from: (table: string) => any },
  assigneeId: string,
  task: Task,
  assignerName: string
) {
  // Only notify login users (those with a profile)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', assigneeId)
    .single()

  if (!profile) return

  await supabase.from('notifications').insert({
    user_id: assigneeId,
    type: 'task_assigned',
    title: 'New task assigned',
    message: `${assignerName} assigned you to "${task.title}"`,
    link: `/projects/${task.project_id}?tab=tasks`,
    metadata: {
      task_id: task.id,
      task_title: task.title,
      project_id: task.project_id,
      assigner_name: assignerName,
    },
  })
}

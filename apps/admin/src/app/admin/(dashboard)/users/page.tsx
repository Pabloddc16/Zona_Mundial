'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type AdminUser } from '@/lib/api'
import { DataTable } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Sheet } from '@/components/ui/sheet'
import { Plus, Trash2 } from 'lucide-react'
import { format } from 'date-fns'

const ROLES = ['admin', 'capturista', 'repartidor']
const ROLE_COLORS: Record<string, 'brand' | 'info' | 'default'> = {
  admin: 'brand', capturista: 'info', repartidor: 'default',
}

export default function UsersPage() {
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)

  const { data: users, isLoading } = useQuery({ queryKey: ['users'], queryFn: api.users.list })

  const createMut = useMutation({
    mutationFn: (body: unknown) => api.users.create(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setCreating(false) },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) => api.users.update(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setEditing(null) },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.users.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const columns = [
    { key: 'username', header: 'Username', cell: (r: AdminUser) => <span className="font-mono text-sm">{r.username}</span> },
    { key: 'email', header: 'Email', cell: (r: AdminUser) => r.email ?? '—' },
    { key: 'role', header: 'Role', cell: (r: AdminUser) => <Badge variant={ROLE_COLORS[r.role] ?? 'default'}>{r.role}</Badge> },
    { key: 'active', header: 'Active', cell: (r: AdminUser) => <Badge variant={r.active ? 'success' : 'danger'}>{r.active ? 'Yes' : 'No'}</Badge>, className: 'text-center' },
    { key: 'created_at', header: 'Created', cell: (r: AdminUser) => format(new Date(r.created_at), 'MM/dd/yy') },
    { key: 'actions', header: '', cell: (r: AdminUser) => (
      <div className="flex gap-1 justify-end">
        <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>Edit</Button>
        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => {
          if (confirm(`Delete ${r.username}? This cannot be undone.`)) deleteMut.mutate(r.id)
        }}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    ) },
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white/90">Users</h1>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1" />New user</Button>
      </div>

      <DataTable columns={columns} data={users ?? []} keyFn={(r) => r.id} loading={isLoading} />

      <Sheet open={creating} onClose={() => setCreating(false)} title="New user">
        <UserForm onSave={(b) => createMut.mutate(b)} saving={createMut.isPending} error={createMut.isError ? (createMut.error as Error).message : ''} />
      </Sheet>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Edit user">
        {editing && (
          <EditUserForm
            user={editing}
            onSave={(b) => updateMut.mutate({ id: editing.id, body: b })}
            saving={updateMut.isPending}
            error={updateMut.isError ? (updateMut.error as Error).message : ''}
          />
        )}
      </Sheet>
    </div>
  )
}

function UserForm({ onSave, saving, error }: { onSave: (b: unknown) => void; saving: boolean; error: string }) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('capturista')

  return (
    <div className="space-y-4">
      {([['Username', username, setUsername, 'text'], ['Email', email, setEmail, 'email'], ['Password (min 8 chars)', password, setPassword, 'password']] as [string, string, (v: string) => void, string][]).map(([label, value, set, type]) => (
        <div key={label}>
          <label className="mb-1 block text-sm font-medium text-white/75">{label}</label>
          <Input type={type} value={value} onChange={(e) => set(e.target.value)} />
        </div>
      ))}
      <div>
        <label className="mb-1 block text-sm font-medium text-white/75">Role</label>
        <Select value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </Select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button className="w-full" disabled={saving || !username || !password} onClick={() => onSave({ username, email, password, role })}>
        {saving ? 'Creating...' : 'Create user'}
      </Button>
    </div>
  )
}

function EditUserForm({ user, onSave, saving, error }: { user: AdminUser; onSave: (b: unknown) => void; saving: boolean; error: string }) {
  const [role, setRole] = useState(user.role)
  const [active, setActive] = useState(user.active)
  const [email, setEmail] = useState(user.email ?? '')
  const [password, setPassword] = useState('')

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/50">User: <strong>{user.username}</strong></p>
      <div>
        <label className="mb-1 block text-sm font-medium text-white/75">Email</label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-white/75">New password (leave blank to keep current)</label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-white/75">Role</label>
        <Select value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </Select>
      </div>
      <div className="flex items-center gap-3">
        <input type="checkbox" id="active" checked={active} onChange={(e) => setActive(e.target.checked)} />
        <label htmlFor="active" className="text-sm font-medium text-white/75">User active</label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button
        className="w-full"
        disabled={saving}
        onClick={() => onSave({ role, active, email: email || undefined, ...(password ? { password } : {}) })}
      >
        {saving ? 'Saving...' : 'Save'}
      </Button>
    </div>
  )
}

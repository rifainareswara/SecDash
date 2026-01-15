<script setup lang="ts">
interface AdminUser {
  username: string
  admin: boolean
  created_at?: string
}

const users = ref<AdminUser[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// Modal states
const showAddModal = ref(false)
const showEditModal = ref(false)
const editingUser = ref<AdminUser | null>(null)

const newUser = reactive({
  username: '',
  password: '',
  confirmPassword: ''
})

const editForm = reactive({
  newPassword: '',
  confirmPassword: ''
})

// 2FA State
const twoFactorStatus = ref({ enabled: false, hasSecret: false })
const showSetup2FAModal = ref(false)
const setup2FAData = ref<{ qrCode: string; secret: string } | null>(null)
const otpCode = ref('')
const loading2FA = ref(false)
const disableOtpCode = ref('')

onMounted(async () => {
  await fetchUsers()
  await fetch2FAStatus()
})

async function fetchUsers() {
  loading.value = true
  error.value = null
  try {
    const response = await $fetch<{ success: boolean; users: AdminUser[] }>('/api/admin-users')
    if (response.success) {
      users.value = response.users
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load users'
  } finally {
    loading.value = false
  }
}

async function fetch2FAStatus() {
  try {
    const response = await $fetch<{ success: boolean; enabled: boolean; hasSecret: boolean }>('/api/2fa/status')
    twoFactorStatus.value = { enabled: response.enabled, hasSecret: response.hasSecret }
  } catch (err) {
    console.error('Failed to fetch 2FA status:', err)
  }
}

async function setup2FA() {
  loading2FA.value = true
  try {
    const response = await $fetch<{ success: boolean; qrCode: string; secret: string }>('/api/2fa/setup', { method: 'POST' })
    setup2FAData.value = { qrCode: response.qrCode, secret: response.secret }
    showSetup2FAModal.value = true
  } catch (err: any) {
    alert(err.data?.message || 'Failed to setup 2FA')
  } finally {
    loading2FA.value = false
  }
}

async function verify2FA() {
  if (otpCode.value.length !== 6) {
    alert('Please enter a 6-digit code')
    return
  }
  loading2FA.value = true
  try {
    await $fetch('/api/2fa/verify', { method: 'POST', body: { otp: otpCode.value } })
    twoFactorStatus.value.enabled = true
    showSetup2FAModal.value = false
    setup2FAData.value = null
    otpCode.value = ''
    alert('2FA enabled successfully!')
  } catch (err: any) {
    alert(err.data?.message || 'Invalid OTP code')
  } finally {
    loading2FA.value = false
  }
}

async function disable2FA() {
  if (disableOtpCode.value.length !== 6) {
    alert('Please enter your current OTP code to disable 2FA')
    return
  }
  if (!confirm('Are you sure you want to disable 2FA?')) return
  loading2FA.value = true
  try {
    await $fetch('/api/2fa/disable', { method: 'POST', body: { otp: disableOtpCode.value } })
    twoFactorStatus.value = { enabled: false, hasSecret: false }
    disableOtpCode.value = ''
    alert('2FA disabled')
  } catch (err: any) {
    alert(err.data?.message || 'Failed to disable 2FA')
  } finally {
    loading2FA.value = false
  }
}

async function handleAddUser() {
  if (!newUser.username || !newUser.password) {
    alert('Username and password are required')
    return
  }
  if (newUser.password !== newUser.confirmPassword) {
    alert('Passwords do not match')
    return
  }

  try {
    const response = await $fetch<{ success: boolean; user: AdminUser }>('/api/admin-users', {
      method: 'POST',
      body: { username: newUser.username, password: newUser.password }
    })
    if (response.success) {
      users.value.push(response.user)
      showAddModal.value = false
      newUser.username = ''
      newUser.password = ''
      newUser.confirmPassword = ''
    }
  } catch (err: any) {
    alert(err.data?.message || 'Failed to create user')
  }
}

function openEditModal(user: AdminUser) {
  editingUser.value = user
  editForm.newPassword = ''
  editForm.confirmPassword = ''
  showEditModal.value = true
}

async function handleEditUser() {
  if (!editingUser.value) return
  
  if (editForm.newPassword && editForm.newPassword !== editForm.confirmPassword) {
    alert('Passwords do not match')
    return
  }

  try {
    const body: any = {}
    if (editForm.newPassword) body.password = editForm.newPassword

    await $fetch(`/api/admin-users/${editingUser.value.username}`, {
      method: 'PATCH',
      body
    })
    
    showEditModal.value = false
    editingUser.value = null
  } catch (err: any) {
    alert(err.data?.message || 'Failed to update user')
  }
}

async function handleDeleteUser(username: string) {
  if (!confirm(`Are you sure you want to delete user "${username}"?`)) return

  try {
    await $fetch(`/api/admin-users/${username}`, { method: 'DELETE' })
    users.value = users.value.filter(u => u.username !== username)
  } catch (err: any) {
    alert(err.data?.message || 'Failed to delete user')
  }
}
</script>

<template>
  <div class="space-y-6 md:space-y-8">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div class="space-y-1">
        <h2 class="text-3xl md:text-4xl font-black tracking-tight text-white">
          Admin Users
        </h2>
        <p class="text-text-secondary text-sm md:text-base">
          Manage administrators who can access this dashboard.
        </p>
      </div>
      <div>
        <button
          class="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-blue-400 text-black rounded-lg text-sm font-bold transition-colors shadow-[0_0_15px_rgba(59,130,246,0.3)]"
          @click="showAddModal = true"
        >
          <span class="material-symbols-outlined text-[18px]">person_add</span>
          Add Admin
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="glass-panel p-8 rounded-xl text-center">
      <span class="material-symbols-outlined text-4xl text-text-secondary animate-spin">sync</span>
      <p class="text-text-secondary mt-2">Loading users...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="glass-panel p-8 rounded-xl text-center">
      <p class="text-red-400 mb-4">{{ error }}</p>
      <button @click="fetchUsers" class="px-4 py-2 bg-surface text-white rounded-lg">Retry</button>
    </div>

    <!-- Users Table -->
    <div v-else class="glass-panel rounded-xl overflow-hidden">
      <table class="w-full text-left">
        <thead class="border-b border-surface-highlight bg-[#12121a]">
          <tr>
            <th class="px-6 py-4 text-xs font-semibold text-text-secondary uppercase">Username</th>
            <th class="px-6 py-4 text-xs font-semibold text-text-secondary uppercase">Role</th>
            <th class="px-6 py-4 text-xs font-semibold text-text-secondary uppercase">Created</th>
            <th class="px-6 py-4 text-xs font-semibold text-text-secondary uppercase text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-surface-highlight">
          <tr v-for="user in users" :key="user.username" class="hover:bg-surface-highlight/40 transition-colors">
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="size-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                  {{ user.username.substring(0, 2).toUpperCase() }}
                </div>
                <span class="text-white font-medium">{{ user.username }}</span>
              </div>
            </td>
            <td class="px-6 py-4">
              <span class="px-2 py-1 rounded text-xs font-bold" :class="user.admin ? 'bg-primary/20 text-primary' : 'bg-blue-500/20 text-blue-400'">
                {{ user.admin ? 'Admin' : 'User' }}
              </span>
            </td>
            <td class="px-6 py-4 text-text-secondary text-sm">
              {{ user.created_at ? new Date(user.created_at).toLocaleDateString() : '-' }}
            </td>
            <td class="px-6 py-4 text-right">
              <div class="flex justify-end gap-2">
                <button
                  @click="openEditModal(user)"
                  class="p-2 hover:bg-surface-highlight rounded-lg text-text-secondary hover:text-white transition-colors"
                  title="Edit"
                >
                  <span class="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button
                  @click="handleDeleteUser(user.username)"
                  class="p-2 hover:bg-red-500/20 rounded-lg text-text-secondary hover:text-red-400 transition-colors"
                  title="Delete"
                  :disabled="users.length === 1"
                >
                  <span class="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 2FA Security Settings -->
    <div class="glass-panel rounded-xl p-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-lg font-bold text-white flex items-center gap-2">
            <span class="material-symbols-outlined text-blue-400">security</span>
            Two-Factor Authentication
          </h3>
          <p class="text-sm text-text-secondary mt-1">Secure VPN client activation with TOTP</p>
        </div>
        <div v-if="twoFactorStatus.enabled" class="flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
          <span class="material-symbols-outlined text-[16px]">check_circle</span>
          Enabled
        </div>
        <div v-else class="flex items-center gap-2 px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm font-medium">
          <span class="material-symbols-outlined text-[16px]">warning</span>
          Not Configured
        </div>
      </div>

      <div v-if="!twoFactorStatus.enabled" class="space-y-4">
        <p class="text-text-secondary text-sm">
          Enable 2FA to require OTP verification before activating VPN clients. This adds an extra layer of security if a device is lost or stolen.
        </p>
        <button 
          @click="setup2FA" 
          :disabled="loading2FA"
          class="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-blue-400 text-black font-bold rounded-lg transition-colors"
        >
          <span class="material-symbols-outlined text-[18px]">qr_code_2</span>
          {{ loading2FA ? 'Setting up...' : 'Setup 2FA' }}
        </button>
      </div>

      <div v-else class="space-y-4">
        <p class="text-green-400 text-sm">✅ 2FA is active. VPN clients with "Require 2FA" will need OTP verification to activate.</p>
        <div class="flex items-center gap-3">
          <input 
            v-model="disableOtpCode" 
            type="text" 
            maxlength="6" 
            placeholder="Enter OTP to disable"
            class="w-32 bg-surface border border-surface-highlight rounded-lg px-3 py-2 text-white text-center font-mono tracking-widest focus:outline-none focus:border-primary"
          >
          <button 
            @click="disable2FA" 
            :disabled="loading2FA || disableOtpCode.length !== 6"
            class="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            Disable 2FA
          </button>
        </div>
      </div>
    </div>

    <!-- Add User Modal -->
    <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div class="glass-panel p-6 rounded-xl w-full max-w-md m-4">
        <h3 class="text-xl font-bold text-white mb-4">Add New Admin</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-text-secondary mb-1">Username</label>
            <input v-model="newUser.username" type="text" class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary" placeholder="username">
          </div>
          <div>
            <label class="block text-sm text-text-secondary mb-1">Password</label>
            <input v-model="newUser.password" type="password" class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
          </div>
          <div>
            <label class="block text-sm text-text-secondary mb-1">Confirm Password</label>
            <input v-model="newUser.confirmPassword" type="password" class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-6">
          <button @click="showAddModal = false" class="px-4 py-2 text-text-secondary hover:text-white">Cancel</button>
          <button @click="handleAddUser" class="px-4 py-2 bg-primary text-black font-bold rounded-lg hover:bg-blue-400">Create Admin</button>
        </div>
      </div>
    </div>

    <!-- Edit User Modal -->
    <div v-if="showEditModal && editingUser" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div class="glass-panel p-6 rounded-xl w-full max-w-md m-4">
        <h3 class="text-xl font-bold text-white mb-4">Edit User: {{ editingUser.username }}</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-text-secondary mb-1">New Password <span class="text-xs text-gray-500">(leave empty to keep current)</span></label>
            <input v-model="editForm.newPassword" type="password" class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
          </div>
          <div>
            <label class="block text-sm text-text-secondary mb-1">Confirm Password</label>
            <input v-model="editForm.confirmPassword" type="password" class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-6">
          <button @click="showEditModal = false" class="px-4 py-2 text-text-secondary hover:text-white">Cancel</button>
          <button @click="handleEditUser" class="px-4 py-2 bg-primary text-black font-bold rounded-lg hover:bg-blue-400">Save Changes</button>
        </div>
      </div>
    </div>

    <!-- 2FA Setup Modal -->
    <div v-if="showSetup2FAModal && setup2FAData" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div class="glass-panel p-6 rounded-xl w-full max-w-md m-4">
        <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span class="material-symbols-outlined text-blue-400">qr_code_2</span>
          Setup 2FA
        </h3>
        
        <div class="space-y-4">
          <p class="text-text-secondary text-sm">Scan this QR code with Google Authenticator or any TOTP app:</p>
          
          <div class="flex justify-center p-4 bg-white rounded-lg">
            <img :src="setup2FAData.qrCode" alt="2FA QR Code" class="w-48 h-48">
          </div>
          
          <div class="text-center">
            <p class="text-xs text-text-secondary mb-1">Or enter manually:</p>
            <code class="text-xs text-primary bg-surface px-2 py-1 rounded break-all">{{ setup2FAData.secret }}</code>
          </div>
          
          <div>
            <label class="block text-sm text-text-secondary mb-1">Enter 6-digit code to verify:</label>
            <input 
              v-model="otpCode" 
              type="text" 
              maxlength="6" 
              placeholder="000000"
              class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-3 text-white text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:border-primary"
            >
          </div>
        </div>
        
        <div class="flex justify-end gap-3 mt-6">
          <button @click="showSetup2FAModal = false; setup2FAData = null; otpCode = ''" class="px-4 py-2 text-text-secondary hover:text-white">Cancel</button>
          <button 
            @click="verify2FA" 
            :disabled="loading2FA || otpCode.length !== 6"
            class="px-4 py-2 bg-primary text-black font-bold rounded-lg hover:bg-blue-400 disabled:opacity-50"
          >
            {{ loading2FA ? 'Verifying...' : 'Verify & Enable' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

import Config from './Config'

window.onload = () => {
  if (window.location.href.includes('pages/promptConfiguration.html')) {
    const promptConfiguration = new PromptConfiguration()
    promptConfiguration.init()
  }
}

class PromptConfiguration {
  init () {
    this.cacheEls()
    this.bindStaticEvents()
    this.loadAndRender()
  }

  cacheEls () {
    // roles list
    this.rolesList = document.querySelector('#rolesList')

    // create role
    this.newRoleName = document.querySelector('#newRoleName')
    this.newRoleValue = document.querySelector('#newRoleValue') // divergence|convergence
    this.newRoleDescription = document.querySelector('#newRoleDescription')
    this.addRoleBtn = document.querySelector('#addRoleBtn')
    this.addRoleMessage = document.querySelector('#addRoleMessage')

    // reset all
    this.resetAllBtn = document.querySelector('#resetAllBtn')
    this.resetAllMessage = document.querySelector('#resetAllMessage')
  }

  bindStaticEvents () {
    // Add role
    this.addRoleBtn.addEventListener('click', () => this.addRole())

    // Reset all
    this.resetAllBtn.addEventListener('click', () => {
      chrome.storage.local.set({ roleDefinitions: this.clone(this.defaults()) }, () => {
        const err = chrome.runtime.lastError
        this.resetAllMessage.textContent = err ? err.message : 'All roles reset to defaults.'
        this.loadAndRender()
      })
    })
  }

  loadAndRender () {
    chrome.storage.local.get(
      {
        mode: 'divergent',
        roleDefinitions: this.clone(this.defaults())
      },
      (data) => {
        const roles = Array.isArray(data.roleDefinitions) ? data.roleDefinitions : []
        this.state = {
          mode: data.mode,
          roleDefinitions: roles
        }
        this.renderRoles()
      }
    )
  }

  renderRoles () {
    this.rolesList.innerHTML = ''

    const roles = Array.isArray(this.state.roleDefinitions)
      ? this.state.roleDefinitions
      : []

    if (roles.length === 0) {
      const empty = document.createElement('div')
      empty.textContent = 'No roles yet. Create one above.'
      this.rolesList.appendChild(empty)
      return
    }

    // Group by mode
    const divergence = roles.filter(r => r && r.mode === 'divergence')
    const convergence = roles.filter(r => r && r.mode === 'convergence')

    // Convergence first (or swap if you want)
    this.rolesList.appendChild(this.createRoleGroup('Convergence', 'convergence', convergence))
    this.rolesList.appendChild(this.createRoleGroup('Divergence', 'divergence', divergence))
  }

  createRoleGroup (title, modeKey, groupRoles) {
    const details = document.createElement('details')
    details.className = 'card role-group'
    details.open = true // set false if you want collapsed by default

    const summary = document.createElement('summary')
    summary.className = 'card-header bg-dark text-white role-group-summary'
    summary.innerHTML = `
      <div class="role-group-title">${title}</div>
      <div class="role-group-count">${groupRoles.length}</div>
    `

    const body = document.createElement('div')
    body.className = 'card-body'

    if (groupRoles.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'text-muted'
      empty.textContent = `No ${modeKey} roles.`
      body.appendChild(empty)
    } else {
      groupRoles.forEach((role, idx) => {
        body.appendChild(this.createRoleCard(role))

        if (idx !== groupRoles.length - 1) {
          const sep = document.createElement('div')
          sep.className = 'role-separator'
          body.appendChild(sep)
        }
      })
    }

    details.appendChild(summary)
    details.appendChild(body)
    return details
  }

  createRoleCard (role) {
    const wrapper = document.createElement('div')
    wrapper.className = 'Prompt-Configuration'

    // Track original name for rename support (since name is the ID)
    wrapper.dataset.originalName = (role.name || '').trim()

    const isDefaultRole = !!this.getDefaultRoleByName(role.name)

    wrapper.innerHTML = `
      <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:flex-start;">
        <div style="min-width:220px;">
          <label><b>Name</b></label>
          <input class="form-control" data-field="name" value="${this.escapeAttr(role.name || '')}">
        </div>

        <div style="min-width:220px;">
          <label><b>Mode</b></label>
          <select class="form-control" data-field="mode">
            <option value="divergence" ${role.mode === 'divergence' ? 'selected' : ''}>divergence</option>
            <option value="convergence" ${role.mode === 'convergence' ? 'selected' : ''}>convergence</option>
          </select>
        </div>
      </div>

      <div style="margin-top:12px;">
        <label><b>Description</b></label>
        <textarea class="form-control" rows="3" data-field="description">${this.escapeHtml(role.description || '')}</textarea>
      </div>

      <br>
      <div class="role-actions">
        <button class="btn btn-secondary" data-action="save">Save</button>
        <button class="btn btn-secondary" data-action="reset" ${isDefaultRole ? '' : 'disabled'}>Reset to default</button>
        <button class="btn btn-secondary" data-action="delete" ${isDefaultRole ? 'disabled' : ''}>Delete</button>
        <label class="role-message" data-field="message"></label>
      </div>
      ${isDefaultRole ? '' : '<div><small class="text-muted">Custom role. Reset disabled.</small></div>'}

    `
    wrapper.querySelector('[data-action="save"]').addEventListener('click', () => this.saveRole(wrapper))
    wrapper.querySelector('[data-action="reset"]').addEventListener('click', () => this.resetRole(wrapper))
    wrapper.querySelector('[data-action="delete"]').addEventListener('click', () => this.deleteRole(wrapper))

    return wrapper
  }

  saveRole (wrapper) {
    const msgEl = wrapper.querySelector('[data-field="message"]')

    const originalName = (wrapper.dataset.originalName || '').trim()
    const newName = (wrapper.querySelector('[data-field="name"]').value || '').trim()
    const mode = wrapper.querySelector('[data-field="mode"]').value || 'divergence'
    const description = wrapper.querySelector('[data-field="description"]').value || ''

    if (!newName) {
      msgEl.textContent = 'Name is required.'
      return
    }

    const roles = this.clone(this.state.roleDefinitions)

    // Find by original name
    const idx = roles.findIndex(r => r && r.name === originalName)
    if (idx === -1) {
      msgEl.textContent = 'Role not found (maybe changed). Reload the page.'
      return
    }

    // Renaming needs collision check
    if (newName !== originalName) {
      const collision = roles.some((r, i) => i !== idx && r && r.name === newName)
      if (collision) {
        msgEl.textContent = 'A role with that name already exists.'
        return
      }
    }

    roles[idx] = { name: newName, mode, description }

    chrome.storage.local.set({ roleDefinitions: roles }, () => {
      const err = chrome.runtime.lastError
      msgEl.textContent = err ? err.message : 'Saved.'
      if (!err) {
        this.state.roleDefinitions = roles
        wrapper.dataset.originalName = newName // update tracker
      }
    })
  }

  resetRole (wrapper) {
    const msgEl = wrapper.querySelector('[data-field="message"]')
    const originalName = (wrapper.dataset.originalName || '').trim()

    const def = this.getDefaultRoleByName(originalName)
    if (!def) {
      msgEl.textContent = 'No default exists for this role.'
      return
    }

    const roles = this.clone(this.state.roleDefinitions)
    const idx = roles.findIndex(r => r && r.name === originalName)
    if (idx === -1) {
      msgEl.textContent = 'Role not found. Reload the page.'
      return
    }

    roles[idx] = this.clone(def)

    chrome.storage.local.set({ roleDefinitions: roles }, () => {
      const err = chrome.runtime.lastError
      msgEl.textContent = err ? err.message : 'Reset to default.'
      if (!err) {
        this.state.roleDefinitions = roles
        this.renderRoles()
      }
    })
  }

  deleteRole (wrapper) {
    const msgEl = wrapper.querySelector('[data-field="message"]')
    const originalName = (wrapper.dataset.originalName || '').trim()

    // Don't delete defaults
    if (this.getDefaultRoleByName(originalName)) {
      msgEl.textContent = 'Default roles cannot be deleted.'
      return
    }

    const roles = this.clone(this.state.roleDefinitions)
      .filter(r => r && r.name !== originalName)

    chrome.storage.local.set({ roleDefinitions: roles }, () => {
      const err = chrome.runtime.lastError
      msgEl.textContent = err ? err.message : 'Deleted.'
      if (!err) {
        this.state.roleDefinitions = roles
        this.renderRoles()
      }
    })
  }

  addRole () {
    const name = (this.newRoleName.value || '').trim()
    const mode = this.newRoleValue.value
    const description = (this.newRoleDescription.value || '').trim()

    if (!name) {
      this.addRoleMessage.textContent = 'Role name is required.'
      return
    }

    const roles = Array.isArray(this.state.roleDefinitions)
      ? this.clone(this.state.roleDefinitions)
      : []

    if (roles.some(r => r && r.name === name)) {
      this.addRoleMessage.textContent = 'A role with that name already exists.'
      return
    }

    roles.push({ name, mode, description })

    chrome.storage.local.set({ roleDefinitions: roles }, () => {
      const err = chrome.runtime.lastError
      this.addRoleMessage.textContent = err ? err.message : 'Role added.'
      if (!err) {
        this.state.roleDefinitions = roles
        this.newRoleName.value = ''
        this.newRoleDescription.value = ''
        this.renderRoles()
      }
    })
  }

  // defaults from Config.roles (array)
  defaults () {
    return Array.isArray(Config.roles) ? Config.roles : []
  }

  getDefaultRoleByName (name) {
    const defs = this.defaults()
    return defs.find(r => r && r.name === name) || null
  }

  clone (obj) {
    return JSON.parse(JSON.stringify(obj))
  }

  escapeHtml (str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  escapeAttr (str) {
    return this.escapeHtml(str).replace(/"/g, '&quot;')
  }
}

export default PromptConfiguration

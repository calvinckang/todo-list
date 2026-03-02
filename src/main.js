import './style.css'

const container = document.querySelector('#app') || document.body
const appErrorBlock = document.getElementById('app-error-block')

function setAppError(html) {
  if (!appErrorBlock) return
  appErrorBlock.innerHTML = html
  appErrorBlock.hidden = false
  const main = container.querySelector('h1')
  const form = document.getElementById('todo-form')
  const listEl = document.getElementById('todo-list')
  const errorEl = document.getElementById('error-message')
  if (main) main.hidden = true
  if (form) form.hidden = true
  if (listEl) listEl.hidden = true
  if (errorEl) errorEl.hidden = true
}

function showFatalError(err) {
  const msg = String(err.message || err).replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const stack = (err.stack || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  setAppError(`<p>App failed to start: ${msg}</p><pre>${stack}</pre>`)
  console.error(err)
}

async function init() {
  try {
    const { supabase } = await import('./supabase.js')

    if (!supabase) {
      setAppError(
        '<p>Missing Supabase config. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env</code> in the project root, then restart the dev server (<code>pnpm dev</code>).</p>'
      )
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      const { error } = await supabase.auth.signInAnonymously()
      if (error) {
        const msg = String(error.message).replace(/</g, '&lt;').replace(/>/g, '&gt;')
        setAppError(`<p>Could not start session: ${msg}</p>`)
        return
      }
    } else {
      await supabase.auth.refreshSession()
    }

    const form = document.getElementById('todo-form')
    const input = document.getElementById('todo-input')
    const listEl = document.getElementById('todo-list')
    const errorEl = document.getElementById('error-message')
    const filterContainer = document.getElementById('todo-filters')
    const headerEl = document.querySelector('.app-header')
    const accountArea = document.getElementById('account-area')

    // #region agent log
    fetch('http://127.0.0.1:7862/ingest/5b0c0f69-d47c-4dc4-95fd-7b76d44ad0a3', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': '1b3e00',
      },
      body: JSON.stringify({
        sessionId: '1b3e00',
        runId: 'pre-fix',
        hypothesisId: 'H1-H4',
        location: 'src/main.js:header-layout',
        message: 'Header and account area layout debug',
        data: {
          viewportWidth: window.innerWidth,
          headerRect: headerEl?.getBoundingClientRect?.(),
          accountRect: accountArea?.getBoundingClientRect?.(),
          headerStyles: headerEl ? getComputedStyle(headerEl) : null,
          accountStyles: accountArea ? getComputedStyle(accountArea) : null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion

    const addButton = form?.querySelector('button[type="submit"]')

    function updateAddButtonState() {
      if (!addButton || !input) return
      const hasText = input.value.trim().length > 0
      addButton.disabled = !hasText
    }

    updateAddButtonState()
    input?.addEventListener('input', updateAddButtonState)

    let todos = []
    let currentFilter = 'all'
    let errorMessage = ''

    function setError(msg) {
      errorMessage = msg || ''
      errorEl.textContent = errorMessage
      errorEl.classList.toggle('visible', !!errorMessage)
    }

    function escapeHtml(text) {
      const div = document.createElement('div')
      div.textContent = text
      return div.innerHTML
    }

    function getFilteredTodos() {
      if (currentFilter === 'todo') {
        return todos.filter((t) => !t.is_complete)
      }
      if (currentFilter === 'done') {
        return todos.filter((t) => t.is_complete)
      }
      return todos
    }

    function renderTodos() {
      listEl.innerHTML = ''
      const visibleTodos = getFilteredTodos()

      if (!visibleTodos.length) {
        const li = document.createElement('li')
        li.className = 'todo-empty-state'
        li.innerHTML = `
          <div class="todo-empty-text">
            <h2 class="todo-empty-title">Nothing here yet</h2>
            <p class="todo-empty-caption">Try adding a task or changing the filter.</p>
          </div>
        `
        listEl.appendChild(li)
        return
      }

      for (const todo of visibleTodos) {
        const li = document.createElement('li')
        li.dataset.id = todo.id
        li.classList.toggle('completed', todo.is_complete)
        li.innerHTML = `
          <input type="checkbox" class="todo-toggle" ${todo.is_complete ? 'checked' : ''} aria-label="Toggle complete" />
          <span class="todo-text">${escapeHtml(todo.text)}</span>
          <button type="button" class="btn btn--sm btn--danger todo-delete" aria-label="Delete">Delete</button>
        `
        listEl.appendChild(li)
      }
    }

    function initFilters() {
      if (!filterContainer) return
      const buttons = Array.from(filterContainer.querySelectorAll('[data-filter]'))
      function setFilter(filter) {
        currentFilter = filter
        buttons.forEach((btn) => {
          const isActive = btn.dataset.filter === filter
          btn.classList.toggle('chip--active', isActive)
        })
        renderTodos()
      }
      buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const filter = btn.dataset.filter
          if (!filter || filter === currentFilter) return
          setFilter(filter)
        })
      })
    }

    function showLoading(show) {
      listEl.classList.toggle('loading', show)
      if (show) {
        listEl.innerHTML = '<li class="loading-placeholder">Loading…</li>'
      }
    }

    async function loadTodos() {
      showLoading(true)
      setError('')
      const { data, error } = await supabase
        .from('todos')
        .select('id, text, is_complete, created_at')
        .order('created_at', { ascending: true })
      showLoading(false)
      if (error) {
        setError('Failed to load todos. Please try again.')
        console.error('Supabase load error:', error)
        return
      }
      todos = data || []
      renderTodos()
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const text = input.value.trim()
      if (!text) return
      setError('')
      const { data, error } = await supabase
        .from('todos')
        .insert({ text, is_complete: false })
        .select('id, text, is_complete, created_at')
        .single()
      if (error) {
        setError('Failed to add todo. Please try again.')
        console.error('Supabase insert error:', error)
        return
      }
      todos.push(data)
      input.value = ''
      updateAddButtonState()
      renderTodos()
    })

    listEl.addEventListener('change', async (e) => {
      if (!e.target.matches('.todo-toggle')) return
      const li = e.target.closest('li')
      const todo = todos.find((t) => t.id === li.dataset.id)
      if (!todo) return
      const isComplete = e.target.checked
      setError('')
      const { error } = await supabase
        .from('todos')
        .update({ is_complete: isComplete })
        .eq('id', todo.id)
      if (error) {
        setError('Failed to update todo. Please try again.')
        console.error('Supabase update error:', error)
        todo.is_complete = !isComplete
        renderTodos()
        return
      }
      todo.is_complete = isComplete
      renderTodos()
    })

    listEl.addEventListener('click', async (e) => {
      if (!e.target.matches('.todo-delete')) return
      const li = e.target.closest('li')
      const id = li.dataset.id
      setError('')
      const { error } = await supabase.from('todos').delete().eq('id', id)
      if (error) {
        setError('Failed to delete todo. Please try again.')
        console.error('Supabase delete error:', error)
        return
      }
      todos = todos.filter((t) => t.id !== id)
      renderTodos()
    })

    async function updateAccountUI(overrideUser) {
      const u = overrideUser ?? (await supabase.auth.getUser()).data?.user
      if (!accountArea) return
      const email = u?.email ?? ''
      const isAnonymous = u?.is_anonymous ?? true
      if (isAnonymous) {
          accountArea.innerHTML = `
            <span class="account-status">Using app as guest</span>
            <div class="account-actions">
              <button type="button" class="btn btn--sm btn--secondary account-btn" data-action="show-create">Create account</button>
              <button type="button" class="btn btn--sm btn--secondary account-btn" data-action="show-signin">Sign in</button>
            </div>
            <div id="auth-popover" class="auth-popover" hidden role="dialog" aria-modal="true" aria-label="Account">
              <div id="auth-form-container" class="auth-form-container"></div>
            </div>
          `
      } else {
        accountArea.innerHTML = `
            <span class="account-status">Signed in as <span class="account-email">${escapeHtml(email)}</span></span>
            <button type="button" class="btn btn--sm btn--secondary account-btn account-btn-signout">Sign out</button>
          `
      }
      const authPopover = document.getElementById('auth-popover')
      const formContainer = document.getElementById('auth-form-container')
      function openPopover(anchorEl, formKind) {
        if (!authPopover || !formContainer) return
        if (!authPopover.hidden && authPopover.dataset.openFrom === formKind) {
          closePopover()
          return
        }
        const rect = anchorEl.getBoundingClientRect()
        authPopover.style.top = `calc(${rect.bottom}px + var(--space-sm))`
        authPopover.style.left = 'auto'
        authPopover.style.right = `${window.innerWidth - rect.right}px`
        authPopover.dataset.openFrom = formKind
        authPopover.hidden = false
      }
      function closePopover() {
        if (authPopover) {
          authPopover.hidden = true
          delete authPopover.dataset.openFrom
        }
        if (formContainer) formContainer.innerHTML = ''
      }
      function setFormErrorCreate(form, field, message) {
        setError('')
        const fieldEl = form?.querySelector(`.auth-field[data-field="${field}"]`)
        const input = fieldEl?.querySelector('input')
        const errEl = fieldEl?.querySelector('.auth-field-error')
        if (input) input.classList.toggle('auth-input-error', !!message)
        if (errEl) {
          errEl.textContent = message || ''
          errEl.hidden = !message
        }
      }
      function clearAllFormErrorsCreate(form) {
        setFormErrorCreate(form, 'email', '')
        setFormErrorCreate(form, 'password', '')
      }
      function bindFormErrorClearCreate(form) {
        form?.querySelector('input[name="email"]')?.addEventListener('input', () =>
          setFormErrorCreate(form, 'email', '')
        )
        form?.querySelector('input[name="password"]')?.addEventListener('input', () =>
          setFormErrorCreate(form, 'password', '')
        )
      }
      const authFormFields = `
        <div class="auth-field" data-field="email">
          <input type="email" name="email" placeholder="Email" required autocomplete="email" />
          <span class="auth-field-error" role="alert" aria-live="polite" hidden></span>
        </div>
        <div class="auth-field" data-field="password">
          <input type="password" name="password" placeholder="Password" required autocomplete="new-password" />
          <span class="auth-field-error" role="alert" aria-live="polite" hidden></span>
        </div>
      `
      const authFormFieldsSignin = `
        <div class="auth-field" data-field="email">
          <input type="email" name="email" placeholder="Email" required autocomplete="email" />
          <span class="auth-field-error" role="alert" aria-live="polite" hidden></span>
        </div>
        <div class="auth-field" data-field="password">
          <input type="password" name="password" placeholder="Password" required autocomplete="current-password" />
          <span class="auth-field-error" role="alert" aria-live="polite" hidden></span>
        </div>
      `
      const emailFormatRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      function setFormErrorSignin(form, field, message) {
        setError('')
        const fieldEl = form?.querySelector(`.auth-field[data-field="${field}"]`)
        const input = fieldEl?.querySelector('input')
        const errEl = fieldEl?.querySelector('.auth-field-error')
        if (input) input.classList.toggle('auth-input-error', !!message)
        if (errEl) {
          errEl.textContent = message || ''
          errEl.hidden = !message
        }
      }
      function clearAllFormErrorsSignin(form) {
        setFormErrorSignin(form, 'email', '')
        setFormErrorSignin(form, 'password', '')
      }
      function bindFormErrorClearSignin(form) {
        form?.querySelector('input[name="email"]')?.addEventListener('input', () => setFormErrorSignin(form, 'email', ''))
        form?.querySelector('input[name="password"]')?.addEventListener('input', () => setFormErrorSignin(form, 'password', ''))
      }
      function signInErrorToFieldAndMessage(errorMessage) {
        const msg = (errorMessage || '').toLowerCase()
        if (msg.includes('valid') && msg.includes('email') || msg.includes('invalid email') || msg.includes('email format')) {
          return { field: 'email', message: 'Please enter a valid email address.' }
        }
        if (msg.includes('user not found') || msg.includes('no user') || msg.includes('email not found') || msg.includes('no account') || msg.includes('not found')) {
          return { field: 'email', message: 'No account found with this email.' }
        }
        return { field: 'password', message: 'Invalid email or password. Please try again.' }
      }
      accountArea.querySelectorAll('[data-action="show-create"]').forEach((btn) => {
          btn.addEventListener('click', () => {
            if (!formContainer) return
            openPopover(btn, 'create')
            formContainer.innerHTML = `
              <form id="auth-create-form" class="auth-form" novalidate>
                ${authFormFields}
                <div class="auth-form-buttons">
                  <button type="button" class="btn btn--sm btn--tertiary auth-cancel">Cancel</button>
                  <button type="submit" class="btn btn--sm btn--primary">Create account</button>
                </div>
              </form>
            `
            const form = formContainer.querySelector('#auth-create-form')
            bindFormErrorClearCreate(form)
            formContainer.querySelector('.auth-cancel')?.addEventListener('click', () => {
              closePopover()
            })
            formContainer.querySelector('#auth-create-form')?.addEventListener('submit', async (e) => {
              e.preventDefault()
              const formEl = e.target
              const fd = new FormData(formEl)
              const emailVal = fd.get('email')?.toString().trim() || ''
              const passwordVal = fd.get('password')?.toString() || ''
              clearAllFormErrorsCreate(formEl)
              if (!emailVal) {
                setFormErrorCreate(formEl, 'email', 'Please enter your email address.')
                return
              }
              if (!emailFormatRegex.test(emailVal)) {
                setFormErrorCreate(formEl, 'email', 'Please enter a valid email address.')
                return
              }
              if (!passwordVal) {
                setFormErrorCreate(formEl, 'password', 'Please enter a password.')
                return
              }
              const { data: signUpData, error } = await supabase.auth.signUp({ email: emailVal, password: passwordVal })
              if (error) {
                const msg = error.message?.trim() === 'User already registered'
                  ? 'A user with this email address has already been registered.'
                  : error.message
                setFormErrorCreate(formEl, 'email', msg)
                return
              }
              closePopover()
              updateAccountUI()
            })
          })
      })
      accountArea.querySelectorAll('[data-action="show-signin"]').forEach((btn) => {
          btn.addEventListener('click', () => {
            if (!formContainer) return
            openPopover(btn, 'signin')
            formContainer.innerHTML = `
              <form id="auth-signin-form" class="auth-form" novalidate>
                ${authFormFieldsSignin}
                <div class="auth-form-buttons">
                  <button type="button" class="btn btn--sm btn--tertiary auth-cancel">Cancel</button>
                  <button type="submit" class="btn btn--sm btn--primary">Sign in</button>
                </div>
              </form>
            `
            const form = formContainer.querySelector('#auth-signin-form')
            bindFormErrorClearSignin(form)
            formContainer.querySelector('.auth-cancel')?.addEventListener('click', () => {
              closePopover()
            })
            formContainer.querySelector('#auth-signin-form')?.addEventListener('submit', async (e) => {
              e.preventDefault()
              const formEl = e.target
              const fd = new FormData(formEl)
              const emailVal = fd.get('email')?.toString().trim() || ''
              const passwordVal = fd.get('password')?.toString() || ''
              clearAllFormErrorsSignin(formEl)
              if (!emailVal || !emailFormatRegex.test(emailVal)) {
                setFormErrorSignin(formEl, 'email', 'Please enter a valid email address.')
                return
              }
              if (!passwordVal) {
                setFormErrorSignin(formEl, 'password', 'Please enter your password.')
                return
              }
              const { data: { user: prevUser } } = await supabase.auth.getUser()
              const prevId = prevUser?.id
              const wasAnonymous = prevUser?.is_anonymous === true
              const { data: signInData, error } = await supabase.auth.signInWithPassword({ email: emailVal, password: passwordVal })
              if (error) {
                const { field, message } = signInErrorToFieldAndMessage(error.message)
                setFormErrorSignin(formEl, field, message)
                return
              }
              if (wasAnonymous && prevId && signInData?.user?.id !== prevId) {
                try {
                  await supabase.rpc('migrate_todos_from_anonymous', { anonymous_user_id: prevId })
                  await loadTodos()
                } catch (migrateErr) {}
              }
              closePopover()
              updateAccountUI(signInData.user)
            })
          })
      })
      accountArea.querySelectorAll('.account-btn-signout').forEach((btn) => {
        btn.addEventListener('click', async () => {
          await supabase.auth.signOut()
          const { error } = await supabase.auth.signInAnonymously()
          if (!error) {
            await loadTodos()
            updateAccountUI()
          }
        })
      })
    }

    supabase.auth.onAuthStateChange((event) => {
      updateAccountUI()
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') loadTodos()
    })

    container.addEventListener('click', (e) => {
      const popover = document.getElementById('auth-popover')
      const area = document.getElementById('account-area')
      if (!popover || popover.hidden) return
      if (popover.contains(e.target) || area?.contains(e.target)) return
      popover.hidden = true
      const formContainer = document.getElementById('auth-form-container')
      if (formContainer) formContainer.innerHTML = ''
    }, true)

    updateAccountUI()
    initFilters()
    loadTodos()
  } catch (err) {
    showFatalError(err)
  }
}

init()

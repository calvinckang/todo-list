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

    const form = document.getElementById('todo-form')
    const input = document.getElementById('todo-input')
    const listEl = document.getElementById('todo-list')
    const errorEl = document.getElementById('error-message')

    let todos = []
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

    function renderTodos() {
      listEl.innerHTML = ''
      for (const todo of todos) {
        const li = document.createElement('li')
        li.dataset.id = todo.id
        li.classList.toggle('completed', todo.is_complete)
        li.innerHTML = `
          <input type="checkbox" class="todo-toggle" ${todo.is_complete ? 'checked' : ''} aria-label="Toggle complete" />
          <span class="todo-text">${escapeHtml(todo.text)}</span>
          <button type="button" class="todo-delete" aria-label="Delete">Delete</button>
        `
        listEl.appendChild(li)
      }
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

    loadTodos()
  } catch (err) {
    showFatalError(err)
  }
}

init()

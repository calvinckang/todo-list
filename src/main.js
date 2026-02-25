import './style.css'

let todos = []

const app = document.querySelector('#app')
app.innerHTML = `
  <h1>Todo List</h1>
  <form id="todo-form">
    <input type="text" id="todo-input" placeholder="What needs to be done?" autocomplete="off" />
    <button type="submit">Add</button>
  </form>
  <ul id="todo-list"></ul>
`

const form = app.querySelector('#todo-form')
const input = app.querySelector('#todo-input')
const listEl = app.querySelector('#todo-list')

function renderTodos() {
  listEl.innerHTML = ''
  for (const todo of todos) {
    const li = document.createElement('li')
    li.dataset.id = todo.id
    li.classList.toggle('completed', todo.completed)
    li.innerHTML = `
      <input type="checkbox" class="todo-toggle" ${todo.completed ? 'checked' : ''} aria-label="Toggle complete" />
      <span class="todo-text">${escapeHtml(todo.text)}</span>
      <button type="button" class="todo-delete" aria-label="Delete">Delete</button>
    `
    listEl.appendChild(li)
  }
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

form.addEventListener('submit', (e) => {
  e.preventDefault()
  const text = input.value.trim()
  if (!text) return
  todos.push({ id: crypto.randomUUID(), text, completed: false })
  input.value = ''
  renderTodos()
})

listEl.addEventListener('change', (e) => {
  if (!e.target.matches('.todo-toggle')) return
  const li = e.target.closest('li')
  const todo = todos.find((t) => t.id === li.dataset.id)
  if (todo) {
    todo.completed = e.target.checked
    renderTodos()
  }
})

listEl.addEventListener('click', (e) => {
  if (!e.target.matches('.todo-delete')) return
  const li = e.target.closest('li')
  todos = todos.filter((t) => t.id !== li.dataset.id)
  renderTodos()
})

renderTodos()

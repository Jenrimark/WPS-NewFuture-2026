import { useState } from 'react'
import LoginPage from './pages/LoginPage'
import EditorPage from './pages/EditorPage'

function App() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('token')
  )

  const handleLogin = (t: string) => {
    localStorage.setItem('token', t)
    setToken(t)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken(null)
  }

  if (!token) {
    return <LoginPage onLogin={handleLogin} />
  }

  return <EditorPage onLogout={handleLogout} />
}

export default App

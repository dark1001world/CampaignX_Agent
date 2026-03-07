import { useState, useEffect } from "react"
import AegisAgentUI from "./home"
import AuthPage from "./AuthPage"

function App() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem("user")
    if (stored) setUser(JSON.parse(stored))
  }, [])

  const handleAuth = (userData) => {
    setUser(userData)
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setUser(null)
  }

  if (!user) return <AuthPage onAuth={handleAuth} />
  return <AegisAgentUI user={user} onLogout={handleLogout} />
}

export default App
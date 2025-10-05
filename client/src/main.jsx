import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom'
import './style.css'

const API_BASE = import.meta.env.VITE_API_URL || ''
const api = (path) => `${API_BASE}${path}`

function useAuth() {
  const [token, setToken] = React.useState(localStorage.getItem('token') || '')
  const [user, setUser] = React.useState(JSON.parse(localStorage.getItem('user') || 'null'))
  const login = (data) => { localStorage.setItem('token', data.token); localStorage.setItem('user', JSON.stringify(data.user)); setToken(data.token); setUser(data.user) }
  const logout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); setToken(''); setUser(null) }
  return { token, user, login, logout }
}

function App() {
  const auth = useAuth()
  return (
    <BrowserRouter>
      <nav style={{ display:'flex', gap:12, padding:12, borderBottom:'1px solid #ddd' }}>
        <Link to="/courses">Courses</Link>
        {auth.user && <Link to="/progress">My Progress</Link>}
        {auth.user?.role === 'Learner' && <Link to="/creator/apply">Apply Creator</Link>}
        {auth.user?.role === 'Creator' && <Link to="/creator/dashboard">Creator</Link>}
        {auth.user?.role === 'Admin' && <Link to="/admin/review/courses">Admin</Link>}
        <span style={{ marginLeft:'auto' }}>
          {auth.user ? (
            <>
              <b>{auth.user.email}</b> <button onClick={auth.logout}>Logout</button>
            </>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </span>
      </nav>
      <Routes>
        <Route path="/" element={<Courses auth={auth} />} />
        <Route path="/login" element={<Login auth={auth} />} />
        <Route path="/courses" element={<Courses auth={auth} />} />
        <Route path="/courses/:id" element={<CourseDetail auth={auth} />} />
        <Route path="/learn/:lessonId" element={<LearnLesson auth={auth} />} />
        <Route path="/progress" element={<Progress auth={auth} />} />
        <Route path="/creator/apply" element={<CreatorApply auth={auth} />} />
        <Route path="/creator/dashboard" element={<CreatorDashboard auth={auth} />} />
        <Route path="/admin/review/courses" element={<AdminReview auth={auth} />} />
      </Routes>
    </BrowserRouter>
  )
}

function Login({ auth }) {
  const nav = useNavigate()
  const [email, setEmail] = React.useState('learner@example.com')
  const [password, setPassword] = React.useState('learner123')
  const onSubmit = async (e) => {
    e.preventDefault()
    const r = await fetch(api('/api/auth/login'), { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ email, password }) })
    const d = await r.json(); if (r.ok) { auth.login(d); nav('/courses') } else { alert(JSON.stringify(d)) }
  }
  return (
    <form onSubmit={onSubmit} style={{ padding:20 }}>
      <h2>Login</h2>
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="email" />
      <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="password" type="password" />
      <button>Login</button>
    </form>
  )
}

function Courses() {
  const [data, setData] = React.useState({ items: [] })
  React.useEffect(()=>{ (async()=>{ const r = await fetch(api('/api/courses')); setData(await r.json()) })() },[])
  return (
    <div style={{ padding:20 }}>
      <h2>Courses</h2>
      <ul>
        {data.items.map(c=> (<li key={c.id}><Link to={`/courses/${c.id}`}>{c.title}</Link></li>))}
      </ul>
    </div>
  )
}

function CourseDetail({ auth }) {
  const { id } = useParams()
  const [d, setD] = React.useState(null)
  React.useEffect(()=>{ (async()=>{ const r = await fetch(`/api/courses/${id}`); setD(await r.json()) })() },[id])
  if (!d) return null
  const enroll = async ()=>{
    const r = await fetch(api('/api/learn/enroll'), { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization': `Bearer ${auth.token}` }, body: JSON.stringify({ course_id: d.course.id })}); const j = await r.json(); if(!r.ok) alert(JSON.stringify(j))
  }
  return (
    <div style={{ padding:20 }}>
      <h2>{d.course.title}</h2>
      <p>{d.course.description}</p>
      {auth.user && <button onClick={enroll}>Enroll</button>}
      <h3>Lessons</h3>
      <ol>
        {d.lessons.map(l => (<li key={l.id}><Link to={`/learn/${l.id}`}>{l.title}</Link></li>))}
      </ol>
    </div>
  )
}

function LearnLesson({ auth }) {
  const { lessonId } = useParams()
  const [l, setL] = React.useState(null)
  React.useEffect(()=>{ (async()=>{ const r = await fetch(api(`/api/lesson/${lessonId}`)); setL(await r.json()) })() },[lessonId])
  if (!l) return null
  const complete = async ()=>{
    const r = await fetch(api('/api/learn/complete'), { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization': `Bearer ${auth.token}` }, body: JSON.stringify({ lesson_id: Number(lessonId) })}); const j = await r.json(); if(!r.ok) alert(JSON.stringify(j))
  }
  return (
    <div style={{ padding:20 }}>
      <h2>{l.title}</h2>
      <p>{l.content}</p>
      <pre>{l.transcript}</pre>
      {auth.user && <button onClick={complete}>Mark Complete</button>}
    </div>
  )
}

function Progress({ auth }) {
  const [courseId, setCourseId] = React.useState('1')
  const [p, setP] = React.useState(null)
  const fetchP = async ()=>{ const r = await fetch(api(`/api/learn/progress/${courseId}`), { headers: { 'Authorization': `Bearer ${auth.token}` } }); setP(await r.json()) }
  return (
    <div style={{ padding:20 }}>
      <h2>My Progress</h2>
      <input value={courseId} onChange={e=>setCourseId(e.target.value)} placeholder="Course ID" />
      <button onClick={fetchP}>Fetch</button>
      {p && <p>{p.completed_lessons}/{p.total_lessons} ({p.percent}%)</p>}
      <button onClick={async()=>{ const r = await fetch(api('/api/learn/certificate'), { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization': `Bearer ${auth.token}` }, body: JSON.stringify({ course_id: Number(courseId) })}); const j = await r.json(); if(r.ok) alert(`Issued: ${j.certificate.serial_hash}`); else alert(JSON.stringify(j)) }}>Issue Certificate</button>
    </div>
  )
}

function CreatorApply({ auth }) {
  const submit = async ()=>{
    const r = await fetch(api('/api/creator/apply'), { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization': `Bearer ${auth.token}` }, body: JSON.stringify({ bio: 'Experienced teacher' })}); const j = await r.json(); if(!r.ok) alert(JSON.stringify(j))
  }
  return (
    <div style={{ padding:20 }}>
      <h2>Apply as Creator</h2>
      <button onClick={submit}>Submit Application</button>
    </div>
  )
}

function CreatorDashboard({ auth }) {
  const [title, setTitle] = React.useState('New Course')
  const [desc, setDesc] = React.useState('About this course')
  const [cid, setCid] = React.useState(null)
  const [items, setItems] = React.useState([])
  const reload = async ()=>{ const r = await fetch(api('/api/creator/dashboard'), { headers:{ 'Authorization': `Bearer ${auth.token}` }}); const j = await r.json(); setItems(j.items || []) }
  React.useEffect(()=>{ reload() },[])
  const create = async ()=>{ const r = await fetch(api('/api/courses'), { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization': `Bearer ${auth.token}` }, body: JSON.stringify({ title, description: desc })}); const j = await r.json(); if(r.ok) { setCid(j.id); reload() } else alert(JSON.stringify(j)) }
  const addLesson = async ()=>{ const r = await fetch(api(`/api/courses/${cid}/lessons`), { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization': `Bearer ${auth.token}` }, body: JSON.stringify({ title:'Lesson', content:'Auto transcript content. This illustrates keywords.', order_index: 1 })}); if(r.ok) reload(); else alert(await r.text()) }
  const submit = async ()=>{ const r = await fetch(api(`/api/courses/${cid}/submit`), { method:'POST', headers:{ 'Authorization': `Bearer ${auth.token}` }}); if(r.ok) reload(); else alert(await r.text()) }
  return (
    <div style={{ padding:20 }}>
      <h2>Creator Dashboard</h2>
      <div>
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="title" />
        <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="description" />
        <button onClick={create}>Create Course</button>
      </div>
      <div>
        <input value={cid||''} onChange={e=>setCid(Number(e.target.value))} placeholder="course id" />
        <button onClick={addLesson} disabled={!cid}>Add Lesson #1</button>
        <button onClick={submit} disabled={!cid}>Submit for Review</button>
      </div>
      <ul>
        {items.map(c => (<li key={c.id}>#{c.id} {c.title} [{c.status}]</li>))}
      </ul>
    </div>
  )
}

function AdminReview({ auth }) {
  const [courses, setCourses] = React.useState([])
  const [apps, setApps] = React.useState([])
  const reload = async ()=>{
    const r1 = await fetch(api('/api/admin/review/courses'), { headers:{ 'Authorization': `Bearer ${auth.token}` }}); setCourses((await r1.json()).items || [])
    const r2 = await fetch(api('/api/admin/review/creators'), { headers:{ 'Authorization': `Bearer ${auth.token}` }}); setApps((await r2.json()).items || [])
  }
  React.useEffect(()=>{ reload() },[])
  const approveCourse = async (id)=>{ const r = await fetch(api(`/api/admin/review/courses/${id}/approve`), { method:'POST', headers:{ 'Authorization': `Bearer ${auth.token}` }}); if(r.ok) reload(); else alert(await r.text()) }
  const approveCreator = async (id)=>{ const r = await fetch(api(`/api/admin/review/creators/${id}/approve`), { method:'POST', headers:{ 'Authorization': `Bearer ${auth.token}` }}); if(r.ok) reload(); else alert(await r.text()) }
  return (
    <div style={{ padding:20 }}>
      <h2>Admin Review</h2>
      <h3>Creator Applications</h3>
      <ul>
        {apps.map(a => (<li key={a.id}>#{a.id} {a.email} <button onClick={()=>approveCreator(a.id)}>Approve</button></li>))}
      </ul>
      <h3>Courses</h3>
      <ul>
        {courses.map(c => (<li key={c.id}>#{c.id} {c.title} <button onClick={()=>approveCourse(c.id)}>Publish</button></li>))}
      </ul>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
